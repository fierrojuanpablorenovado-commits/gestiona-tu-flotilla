import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase().trim() || '';
    const status = searchParams.get('status') || '';
    const page   = Math.max(1, parseInt(searchParams.get('page')  || '1'));
    const limit  = Math.min(50, parseInt(searchParams.get('limit') || '15'));
    const offset = (page - 1) * limit;

    // Query con driver asignado + métricas reales desde weekly_accounts
    const rows = await sql`
      SELECT
        v.id,
        v.eco,
        v.brand,
        v.model,
        v.year,
        v.color,
        v.plates,
        v.vin,
        v.km_actual      AS km,
        v.status,
        v.platform,
        v.notes,
        v.weekly_rent    AS "weeklyRent",
        v.created_at,
        d.id             AS "driverId",
        d.first_name || ' ' || d.last_name AS driver,
        d.first_name     AS "driverFirstName",
        d.last_name      AS "driverLastName",
        d.phone          AS "driverPhone",
        d.rating         AS "driverRating",
        -- Ingresos semana actual (plataforma)
        COALESCE((
          SELECT SUM(wa.uber_income + wa.didi_income + wa.indriver_income + wa.other_income)
          FROM weekly_accounts wa
          WHERE wa.vehicle_id = v.id
            AND wa.week_start >= date_trunc('week', CURRENT_DATE)
        ), 0) AS "weeklyIncome",
        -- Renta pendiente (cuánto debe el chofer actual)
        COALESCE((
          SELECT SUM(wa.rent)
          FROM weekly_accounts wa
          WHERE wa.vehicle_id = v.id
            AND wa.status = 'pending'
            AND wa.week_start >= CURRENT_DATE - INTERVAL '30 days'
        ), 0) AS "pendingRent",
        -- Health score: base 100
        --   - días desde última cuenta × 5 (máx. 40 puntos)
        --   - cuentas pendientes últimos 30 días × 12 (máx. 36 puntos)
        --   - vehículo en taller: fijo 35
        CASE
          WHEN v.status = 'workshop' THEN 35
          WHEN v.status IN ('inactive','sold') THEN 0
          ELSE GREATEST(0,
            100
            - LEAST(40, EXTRACT(day FROM (
                CURRENT_DATE - COALESCE(
                  (SELECT MAX(wa.week_start) FROM weekly_accounts wa WHERE wa.vehicle_id = v.id),
                  CURRENT_DATE - INTERVAL '14 days'
                )
              ))::int * 5)
            - LEAST(36, (
                SELECT COUNT(*)::int * 12
                FROM weekly_accounts wa
                WHERE wa.vehicle_id = v.id
                  AND wa.status = 'pending'
                  AND wa.week_start >= CURRENT_DATE - INTERVAL '30 days'
              ))
          )
        END AS "healthScore"
      FROM vehicles v
      LEFT JOIN drivers d
        ON d.vehicle_id = v.id AND d.status = 'active'
      WHERE v.tenant_id = ${session.tenantId}
        ${search ? sql`AND (
          v.eco    ILIKE ${'%' + search + '%'} OR
          v.brand  ILIKE ${'%' + search + '%'} OR
          v.model  ILIKE ${'%' + search + '%'} OR
          v.plates ILIKE ${'%' + search + '%'}
        )` : sql``}
        ${status ? sql`AND v.status = ${status}` : sql``}
      ORDER BY v.eco
      LIMIT  ${limit}
      OFFSET ${offset}
    `;

    // Total count
    const countRows = await sql`
      SELECT COUNT(*)::int AS total
      FROM vehicles v
      WHERE v.tenant_id = ${session.tenantId}
        ${search ? sql`AND (
          v.eco    ILIKE ${'%' + search + '%'} OR
          v.brand  ILIKE ${'%' + search + '%'} OR
          v.model  ILIKE ${'%' + search + '%'} OR
          v.plates ILIKE ${'%' + search + '%'}
        )` : sql``}
        ${status ? sql`AND v.status = ${status}` : sql``}
    `;

    const total = countRows[0]?.total ?? 0;

    // Normalizar tipos — healthScore ya viene del SQL
    const data = rows.map((v) => ({
      ...v,
      weeklyRent:   Number(v.weeklyRent   ?? 0),
      weeklyIncome: Number(v.weeklyIncome ?? 0),
      healthScore:  Number(v.healthScore  ?? 50),
    }));

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('[vehicles GET] Error:', err);
    return NextResponse.json({ message: 'Error al obtener vehículos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { eco, brand, model, year, color, plates, vin, platform, notes, weeklyRent } = body;

    if (!eco || !brand || !model || !year) {
      return NextResponse.json(
        { message: 'eco, brand, model y year son requeridos' },
        { status: 400 },
      );
    }

    const platformArr = Array.isArray(platform) ? platform : (platform ? [platform] : []);
    const rentAmount = parseFloat(weeklyRent) || 0;

    const result = await sql`
      INSERT INTO vehicles (tenant_id, eco, brand, model, year, color, plates, vin, platform, notes, weekly_rent)
      VALUES (
        ${session.tenantId},
        ${eco.toUpperCase()},
        ${brand},
        ${model},
        ${parseInt(year)},
        ${color || null},
        ${plates || null},
        ${vin || null},
        ${platformArr},
        ${notes || null},
        ${rentAmount}
      )
      RETURNING *
    `;

    return NextResponse.json({ data: result[0] }, { status: 201 });
  } catch (err) {
    console.error('[vehicles POST] Error:', err);
    return NextResponse.json({ message: 'Error al crear vehículo' }, { status: 500 });
  }
}
