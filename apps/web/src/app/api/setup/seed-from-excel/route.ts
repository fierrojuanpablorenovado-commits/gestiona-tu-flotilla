import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import sql from '@/lib/db'

// ── Datos del Excel: FLOTILLA JUPAFI CONSULTORES ADMON.xlsm (mayo 2026) ───────

const INSURANCE_DATA = [
  { plates: 'JSK7523', insurer: 'Maps', policy_number: '20240231',    start_date: '2025-02-06', expiry_date: '2026-02-06' },
  { plates: 'HWT882A', insurer: 'SPT',  policy_number: '14532502851', start_date: '2025-03-21', expiry_date: '2026-03-21' },
  { plates: 'JPD3500', insurer: 'SPT',  policy_number: '14532502820', start_date: '2025-03-21', expiry_date: '2026-03-21' },
  { plates: 'HZG882A', insurer: 'SPT',  policy_number: '14532502831', start_date: '2025-03-13', expiry_date: '2026-03-13' },
  { plates: 'JBF316A', insurer: 'Maps', policy_number: '20250424',    start_date: '2025-04-07', expiry_date: '2026-04-07' },
  { plates: 'JRY1332', insurer: 'Maps', policy_number: '20228277',    start_date: '2024-09-02', expiry_date: '2025-09-02' }, // VENCIDA
]

const VEHICLE_META_DATA = [
  { plates: 'JSK7523', purchase_price: 128000, jp_participation: 100, km_actual: 106292 },
  { plates: 'HWT882A', purchase_price: 131500, jp_participation: 100, km_actual:  93604 },
  { plates: 'HUA738A', purchase_price: 105000, jp_participation: 100, km_actual: 181029 },
  { plates: 'JPD3500', purchase_price: 142000, jp_participation: 100, km_actual: 106156 },
  { plates: 'HZG882A', purchase_price: 155000, jp_participation: 100, km_actual:  93604 },
  { plates: 'HTC246A', purchase_price: 162000, jp_participation: 100, km_actual: 134000 },
  { plates: 'JRY1332', purchase_price: 135000, jp_participation: 100, km_actual: 118241 },
  { plates: 'KZT930A', purchase_price: 225000, jp_participation: 100, km_actual:       0 },
  { plates: 'HTC054B', purchase_price:      0, jp_participation: 100, km_actual:       0 },
  { plates: 'HTB566B', purchase_price:      0, jp_participation: 100, km_actual:       0 },
  { plates: 'JBF316A', purchase_price: 140000, jp_participation: 100, km_actual: 145736 },
]

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user || !['admin_general', 'super_admin'].includes(user.role ?? '')) {
    return NextResponse.json({ error: 'No autorizado — solo admin' }, { status: 401 })
  }

  const tid = user.tenantId
  const results: Record<string, string[]> = { vehicles: [], insurance: [] }

  // 1. Agregar columnas nuevas a vehicles (safe)
  await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS purchase_price   NUMERIC(12,2) DEFAULT 0`.catch(() => {})
  await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS jp_participation NUMERIC(5,2)  DEFAULT 100`.catch(() => {})

  // 2. Actualizar metadata de vehículos
  for (const v of VEHICLE_META_DATA) {
    const normalPlates = v.plates.toUpperCase().replace(/\s/g, '')
    const rows = await sql`
      SELECT id, km_actual FROM vehicles
      WHERE tenant_id = ${tid}
        AND UPPER(REPLACE(plates, ' ', '')) = ${normalPlates}
      LIMIT 1
    `.catch(() => [])
    if (!rows.length) { results.vehicles.push(`⚠️ ${normalPlates}: no encontrado`); continue }
    const vid = rows[0].id
    const currentKm = Number(rows[0].km_actual ?? 0)
    await sql`
      UPDATE vehicles SET
        purchase_price   = ${v.purchase_price},
        jp_participation = ${v.jp_participation},
        km_actual        = ${Math.max(currentKm, v.km_actual)}
      WHERE id = ${vid}
    `.catch(() => {})
    results.vehicles.push(`✅ ${normalPlates}: precio $${v.purchase_price.toLocaleString()}, ${v.jp_participation}% JP, km ${Math.max(currentKm, v.km_actual).toLocaleString()}`)
  }

  // 3. Insertar seguros — primero borrar los de ese tenant para evitar duplicados
  await sql`DELETE FROM vehicle_insurance WHERE tenant_id = ${tid}`.catch(() => {})

  for (const ins of INSURANCE_DATA) {
    const normalPlates = ins.plates.toUpperCase().replace(/\s/g, '')
    const vRows = await sql`
      SELECT id FROM vehicles
      WHERE tenant_id = ${tid}
        AND UPPER(REPLACE(plates, ' ', '')) = ${normalPlates}
      LIMIT 1
    `.catch(() => [])
    if (!vRows.length) { results.insurance.push(`⚠️ ${normalPlates}: vehículo no encontrado`); continue }

    const vid = vRows[0].id
    await sql`
      INSERT INTO vehicle_insurance
        (tenant_id, vehicle_id, insurer, policy_number, start_date, expiry_date, coverage_type, annual_premium, insured_amount)
      VALUES
        (${tid}, ${vid}, ${ins.insurer}, ${ins.policy_number},
         ${ins.start_date}, ${ins.expiry_date}, 'amplia', 0, 0)
    `.catch(() => {})

    const expired = new Date(ins.expiry_date) < new Date()
    const daysLeft = Math.ceil((new Date(ins.expiry_date).getTime() - Date.now()) / 86400000)
    results.insurance.push(
      `${expired ? '⚠️ VENCIDA' : '✅'} ${normalPlates} — ${ins.insurer} ${ins.policy_number} → vence ${ins.expiry_date}${expired ? ` (hace ${Math.abs(daysLeft)}d)` : ` (en ${daysLeft}d)`}`
    )
  }

  return NextResponse.json({ ok: true, ...results })
}
