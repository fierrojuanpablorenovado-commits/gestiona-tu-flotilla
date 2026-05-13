import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getSessionUser } from '@/lib/session'

const sql = neon(process.env.DATABASE_URL!)

// GET /api/accounting/flotilla?year=2026
// Retorna P&L por vehículo calculado desde weekly_accounts
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const tid  = user.tenantId
  const year = Number(new URL(req.url).searchParams.get('year') || new Date().getFullYear())

  // Columnas opcionales — crear si no existen
  await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS purchase_price   NUMERIC(12,2) DEFAULT 0`.catch(() => {})
  await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS jp_participation NUMERIC(5,2)  DEFAULT 100`.catch(() => {})
  await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS dias_trabajados      INTEGER DEFAULT 7`.catch(() => {})
  await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS efectivo_a_entregar  NUMERIC(10,2) DEFAULT 0`.catch(() => {})
  await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS didi_balance         NUMERIC(10,2) DEFAULT 0`.catch(() => {})
  await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS didi_tax             NUMERIC(10,2) DEFAULT 0`.catch(() => {})
  await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS didi_bonuses         NUMERIC(10,2) DEFAULT 0`.catch(() => {})
  await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS adicional            NUMERIC(10,2) DEFAULT 0`.catch(() => {})
  await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS monto_kms            NUMERIC(10,2) DEFAULT 0`.catch(() => {})
  await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS viajes_pagados       INTEGER       DEFAULT 0`.catch(() => {})

  const rows = await sql`
    SELECT
      v.id::text                             AS vehicle_id,
      v.eco,
      v.brand,
      v.model,
      v.year                                 AS vehicle_year,
      v.plates,
      COALESCE(v.km_actual, 0)               AS km_actual,
      COALESCE(v.purchase_price,   0)        AS purchase_price,
      COALESCE(v.jp_participation, 100)      AS jp_participation,
      COALESCE(v.weekly_rent,      0)        AS weekly_rent,
      d.first_name || ' ' || d.last_name     AS driver,

      -- Aggregates desde weekly_accounts del año seleccionado
      COUNT(wa.id)                           AS semanas_registradas,
      COALESCE(SUM(wa.didi_income),        0)::numeric AS total_didi_income,
      COALESCE(SUM(wa.didi_balance),       0)::numeric AS total_deposito_banco,
      COALESCE(SUM(wa.didi_tax),           0)::numeric AS total_impuestos_didi,
      COALESCE(SUM(wa.didi_bonuses),       0)::numeric AS total_bonos,
      COALESCE(SUM(wa.efectivo_a_entregar),0)::numeric AS total_efectivo_recibido,
      COALESCE(SUM(wa.rent),               0)::numeric AS total_renta_base,
      COALESCE(SUM(wa.dias_trabajados),    0)          AS total_dias,
      COALESCE(SUM(wa.adicional),          0)::numeric AS total_adicional,
      COALESCE(SUM(wa.monto_kms),          0)::numeric AS total_kms_adicionales,
      COALESCE(SUM(wa.viajes_pagados),     0)          AS total_viajes

    FROM vehicles v
    LEFT JOIN drivers d ON d.vehicle_id = v.id AND d.status = 'active'
    LEFT JOIN weekly_accounts wa
      ON  wa.vehicle_id  = v.id
      AND wa.tenant_id   = v.tenant_id
      AND EXTRACT(YEAR FROM wa.week_start) = ${year}
    WHERE v.tenant_id = ${tid}
    GROUP BY v.id, v.eco, v.brand, v.model, v.year, v.plates,
             v.km_actual, v.purchase_price, v.jp_participation, v.weekly_rent,
             d.first_name, d.last_name
    ORDER BY v.eco
  `.catch(() => [])

  // Calcular métricas derivadas
  const data = rows.map((r: any) => {
    const totalDidiIncome    = Number(r.total_didi_income)
    const totalDepositoBanco = Number(r.total_deposito_banco)
    const totalImpuestos     = Number(r.total_impuestos_didi)
    const totalBonos         = Number(r.total_bonos)
    const totalEfectivo      = Number(r.total_efectivo_recibido)
    const jpParticipacion    = Number(r.jp_participation)
    const purchasePrice      = Number(r.purchase_price)
    const semanas            = Number(r.semanas_registradas)

    // JP recibe: efectivo en mano + depósito banco (ya en su cuenta)
    const totalRecibeJP = totalEfectivo + totalDepositoBanco

    // Utilidad simplificada (sin gastos de mantenimiento/seguro por ahora)
    // = lo que JP recibió - impuestos Didi ya cobrados por Didi
    const utilidadSimple = totalRecibeJP

    // ROI anual
    const roi = purchasePrice > 0 ? (utilidadSimple / purchasePrice) * 100 : 0

    return {
      vehicleId:        r.vehicle_id,
      eco:              r.eco,
      brand:            r.brand,
      model:            r.model,
      year:             r.vehicle_year,
      plates:           r.plates,
      kmActual:         Number(r.km_actual),
      purchasePrice,
      jpParticipacion,
      weeklyRent:       Number(r.weekly_rent),
      driver:           r.driver || 'Sin chofer',
      semanas,
      totalDidiIncome,
      totalDepositoBanco,
      totalImpuestos,
      totalBonos,
      totalEfectivo,
      totalRecibeJP,
      utilidadSimple,
      roi: Number(roi.toFixed(1)),
      totalAdicional:       Number(r.total_adicional ?? 0),
      totalKmsAdicionales:  Number(r.total_kms_adicionales ?? 0),
      totalViajes:          Number(r.total_viajes ?? 0),
    }
  })

  // Totales globales
  const totals = {
    semanas:            data.reduce((s: number, r: any) => s + r.semanas, 0),
    totalDidiIncome:    data.reduce((s: number, r: any) => s + r.totalDidiIncome, 0),
    totalDepositoBanco: data.reduce((s: number, r: any) => s + r.totalDepositoBanco, 0),
    totalEfectivo:      data.reduce((s: number, r: any) => s + r.totalEfectivo, 0),
    totalRecibeJP:      data.reduce((s: number, r: any) => s + r.totalRecibeJP, 0),
    totalInversion:       data.reduce((s: number, r: any) => s + r.purchasePrice, 0),
    totalAdicional:       data.reduce((s: number, r: any) => s + r.totalAdicional, 0),
    totalKmsAdicionales:  data.reduce((s: number, r: any) => s + r.totalKmsAdicionales, 0),
    totalViajes:          data.reduce((s: number, r: any) => s + r.totalViajes, 0),
  }

  return NextResponse.json({ year, data, totals })
}
