import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getSessionUser } from '@/lib/session'
import sql from '@/lib/db'

// ─── POST /api/import/didi-fleet ─────────────────────────────────────────────
// Parsea el reporte FleetSummary de Didi Fleet y lo cruza con los choferes en BD
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })

  // Preferir hoja FleetSummary si existe, sino la primera
  const sheetName = workbook.SheetNames.find(n =>
    n.toLowerCase().includes('fleet') || n.toLowerCase().includes('didi')
  ) ?? workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]

  // Leer como array de arrays para detectar la fila de encabezado dinámicamente
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })

  // Detectar la fila de encabezados buscando "Nombre del conductor"
  let headerIdx = -1
  for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
    if (rawRows[i]?.some((c: any) => String(c ?? '').includes('Nombre del conductor'))) {
      headerIdx = i
      break
    }
  }

  // Extraer fecha de exportación de las primeras filas (row 1 del reporte Didi)
  let weekLabel = ''
  for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
    const row = rawRows[i]
    for (const cell of row ?? []) {
      const s = String(cell ?? '')
      if (s.match(/del\s+\d/i) || s.match(/\d{4}-\d{2}-\d{2}-\d{4}/)) {
        weekLabel = s
        break
      }
    }
    if (weekLabel) break
  }

  if (headerIdx === -1) {
    return NextResponse.json({ error: 'Formato no reconocido. Asegúrate de subir el reporte FleetSummary de Didi Fleet.' }, { status: 422 })
  }

  const headers: string[] = rawRows[headerIdx].map((h: any) => String(h ?? '').trim())
  const dataRows = rawRows.slice(headerIdx + 1)

  // Mapeo de columnas del reporte Didi Fleet
  const col = (keyword: string) => headers.findIndex(h => h.toLowerCase().includes(keyword.toLowerCase()))

  const colMap = {
    name:        col('Nombre del conductor'),
    phone:       col('teléfono'),
    city:        col('Ciudad'),
    tripsPaid:   col('Viajes pagados'),
    tripsOnline: col('Online Trips'),
    tripsCash:   col('Cash Trips'),
    incomeTotal: col('Ganancias totales del conductor'),
    incomeCash:  col('Ganancias en efectivo del conductor'),
    balance:     col('Saldo de ganancias del conductor'),
    incomeCard:  col('Ganancias de viajes pagados con tarjeta'),
    incomeCashV: col('Ganancias de viajes pagados en efectivo'),
    tax:         col('Impuesto'),
    bonuses:     col('Recompensas'),
    deduction:   col('Deducción'),
  }

  // Asegurar columna whatsapp_group (safe migration)
  await sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS whatsapp_group TEXT`.catch(() => {})

  // Solo choferes con status = 'active' — la misma regla que aparece en la pestaña Choferes
  const dbDrivers: any[] = await sql`
    SELECT d.id, d.first_name, d.last_name, d.phone, d.whatsapp_group,
           v.id          AS vehicle_id,
           v.eco         AS vehicle_eco,
           COALESCE(v.weekly_rent, 0) AS rent_amount,
           LOWER(d.first_name || ' ' || d.last_name) AS full_name
    FROM drivers d
    LEFT JOIN vehicles v ON v.id = d.vehicle_id AND v.tenant_id = ${user.tenantId}
    WHERE d.tenant_id = ${user.tenantId}
      AND d.status    = 'active'
  `

  const val = (row: any[], idx: number): number =>
    idx >= 0 ? (Number(row[idx]) || 0) : 0

  const processed = []

  for (const row of dataRows) {
    const name = String(row[colMap.name] ?? '').trim()
    if (!name) continue
    // Saltar fila de totales y la del propietario (Juan Pablo Fierro)
    if (name === 'Total') continue

    const incomeTotal = val(row, colMap.incomeTotal)
    const incomeCash  = val(row, colMap.incomeCash)
    const balance     = val(row, colMap.balance)   // lo que deposita Didi a la cuenta
    const tax         = Math.abs(val(row, colMap.tax))
    const bonuses     = val(row, colMap.bonuses)
    const deduction   = val(row, colMap.deduction)
    const trips       = val(row, colMap.tripsPaid)
    const tripsOnline = val(row, colMap.tripsOnline)
    const tripsCash   = val(row, colMap.tripsCash)

    // ── Matching: teléfono → nombre exacto → nombre+apellido ─────────────────
    // El teléfono es el identificador más confiable (evita duplicados de nombre).
    const rawPhone  = String(row[colMap.phone] ?? '').trim()
    const normPhone = rawPhone.replace(/\D/g, '').replace(/^521?/, '').slice(-10)

    const nameLower = name.toLowerCase()
    const parts     = nameLower.split(' ').filter(Boolean)

    // Nivel 1: teléfono exacto (últimos 10 dígitos)
    let matched = normPhone.length >= 8
      ? dbDrivers.find((d: any) => {
          const dbPhone = String(d.phone ?? '').replace(/\D/g, '').replace(/^521?/, '').slice(-10)
          return dbPhone.length >= 8 && dbPhone === normPhone
        })
      : undefined

    // Nivel 2: nombre completo exacto
    if (!matched) {
      matched = dbDrivers.find((d: any) => d.full_name === nameLower)
    }

    // Nivel 3: nombre + primer apellido coinciden en la BD
    // Ej. Excel "Jorge Avalos" → BD "Jorge Avalos Aceves" → match
    // Requiere al menos 2 palabras y que AMBAS aparezcan en el nombre de BD
    if (!matched && parts.length >= 2) {
      // Tomar solo palabras con más de 2 chars para ignorar preposiciones ("de","la")
      const sigParts = parts.filter(p => p.length > 2)
      if (sigParts.length >= 2) {
        matched = dbDrivers.find((d: any) =>
          sigParts.every(p => d.full_name.includes(p))
        )
      }
    }
    // Sin nivel 4: no se hace match por nombre o apellido suelto para evitar duplicados

    processed.push({
      driverName:    name,
      driverId:      matched?.id ?? null,
      vehicleId:     matched?.vehicle_id ?? null,
      vehicleEco:    matched?.vehicle_eco ?? null,
      phone:         matched?.phone ?? null,
      whatsappGroup: matched?.whatsapp_group ?? null,
      // Renta desde vehicles.weekly_rent (fuente de verdad)
      lastRent:      matched?.rent_amount ?? 0,
      matched:       !!matched,
      hasActivity:   incomeTotal > 0 || trips > 0,
      // Datos Didi
      didiIncome:   incomeTotal,
      didiCash:     incomeCash,
      didiBalance:  balance,      // deposita Didi → cuenta del chofer
      tax,
      bonuses,
      deduction,
      trips,
      tripsOnline,
      tripsCash,
    })
  }

  // ── Agregar choferes activos en BD que NO aparecieron en el Excel ──────────
  // (tienen 0 viajes y 0 ingresos Didi, pero sí deben pagar renta)
  const matchedDriverIds = new Set(processed.filter(p => p.driverId).map(p => p.driverId))
  for (const d of dbDrivers) {
    if (!matchedDriverIds.has(d.id)) {
      processed.push({
        driverName:    `${d.first_name} ${d.last_name ?? ''}`.trim(),
        driverId:      d.id,
        vehicleId:     d.vehicle_id ?? null,
        vehicleEco:    d.vehicle_eco ?? null,
        phone:         d.phone ?? null,
        whatsappGroup: d.whatsapp_group ?? null,
        lastRent:      Number(d.rent_amount) ?? 0,
        matched:       true,
        hasActivity:   false,   // sin actividad Didi esta semana
        didiIncome:    0,
        didiCash:      0,
        didiBalance:   0,
        tax:           0,
        bonuses:       0,
        deduction:     0,
        trips:         0,
        tripsOnline:   0,
        tripsCash:     0,
      })
    }
  }

  return NextResponse.json({
    weekLabel,
    sheetUsed: sheetName,
    total:     processed.length,
    active:    processed.filter(p => p.hasActivity).length,
    matched:   processed.filter(p => p.matched).length,
    unmatched: processed.filter(p => !p.matched).length,
    data:      processed,
  })
}

// ─── PUT /api/import/didi-fleet ─────────────────────────────────────────────
// Guarda los datos importados en weekly_accounts (todos los campos Didi)
export async function PUT(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { rows, weekStart, weekEnd } = await request.json()
  if (!rows?.length || !weekStart || !weekEnd) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  // Asegurar que existen las columnas extendidas (safe ALTER TABLE)
  await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS viajes_pagados    INTEGER DEFAULT 0`.catch(() => {})
  await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS viajes_online     INTEGER DEFAULT 0`.catch(() => {})
  await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS viajes_efectivo   INTEGER DEFAULT 0`.catch(() => {})
  await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS didi_income_cash  NUMERIC(10,2) DEFAULT 0`.catch(() => {})
  await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS didi_income_card  NUMERIC(10,2) DEFAULT 0`.catch(() => {})
  await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS adicional         NUMERIC(10,2) DEFAULT 0`.catch(() => {})
  await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS monto_kms         NUMERIC(10,2) DEFAULT 0`.catch(() => {})
  await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS contabilidad      NUMERIC(10,2) DEFAULT 0`.catch(() => {})
  await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS nota              TEXT`.catch(() => {})
  await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS didi_balance     NUMERIC(10,2) DEFAULT 0`.catch(() => {})
  await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS didi_bonuses     NUMERIC(10,2) DEFAULT 0`.catch(() => {})
  await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS didi_tax         NUMERIC(10,2) DEFAULT 0`.catch(() => {})
  await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS didi_deduction   NUMERIC(10,2) DEFAULT 0`.catch(() => {})
  await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS notified_driver      BOOLEAN DEFAULT FALSE`.catch(() => {})
  await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS dias_trabajados       INTEGER DEFAULT 7`.catch(() => {})
  await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS saldo_pendiente       NUMERIC(10,2) DEFAULT 0`.catch(() => {})
  await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS efectivo_a_entregar  NUMERIC(10,2) DEFAULT 0`.catch(() => {})

  let saved = 0
  let skipped = 0

  for (const row of rows) {
    if (!row.driverId) { skipped++; continue }

    const dias      = Math.max(0, Math.min(7, Number(row.diasTrabajados) ?? 7))
    const saldo     = Number(row.saldoPendiente) || 0
    const rentaBase = Number(row.rent) || 0
    const efectivo  = ((rentaBase / 7) * dias)
      + (Number(row.contabilidad) || 75)
      - (Number(row.didiBalance) || 0)
      + saldo
      + (Number(row.adicional) || 0)
      + (Number(row.montoKms) || 0)

    const existing = await sql`
      SELECT id FROM weekly_accounts
      WHERE tenant_id = ${user.tenantId}
        AND driver_id  = ${row.driverId}
        AND week_start = ${weekStart}
    `

    if (existing.length > 0) {
      await sql`
        UPDATE weekly_accounts SET
          didi_income           = ${row.didiIncome},
          rent                  = ${rentaBase},
          viajes_pagados        = ${row.trips ?? 0},
          viajes_online         = ${row.tripsOnline ?? 0},
          viajes_efectivo       = ${row.tripsCash ?? 0},
          didi_income_cash      = ${row.didiCash ?? 0},
          didi_income_card      = ${row.incomeCard ?? 0},
          didi_balance          = ${row.didiBalance ?? 0},
          didi_bonuses          = ${row.bonuses ?? 0},
          didi_tax              = ${row.tax ?? 0},
          didi_deduction        = ${row.deduction ?? 0},
          contabilidad          = ${Number(row.contabilidad) || 75},
          adicional             = ${Number(row.adicional) || 0},
          monto_kms             = ${Number(row.montoKms) || 0},
          nota                  = ${row.nota || ''},
          dias_trabajados       = ${dias},
          saldo_pendiente       = ${saldo},
          efectivo_a_entregar   = ${efectivo},
          status                = 'pending',
          notified_driver       = FALSE,
          updated_at            = NOW()
        WHERE id = ${existing[0].id}
      `
    } else {
      await sql`
        INSERT INTO weekly_accounts
          (tenant_id, driver_id, vehicle_id, week_start, week_end,
           didi_income, rent, status,
           viajes_pagados, viajes_online, viajes_efectivo,
           didi_income_cash, didi_income_card,
           didi_balance, didi_bonuses, didi_tax, didi_deduction,
           contabilidad, adicional, monto_kms, nota,
           dias_trabajados, saldo_pendiente, efectivo_a_entregar,
           notified_driver)
        VALUES
          (${user.tenantId}, ${row.driverId}, ${row.vehicleId ?? null},
           ${weekStart}, ${weekEnd},
           ${row.didiIncome}, ${rentaBase}, 'pending',
           ${row.trips ?? 0}, ${row.tripsOnline ?? 0}, ${row.tripsCash ?? 0},
           ${row.didiCash ?? 0}, ${row.incomeCard ?? 0},
           ${row.didiBalance ?? 0},
           ${row.bonuses ?? 0}, ${row.tax ?? 0}, ${row.deduction ?? 0},
           ${Number(row.contabilidad) || 75}, ${Number(row.adicional) || 0},
           ${Number(row.montoKms) || 0}, ${row.nota || ''},
           ${dias}, ${saldo}, ${efectivo},
           FALSE)
      `
    }
    saved++
  }

  return NextResponse.json({ saved, skipped, total: rows.length })
}
