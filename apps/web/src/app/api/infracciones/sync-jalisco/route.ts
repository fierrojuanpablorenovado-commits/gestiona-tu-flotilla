import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

/**
 * POST /api/infracciones/sync-jalisco
 *
 * Consulta el portal de adeudos vehiculares del Estado de Jalisco
 * (https://gobiernoenlinea1.jalisco.gob.mx/serviciosVehiculares/adeudos)
 * para cada vehículo del tenant que tenga VIN, número de motor y propietario configurados.
 *
 * Parámetros requeridos por el portal:
 *   placa            — placa oficial del vehículo
 *   numeroSerie      — últimos 5 caracteres del VIN (ej. "01446" de "ML3AF26J9MH001446")
 *   nombrePropietario — nombre del propietario tal como aparece en tarjeta de circulación
 *   numeroMotor      — número de motor del vehículo
 */

const JALISCO_API =
  'https://gobiernoenlinea1.jalisco.gob.mx/serviciosVehiculares/adeudos';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface JaliscoConcepto {
  idRow?:       number;
  folio?:       string;
  descripcion?: string;
  importe?:     number;
  baseLegal?:   string;
  periodo?:     number;
  numserie?:    string;
}

interface JaliscoAdeudo {
  placa?:     string;
  idAdeudo?:  string;
  total?:     number;
  conceptos?: JaliscoConcepto[];
}

// ─── Parser HTML ──────────────────────────────────────────────────────────────

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>');
}

/** Devuelve los adeudos (no los conceptos) para poder usar total y idAdeudo */
function parseJaliscoResponse(html: string): JaliscoAdeudo[] {
  // 1) JSON directo
  try {
    const data = JSON.parse(html) as JaliscoAdeudo[];
    if (Array.isArray(data)) return data;
  } catch {}

  // 2) <input value ="[{&quot;placa&quot;:...}]"> — portal Jalisco inyecta entidades HTML
  const mVal = html.match(/value\s*=\s*"(\[(?:[^"]|&quot;)*\])"/s);
  if (mVal?.[1]) {
    try {
      const data = JSON.parse(decodeHtmlEntities(mVal[1])) as JaliscoAdeudo[];
      if (Array.isArray(data)) return data;
    } catch {}
  }

  // 3) Array JSON inline (fallback)
  const mInline = html.match(/\[\s*\{[^<]*"placa"[\s\S]*?\}\s*\]/);
  if (mInline) {
    try {
      const data = JSON.parse(decodeHtmlEntities(mInline[0])) as JaliscoAdeudo[];
      if (Array.isArray(data)) return data;
    } catch {}
  }

  return [];
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const tid = user.tenantId;

  // Asegurar columnas necesarias (idempotente)
  await Promise.all([
    sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS numero_motor       TEXT`.catch(() => {}),
    sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS jalisco_propietario TEXT`.catch(() => {}),
    sql`ALTER TABLE infracciones ADD COLUMN IF NOT EXISTS fuente   TEXT DEFAULT 'manual'`.catch(() => {}),
    sql`ALTER TABLE infracciones ADD COLUMN IF NOT EXISTS ssim_id  TEXT`.catch(() => {}),
    sql`ALTER TABLE infracciones ADD COLUMN IF NOT EXISTS foto_url TEXT`.catch(() => {}),
  ]);

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS infracciones_ssim_id_unique
    ON infracciones (tenant_id, ssim_id)
    WHERE ssim_id IS NOT NULL
  `.catch(() => {});

  // Vehículos del tenant con todos los datos requeridos por Jalisco
  const vehicles = await sql`
    SELECT
      v.id  AS vehicle_id,
      v.eco,
      COALESCE(NULLIF(TRIM(v.plates), ''), NULLIF(TRIM(v.eco), '')) AS placa,
      TRIM(v.vin)                  AS vin,
      TRIM(v.numero_motor)         AS numero_motor,
      TRIM(v.jalisco_propietario)  AS jalisco_propietario,
      d.id  AS driver_id
    FROM vehicles v
    LEFT JOIN drivers d ON d.vehicle_id = v.id AND d.status = 'active'
    WHERE v.tenant_id = ${tid}
      AND v.status    != 'deleted'
      AND NULLIF(TRIM(COALESCE(v.plates, v.eco)), '') IS NOT NULL
      AND NULLIF(TRIM(v.vin), '')                     IS NOT NULL
      AND NULLIF(TRIM(v.numero_motor), '')             IS NOT NULL
      AND NULLIF(TRIM(v.jalisco_propietario), '')      IS NOT NULL
  `;

  if (vehicles.length === 0) {
    return NextResponse.json({
      ok:                   true,
      totalNuevas:          0,
      vehiculosConsultados: 0,
      detalle:              [],
      aviso:
        'Ningún vehículo tiene VIN, número de motor y propietario configurados. ' +
        'Edita cada vehículo en el módulo Vehículos y completa esos campos para activar la consulta Jalisco.',
    });
  }

  let totalNuevas = 0;
  const detalle: Array<{
    placa: string; eco: string; nuevas: number; total: number; error?: string;
  }> = [];

  for (const v of vehicles) {
    let adeudos: JaliscoAdeudo[] = [];
    let errorMsg: string | undefined;

    try {
      const numSerie = String(v.vin).trim().slice(-5);

      const fd = new FormData();
      fd.append('placa',             String(v.placa));
      fd.append('numeroSerie',       numSerie);
      fd.append('nombrePropietario', String(v.jalisco_propietario));
      fd.append('numeroMotor',       String(v.numero_motor));

      const res = await fetch(JALISCO_API, {
        method: 'POST',
        body:   fd,
        signal: AbortSignal.timeout(15_000),
      });

      if (res.ok) {
        adeudos = parseJaliscoResponse(await res.text());
      } else {
        errorMsg = `HTTP ${res.status}`;
      }
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Timeout';
    }

    let nuevas = 0;

    for (const adeudo of adeudos) {
      const adeudoId = String(adeudo.idAdeudo ?? '').trim();
      if (!adeudoId) continue;

      // Monto = total del adeudo (ya incluye descuentos pronto pago)
      const monto = Number(adeudo.total ?? 0);

      // Primer concepto con folio válido → úsalo como referencia
      const concepto = (adeudo.conceptos ?? []).find(c => c.folio);
      const folio     = String(concepto?.folio ?? adeudoId).trim();
      // El portal Jalisco no devuelve fecha exacta de infracción, solo período fiscal.
      // Usamos la fecha de detección (hoy) para que sea útil operativamente.
      const fechaStr  = new Date().toISOString().split('T')[0];

      // Descripción: lista de infracciones del adeudo
      const descs = (adeudo.conceptos ?? [])
        .filter(c => (c.importe ?? 0) > 0)
        .map(c => String(c.descripcion ?? '').trim())
        .filter(Boolean)
        .join(' / ');
      const baseLegal = (adeudo.conceptos ?? [])
        .find(c => c.baseLegal)?.baseLegal ?? '';
      const notas =
        `Detectada vía portal Jalisco. Placa: ${v.placa}.` +
        (baseLegal ? ` Base legal: ${baseLegal}.` : '') +
        ` ID Adeudo: ${adeudoId}. PENDIENTE DE PAGO.`;

      // Deduplicar por adeudoId (en ssim_id)
      const inserted = await sql`
        INSERT INTO infracciones (
          tenant_id, vehicle_id, driver_id,
          fecha, tipo, folio, descripcion,
          monto, pagada, responsable,
          cargo_chofer, cargo_monto,
          fuente, ssim_id, notas
        )
        SELECT
          ${tid}, ${v.vehicle_id}, ${v.driver_id ?? null},
          ${fechaStr}::date, 'Infracción estatal Jalisco', ${folio}, ${descs || 'Sin descripción'},
          ${monto}, false, 'chofer', true, ${monto},
          'jalisco', ${adeudoId}, ${notas}
        WHERE NOT EXISTS (
          SELECT 1 FROM infracciones
          WHERE tenant_id = ${tid} AND ssim_id = ${adeudoId}
        )
        RETURNING id
      `.catch(() => []);

      if (inserted.length > 0) {
        nuevas++;
        totalNuevas++;
      }
    }

    detalle.push({
      placa:  String(v.placa),
      eco:    String(v.eco),
      nuevas,
      total:  adeudos.length,
      error:  errorMsg,
    });
  }

  return NextResponse.json({
    ok:                   true,
    totalNuevas,
    vehiculosConsultados: vehicles.length,
    detalle,
  });
}
