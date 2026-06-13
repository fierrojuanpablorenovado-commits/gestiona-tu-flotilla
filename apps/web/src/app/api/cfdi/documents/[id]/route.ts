import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { cancelarCFDI, type CFDIConfig } from '@/lib/facturama';

export const dynamic = 'force-dynamic';

// GET — detalle del CFDI + items
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionUser(req);
  if (!session?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const [doc] = await sql`
    SELECT d.id, d.facturama_id AS "facturamaId", d.uuid_sat AS "uuidSat",
           d.serie, d.folio, d.tipo, d.mes, d.anio, d.period_label AS "periodLabel",
           d.receptor_rfc AS "receptorRfc", d.receptor_nombre AS "receptorNombre",
           d.subtotal, d.iva, d.total, d.status, d.error_message AS "errorMessage",
           d.notas, d.created_at AS "createdAt"
    FROM cfdi_documents d
    WHERE d.id = ${params.id} AND d.tenant_id = ${session.tenantId}
    LIMIT 1
  `.catch(() => []);

  if (!doc) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const items = await sql`
    SELECT id, clave_prod_serv AS "claveProdServ", cantidad, clave_unidad AS "claveUnidad",
           descripcion, valor_unitario AS "valorUnitario", importe, tasa_iva AS "tasaIva"
    FROM cfdi_items WHERE cfdi_id = ${params.id}
  `.catch(() => []);

  return NextResponse.json({ doc, items });
}

// DELETE — cancelar CFDI
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionUser(req);
  if (!session?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { motivo?: '01' | '02' | '03' | '04' };
  const motivo = body.motivo ?? '02';

  const [doc] = await sql`
    SELECT facturama_id AS "facturamaId", status
    FROM cfdi_documents
    WHERE id = ${params.id} AND tenant_id = ${session.tenantId}
    LIMIT 1
  `.catch(() => []);

  if (!doc) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  if (doc.status === 'cancelado') {
    return NextResponse.json({ error: 'Ya está cancelado' }, { status: 400 });
  }
  if (!doc.facturamaId) {
    // Sin facturama_id — solo marcar cancelado localmente
    await sql`UPDATE cfdi_documents SET status = 'cancelado', updated_at = NOW() WHERE id = ${params.id}`;
    return NextResponse.json({ ok: true });
  }

  // Obtener config del tenant
  const [cfg] = await sql`
    SELECT rfc, razon_social AS "razonSocial", codigo_postal AS "codigoPostal",
           regimen_fiscal AS "regimenFiscal", pac_user AS "pacUser",
           pac_password_enc AS "pacPasswordEnc", pac_sandbox AS "pacSandbox",
           serie_ingreso AS "serieIngreso", serie_global AS "serieGlobal"
    FROM cfdi_config WHERE tenant_id = ${session.tenantId} LIMIT 1
  `.catch(() => []);

  if (!cfg) return NextResponse.json({ error: 'Sin configuración CFDI' }, { status: 422 });

  const result = await cancelarCFDI(cfg as unknown as CFDIConfig, doc.facturamaId, motivo);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  await sql`
    UPDATE cfdi_documents SET status = 'cancelado', updated_at = NOW()
    WHERE id = ${params.id}
  `;

  return NextResponse.json({ ok: true });
}
