import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const tipo      = searchParams.get('tipo')      || '';
    const categoria = searchParams.get('categoria') || '';
    const desde     = searchParams.get('desde')     || '';
    const hasta     = searchParams.get('hasta')     || '';
    const page      = Math.max(1, parseInt(searchParams.get('page')  || '1'));
    const limit     = Math.min(50, parseInt(searchParams.get('limit') || '20'));
    const offset    = (page - 1) * limit;

    const rows = await sql`
      SELECT
        t.id, t.tipo, t.categoria, t.descripcion,
        t.monto::float, t.fecha, t.reference, t.status,
        t.created_at AS "createdAt",
        d.first_name || ' ' || d.last_name AS driver,
        v.eco AS vehicle
      FROM treasury_transactions t
      LEFT JOIN drivers  d ON d.id = t.driver_id
      LEFT JOIN vehicles v ON v.id = t.vehicle_id
      WHERE t.tenant_id = ${session.tenantId}
        ${tipo      ? sql`AND t.tipo      = ${tipo}`       : sql``}
        ${categoria ? sql`AND t.categoria = ${categoria}`  : sql``}
        ${desde     ? sql`AND t.fecha >= ${desde}::date`   : sql``}
        ${hasta     ? sql`AND t.fecha <= ${hasta}::date`   : sql``}
      ORDER BY t.fecha DESC, t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [totals] = await sql`
      SELECT
        COALESCE(SUM(monto) FILTER (WHERE tipo = 'ingreso' AND status = 'completed'),0)::float AS "totalIngresos",
        COALESCE(SUM(monto) FILTER (WHERE tipo = 'egreso'  AND status = 'completed'),0)::float AS "totalEgresos",
        COALESCE(SUM(monto) FILTER (WHERE tipo = 'ingreso' AND status = 'pending'),  0)::float AS "pendientesCobro",
        COUNT(*)::int AS total
      FROM treasury_transactions
      WHERE tenant_id = ${session.tenantId}
    `;

    return NextResponse.json({
      data: rows,
      summary: {
        ...totals,
        balance: totals.totalIngresos - totals.totalEgresos,
        page, limit,
        pages: Math.ceil((totals.total || 0) / limit),
      },
    });
  } catch (err) {
    console.error('[treasury GET]', err);
    return NextResponse.json({ message: 'Error al obtener tesorería' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const { tipo, categoria, descripcion, monto, fecha, reference, driverId, vehicleId } = body;

    if (!tipo || !categoria || !monto || !fecha)
      return NextResponse.json({ message: 'tipo, categoría, monto y fecha son requeridos' }, { status: 400 });
    if (Number(monto) <= 0)
      return NextResponse.json({ message: 'El monto debe ser mayor a cero' }, { status: 400 });

    const result = await sql`
      INSERT INTO treasury_transactions
        (tenant_id, tipo, categoria, descripcion, monto, fecha, reference, driver_id, vehicle_id, created_by)
      VALUES
        (${session.tenantId}, ${tipo}, ${categoria}, ${descripcion||null},
         ${monto}, ${fecha}, ${reference||null}, ${driverId||null}, ${vehicleId||null}, ${session.id})
      RETURNING *
    `;
    return NextResponse.json({ data: result[0] }, { status: 201 });
  } catch (err) {
    console.error('[treasury POST]', err);
    return NextResponse.json({ message: 'Error al registrar transacción' }, { status: 500 });
  }
}
