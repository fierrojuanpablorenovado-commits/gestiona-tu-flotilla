import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import sql from '@/lib/db'

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Vehículos CON póliza
  const insurance = await sql`
    SELECT i.*, v.eco, v.brand, v.model, v.plates
    FROM vehicle_insurance i
    LEFT JOIN vehicles v ON i.vehicle_id = v.id
    WHERE i.tenant_id = ${user.tenantId}
    ORDER BY i.expiry_date ASC
  `

  // Vehículos SIN ninguna póliza registrada → alerta crítica
  const uninsured = await sql`
    SELECT v.id::text, v.eco, v.brand, v.model, v.plates
    FROM vehicles v
    WHERE v.tenant_id = ${user.tenantId}
      AND v.status NOT IN ('inactive', 'sold')
      AND NOT EXISTS (
        SELECT 1 FROM vehicle_insurance i
        WHERE i.vehicle_id = v.id AND i.tenant_id = v.tenant_id
      )
    ORDER BY v.eco
  `.catch(() => [])

  return NextResponse.json({ data: insurance, uninsured })
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { vehicle_id, insurer, policy_number, start_date, expiry_date, coverage_type, annual_premium, insured_amount, notes } = body

  const [ins] = await sql`
    INSERT INTO vehicle_insurance (
      tenant_id, vehicle_id, insurer, policy_number,
      start_date, expiry_date, coverage_type, annual_premium, insured_amount, notes
    ) VALUES (
      ${user.tenantId}, ${vehicle_id}, ${insurer}, ${policy_number},
      ${start_date}, ${expiry_date}, ${coverage_type}, ${annual_premium}, ${insured_amount}, ${notes || null}
    ) RETURNING *
  `
  return NextResponse.json({ data: ins }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  await sql`DELETE FROM vehicle_insurance WHERE id = ${id} AND tenant_id = ${user.tenantId}`
  return NextResponse.json({ success: true })
}
