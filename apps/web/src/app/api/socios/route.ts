import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    const rows = await sql`
      SELECT id, name, email, phone,
        vehicles_count AS "vehiclesCount",
        investment, monthly_income AS "monthlyIncome",
        roi, status, notes, created_at AS "createdAt"
      FROM partners
      WHERE tenant_id = ${session.tenantId}
      ORDER BY name
    `;

    const summary = {
      total:           rows.length,
      activos:         rows.filter(r => r.status === 'active').length,
      totalInvestment: rows.reduce((s, r) => s + Number(r.investment   || 0), 0),
      totalMonthly:    rows.reduce((s, r) => s + Number(r.monthlyIncome || 0), 0),
    };

    return NextResponse.json({ data: rows, summary });
  } catch (err) {
    console.error('[socios GET]', err);
    return NextResponse.json({ message: 'Error al obtener socios' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const { name, email, phone, vehiclesCount, investment, monthlyIncome, roi, notes } = body;
    if (!name) return NextResponse.json({ message: 'Nombre es requerido' }, { status: 400 });

    const result = await sql`
      INSERT INTO partners (tenant_id, name, email, phone, vehicles_count, investment, monthly_income, roi, notes)
      VALUES (${session.tenantId}, ${name}, ${email||null}, ${phone||null},
              ${vehiclesCount||0}, ${investment||0}, ${monthlyIncome||0}, ${roi||null}, ${notes||null})
      RETURNING *
    `;
    return NextResponse.json({ data: result[0] }, { status: 201 });
  } catch (err) {
    console.error('[socios POST]', err);
    return NextResponse.json({ message: 'Error al crear socio' }, { status: 500 });
  }
}
