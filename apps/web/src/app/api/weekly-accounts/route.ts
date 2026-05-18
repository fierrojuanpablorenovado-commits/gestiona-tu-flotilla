import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

// ── GET — Listar cuentas semanales por semana ─────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session?.tenantId) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const week      = searchParams.get('week');      // YYYY-MM-DD (lunes exacto)
  const since     = searchParams.get('since');     // YYYY-MM-DD (desde esta fecha)
  const vehicleId = searchParams.get('vehicleId'); // UUID — historial de un vehículo
  const limitParam = parseInt(searchParams.get('limit') ?? '24', 10);

  try {
    let rows;

    // ── Fragmento SQL compartido para todos los casos ──
    const selectFields = (extraWhere: string) => sql.unsafe(`
      SELECT
        wa.id,
        wa.week_start                                AS "weekStart",
        wa.week_end                                  AS "weekEnd",
        -- Renta
        wa.rent,
        COALESCE(wa.contabilidad, 0)                AS "contabilidad",
        COALESCE(wa.dias_trabajados, 7)             AS "diasTrabajados",
        -- Ingresos Didi
        COALESCE(wa.didi_income,       0)           AS "didiIncome",
        COALESCE(wa.didi_income_cash,  0)           AS "didiIncomeCash",
        COALESCE(wa.didi_income_card,  0)           AS "didiIncomeCard",
        COALESCE(wa.didi_balance,      0)           AS "didiBalance",
        COALESCE(wa.didi_bonuses,      0)           AS "didiBonus",
        COALESCE(wa.didi_tax,          0)           AS "didiTax",
        -- Viajes
        COALESCE(wa.viajes_pagados,    0)           AS "viajesPagados",
        COALESCE(wa.viajes_online,     0)           AS "viajesOnline",
        COALESCE(wa.viajes_efectivo,   0)           AS "viajesEfectivo",
        -- Cargos extra
        COALESCE(wa.monto_kms,         0)           AS "montoKms",
        COALESCE(wa.adicional,         0)           AS "adicional",
        -- Resumen de cobro
        COALESCE(wa.saldo_pendiente,   0)           AS "saldoPendiente",
        COALESCE(wa.efectivo_a_entregar, 0)         AS "efectivoAEntregar",
        -- Plataformas extra (Uber / InDriver)
        COALESCE(wa.uber_income,        0)          AS "uberIncome",
        COALESCE(wa.indriver_income,    0)          AS "indriverIncome",
        -- Estado y nota
        wa.status,
        COALESCE(wa.nota, wa.notes, '')             AS "nota",
        -- Vehículo y chofer
        v.eco,
        v.plates,
        COALESCE(d.first_name || ' ' || d.last_name, 'Sin asignar') AS "driverName",
        COALESCE(d.phone, '') AS "driverPhone"
      FROM weekly_accounts wa
      JOIN vehicles v ON v.id = wa.vehicle_id
      LEFT JOIN drivers d ON d.id = wa.driver_id
      WHERE wa.tenant_id = '${session.tenantId}' ${extraWhere}
    `);

    if (vehicleId) {
      // Historial de un vehículo específico (para el perfil del chofer)
      rows = await sql`
        SELECT
          wa.id,
          wa.week_start                              AS "weekStart",
          wa.week_end                                AS "weekEnd",
          wa.rent,
          COALESCE(wa.contabilidad,        0)        AS "contabilidad",
          COALESCE(wa.dias_trabajados,     7)        AS "diasTrabajados",
          COALESCE(wa.didi_income,         0)        AS "didiIncome",
          COALESCE(wa.didi_income_cash,    0)        AS "didiIncomeCash",
          COALESCE(wa.didi_income_card,    0)        AS "didiIncomeCard",
          COALESCE(wa.didi_balance,        0)        AS "didiBalance",
          COALESCE(wa.didi_bonuses,        0)        AS "didiBonus",
          COALESCE(wa.didi_tax,            0)        AS "didiTax",
          COALESCE(wa.viajes_pagados,      0)        AS "viajesPagados",
          COALESCE(wa.viajes_online,       0)        AS "viajesOnline",
          COALESCE(wa.viajes_efectivo,     0)        AS "viajesEfectivo",
          COALESCE(wa.monto_kms,           0)        AS "montoKms",
          COALESCE(wa.adicional,           0)        AS "adicional",
          COALESCE(wa.saldo_pendiente,     0)        AS "saldoPendiente",
          COALESCE(wa.efectivo_a_entregar, 0)        AS "efectivoAEntregar",
          COALESCE(wa.uber_income,         0)        AS "uberIncome",
          COALESCE(wa.indriver_income,     0)        AS "indriverIncome",
          wa.status,
          COALESCE(wa.nota, wa.notes, '')            AS "nota",
          v.eco, v.plates, v.brand, v.model, v.year,
          v.wa_group_link                            AS "waGroupLink",
          COALESCE(d.first_name || ' ' || d.last_name, 'Sin asignar') AS "driverName",
          COALESCE(d.phone, '') AS "driverPhone"
        FROM weekly_accounts wa
        JOIN vehicles v ON v.id = wa.vehicle_id
        LEFT JOIN drivers d ON d.id = wa.driver_id
        WHERE wa.tenant_id  = ${session.tenantId}
          AND wa.vehicle_id = ${vehicleId}::uuid
        ORDER BY wa.week_start DESC
        LIMIT ${limitParam}
      `;
    } else if (week) {
      rows = await sql`
        SELECT
          wa.id,
          wa.week_start                              AS "weekStart",
          wa.week_end                                AS "weekEnd",
          wa.rent,
          COALESCE(wa.contabilidad,        0)        AS "contabilidad",
          COALESCE(wa.dias_trabajados,     7)        AS "diasTrabajados",
          COALESCE(wa.didi_income,         0)        AS "didiIncome",
          COALESCE(wa.didi_income_cash,    0)        AS "didiIncomeCash",
          COALESCE(wa.didi_income_card,    0)        AS "didiIncomeCard",
          COALESCE(wa.didi_balance,        0)        AS "didiBalance",
          COALESCE(wa.didi_bonuses,        0)        AS "didiBonus",
          COALESCE(wa.didi_tax,            0)        AS "didiTax",
          COALESCE(wa.viajes_pagados,      0)        AS "viajesPagados",
          COALESCE(wa.viajes_online,       0)        AS "viajesOnline",
          COALESCE(wa.viajes_efectivo,     0)        AS "viajesEfectivo",
          COALESCE(wa.monto_kms,           0)        AS "montoKms",
          COALESCE(wa.adicional,           0)        AS "adicional",
          COALESCE(wa.saldo_pendiente,     0)        AS "saldoPendiente",
          COALESCE(wa.efectivo_a_entregar, 0)        AS "efectivoAEntregar",
          COALESCE(wa.uber_income,         0)        AS "uberIncome",
          COALESCE(wa.indriver_income,     0)        AS "indriverIncome",
          wa.status,
          COALESCE(wa.nota, wa.notes, '')            AS "nota",
          v.eco, v.plates, v.brand, v.model, v.year,
          v.wa_group_link                            AS "waGroupLink",
          COALESCE(d.first_name || ' ' || d.last_name, 'Sin asignar') AS "driverName",
          COALESCE(d.phone, '') AS "driverPhone"
        FROM weekly_accounts wa
        JOIN vehicles v ON v.id = wa.vehicle_id
        LEFT JOIN drivers d ON d.id = wa.driver_id
        WHERE wa.tenant_id  = ${session.tenantId}
          AND wa.week_start = ${week}
        ORDER BY
          CASE wa.status WHEN 'pending' THEN 1 WHEN 'partial' THEN 2 ELSE 3 END,
          "driverName"
      `;
    } else if (since) {
      rows = await sql`
        SELECT
          wa.id,
          wa.week_start                              AS "weekStart",
          wa.week_end                                AS "weekEnd",
          wa.rent,
          COALESCE(wa.contabilidad,        0)        AS "contabilidad",
          COALESCE(wa.dias_trabajados,     7)        AS "diasTrabajados",
          COALESCE(wa.didi_income,         0)        AS "didiIncome",
          COALESCE(wa.didi_income_cash,    0)        AS "didiIncomeCash",
          COALESCE(wa.didi_income_card,    0)        AS "didiIncomeCard",
          COALESCE(wa.didi_balance,        0)        AS "didiBalance",
          COALESCE(wa.didi_bonuses,        0)        AS "didiBonus",
          COALESCE(wa.didi_tax,            0)        AS "didiTax",
          COALESCE(wa.viajes_pagados,      0)        AS "viajesPagados",
          COALESCE(wa.viajes_online,       0)        AS "viajesOnline",
          COALESCE(wa.viajes_efectivo,     0)        AS "viajesEfectivo",
          COALESCE(wa.monto_kms,           0)        AS "montoKms",
          COALESCE(wa.adicional,           0)        AS "adicional",
          COALESCE(wa.saldo_pendiente,     0)        AS "saldoPendiente",
          COALESCE(wa.efectivo_a_entregar, 0)        AS "efectivoAEntregar",
          COALESCE(wa.uber_income,         0)        AS "uberIncome",
          COALESCE(wa.indriver_income,     0)        AS "indriverIncome",
          wa.status,
          COALESCE(wa.nota, wa.notes, '')            AS "nota",
          v.eco, v.plates, v.brand, v.model, v.year,
          v.wa_group_link                            AS "waGroupLink",
          COALESCE(d.first_name || ' ' || d.last_name, 'Sin asignar') AS "driverName",
          COALESCE(d.phone, '') AS "driverPhone"
        FROM weekly_accounts wa
        JOIN vehicles v ON v.id = wa.vehicle_id
        LEFT JOIN drivers d ON d.id = wa.driver_id
        WHERE wa.tenant_id  = ${session.tenantId}
          AND wa.week_start >= ${since}
        ORDER BY wa.week_start DESC, "driverName"
        LIMIT 50
      `;
    } else {
      rows = await sql`
        SELECT
          wa.id,
          wa.week_start                              AS "weekStart",
          wa.week_end                                AS "weekEnd",
          wa.rent,
          COALESCE(wa.contabilidad,        0)        AS "contabilidad",
          COALESCE(wa.dias_trabajados,     7)        AS "diasTrabajados",
          COALESCE(wa.didi_income,         0)        AS "didiIncome",
          COALESCE(wa.didi_income_cash,    0)        AS "didiIncomeCash",
          COALESCE(wa.didi_income_card,    0)        AS "didiIncomeCard",
          COALESCE(wa.didi_balance,        0)        AS "didiBalance",
          COALESCE(wa.didi_bonuses,        0)        AS "didiBonus",
          COALESCE(wa.didi_tax,            0)        AS "didiTax",
          COALESCE(wa.viajes_pagados,      0)        AS "viajesPagados",
          COALESCE(wa.viajes_online,       0)        AS "viajesOnline",
          COALESCE(wa.viajes_efectivo,     0)        AS "viajesEfectivo",
          COALESCE(wa.monto_kms,           0)        AS "montoKms",
          COALESCE(wa.adicional,           0)        AS "adicional",
          COALESCE(wa.saldo_pendiente,     0)        AS "saldoPendiente",
          COALESCE(wa.efectivo_a_entregar, 0)        AS "efectivoAEntregar",
          COALESCE(wa.uber_income,         0)        AS "uberIncome",
          COALESCE(wa.indriver_income,     0)        AS "indriverIncome",
          wa.status,
          COALESCE(wa.nota, wa.notes, '')            AS "nota",
          v.eco, v.plates, v.brand, v.model, v.year,
          v.wa_group_link                            AS "waGroupLink",
          COALESCE(d.first_name || ' ' || d.last_name, 'Sin asignar') AS "driverName",
          COALESCE(d.phone, '') AS "driverPhone"
        FROM weekly_accounts wa
        JOIN vehicles v ON v.id = wa.vehicle_id
        LEFT JOIN drivers d ON d.id = wa.driver_id
        WHERE wa.tenant_id = ${session.tenantId}
          AND wa.week_start = (
            SELECT MAX(week_start) FROM weekly_accounts WHERE tenant_id = ${session.tenantId}
          )
        ORDER BY
          CASE wa.status WHEN 'pending' THEN 1 WHEN 'partial' THEN 2 ELSE 3 END,
          "driverName"
      `;
    }

    const data = rows.map((r) => ({
      id:                r.id,
      weekStart:         r.weekStart,
      weekEnd:           r.weekEnd,
      eco:               r.eco,
      plates:            r.plates,
      brand:             r.brand   ?? '',
      model:             r.model   ?? '',
      year:              r.year    ? Number(r.year) : null,
      driverName:        r.driverName,
      driverPhone:       r.driverPhone,
      status:            String(r.status ?? 'pending'),
      nota:              r.nota ?? '',
      // Renta
      rent:              Number(r.rent),
      contabilidad:      Number(r.contabilidad  ?? 0),
      diasTrabajados:    Number(r.diasTrabajados ?? 7),
      // Didi
      didiIncome:        Number(r.didiIncome     ?? 0),
      didiIncomeCash:    Number(r.didiIncomeCash ?? 0),
      didiIncomeCard:    Number(r.didiIncomeCard ?? 0),
      didiBalance:       Number(r.didiBalance    ?? 0),
      didiBonus:         Number(r.didiBonus      ?? 0),
      didiTax:           Number(r.didiTax        ?? 0),
      // Viajes
      viajesPagados:     Number(r.viajesPagados  ?? 0),
      viajesOnline:      Number(r.viajesOnline   ?? 0),
      viajesEfectivo:    Number(r.viajesEfectivo ?? 0),
      // Cargos extra
      montoKms:          Number(r.montoKms       ?? 0),
      adicional:         Number(r.adicional      ?? 0),
      // Cobro
      saldoPendiente:    Number(r.saldoPendiente  ?? 0),
      efectivoAEntregar: Number(r.efectivoAEntregar ?? 0),
      // Otras plataformas
      uberIncome:        Number(r.uberIncome     ?? 0),
      indriverIncome:    Number(r.indriverIncome ?? 0),
      // WA Grupo
      waGroupLink:       r.waGroupLink ?? null,
    }));

    // Total ingresos = Didi + Uber + InDriver
    const dataConTotales = data.map((r) => ({
      ...r,
      totalIncome: r.didiIncome + r.uberIncome + r.indriverIncome,
    }));

    // Resumen semana
    const summary = {
      totalCuentas:         data.length,
      totalPagadas:         data.filter((r) => r.status === 'paid').length,
      totalPendientes:      data.filter((r) => r.status === 'pending').length,
      totalEfectivo:        data.reduce((s, r) => s + r.efectivoAEntregar, 0),
      totalDidi:            data.reduce((s, r) => s + r.didiIncome, 0),
      totalViajesSemana:    data.reduce((s, r) => s + r.viajesPagados, 0),
      totalDepositos:       data.reduce((s, r) => s + r.didiBalance, 0),
      totalRenta:           data.reduce((s, r) => s + r.rent, 0),
    };

    // Alias para compatibilidad
    const dataFinal = dataConTotales;

    return NextResponse.json({ data: dataFinal, summary });
  } catch (err) {
    console.error('[weekly-accounts GET]', err);
    return NextResponse.json({ message: 'Error al obtener cuentas semanales' }, { status: 500 });
  }
}
