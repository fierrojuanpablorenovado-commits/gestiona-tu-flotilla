import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { emitirCFDIGlobal, type CFDIConfig } from '@/lib/facturama';

export const dynamic = 'force-dynamic';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// GET — preview del monto para el mes (rentas cobradas)
export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mes  = parseInt(searchParams.get('mes')  ?? String(new Date().getMonth() + 1), 10);
  const anio = parseInt(searchParams.get('anio') ?? String(new Date().getFullYear()),  10);

  // Sumar rentas cobradas (status paid) del mes indicado
  const [totals] = await sql`
    SELECT
      COALESCE(SUM(rent), 0)::numeric          AS total_rentas,
      COUNT(*) FILTER (WHERE status = 'paid')  AS cuentas_pagadas,
      COUNT(*)                                 AS cuentas_total
    FROM weekly_accounts
    WHERE tenant_id = ${session.tenantId}
      AND EXTRACT(MONTH FROM week_start) = ${mes}
      AND EXTRACT(YEAR  FROM week_start) = ${anio}
  `.catch(() => [{ total_rentas: 0, cuentas_pagadas: 0, cuentas_total: 0 }]);

  // Verificar si ya existe CFDI global para ese mes
  const [existing] = await sql`
    SELECT id, status, uuid_sat AS "uuidSat", folio, created_at AS "createdAt"
    FROM cfdi_documents
    WHERE tenant_id = ${session.tenantId}
      AND tipo = 'global'
      AND mes  = ${mes}
      AND anio = ${anio}
    ORDER BY created_at DESC
    LIMIT 1
  `.catch(() => []);

  return NextResponse.json({
    mes,
    anio,
    mesLabel: MESES[mes - 1],
    totalRentas: Number(totals.total_rentas ?? 0),
    cuentasPagadas: Number(totals.cuentas_pagadas ?? 0),
    cuentasTotal: Number(totals.cuentas_total ?? 0),
    existing: existing ?? null,
  });
}

// POST — emitir CFDI global mensual
export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json() as {
    mes: number;
    anio: number;
    montoManual?: number;
    descripcion?: string;
  };

  const { mes, anio } = body;
  if (!mes || !anio) {
    return NextResponse.json({ error: 'mes y anio son requeridos' }, { status: 400 });
  }

  // Obtener config
  const [cfg] = await sql`
    SELECT rfc, razon_social AS "razonSocial", codigo_postal AS "codigoPostal",
           regimen_fiscal AS "regimenFiscal", pac_user AS "pacUser",
           pac_password_enc AS "pacPasswordEnc", pac_sandbox AS "pacSandbox",
           serie_ingreso AS "serieIngreso", serie_global AS "serieGlobal"
    FROM cfdi_config WHERE tenant_id = ${session.tenantId} LIMIT 1
  `.catch(() => []);

  if (!cfg) {
    return NextResponse.json({ error: 'Configura RFC y Facturama antes de emitir CFDIs' }, { status: 422 });
  }

  // Calcular monto: manual o desde cuentas semanales
  let montoBase = body.montoManual ?? 0;
  if (!montoBase) {
    const [totals] = await sql`
      SELECT COALESCE(SUM(rent), 0)::numeric AS total_rentas
      FROM weekly_accounts
      WHERE tenant_id = ${session.tenantId}
        AND EXTRACT(MONTH FROM week_start) = ${mes}
        AND EXTRACT(YEAR  FROM week_start) = ${anio}
        AND status = 'paid'
    `.catch(() => [{ total_rentas: 0 }]);
    montoBase = Number(totals?.total_rentas ?? 0);
  }

  if (montoBase <= 0) {
    return NextResponse.json({ error: 'No hay rentas cobradas para este mes. Ingresa el monto manualmente.' }, { status: 400 });
  }

  const mesLabel = MESES[mes - 1];
  const descripcion = body.descripcion ?? `Servicio de arrendamiento de vehículos — ${mesLabel} ${anio}`;

  // Folio: contar globales anteriores + 1
  const [folioRow] = await sql`
    SELECT COUNT(*) AS cnt FROM cfdi_documents
    WHERE tenant_id = ${session.tenantId} AND tipo = 'global'
  `.catch(() => [{ cnt: '0' }]);
  const folio = parseInt(String(folioRow?.cnt ?? '0'), 10) + 1;

  const result = await emitirCFDIGlobal(
    cfg as unknown as CFDIConfig,
    mes,
    anio,
    [{ descripcion, monto: montoBase }],
    folio,
  );

  const subtotal = montoBase;
  const iva = parseFloat((subtotal * 0.16).toFixed(2));
  const total = parseFloat((subtotal + iva).toFixed(2));

  const status = result.error ? 'error' : 'timbrado';

  const [inserted] = await sql`
    INSERT INTO cfdi_documents (
      tenant_id, facturama_id, uuid_sat, serie, folio, tipo,
      periodicidad, mes, anio, period_label,
      receptor_rfc, receptor_nombre, receptor_uso_cfdi,
      subtotal, iva, total,
      status, error_message
    ) VALUES (
      ${session.tenantId},
      ${result.id || null},
      ${result.uuid || null},
      ${result.serie || cfg.serieGlobal},
      ${result.folio || String(folio)},
      'global',
      'mensual', ${mes}, ${anio}, ${`${mesLabel} ${anio}`},
      'XAXX010101000', 'PÚBLICO EN GENERAL', 'S01',
      ${subtotal}, ${iva}, ${total},
      ${status},
      ${result.error || null}
    )
    RETURNING id
  `;

  // Guardar concepto
  await sql`
    INSERT INTO cfdi_items (cfdi_id, descripcion, cantidad, valor_unitario, importe)
    VALUES (${inserted.id}, ${descripcion}, 1, ${montoBase}, ${subtotal})
  `.catch(() => null);

  if (result.error) {
    return NextResponse.json({ error: result.error, id: inserted.id }, { status: 422 });
  }

  return NextResponse.json({
    ok: true,
    id: inserted.id,
    uuid: result.uuid,
    folio: result.folio,
    total,
    mesLabel,
  });
}
