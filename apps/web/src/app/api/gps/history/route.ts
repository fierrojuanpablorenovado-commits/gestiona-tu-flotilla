import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const vehicleId = req.nextUrl.searchParams.get('vehicleId');
    const hours = Math.min(Number(req.nextUrl.searchParams.get('hours') ?? '8'), 24);

    if (!vehicleId) return NextResponse.json({ error: 'vehicleId requerido' }, { status: 400 });

    const rows = await sql`
      SELECT lat, lng, speed, course, status, recorded_at
      FROM vehicle_locations
      WHERE tenant_id = ${session.tenantId}::uuid
        AND vehicle_id = ${vehicleId}
        AND recorded_at >= NOW() - INTERVAL '1 hour' * ${hours}
        AND lat != 0 AND lng != 0
      ORDER BY recorded_at ASC
    `;

    return NextResponse.json({ points: rows, count: rows.length });
  } catch (err) {
    console.error('[GPS history]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
