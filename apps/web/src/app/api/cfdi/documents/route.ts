import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { emitirCFDIIngreso, type CFDIConfig } from '@/lib/facturama';
import type { CFDIItem } from '@/lib/facturama';

export const dynamic = 'force-dynamic';

// GET — listar CFDIs del tenant
export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mes   = searchParams.get('mes');
  const anio  = searchParams.get('anio');
  const tipo  = searchParams.get('tipo');
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);

  const docs = await sql`
    SELECT id, facturama_id AS "facturamaId", uuid_sat AS "uuidSat",
           serie, folio, tipo, mes, anio, period_label AS "periodLabel",
           receptor_rfc AS "receptorRfc", receptor_nombre AS "receptorNombre",
           subtotal, iva, total, status, error_message AS "errorMessage",
           notas, created_at AS "createdAt"
    FROM cfdi_documents
    WHERE tenant_id = ${session.tenantId}
      ${mes  ? sql`AND mes  = ${parseInt(mes,  10)}` : sql``}
      ${anio ? sql`AND anio = ${parseInt(anio, 10)}` : sql``}
      ${tipo ? sql`AND tipo = ${tipo}` : sql``}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `.catch(() => []);

  const stats = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'timbrado')::int AS timbrados,
      COUNT(*) FILTER (WHERE status = 'cancelado')::int AS cancelados,
      COALESCE(SUM(total) FILTER (WHERE status = 'timbrado'), 0) AS total_timbrado
    FROM cfdi_documents
    WHERE tenant_id = ${session.tenantId}
      AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW())
      AND EXTRACT(YEAR  FROM created_at) = EXTRACT(YEAR  FROM NOW())
  `.catch(() => [{}]);

  return NextResponse.json({ docs, stats: stats[0] ?? {} });
}

// POST — emitir CFDI de ingreso individual
export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json() as {
    receptorRfc: string;
    receptorNombre: string;
    usoCfdi?: string;
    regimenFiscalReceptor?: string;
    codigoPostalReceptor?: string;
    items: CFDIItem[];
    driverId?: string;
    notas?: string;
  };

  const { receptorRfc, receptorNombre, items, driverId, notas } = body;
  if (!receptorRfc || !receptorNombre || !items?.length) {
    return NextResponse.json({ error: 'receptorRfc, receptorNombre e items son requeridos' }, { status: 400 });
  }

  // Obtener config CFDI del tenant
  const cfgRows = await sql`
    SELECT rfc, razon_social AS "razonSocial", codigo_postal AS "codigoPostal",
           regimen_fiscal AS "regimenFiscal", pac_user AS "pacUser",
           pac_password_enc AS "pacPasswordEnc", pac_sandbox AS "pacSandbox",
           serie_ingreso AS "serieIngreso", serie_global AS "serieGlobal"
    FROM cfdi_config
    WHERE tenant_id = ${session.tenantId}
    LIMIT 1
  `.catch(() => []);

  if (!cfgRows.length) {
    return NextResponse.json({ error: 'Configura RFC y Facturama antes de emitir CFDIs' }, { status: 422 });
  }

  const cfg = cfgRows[0];

  // Número de folio: contar documentos + 1
  const folioRows = await sql`
    SELECT COUNT(*) AS cnt FROM cfdi_documents
    WHERE tenant_id = ${session.tenantId} AND tipo = 'ingreso'
  `.catch(() => [{ cnt: '0' }]);
  const folio = parseInt(String(folioRows[0]?.cnt ?? '0'), 10) + 1;

  const result = await emitirCFDIIngreso(
    cfg as unknown as CFDIConfig,
    {
      rfc: receptorRfc.toUpperCase().trim(),
      nombre: receptorNombre.trim(),
      usoCfdi: body.usoCfdi ?? 'G03',
      regimenFiscal: body.regimenFiscalReceptor ?? '605',
      codigoPostal: body.codigoPostalReceptor ?? '99999',
    },
    items,
    folio,
  );

  // Calcular totales
  const subtotal = items.reduce((s, it) => s + (it.cantidad ?? 1) * it.monto, 0);
  const iva = parseFloat((subtotal * 0.16).toFixed(2));
  const total = parseFloat((subtotal + iva).toFixed(2));

  const status = result.error ? 'error' : 'timbrado';

  const [inserted] = await sql`
    INSERT INTO cfdi_documents (
      tenant_id, facturama_id, uuid_sat, serie, folio, tipo,
      receptor_rfc, receptor_nombre, receptor_uso_cfdi,
      subtotal, iva, total, driver_id, notas, status, error_message
    ) VALUES (
      ${session.tenantId},
      ${result.id || null},
      ${result.uuid || null},
      ${result.serie || cfg.serieIngreso},
      ${result.folio || String(folio)},
      'ingreso',
      ${receptorRfc.toUpperCase().trim()},
      ${receptorNombre.trim()},
      ${body.usoCfdi ?? 'G03'},
      ${subtotal}, ${iva}, ${total},
      ${driverId || null},
      ${notas || null},
      ${status},
      ${result.error || null}
    )
    RETURNING id
  `;

  // Guardar conceptos
  for (const item of items) {
    const importe = parseFloat(((item.cantidad ?? 1) * item.monto).toFixed(2));
    await sql`
      INSERT INTO cfdi_items (cfdi_id, clave_prod_serv, cantidad, clave_unidad, descripcion, valor_unitario, importe)
      VALUES (${inserted.id}, ${item.claveProdServ ?? '78131600'}, ${item.cantidad ?? 1}, ${item.claveUnidad ?? 'E48'}, ${item.descripcion}, ${item.monto}, ${importe})
    `.catch(() => null);
  }

  if (result.error) {
    return NextResponse.json({ error: result.error, id: inserted.id }, { status: 422 });
  }

  return NextResponse.json({ ok: true, id: inserted.id, uuid: result.uuid, folio: result.folio });
}
