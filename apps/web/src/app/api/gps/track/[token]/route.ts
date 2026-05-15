import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyShareToken } from '@/lib/gps-share-token';

// Public endpoint — no session auth, uses signed share token
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } },
) {
  const verified = verifyShareToken(params.token);
  if (!verified) {
    return NextResponse.json({ error: 'Enlace inválido o expirado' }, { status: 401 });
  }

  const { tenantId, vehicleId } = verified;

  try {
    const vehicles = await sql`
      SELECT v.id, v.eco, v.plates, v.brand, v.model,
        CONCAT(d.first_name, ' ', d.last_name) AS driver_name
      FROM vehicles v
      LEFT JOIN drivers d ON d.vehicle_id = v.id AND d.status = 'active'
      WHERE v.id = ${vehicleId}
        AND v.tenant_id = ${tenantId}::uuid
    `;

    if (!vehicles.length) return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });

    const lastLoc = await sql`
      SELECT lat, lng, speed, status, recorded_at
      FROM vehicle_locations
      WHERE tenant_id = ${tenantId}::uuid
        AND vehicle_id = ${vehicleId}
        AND lat != 0 AND lng != 0
      ORDER BY recorded_at DESC LIMIT 1
    `;

    const v = vehicles[0];

    return NextResponse.json({
      vehicle: {
        id: vehicleId,
        eco: v.eco,
        plates: v.plates,
        brand: v.brand,
        model: v.model,
        driver: v.driver_name,
      },
      location: lastLoc.length ? {
        lat: Number(lastLoc[0].lat),
        lng: Number(lastLoc[0].lng),
        speed: Number(lastLoc[0].speed),
        status: lastLoc[0].status,
        recorded_at: lastLoc[0].recorded_at,
      } : null,
    });
  } catch (err) {
    console.error('[GPS track public]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
