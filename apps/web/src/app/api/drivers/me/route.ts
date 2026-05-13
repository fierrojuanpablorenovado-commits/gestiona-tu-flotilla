import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const tid = session.tenantId;
    const userId = session.id;

    // ── Buscar driver por user_id ──────────────────────────────────────────────
    const [driver] = await sql`
      SELECT
        d.id, d.first_name, d.last_name, d.phone, d.status,
        d.licencia, d.licencia_vencimiento, d.rating, d.created_at,
        d.vehicle_id,
        v.eco, v.brand, v.model, v.year, v.color, v.plates, v.vin,
        v.status AS vehicle_status, v.km_actual, v.platform, v.weekly_rent
      FROM drivers d
      LEFT JOIN vehicles v ON v.id = d.vehicle_id
      WHERE d.user_id = ${userId}
        AND d.tenant_id = ${tid}
      LIMIT 1
    `;

    if (!driver) {
      return NextResponse.json({ message: 'No tiene perfil de chofer asociado' }, { status: 404 });
    }

    // Asegurar columna notified_driver (safe migration)
    await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS notified_driver BOOLEAN DEFAULT FALSE`.catch(() => {});

    // ── Historial semanal completo con todos los campos Didi ─────────────────
    const weeklyRows = await sql`
      SELECT week_start, week_end,
             COALESCE(didi_income, 0)     AS didi_income,
             COALESCE(uber_income, 0)     AS uber_income,
             COALESCE(indriver_income, 0) AS indriver_income,
             COALESCE(other_income, 0)    AS other_income,
             COALESCE(rent, 0)            AS rent,
             COALESCE(trips_count, 0)     AS trips_count,
             COALESCE(trips_online, 0)    AS trips_online,
             COALESCE(trips_cash, 0)      AS trips_cash,
             COALESCE(didi_cash, 0)       AS didi_cash,
             COALESCE(didi_balance, 0)    AS didi_balance,
             COALESCE(didi_bonuses, 0)    AS didi_bonuses,
             COALESCE(didi_tax, 0)        AS didi_tax,
             COALESCE(didi_deduction, 0)  AS didi_deduction,
             COALESCE(notified_driver, FALSE) AS notified_driver,
             status
      FROM weekly_accounts
      WHERE driver_id = ${driver.id}
        AND tenant_id = ${tid}
      ORDER BY week_start DESC
      LIMIT 8
    `.catch(() => []);

    const weeklyHistory = weeklyRows.map((r: any) => ({
      weekStart:       r.week_start,
      weekEnd:         r.week_end,
      income:          Number(r.didi_income) + Number(r.uber_income) + Number(r.indriver_income) + Number(r.other_income),
      rent:            Number(r.rent),
      trips:           Number(r.trips_count),
      tripsOnline:     Number(r.trips_online),
      tripsCash:       Number(r.trips_cash),
      didiCash:        Number(r.didi_cash),     // efectivo que el chofer tiene en mano
      didiBalance:     Number(r.didi_balance),  // lo que Didi deposita a su cuenta
      bonuses:         Number(r.didi_bonuses),  // bonos/recompensas
      tax:             Number(r.didi_tax),      // ISR / comisión Didi
      deduction:       Number(r.didi_deduction),
      status:          r.status,
      isNew:           r.notified_driver === false, // true si la cuenta aún no fue vista
    }));

    // Marcar automáticamente las cuentas nuevas como notificadas (vistas por el chofer)
    const newAccountIds = weeklyRows
      .filter((r: any) => r.notified_driver === false)
      .map((r: any) => r.week_start);

    if (newAccountIds.length > 0) {
      await sql`
        UPDATE weekly_accounts
        SET notified_driver = TRUE
        WHERE driver_id  = ${driver.id}
          AND tenant_id  = ${tid}
          AND notified_driver = FALSE
      `.catch(() => {});
    }

    const currentWeek  = weeklyHistory[0] ?? null;
    const previousWeek = weeklyHistory[1] ?? null;

    // ── Seguro del vehículo ───────────────────────────────────────────────────
    let insurance = null;
    if (driver.vehicle_id) {
      const [ins] = await sql`
        SELECT insurer, policy_number, expiry_date, coverage_type
        FROM insurance
        WHERE vehicle_id = ${driver.vehicle_id}
          AND tenant_id  = ${tid}
        ORDER BY expiry_date DESC
        LIMIT 1
      `.catch(() => [null]);
      insurance = ins ?? null;
    }

    return NextResponse.json({
      id:        driver.id,
      firstName: driver.first_name,
      lastName:  driver.last_name,
      phone:     driver.phone ?? '',
      status:    driver.status,
      license:   driver.licencia ?? '',
      licenseExpiry: driver.licencia_vencimiento ?? null,
      rating:    Number(driver.rating ?? 4.5),
      since:     driver.created_at,
      vehicle: driver.vehicle_id ? {
        id:      driver.vehicle_id,
        eco:     driver.eco,
        brand:   driver.brand,
        model:   driver.model,
        year:    driver.year,
        color:   driver.color ?? '',
        plates:  driver.plates ?? '',
        vin:     driver.vin ?? '',
        status:  driver.vehicle_status,
        km:      Number(driver.km_actual ?? 0),
        platform: driver.platform ?? [],
        weeklyRent: Number(driver.weekly_rent ?? 0),
      } : null,
      insurance: insurance ? {
        company: insurance.insurer,
        policy:  insurance.policy_number,
        expiry:  insurance.expiry_date,
        type:    insurance.coverage_type,
      } : null,
      currentWeek,
      previousWeek,
      weeklyHistory,
    });
  } catch (err) {
    console.error('[drivers/me] Error:', err);
    return NextResponse.json({ message: 'Error al cargar perfil' }, { status: 500 });
  }
}
