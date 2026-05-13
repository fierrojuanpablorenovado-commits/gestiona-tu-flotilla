import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    // Asegurar que la columna whatsapp_group exista (safe migration)
    await sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS whatsapp_group TEXT`.catch(() => {});

    const { searchParams } = new URL(req.url);
    const search   = searchParams.get('search')?.toLowerCase().trim() || '';
    const status   = searchParams.get('status') || '';
    const platform = searchParams.get('platform') || '';

    const rows = await sql`
      SELECT
        d.id,
        d.first_name || ' ' || d.last_name  AS name,
        d.first_name AS "firstName",
        d.last_name  AS "lastName",
        d.phone,
        d.email,
        d.licencia,
        d.licencia_tipo        AS "licenseType",
        d.licencia_vencimiento AS "licenseExpiry",
        d.hire_date            AS "joinDate",
        d.status,
        d.rating               AS "platformRating",
        d.score                AS "scoreChofer",
        d.platforms,
        COALESCE(d.platforms[1], 'Didi') AS platform,
        d.notes,
        d.whatsapp_group       AS "whatsappGroup",
        v.eco                  AS vehicle,
        v.id                   AS "vehicleId",
        -- Saldo pendiente (rentas sin pagar en los últimos 30 días)
        COALESCE((
          SELECT SUM(wa.rent)
          FROM weekly_accounts wa
          WHERE wa.driver_id = d.id
            AND wa.status = 'pending'
            AND wa.week_start >= CURRENT_DATE - INTERVAL '30 days'
        ), 0) AS "totalDebt",
        -- Ingresos semana actual
        COALESCE((
          SELECT SUM(wa.uber_income + wa.didi_income + wa.indriver_income + wa.other_income)
          FROM weekly_accounts wa
          WHERE wa.driver_id = d.id
            AND wa.week_start >= date_trunc('week', CURRENT_DATE)
        ), 0) AS "weeklyBalance",
        -- Viajes semana actual
        COALESCE((
          SELECT SUM(wa.viajes_pagados)
          FROM weekly_accounts wa
          WHERE wa.driver_id = d.id
            AND wa.week_start >= date_trunc('week', CURRENT_DATE)
        ), 0) AS "tripsWeek"
      FROM drivers d
      LEFT JOIN vehicles v ON v.id = d.vehicle_id
      WHERE d.tenant_id = ${session.tenantId}
        ${search ? sql`AND (
          d.first_name ILIKE ${'%' + search + '%'} OR
          d.last_name  ILIKE ${'%' + search + '%'} OR
          d.phone      ILIKE ${'%' + search + '%'} OR
          d.email      ILIKE ${'%' + search + '%'} OR
          v.eco        ILIKE ${'%' + search + '%'}
        )` : sql``}
        ${status ? sql`AND d.status = ${status}` : sql``}
        ${platform ? sql`AND ${platform} = ANY(d.platforms)` : sql``}
      ORDER BY d.first_name, d.last_name
    `;

    const totalDebtSum = rows.reduce((s, d) => s + Number(d.totalDebt ?? 0), 0);

    const summary = {
      total:       rows.length,
      activos:     rows.filter((d) => d.status === 'active').length,
      suspendidos: rows.filter((d) => d.status === 'suspended').length,
      inactivos:   rows.filter((d) => d.status === 'inactive').length,
      totalDebt:   totalDebtSum,
    };

    return NextResponse.json({ data: rows, summary });
  } catch (err) {
    console.error('[drivers GET] Error:', err);
    return NextResponse.json({ message: 'Error al obtener choferes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const {
      firstName, lastName, phone, email,
      licencia, licenciaTipo, licenciaVencimiento,
      vehicleId, platforms, hireDate, notes, whatsappGroup,
    } = body;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { message: 'Nombre y apellido son requeridos' },
        { status: 400 },
      );
    }

    const platformArr = Array.isArray(platforms) ? platforms : (platforms ? [platforms] : []);

    const result = await sql`
      INSERT INTO drivers (
        tenant_id, first_name, last_name, phone, email,
        licencia, licencia_tipo, licencia_vencimiento,
        vehicle_id, platforms, hire_date, notes, whatsapp_group
      )
      VALUES (
        ${session.tenantId},
        ${firstName},
        ${lastName},
        ${phone || null},
        ${email || null},
        ${licencia || null},
        ${licenciaTipo || null},
        ${licenciaVencimiento || null},
        ${vehicleId || null},
        ${platformArr},
        ${hireDate || null},
        ${notes || null},
        ${whatsappGroup || null}
      )
      RETURNING *
    `;

    return NextResponse.json({ data: result[0] }, { status: 201 });
  } catch (err) {
    console.error('[drivers POST] Error:', err);
    return NextResponse.json({ message: 'Error al crear chofer' }, { status: 500 });
  }
}
