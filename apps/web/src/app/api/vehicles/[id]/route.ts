import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const tid = session.tenantId;
    const vid = params.id;

    // ── Vehículo ──────────────────────────────────────────────────────────────
    const [vehicle] = await sql`
      SELECT id, eco, brand, model, year, color, plates, vin,
             status, km_actual, platform, notes, weekly_rent
      FROM vehicles
      WHERE id = ${vid}
        AND tenant_id = ${tid}
    `;

    if (!vehicle) {
      return NextResponse.json({ message: 'Vehículo no encontrado' }, { status: 404 });
    }

    // ── Chofer asignado (por vehicle_id en drivers) ───────────────────────────
    const [d] = await sql`
      SELECT id, first_name, last_name, phone, status,
             licencia, licencia_vencimiento, rating, created_at
      FROM drivers
      WHERE vehicle_id = ${vid}
        AND tenant_id  = ${tid}
        AND status = 'active'
      LIMIT 1
    `.catch(() => [null]);

    const driver = d ? {
      id:            d.id,
      name:          `${d.first_name} ${d.last_name}`,
      phone:         d.phone ?? '',
      status:        d.status,
      license:       d.licencia ?? '',
      licenseExpiry: d.licencia_vencimiento ?? null,
      rating:        d.rating ?? null,
      since:         d.created_at,
    } : null;

    // ── Seguro vigente ────────────────────────────────────────────────────────
    const insuranceRows = await sql`
      SELECT insurer, policy_number, start_date, expiry_date,
             coverage_type, annual_premium
      FROM vehicle_insurance
      WHERE vehicle_id = ${vid}
        AND tenant_id  = ${tid}
      ORDER BY expiry_date DESC
      LIMIT 1
    `.catch(() => []);
    const insurance = insuranceRows[0] ?? null;

    // ── Mantenimientos ────────────────────────────────────────────────────────
    const maintenanceRows = await sql`
      SELECT id, tipo, descripcion, fecha_ingreso, fecha_salida,
             costo_total, taller, status, km_ingreso
      FROM maintenance_orders
      WHERE vehicle_id = ${vid}
        AND tenant_id  = ${tid}
      ORDER BY fecha_ingreso DESC
      LIMIT 20
    `.catch(() => []);

    // ── Ingresos semanales (últimas 8 semanas) ────────────────────────────────
    const weeklyRows = await sql`
      SELECT week_start, week_end,
             COALESCE(didi_income, 0)     AS didi_income,
             COALESCE(uber_income, 0)     AS uber_income,
             COALESCE(indriver_income, 0) AS indriver_income,
             COALESCE(other_income, 0)    AS other_income,
             COALESCE(rent, 0)            AS rent,
             COALESCE(trips_count, 0)     AS trips_count,
             status
      FROM weekly_accounts
      WHERE vehicle_id = ${vid}
        AND tenant_id  = ${tid}
      ORDER BY week_start DESC
      LIMIT 8
    `.catch(() => []);

    const weeklyHistory = weeklyRows.map((r: any) => ({
      week:      r.week_start,
      weekEnd:   r.week_end,
      income:    Number(r.didi_income) + Number(r.uber_income) + Number(r.indriver_income) + Number(r.other_income),
      rent:      Number(r.rent),
      trips:     Number(r.trips_count),
      status:    r.status,
    }));

    const weeklyIncome  = weeklyHistory[0]?.income ?? 0;
    const monthlyIncome = weeklyRows
      .filter((r: any) => {
        const start = new Date(r.week_start);
        const now   = new Date();
        return start.getFullYear() === now.getFullYear() && start.getMonth() === now.getMonth();
      })
      .reduce((acc: number, r: any) => acc + Number(r.didi_income) + Number(r.uber_income) + Number(r.indriver_income) + Number(r.other_income), 0);

    const totalIncome = weeklyRows.reduce(
      (acc: number, r: any) => acc + Number(r.didi_income) + Number(r.uber_income) + Number(r.indriver_income) + Number(r.other_income),
      0,
    );

    // ── Próximo mantenimiento programado ─────────────────────────────────────
    const [nextMaint] = await sql`
      SELECT tipo, fecha_ingreso
      FROM maintenance_orders
      WHERE vehicle_id = ${vid}
        AND tenant_id  = ${tid}
        AND status = 'Programado'
      ORDER BY fecha_ingreso
      LIMIT 1
    `.catch(() => [null]);

    return NextResponse.json({
      id:           vehicle.id,
      eco:          vehicle.eco,
      brand:        vehicle.brand,
      model:        vehicle.model,
      year:         vehicle.year,
      color:        vehicle.color ?? '',
      plates:       vehicle.plates ?? '',
      vin:          vehicle.vin ?? '',
      status:       vehicle.status,
      km:           Number(vehicle.km_actual ?? 0),
      platform:     vehicle.platform ?? [],
      notes:        vehicle.notes ?? '',
      weeklyRent:   Number(vehicle.weekly_rent ?? 0),
      driver,
      insurance:    insurance ? {
        company:  insurance.insurer,
        policy:   insurance.policy_number,
        startDate:insurance.start_date,
        expiry:   insurance.expiry_date,
        type:     insurance.coverage_type,
        premium:  Number(insurance.annual_premium ?? 0),
      } : null,
      maintenanceHistory: maintenanceRows.map((m: any) => ({
        id:        m.id,
        date:      m.fecha_ingreso,
        exitDate:  m.fecha_salida,
        type:      m.tipo,
        desc:      m.descripcion ?? '',
        cost:      Number(m.costo_total ?? 0),
        workshop:  m.taller ?? '',
        status:    m.status,
        km:        Number(m.km_ingreso ?? 0),
      })),
      weeklyHistory,
      weeklyIncome,
      monthlyIncome,
      totalIncome,
      nextMaintenance: nextMaint ? {
        type: nextMaint.tipo,
        date: nextMaint.fecha_ingreso,
      } : null,
    });
  } catch (err) {
    console.error('[vehicles/id] Error:', err);
    return NextResponse.json({ message: 'Error al cargar vehículo' }, { status: 500 });
  }
}

// ─── PATCH /api/vehicles/[id] ─────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const tid = session.tenantId;
    const vid = params.id;
    const body = await req.json();

    const updates: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const values: any[] = [];

    if (body.weeklyRent !== undefined) {
      await sql`UPDATE vehicles SET weekly_rent = ${parseFloat(body.weeklyRent) || 0} WHERE id = ${vid} AND tenant_id = ${tid}`;
    }
    if (body.status !== undefined) {
      await sql`UPDATE vehicles SET status = ${body.status} WHERE id = ${vid} AND tenant_id = ${tid}`;
    }
    if (body.eco !== undefined) {
      await sql`UPDATE vehicles SET eco = ${String(body.eco).toUpperCase()} WHERE id = ${vid} AND tenant_id = ${tid}`;
    }
    if (body.brand !== undefined) {
      await sql`UPDATE vehicles SET brand = ${body.brand} WHERE id = ${vid} AND tenant_id = ${tid}`;
    }
    if (body.model !== undefined) {
      await sql`UPDATE vehicles SET model = ${body.model} WHERE id = ${vid} AND tenant_id = ${tid}`;
    }
    if (body.plates !== undefined) {
      await sql`UPDATE vehicles SET plates = ${body.plates || null} WHERE id = ${vid} AND tenant_id = ${tid}`;
    }
    if (body.color !== undefined) {
      await sql`UPDATE vehicles SET color = ${body.color || null} WHERE id = ${vid} AND tenant_id = ${tid}`;
    }
    if (body.km !== undefined) {
      await sql`UPDATE vehicles SET km_actual = ${parseInt(body.km) || 0} WHERE id = ${vid} AND tenant_id = ${tid}`;
    }
    if (body.notes !== undefined) {
      await sql`UPDATE vehicles SET notes = ${body.notes || null} WHERE id = ${vid} AND tenant_id = ${tid}`;
    }
    if (body.gps_imei !== undefined) {
      const imei = (body.gps_imei || '').trim() || null;
      await sql`UPDATE vehicles SET gps_imei = ${imei} WHERE id = ${vid} AND tenant_id = ${tid}`;
    }

    void updates; void values; // suppress unused warnings

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[vehicles/id PATCH] Error:', err);
    return NextResponse.json({ message: 'Error al actualizar vehículo' }, { status: 500 });
  }
}
