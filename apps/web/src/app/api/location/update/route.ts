import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getSessionUser } from '@/lib/session'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { latitude, longitude, vehicle_id, speed } = await request.json()

  await sql`
    INSERT INTO vehicle_locations (tenant_id, vehicle_id, driver_id, latitude, longitude, speed, recorded_at)
    VALUES (${user.tenantId}, ${vehicle_id || null}, ${user.id}, ${latitude}, ${longitude}, ${speed || 0}, NOW())
    ON CONFLICT DO NOTHING
  `

  return NextResponse.json({ success: true })
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const locations = await sql`
    SELECT DISTINCT ON (vehicle_id)
      vl.*, v.eco, v.brand, v.model, v.plates,
      CONCAT(d.first_name, ' ', d.last_name) as driver_name
    FROM vehicle_locations vl
    LEFT JOIN vehicles v ON vl.vehicle_id = v.id
    LEFT JOIN drivers d ON vl.driver_id = d.id
    WHERE vl.tenant_id = ${user.tenantId}
    AND vl.recorded_at > NOW() - INTERVAL '2 hours'
    ORDER BY vehicle_id, recorded_at DESC
  `
  return NextResponse.json({ data: locations })
}
