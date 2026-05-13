import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS incidents (
      id          SERIAL PRIMARY KEY,
      tenant_id   INTEGER NOT NULL,
      vehicle_id  INTEGER,
      driver_id   INTEGER,
      eco         TEXT,
      chofer      TEXT,
      tipo        TEXT NOT NULL DEFAULT 'Siniestro',
      descripcion TEXT,
      fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
      costo       NUMERIC(12,2) DEFAULT 0,
      status      TEXT NOT NULL DEFAULT 'Abierta',
      prioridad   TEXT NOT NULL DEFAULT 'Media',
      created_by  INTEGER,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    await ensureTable();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || '';
    const tipo   = searchParams.get('tipo')   || '';
    const search = searchParams.get('search') || '';

    const rows = await sql`
      SELECT
        i.id,
        i.eco,
        i.chofer,
        i.tipo,
        i.descripcion,
        i.fecha,
        i.costo::float,
        i.status,
        i.prioridad,
        i.created_at AS "createdAt",
        v.eco AS "vehiculoEco",
        d.first_name || ' ' || d.last_name AS "choferNombre"
      FROM incidents i
      LEFT JOIN vehicles v ON v.id = i.vehicle_id
      LEFT JOIN drivers  d ON d.id = i.driver_id
      WHERE i.tenant_id = ${session.tenantId}
        ${status ? sql`AND i.status = ${status}` : sql``}
        ${tipo   ? sql`AND i.tipo   = ${tipo}`   : sql``}
        ${search ? sql`AND (i.eco ILIKE ${'%'+search+'%'} OR i.chofer ILIKE ${'%'+search+'%'} OR i.descripcion ILIKE ${'%'+search+'%'})` : sql``}
      ORDER BY i.fecha DESC, i.created_at DESC
    `;

    const summary = {
      total:        rows.length,
      abiertas:     rows.filter(r => r.status === 'Abierta').length,
      enProceso:    rows.filter(r => r.status === 'En investigación' || r.status === 'En investigacion').length,
      resueltas:    rows.filter(r => r.status === 'Resuelta').length,
      costoTotal:   rows.reduce((s, r) => s + (r.costo ?? 0), 0),
    };

    return NextResponse.json({ data: rows, summary });
  } catch (err) {
    console.error('[incidents GET]', err);
    return NextResponse.json({ message: 'Error al obtener incidencias' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    await ensureTable();

    const body = await req.json();
    const { eco, chofer, vehicleId, driverId, tipo, descripcion, fecha, costo, status, prioridad } = body;

    if (!tipo || !fecha)
      return NextResponse.json({ message: 'tipo y fecha son requeridos' }, { status: 400 });

    const result = await sql`
      INSERT INTO incidents
        (tenant_id, vehicle_id, driver_id, eco, chofer, tipo, descripcion, fecha, costo, status, prioridad, created_by)
      VALUES
        (${session.tenantId}, ${vehicleId || null}, ${driverId || null},
         ${eco || null}, ${chofer || null}, ${tipo}, ${descripcion || null},
         ${fecha}, ${costo || 0}, ${status || 'Abierta'}, ${prioridad || 'Media'}, ${session.id})
      RETURNING *
    `;
    return NextResponse.json({ data: result[0] }, { status: 201 });
  } catch (err) {
    console.error('[incidents POST]', err);
    return NextResponse.json({ message: 'Error al crear incidencia' }, { status: 500 });
  }
}
