import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

// Genera número de orden siguiente
async function nextOrden(tenantId: string): Promise<string> {
  const [row] = await sql`
    SELECT COUNT(*)::int AS cnt FROM maintenance_orders WHERE tenant_id = ${tenantId}::uuid
  `;
  const num = (row.cnt + 1).toString().padStart(4, '0');
  return `MNT-${num}`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || '';
    const tipo   = searchParams.get('tipo')   || '';

    const rows = await sql`
      SELECT
        mo.id::text,
        mo.orden,
        mo.tipo,
        mo.descripcion,
        mo.taller,
        mo.fecha_ingreso            AS "fechaIngreso",
        mo.fecha_salida             AS "fechaSalida",
        mo.costo_estimado::float    AS "costoEstimado",
        mo.costo_real::float        AS "costoReal",
        mo.status,
        mo.notas,
        mo.created_at               AS "createdAt",
        v.eco,
        v.brand                     AS "marca",
        v.model                     AS "modelo",
        v.year                      AS "anio",
        v.plates,
        COALESCE(d.first_name || ' ' || d.last_name, '—') AS "chofer"
      FROM maintenance_orders mo
      LEFT JOIN vehicles v ON v.id = mo.vehicle_id
      LEFT JOIN drivers  d ON d.vehicle_id = mo.vehicle_id AND d.tenant_id = mo.tenant_id
      WHERE mo.tenant_id = ${session.tenantId}::uuid
        ${status ? sql`AND mo.status = ${status}` : sql``}
        ${tipo   ? sql`AND mo.tipo   = ${tipo}`   : sql``}
      ORDER BY mo.fecha_ingreso DESC, mo.created_at DESC
    `;

    const data = rows.map((r: any) => ({
      id:            r.id,
      orden:         r.orden || r.id.slice(0, 8).toUpperCase(),
      vehiculo:      r.eco   || '—',
      modelo:        [r.marca, r.modelo, r.anio].filter(Boolean).join(' ') || '—',
      plates:        r.plates || '—',
      chofer:        r.chofer,
      tipo:          r.tipo   || 'Preventivo',
      descripcion:   r.descripcion || '',
      taller:        r.taller || '',
      fechaIngreso:  r.fechaIngreso,
      fechaSalida:   r.fechaSalida ?? null,
      costoEstimado: Number(r.costoEstimado ?? 0),
      costoReal:     r.costoReal != null ? Number(r.costoReal) : null,
      status:        r.status || 'Programado',
      notas:         r.notas || '',
    }));

    const summary = {
      total:      data.length,
      programado: data.filter((r: any) => r.status === 'Programado').length,
      enProceso:  data.filter((r: any) => !['Programado','Completado'].includes(r.status)).length,
      completado: data.filter((r: any) => r.status === 'Completado').length,
      costoTotal: data.reduce((s: number, r: any) => s + (r.costoReal ?? r.costoEstimado ?? 0), 0),
    };

    return NextResponse.json({ data, summary });
  } catch (err) {
    console.error('[maintenance GET]', err);
    return NextResponse.json({ message: 'Error al obtener mantenimientos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const { eco, vehicleId, tipo, descripcion, taller, fechaIngreso, costoEstimado, status, notas } = body;

    if (!tipo || !fechaIngreso)
      return NextResponse.json({ message: 'tipo y fechaIngreso son requeridos' }, { status: 400 });

    // Resolver vehicle_id por eco si no viene directo
    let vid = vehicleId || null;
    if (!vid && eco) {
      const [v] = await sql`SELECT id::text FROM vehicles WHERE eco = ${eco} AND tenant_id = ${session.tenantId}::uuid LIMIT 1`;
      vid = v?.id || null;
    }

    const orden = await nextOrden(session.tenantId);

    const [result] = await sql`
      INSERT INTO maintenance_orders
        (tenant_id, vehicle_id, orden, tipo, descripcion, taller, fecha_ingreso, costo_estimado, status, notas, created_by)
      VALUES
        (${session.tenantId}::uuid,
         ${vid ? sql`${vid}::uuid` : sql`NULL`},
         ${orden}, ${tipo}, ${descripcion || null}, ${taller || null},
         ${fechaIngreso}, ${costoEstimado || 0},
         ${status || 'En diagnostico'}, ${notas || null},
         ${session.id}::uuid)
      RETURNING id::text, orden
    `;
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    console.error('[maintenance POST]', err);
    return NextResponse.json({ message: 'Error al crear orden de mantenimiento' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const { id, status, costoReal, notas, fechaSalida } = body;

    if (!id) return NextResponse.json({ message: 'id requerido' }, { status: 400 });

    await sql`
      UPDATE maintenance_orders
      SET
        status      = COALESCE(${status || null}, status),
        costo_real  = COALESCE(${costoReal ?? null}, costo_real),
        notas       = COALESCE(${notas   || null}, notas),
        fecha_salida = COALESCE(${fechaSalida || null}::date, fecha_salida),
        updated_at  = NOW()
      WHERE id = ${id}::uuid AND tenant_id = ${session.tenantId}::uuid
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[maintenance PATCH]', err);
    return NextResponse.json({ message: 'Error al actualizar orden' }, { status: 500 });
  }
}
