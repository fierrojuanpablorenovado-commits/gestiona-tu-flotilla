import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

/**
 * POST /api/infracciones/sync
 * Trigger manual del check SSIM para el tenant autenticado.
 * Usa COALESCE(plates, eco) — plates si está registrada, eco como fallback.
 */

const SSIM_API = 'https://apissim.guadalajara.gob.mx/obtener-infracciones';

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const tid = user.tenantId;

  // Asegurar columnas (safe migration — idempotente)
  await Promise.all([
    sql`ALTER TABLE infracciones ADD COLUMN IF NOT EXISTS fuente   TEXT DEFAULT 'manual'`.catch(() => {}),
    sql`ALTER TABLE infracciones ADD COLUMN IF NOT EXISTS ssim_id  TEXT`.catch(() => {}),
    sql`ALTER TABLE infracciones ADD COLUMN IF NOT EXISTS foto_url TEXT`.catch(() => {}),
  ]);

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS infracciones_ssim_id_unique
    ON infracciones (tenant_id, ssim_id)
    WHERE ssim_id IS NOT NULL
  `.catch(() => {});

  // Vehículos activos del tenant
  // COALESCE(plates, eco): usa la placa oficial si existe, si no el número económico
  // Muchos tenants registran la placa en el campo eco
  const vehicles = await sql`
    SELECT
      v.id  AS vehicle_id,
      COALESCE(NULLIF(TRIM(v.plates), ''), NULLIF(TRIM(v.eco), '')) AS placa,
      v.eco AS eco,
      d.id  AS driver_id,
      d.first_name || ' ' || d.last_name AS driver_name
    FROM vehicles v
    LEFT JOIN drivers d ON d.vehicle_id = v.id AND d.status = 'active'
    WHERE v.tenant_id = ${tid}
      AND v.status   != 'deleted'
      AND COALESCE(NULLIF(TRIM(v.plates), ''), NULLIF(TRIM(v.eco), '')) IS NOT NULL
  `;

  if (vehicles.length === 0) {
    return NextResponse.json({
      ok: true,
      totalNuevas: 0,
      vehiculosConsultados: 0,
      detalle: [],
      aviso: 'No se encontraron vehículos activos con placa o número económico registrado.',
    });
  }

  let totalNuevas = 0;
  const detalle: Array<{ placa: string; nuevas: number; total: number; error?: string }> = [];

  for (const v of vehicles) {
    let ssimData: any[] = [];
    let errorMsg: string | undefined;

    try {
      const res = await fetch(SSIM_API, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ placa: v.placa }),
        signal:  AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const json = await res.json();
        ssimData = Array.isArray(json) ? json : [];
      } else {
        errorMsg = `HTTP ${res.status}`;
      }
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Timeout';
    }

    let nuevas = 0;

    for (const inf of ssimData) {
      const ssimId  = String(inf.id ?? '');
      const folio   = String(inf.folio ?? ssimId);
      const fecha   = parseFecha(inf.fecha);
      const pagada  = String(inf.estatus ?? '').toUpperCase().includes('PAGADO')
                      && !String(inf.estatus ?? '').toUpperCase().includes('NO PAGADO');
      const monto   = Number(inf.monto ?? inf.pago?.monto_sin_descuento ?? inf.pago?.monto ?? 0);
      const fotoUrl = inf.fotos?.length > 0
        ? `https://apissim.guadalajara.gob.mx/image?foto=${folio}/${v.placa}-1.jpeg&pim=0`
        : null;
      const notas = pagada
        ? `Detectada vía SSIM GDL. Placa: ${v.placa}. Ya pagada.`
        : `Detectada vía SSIM GDL. Placa: ${v.placa}. PENDIENTE DE PAGO.`;

      const inserted = await sql`
        INSERT INTO infracciones (
          tenant_id, vehicle_id, driver_id,
          fecha, tipo, folio, descripcion,
          monto, pagada, responsable,
          cargo_chofer, cargo_monto,
          fuente, ssim_id, foto_url, notas
        )
        SELECT
          ${tid}, ${v.vehicle_id}, ${v.driver_id ?? null},
          ${fecha}, 'Infracción municipal GDL', ${folio},
          ${`Hora: ${inf.hora ?? 'N/D'} — SSIM ID: ${ssimId}`},
          ${monto}, ${pagada}, 'chofer', true, ${monto},
          'ssim', ${ssimId}, ${fotoUrl}, ${notas}
        WHERE NOT EXISTS (
          SELECT 1 FROM infracciones
          WHERE tenant_id = ${tid} AND ssim_id = ${ssimId}
        )
        RETURNING id
      `.catch(() => []);

      if (inserted.length > 0) {
        nuevas++;
        totalNuevas++;
      }
    }

    detalle.push({ placa: v.placa, nuevas, total: ssimData.length, error: errorMsg });
  }

  return NextResponse.json({
    ok: true,
    totalNuevas,
    vehiculosConsultados: vehicles.length,
    detalle,
  });
}

function parseFecha(raw: any): string {
  if (!raw) return new Date().toISOString().split('T')[0];
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.split('T')[0];
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const m2 = s.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`;
  return new Date().toISOString().split('T')[0];
}
