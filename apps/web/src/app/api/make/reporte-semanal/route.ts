import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// Endpoint dedicado para Make.com — reporte ejecutivo semanal para el admin
// Se ejecuta cada viernes 7pm (cron Make.com)

const REAL_TENANT_ID = '5f3faf9d-cc84-4112-9128-ef0d6d555e1b'; // Al Volante GDL

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-make-secret');
  if (!secret || secret !== process.env.MAKE_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const tenantSlug = req.nextUrl.searchParams.get('tenant') || 'alvolantegdl';

  try {
    const tenants = await sql`
      SELECT id FROM tenants WHERE slug = ${tenantSlug} LIMIT 1
    `;
    const tenantId = tenants[0]?.id ?? REAL_TENANT_ID;

    // Totales de la semana actual
    const [semanaActual] = await sql`
      SELECT
        COUNT(DISTINCT wa.driver_id)                          AS choferes_activos,
        COALESCE(SUM(wa.uber_income + wa.didi_income + wa.indriver_income + wa.other_income), 0) AS ingresos_semana,
        COALESCE(SUM(wa.rent), 0)                             AS renta_cobrada,
        COALESCE(SUM(wa.trips_count), 0)                      AS viajes_totales
      FROM weekly_accounts wa
      WHERE wa.tenant_id = ${tenantId}
        AND wa.week_start >= date_trunc('week', CURRENT_DATE)
    `;

    // Cobros pendientes últimos 30 días
    const [pendientes] = await sql`
      SELECT COALESCE(SUM(wa.rent), 0) AS total_pendiente,
             COUNT(*) AS cuentas_pendientes
      FROM weekly_accounts wa
      WHERE wa.tenant_id = ${tenantId}
        AND wa.status = 'pending'
        AND wa.week_start >= CURRENT_DATE - INTERVAL '30 days'
    `;

    // Vehículos por status
    const vehiculos = await sql`
      SELECT status, COUNT(*)::int AS total
      FROM vehicles
      WHERE tenant_id = ${tenantId}
      GROUP BY status
    `;

    const vehiculosMap = vehiculos.reduce((acc: Record<string, number>, v) => {
      acc[v.status] = v.total;
      return acc;
    }, {});

    // Top 3 choferes por ingresos esta semana
    const top3 = await sql`
      SELECT
        d.first_name || ' ' || d.last_name AS name,
        SUM(wa.uber_income + wa.didi_income + wa.indriver_income + wa.other_income) AS ingresos
      FROM weekly_accounts wa
      JOIN drivers d ON d.id = wa.driver_id
      WHERE wa.tenant_id = ${tenantId}
        AND wa.week_start >= date_trunc('week', CURRENT_DATE)
      GROUP BY d.id, d.first_name, d.last_name
      ORDER BY ingresos DESC
      LIMIT 3
    `;

    return NextResponse.json({
      ok: true,
      semana: {
        inicio: new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 1)).toISOString().split('T')[0],
        fin: new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 7)).toISOString().split('T')[0],
      },
      resumen: {
        choferes_activos: Number(semanaActual?.choferes_activos ?? 0),
        ingresos_semana: Number(semanaActual?.ingresos_semana ?? 0),
        renta_cobrada: Number(semanaActual?.renta_cobrada ?? 0),
        viajes_totales: Number(semanaActual?.viajes_totales ?? 0),
        cobros_pendientes: Number(pendientes?.total_pendiente ?? 0),
        cuentas_pendientes: Number(pendientes?.cuentas_pendientes ?? 0),
      },
      vehiculos: {
        activos: vehiculosMap['active'] ?? 0,
        disponibles: vehiculosMap['available'] ?? 0,
        taller: vehiculosMap['workshop'] ?? 0,
        total: vehiculos.reduce((s, v) => s + v.total, 0),
      },
      top3Choferes: top3.map((c) => ({ name: c.name, ingresos: Number(c.ingresos) })),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[make/reporte-semanal] Error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
