// API CFDI — Gestiona tu Flotilla
// Maneja emisión, recepción y cancelación de CFDIs por tenant

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { sql } from '@/lib/db';

// ─── Crea tabla si no existe ──────────────────────────────────────────────────
async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS cfdi_records (
      id                   UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
      tenant_id            UUID         NOT NULL,
      type                 VARCHAR(20)  NOT NULL DEFAULT 'emitida',
      rfc_emisor           VARCHAR(20),
      rfc_receptor         VARCHAR(20),
      razon_social_emisor  TEXT,
      razon_social_receptor TEXT,
      folio_fiscal         VARCHAR(100),
      serie                VARCHAR(10),
      folio                VARCHAR(20),
      fecha                TIMESTAMP,
      subtotal             NUMERIC(14,2),
      descuento            NUMERIC(14,2) DEFAULT 0,
      iva                  NUMERIC(14,2),
      total                NUMERIC(14,2),
      moneda               VARCHAR(5)    DEFAULT 'MXN',
      uso_cfdi             VARCHAR(10),
      metodo_pago          VARCHAR(5),
      forma_pago           VARCHAR(5),
      concepto             TEXT,
      status               VARCHAR(20)   DEFAULT 'vigente',
      xml_url              TEXT,
      created_at           TIMESTAMP     DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS cfdi_records_tenant_fecha_idx
      ON cfdi_records (tenant_id, fecha DESC)
  `;
}

// ─── GET /api/cfdi ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    await ensureTable();

    const { searchParams } = new URL(req.url);
    const type   = searchParams.get('type')  ?? 'all';
    const month  = parseInt(searchParams.get('month') ?? '0', 10);
    const year   = parseInt(searchParams.get('year')  ?? String(new Date().getFullYear()), 10);
    const page   = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
    const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const offset = (page - 1) * limit;

    const tenantId = user.tenantId;

    // ── Filtro por tipo ──────────────────────────────────────────────────────
    const typeFilter =
      type === 'emitidas'  ? sql`AND c.type = 'emitida'`  :
      type === 'recibidas' ? sql`AND c.type = 'recibida'` :
      sql``;

    // ── Filtro por mes/año ───────────────────────────────────────────────────
    const monthFilter = (month > 0 && month <= 12)
      ? sql`AND EXTRACT(MONTH FROM c.fecha) = ${month}`
      : sql``;
    const yearFilter = year > 2000
      ? sql`AND EXTRACT(YEAR FROM c.fecha) = ${year}`
      : sql``;

    // ── Total registros ──────────────────────────────────────────────────────
    const countRows = await sql`
      SELECT COUNT(*) AS count
      FROM cfdi_records c
      WHERE c.tenant_id = ${tenantId}::uuid
        ${typeFilter}
        ${monthFilter}
        ${yearFilter}
    `;
    const total = parseInt(String((countRows[0] as Record<string,unknown>)?.count ?? '0'), 10);

    // ── Registros paginados ──────────────────────────────────────────────────
    const listRows = await sql`
      SELECT *
      FROM cfdi_records c
      WHERE c.tenant_id = ${tenantId}::uuid
        ${typeFilter}
        ${monthFilter}
        ${yearFilter}
      ORDER BY fecha DESC NULLS LAST, created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // ── Totales financieros ──────────────────────────────────────────────────
    const totalesRows = await sql`
      SELECT type,
             COALESCE(SUM(total), 0) AS suma,
             COALESCE(SUM(iva),   0) AS suma_iva
      FROM cfdi_records c
      WHERE c.tenant_id = ${tenantId}::uuid
        AND c.status = 'vigente'
        ${monthFilter}
        ${yearFilter}
      GROUP BY type
    `;

    let total_emitidas  = 0;
    let total_recibidas = 0;
    let iva_emitidas    = 0;
    let iva_recibidas   = 0;

    for (const row of totalesRows as Array<Record<string, string>>) {
      if (row.type === 'emitida') {
        total_emitidas = parseFloat(row.suma  ?? '0');
        iva_emitidas   = parseFloat(row.suma_iva ?? '0');
      } else if (row.type === 'recibida') {
        total_recibidas = parseFloat(row.suma  ?? '0');
        iva_recibidas   = parseFloat(row.suma_iva ?? '0');
      }
    }

    return NextResponse.json({
      data: listRows,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      totales: {
        total_emitidas,
        total_recibidas,
        saldo:      total_emitidas - total_recibidas,
        iva_emitidas,
        iva_recibidas,
        iva_neto:   iva_emitidas - iva_recibidas,
      },
    });
  } catch (err) {
    console.error('[GET /api/cfdi]', err);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

// ─── POST /api/cfdi ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    await ensureTable();

    const body = await req.json();
    const {
      type = 'emitida',
      rfc_emisor,
      rfc_receptor,
      razon_social_emisor,
      razon_social_receptor,
      folio_fiscal,
      serie,
      folio,
      fecha,
      subtotal,
      descuento = 0,
      iva,
      total,
      moneda = 'MXN',
      uso_cfdi,
      metodo_pago,
      forma_pago,
      concepto,
      status = 'vigente',
      xml_url,
    } = body;

    if (!['emitida', 'recibida'].includes(type)) {
      return NextResponse.json({ message: 'Tipo inválido. Usa emitida o recibida.' }, { status: 400 });
    }
    if (!total || isNaN(Number(total))) {
      return NextResponse.json({ message: 'El total es requerido y debe ser numérico.' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO cfdi_records (
        tenant_id, type,
        rfc_emisor, rfc_receptor,
        razon_social_emisor, razon_social_receptor,
        folio_fiscal, serie, folio,
        fecha, subtotal, descuento, iva, total,
        moneda, uso_cfdi, metodo_pago, forma_pago,
        concepto, status, xml_url
      ) VALUES (
        ${user.tenantId}::uuid, ${type},
        ${rfc_emisor ?? null}, ${rfc_receptor ?? null},
        ${razon_social_emisor ?? null}, ${razon_social_receptor ?? null},
        ${folio_fiscal ?? null}, ${serie ?? null}, ${folio ?? null},
        ${fecha ? new Date(fecha) : null},
        ${subtotal != null ? Number(subtotal) : null},
        ${Number(descuento)},
        ${iva != null ? Number(iva) : null},
        ${Number(total)},
        ${moneda}, ${uso_cfdi ?? null}, ${metodo_pago ?? null}, ${forma_pago ?? null},
        ${concepto ?? null}, ${status}, ${xml_url ?? null}
      )
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    console.error('[POST /api/cfdi]', err);
    return NextResponse.json({ message: 'Error al crear CFDI' }, { status: 500 });
  }
}

// ─── PATCH /api/cfdi?id=xxx ───────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'Se requiere el parámetro id' }, { status: 400 });

    const body = await req.json();
    const { status, xml_url } = body;

    if (status && !['vigente', 'cancelado'].includes(status)) {
      return NextResponse.json({ message: 'Status inválido. Usa vigente o cancelado.' }, { status: 400 });
    }

    // Actualiza solo los campos presentes
    let result;
    if (status !== undefined && xml_url !== undefined) {
      result = await sql`
        UPDATE cfdi_records
        SET status = ${status}, xml_url = ${xml_url}
        WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}::uuid
        RETURNING *
      `;
    } else if (status !== undefined) {
      result = await sql`
        UPDATE cfdi_records
        SET status = ${status}
        WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}::uuid
        RETURNING *
      `;
    } else if (xml_url !== undefined) {
      result = await sql`
        UPDATE cfdi_records
        SET xml_url = ${xml_url}
        WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}::uuid
        RETURNING *
      `;
    } else {
      return NextResponse.json({ message: 'No hay campos para actualizar' }, { status: 400 });
    }

    if (!result || result.length === 0) {
      return NextResponse.json({ message: 'CFDI no encontrado o sin permiso' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (err) {
    console.error('[PATCH /api/cfdi]', err);
    return NextResponse.json({ message: 'Error al actualizar CFDI' }, { status: 500 });
  }
}
