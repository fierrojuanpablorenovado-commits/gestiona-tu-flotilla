import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { makeShareToken } from '@/lib/gps-share-token';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { vehicleId, hours = 4 } = body as { vehicleId?: string; hours?: number };
    if (!vehicleId) return NextResponse.json({ error: 'vehicleId requerido' }, { status: 400 });

    const token = makeShareToken(session.tenantId, vehicleId, Math.min(hours, 24));
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gestionatuflotilla.com';
    const url = `${baseUrl}/track/${token}`;

    return NextResponse.json({ token, url, expiresInHours: hours });
  } catch (err) {
    console.error('[GPS share]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
