import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import sql from '@/lib/db'

// Umbrales de mantenimiento del Excel (en km)
const THRESHOLDS = [
  { key: 'afinacion_menor',  label: 'Afinación Menor',    interval: 8_000  },
  { key: 'revision_taller',  label: 'Revisión en Taller', interval: 16_000 },
  { key: 'afinacion_mayor',  label: 'Afinación Mayor',    interval: 20_000 },
  { key: 'banda_tiempo',     label: 'Banda de Tiempo',    interval: 70_000 },
  { key: 'amortiguadores',   label: 'Amortiguadores',     interval: 90_000 },
]

function urgency(kmRemaining: number): 'overdue' | 'danger' | 'warning' | 'ok' {
  if (kmRemaining <= 0)    return 'overdue'
  if (kmRemaining <= 500)  return 'danger'
  if (kmRemaining <= 2000) return 'warning'
  return 'ok'
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user?.tenantId) return NextResponse.json([], { status: 200 })

  // Asegurar columna purchase_price / jp_participation si aún no existen
  await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS purchase_price   NUMERIC(12,2) DEFAULT 0`.catch(() => {})
  await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS jp_participation NUMERIC(5,2)  DEFAULT 100`.catch(() => {})

  const vehicles = await sql`
    SELECT
      v.id, v.eco, v.plates, v.brand, v.model, v.year,
      COALESCE(v.km_actual, 0)         AS km_actual,
      COALESCE(v.purchase_price, 0)    AS purchase_price,
      COALESCE(v.jp_participation, 100) AS jp_participation,
      d.first_name || ' ' || d.last_name AS driver
    FROM vehicles v
    LEFT JOIN drivers d ON d.vehicle_id = v.id AND d.status = 'active'
    WHERE v.tenant_id = ${user.tenantId}
    ORDER BY v.eco
  `.catch(() => [])

  const result = vehicles.map((v: any) => {
    const km = Number(v.km_actual) || 0
    const alerts = THRESHOLDS.map(t => {
      const nextKm      = Math.ceil((km + 1) / t.interval) * t.interval
      const kmRemaining = nextKm - km
      return {
        key:          t.key,
        label:        t.label,
        interval:     t.interval,
        nextKm,
        kmRemaining,
        urgency:      urgency(kmRemaining),
      }
    }).sort((a, b) => a.kmRemaining - b.kmRemaining)

    const mostUrgent = alerts[0]

    return {
      vehicleId:       String(v.id),
      vehicleEco:      v.eco,
      vehiclePlates:   v.plates,
      vehicleBrand:    v.brand,
      vehicleModel:    v.model,
      vehicleYear:     v.year,
      driver:          v.driver || 'Sin chofer',
      kmActual:        km,
      purchasePrice:   Number(v.purchase_price),
      jpParticipation: Number(v.jp_participation),
      alerts,
      mostUrgent: mostUrgent?.urgency !== 'ok' ? mostUrgent : null,
    }
  })

  return NextResponse.json(result)
}
