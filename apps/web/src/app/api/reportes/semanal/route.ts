import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const tenantId = Number(session.tenantId);

    // Asegurar que la tabla existe antes de consultar
    await sql`
      CREATE TABLE IF NOT EXISTS weekly_reports (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        week_start DATE NOT NULL,
        total_income DECIMAL(12,2) DEFAULT 0,
        total_expenses DECIMAL(12,2) DEFAULT 0,
        pending_payments INTEGER DEFAULT 0,
        maintenance_alerts INTEGER DEFAULT 0,
        insurance_alerts INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    const rows = await sql`
      SELECT
        id,
        tenant_id,
        week_start,
        total_income::float,
        total_expenses::float,
        pending_payments,
        maintenance_alerts,
        insurance_alerts,
        created_at
      FROM weekly_reports
      WHERE tenant_id = ${tenantId}
      ORDER BY week_start DESC
      LIMIT 52
    `;

    return NextResponse.json(rows);
  } catch (err) {
    console.error('[reportes/semanal GET]', err);
    return NextResponse.json([], { status: 200 });
  }
}
