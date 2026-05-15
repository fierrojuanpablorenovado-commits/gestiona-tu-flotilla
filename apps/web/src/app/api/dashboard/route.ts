import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const tid = session.tenantId;

    // ── Estadísticas principales ──────────────────────────────────────────────
    const [vehicleStats] = await sql`
      SELECT
        COUNT(*)                                          AS total,
        COUNT(*) FILTER (WHERE status = 'active')        AS activos,
        COUNT(*) FILTER (WHERE status = 'workshop')      AS en_taller,
        COUNT(*) FILTER (WHERE status = 'available')     AS disponibles,
        COUNT(*) FILTER (WHERE status = 'inactive')      AS inactivos
      FROM vehicles
      WHERE tenant_id = ${tid}
    `;

    const [driverStats] = await sql`
      SELECT
        COUNT(*)                                          AS total,
        COUNT(*) FILTER (WHERE status = 'active')        AS activos,
        COUNT(*) FILTER (WHERE status = 'suspended')     AS suspendidos
      FROM drivers
      WHERE tenant_id = ${tid}
    `;

    const [candidateStats] = await sql`
      SELECT COUNT(*) AS pipeline
      FROM candidates
      WHERE tenant_id = ${tid}
        AND kanban_stage NOT IN ('contratado','rechazado')
    `.catch(() => [{ pipeline: 0 }]);

    const [maintenanceStats] = await sql`
      SELECT COUNT(*) AS activas
      FROM maintenance_orders
      WHERE tenant_id = ${tid}
        AND status NOT IN ('Completado','Cancelado')
    `.catch(() => [{ activas: 0 }]);

    // ── Ingresos de tesorería esta semana y este mes ──────────────────────────
    const [incomeStats] = await sql`
      SELECT
        COALESCE(SUM(monto) FILTER (WHERE tipo = 'ingreso'
          AND fecha >= date_trunc('week', CURRENT_DATE)), 0)  AS ingresos_semana,
        COALESCE(SUM(monto) FILTER (WHERE tipo = 'ingreso'
          AND fecha >= date_trunc('month', CURRENT_DATE)), 0) AS ingresos_mes,
        COALESCE(SUM(monto) FILTER (WHERE tipo = 'egreso'
          AND fecha >= date_trunc('month', CURRENT_DATE)), 0) AS egresos_mes
      FROM treasury_transactions
      WHERE tenant_id = ${tid}
        AND status = 'completed'
    `.catch(() => [{ ingresos_semana: 0, ingresos_mes: 0, egresos_mes: 0 }]);

    // ── Ingresos desde weekly_accounts — última semana con datos ────────────────
    // Buscar la semana más reciente que tenga registros (no necesariamente la actual)
    const [waLastWeek] = await sql`
      SELECT week_start,
        COALESCE(SUM(efectivo_a_entregar), 0) AS total,
        COALESCE(SUM(didi_income), 0) AS didi,
        COALESCE(SUM(viajes_pagados), 0) AS viajes
      FROM weekly_accounts
      WHERE tenant_id = ${tid}
      GROUP BY week_start
      ORDER BY week_start DESC
      LIMIT 1
    `.catch(() => [{ total: 0, didi: 0, viajes: 0, week_start: null }]);

    const [waMes] = await sql`
      SELECT COALESCE(SUM(efectivo_a_entregar), 0) AS total
      FROM weekly_accounts
      WHERE tenant_id = ${tid}
        AND week_start >= date_trunc('month', CURRENT_DATE)
    `.catch(() => [{ total: 0 }]);

    // Semana anterior a la última con datos
    const lastWeekStart = waLastWeek?.week_start ?? null;
    const [waPrevWeek] = lastWeekStart ? await sql`
      SELECT COALESCE(SUM(efectivo_a_entregar), 0) AS total
      FROM weekly_accounts
      WHERE tenant_id = ${tid}
        AND week_start < ${lastWeekStart}
      ORDER BY week_start DESC
      LIMIT 1
    `.catch(() => [{ total: 0 }]) : [{ total: 0 }];

    // ── Cobros pendientes (weekly_accounts con status pending) ────────────────
    const cobrosPendientesRows = await sql`
      SELECT
        COALESCE(d.first_name || ' ' || d.last_name, 'Sin asignar') AS nombre,
        COALESCE(d.phone, '')                                         AS telefono,
        COALESCE(wa.efectivo_a_entregar, wa.rent)                     AS monto,
        'Semana ' || TO_CHAR(wa.week_start, 'IW')                    AS semana
      FROM weekly_accounts wa
      LEFT JOIN drivers d ON d.id = wa.driver_id
      WHERE wa.tenant_id = ${tid}
        AND wa.status = 'pending'
        AND wa.week_start >= CURRENT_DATE - INTERVAL '21 days'
      ORDER BY wa.week_start DESC, COALESCE(wa.efectivo_a_entregar, wa.rent) DESC
      LIMIT 10
    `.catch(() => []);

    // ── Ingresos por vehículo (renta — weekly_accounts últimas 8 semanas) ──────
    // Base = archivo semanal Didi. Se muestran TODOS los vehículos, sin límite.
    const topVehicles = await sql`
      SELECT
        COALESCE(v.brand || ' ' || v.model, v.eco) AS label,
        COALESCE(SUM(wa.efectivo_a_entregar), 0)::int AS amount
      FROM vehicles v
      LEFT JOIN weekly_accounts wa
        ON wa.vehicle_id = v.id
        AND wa.week_start >= CURRENT_DATE - INTERVAL '56 days'
      WHERE v.tenant_id = ${tid}
      GROUP BY v.id, v.eco
      ORDER BY amount DESC
    `;

    const revenueByVehicle = topVehicles.length > 0
      ? topVehicles
      : (await sql`
          SELECT COALESCE(brand || ' ' || model, eco) AS label, 0 AS amount
          FROM vehicles
          WHERE tenant_id = ${tid}
          ORDER BY eco
        `);

    // ── Alertas activas ───────────────────────────────────────────────────────
    const incidentsOpen = await sql`
      SELECT
        i.id,
        'incident'                      AS type,
        i.tipo || ' — ' || LEFT(i.descripcion, 60) AS message,
        i.severity,
        v.eco                           AS vehicle
      FROM incidents i
      LEFT JOIN vehicles v ON v.id = i.vehicle_id
      WHERE i.tenant_id = ${tid}
        AND i.status IN ('open','investigating')
      ORDER BY
        CASE i.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END
      LIMIT 5
    `.catch(() => []);

    const maintenanceOpen = await sql`
      SELECT
        mo.id,
        'maintenance'                              AS type,
        mo.tipo || ' — ' || v.eco || ': ' || LEFT(mo.descripcion, 50) AS message,
        'medium'                                   AS severity,
        v.eco                                      AS vehicle
      FROM maintenance_orders mo
      JOIN vehicles v ON v.id = mo.vehicle_id
      WHERE mo.tenant_id = ${tid}
        AND mo.status IN ('En diagnostico','En reparacion','Esperando refacciones')
      LIMIT 5
    `.catch(() => []);

    const alerts = [...incidentsOpen, ...maintenanceOpen].slice(0, 5);

    // ── Embudo de reclutamiento ───────────────────────────────────────────────
    const funnelRows = await sql`
      SELECT
        kanban_stage AS stage,
        COUNT(*)::int AS count
      FROM candidates
      WHERE tenant_id = ${tid}
        AND kanban_stage NOT IN ('rechazado')
      GROUP BY kanban_stage
      ORDER BY CASE kanban_stage
        WHEN 'aplicacion'    THEN 1
        WHEN 'pre_screening' THEN 2
        WHEN 'entrevista'    THEN 3
        WHEN 'evaluacion'    THEN 4
        WHEN 'documentos'    THEN 5
        WHEN 'oferta'        THEN 6
        WHEN 'contratado'    THEN 7
        ELSE 8
      END
    `.catch(() => []);

    const stageLabels: Record<string, string> = {
      aplicacion:    'Interesados',
      pre_screening: 'En revisión',
      entrevista:    'Entrevista',
      evaluacion:    'Evaluación',
      documentos:    'Documentos',
      oferta:        'Oferta',
      contratado:    'Contratados',
    };
    const recruitmentFunnel = funnelRows.map((r) => ({
      stage: stageLabels[r.stage] ?? r.stage,
      count: r.count,
    }));

    // ── Histórico financiero semanal (últimas 8 semanas) ─────────────────────
    // Ingresos: de weekly_accounts (renta real de choferes)
    // Gastos: de treasury_transactions tipo 'egreso'
    const historicoRows = await sql`
      WITH semanas AS (
        SELECT generate_series(
          date_trunc('week', CURRENT_DATE) - INTERVAL '7 weeks',
          date_trunc('week', CURRENT_DATE),
          INTERVAL '1 week'
        )::date AS semana_inicio
      ),
      ingresos_wa AS (
        SELECT
          date_trunc('week', wa.week_start)::date AS semana,
          COALESCE(SUM(wa.efectivo_a_entregar), 0)::int AS ingresos
        FROM weekly_accounts wa
        WHERE wa.tenant_id = ${tid}
          AND wa.week_start >= CURRENT_DATE - INTERVAL '8 weeks'
        GROUP BY 1
      ),
      gastos_tt AS (
        SELECT
          date_trunc('week', tt.fecha)::date AS semana,
          COALESCE(SUM(tt.monto), 0)::int     AS gastos
        FROM treasury_transactions tt
        WHERE tt.tenant_id = ${tid}
          AND tt.tipo = 'egreso'
          AND tt.status = 'completed'
          AND tt.fecha >= CURRENT_DATE - INTERVAL '8 weeks'
        GROUP BY 1
      )
      SELECT
        s.semana_inicio                                                                          AS semana,
        TO_CHAR(s.semana_inicio, 'DD/MM') || ' - ' || TO_CHAR(s.semana_inicio + 6, 'DD/MM')   AS label,
        COALESCE(i.ingresos, 0)                                                                 AS ingresos,
        COALESCE(g.gastos, 0)                                                                   AS gastos
      FROM semanas s
      LEFT JOIN ingresos_wa i ON i.semana = s.semana_inicio
      LEFT JOIN gastos_tt  g ON g.semana = s.semana_inicio
      ORDER BY s.semana_inicio ASC
    `.catch(() => []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const weeklyHistory = historicoRows.map((r: any) => ({
      semana:   String(r.label ?? ''),
      ingresos: Number(r.ingresos ?? 0),
      gastos:   Number(r.gastos ?? 0),
    }));

    // ── Recibo / Semáforo — desglose por vehículo última semana ─────────────
    const reciboJPRows = await sql`
      WITH latest_week AS (
        SELECT MAX(week_start) AS ws
        FROM weekly_accounts
        WHERE tenant_id = ${tid}
      )
      SELECT
        v.id::text                                                        AS vehicle_id,
        v.eco,
        v.brand,
        v.model,
        v.plates,
        v.status                                                          AS vehicle_status,
        v.km_actual,
        v.weekly_rent,
        v.wa_group_link,
        COALESCE(d.first_name || ' ' || d.last_name, 'Sin chofer')       AS chofer,
        d.phone                                                           AS chofer_phone,
        lw.ws                                                             AS week_start,
        wa.id::text                                                       AS weekly_account_id,
        COALESCE(wa.efectivo_a_entregar, 0)::int                          AS efectivo,
        COALESCE(wa.didi_balance,        0)::int                          AS banco,
        COALESCE(wa.contabilidad,        0)::int                          AS contabilidad,
        COALESCE(wa.viajes_pagados,      0)::int                          AS viajes,
        COALESCE(wa.status, 'sin_datos')                                  AS wa_status,
        COALESCE(wa.retiro_confirmado,   false)                           AS retiro_confirmado,
        wa.retiro_comprobante_url
      FROM vehicles v
      CROSS JOIN latest_week lw
      LEFT JOIN drivers d ON d.vehicle_id = v.id AND d.status = 'active'
      LEFT JOIN weekly_accounts wa
        ON wa.vehicle_id = v.id
        AND wa.tenant_id = v.tenant_id
        AND wa.week_start = lw.ws
      WHERE v.tenant_id = ${tid}
        AND v.status NOT IN ('sold')
      ORDER BY v.plates
    `.catch(() => [])

    // ── Cobrado esta semana (weekly_accounts pagados) ─────────────────────────
    const [cobradoSemanaRow] = await sql`
      SELECT COALESCE(SUM(efectivo_a_entregar), 0)::int AS cobrado
      FROM weekly_accounts
      WHERE tenant_id = ${tid}
        AND status = 'paid'
        AND week_start = (SELECT MAX(week_start) FROM weekly_accounts WHERE tenant_id = ${tid})
    `.catch(() => [{ cobrado: 0 }])

    // ── Alertas de km (vehículos con 4500+ km desde último mantenimiento) ─────
    const kmAlertRows = await sql`
      SELECT
        v.eco,
        v.plates,
        v.km_actual,
        COALESCE(MAX(mo.km_ingreso), 0)                              AS km_ultima_revision,
        v.km_actual - COALESCE(MAX(mo.km_ingreso), 0)               AS km_desde_revision
      FROM vehicles v
      LEFT JOIN maintenance_orders mo
        ON mo.vehicle_id = v.id AND mo.tenant_id = v.tenant_id
      WHERE v.tenant_id = ${tid}
        AND v.status NOT IN ('inactive', 'sold')
      GROUP BY v.id, v.eco, v.plates, v.km_actual
      HAVING v.km_actual - COALESCE(MAX(mo.km_ingreso), 0) >= 4500
      ORDER BY km_desde_revision DESC
    `.catch(() => [])

    // ── Fleet Roster: vehículos + chofer + seguro + renta ────────────────────
    const fleetRoster = await sql`
      SELECT
        v.id::text        AS vehicle_id,
        v.eco,
        v.brand,
        v.model,
        v.year            AS vehicle_year,
        v.plates,
        v.km_actual,
        v.weekly_rent,
        v.status          AS vehicle_status,
        COALESCE(d.first_name || ' ' || d.last_name, 'Sin chofer') AS driver,
        d.phone           AS driver_phone,
        i.insurer,
        i.policy_number,
        i.expiry_date,
        CASE
          WHEN i.id IS NULL THEN 'sin_poliza'
          WHEN i.expiry_date < CURRENT_DATE THEN 'vencida'
          WHEN i.expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'por_vencer'
          ELSE 'vigente'
        END               AS insurance_status,
        COALESCE(SUM(wa.efectivo_a_entregar), 0)::int AS ingresos_4sem
      FROM vehicles v
      LEFT JOIN drivers d ON d.vehicle_id = v.id AND d.status = 'active'
      LEFT JOIN vehicle_insurance i ON i.vehicle_id = v.id AND i.tenant_id = v.tenant_id
        AND i.expiry_date = (
          SELECT MAX(i2.expiry_date) FROM vehicle_insurance i2
          WHERE i2.vehicle_id = v.id AND i2.tenant_id = v.tenant_id
        )
      LEFT JOIN weekly_accounts wa
        ON wa.vehicle_id = v.id AND wa.tenant_id = v.tenant_id
        AND wa.week_start >= CURRENT_DATE - INTERVAL '28 days'
      WHERE v.tenant_id = ${tid} AND v.status NOT IN ('inactive','sold')
      GROUP BY v.id, v.eco, v.brand, v.model, v.year, v.plates, v.km_actual,
               v.weekly_rent, v.status, d.first_name, d.last_name, d.phone,
               i.id, i.insurer, i.policy_number, i.expiry_date
      ORDER BY v.plates
    `.catch(() => [])

    // Capacidad total de renta semanal
    const [rentaCapacity] = await sql`
      SELECT COALESCE(SUM(weekly_rent), 0)::int AS total
      FROM vehicles WHERE tenant_id = ${tid} AND status NOT IN ('inactive','sold')
    `.catch(() => [{ total: 0 }])

    // ── Mantenimientos próximos programados ───────────────────────────────────
    const maintenanceUpcoming = await sql`
      SELECT
        v.eco,
        mo.tipo  AS type,
        mo.fecha_ingreso AS scheduled_date,
        v.km_actual AS km
      FROM maintenance_orders mo
      JOIN vehicles v ON v.id = mo.vehicle_id
      WHERE mo.tenant_id = ${tid}
        AND mo.status = 'Programado'
      ORDER BY mo.fecha_ingreso
      LIMIT 5
    `.catch(() => []);

    // ── Armar stats finales ───────────────────────────────────────────────────
    const treasuryIngSemana = Number(incomeStats?.ingresos_semana ?? 0);
    const treasuryIngMes    = Number(incomeStats?.ingresos_mes    ?? 0);
    const egresosMes        = Number(incomeStats?.egresos_mes     ?? 0);

    // Preferir weekly_accounts si tesorería no tiene datos
    const waIngSemana = Number(waLastWeek?.total  ?? 0);
    const waIngDidi   = Number(waLastWeek?.didi   ?? 0);
    const waViajes    = Number(waLastWeek?.viajes ?? 0);
    const waIngMes    = Number(waMes?.total        ?? 0);
    const waPrevTotal = Number(waPrevWeek?.total   ?? 0);

    const ingresosSemana         = treasuryIngSemana > 0 ? treasuryIngSemana : waIngSemana;
    const ingresosMes            = treasuryIngMes    > 0 ? treasuryIngMes    : waIngMes;
    const ingresosSemanaAnterior = waPrevTotal > 0 ? waPrevTotal : waIngDidi;

    const cobrosPendientes = Array.isArray(cobrosPendientesRows)
      ? cobrosPendientesRows.map((r) => ({
          nombre:   String(r.nombre),
          telefono: String(r.telefono || ''),
          monto:    Number(r.monto),
          semana:   String(r.semana || ''),
        }))
      : [];

    const totalVehiculos = Number(vehicleStats?.total ?? 0);
    const vehiculosActivos = Number(vehicleStats?.activos ?? 0);
    const vehiculosInactivos = Number(vehicleStats?.inactivos ?? 0);

    const stats = {
      vehiculosActivos,
      vehiculosMantenimiento:  Number(vehicleStats?.en_taller   ?? 0),
      vehiculosDisponibles:    Number(vehicleStats?.disponibles ?? 0),
      vehiculosInactivos,
      totalVehiculos,
      choferes:                Number(driverStats?.total        ?? 0),
      choferesActivos:         Number(driverStats?.activos      ?? 0),
      ingresosSemana,
      ingresosSemanaAnterior,
      ingresosMes,
      utilidadMes:             ingresosMes - egresosMes,
      alertas:                 alerts.length,
      tasaOcupacion:           totalVehiculos > 0
        ? Math.round((vehiculosActivos / totalVehiculos) * 100)
        : 0,
      candidatosPipeline:      Number(candidateStats?.pipeline  ?? 0),
      pagosVencidos:           cobrosPendientes.length,
      vehiculosSinChofer:      Number(vehicleStats?.disponibles ?? 0),
      mantenimientosActivos:   Number(maintenanceStats?.activas ?? 0),
      viajesSemana:            waViajes,
      didiIngresosSemana:      waIngDidi,
      cobradoSemana:           Number(cobradoSemanaRow?.cobrado ?? 0),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fleetRosterMapped = (fleetRoster as any[]).map((r) => ({
      vehicleId:       String(r.vehicle_id),
      eco:             String(r.eco),
      brand:           String(r.brand),
      model:           String(r.model),
      year:            Number(r.vehicle_year),
      plates:          String(r.plates),
      kmActual:        Number(r.km_actual ?? 0),
      weeklyRent:      Number(r.weekly_rent ?? 0),
      vehicleStatus:   String(r.vehicle_status),
      driver:          String(r.driver),
      driverPhone:     String(r.driver_phone ?? ''),
      insurer:         r.insurer ? String(r.insurer) : null,
      policyNumber:    r.policy_number ? String(r.policy_number) : null,
      expiryDate:      r.expiry_date ? String(r.expiry_date) : null,
      insuranceStatus: String(r.insurance_status),
      ingresos4sem:    Number(r.ingresos_4sem ?? 0),
    }))

    const insuranceAlertCount = fleetRosterMapped.filter(
      v => v.insuranceStatus === 'vencida' || v.insuranceStatus === 'sin_poliza'
    ).length

    // ── Mapear Recibo JP ──────────────────────────────────────────────────────
    const fmtDateISO = (d: unknown): string | null => {
      if (!d) return null;
      if (d instanceof Date) return d.toISOString().split('T')[0];
      const s = String(d);
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
      try { return new Date(s).toISOString().split('T')[0]; } catch { return null; }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reciboJPMapped = (reciboJPRows as any[]).map(r => ({
      vehicleId:             String(r.vehicle_id),
      eco:                   String(r.eco),
      brand:                 String(r.brand),
      model:                 String(r.model),
      plates:                String(r.plates),
      vehicleStatus:         String(r.vehicle_status ?? 'active'),
      kmActual:              Number(r.km_actual       ?? 0),
      weeklyRent:            Number(r.weekly_rent     ?? 0),
      waGroupLink:           r.wa_group_link ? String(r.wa_group_link) : null,
      chofer:                String(r.chofer),
      choferPhone:           String(r.chofer_phone    ?? ''),
      weekStart:             fmtDateISO(r.week_start),
      weeklyAccountId:       r.weekly_account_id ? String(r.weekly_account_id) : null,
      efectivo:              Number(r.efectivo         ?? 0),
      banco:                 Number(r.banco            ?? 0),
      contabilidad:          Number(r.contabilidad     ?? 0),
      viajes:                Number(r.viajes           ?? 0),
      waStatus:              String(r.wa_status        ?? 'pending'),
      retiroConfirmado:      Boolean(r.retiro_confirmado),
      retiroComprobanteUrl:  r.retiro_comprobante_url ? String(r.retiro_comprobante_url) : null,
    }))
    const rjTotalEfectivo       = reciboJPMapped.reduce((s, r) => s + r.efectivo,     0)
    const rjTotalBanco          = reciboJPMapped.reduce((s, r) => s + r.banco,         0)
    const rjTotalContabilidad   = reciboJPMapped.reduce((s, r) => s + r.contabilidad,  0)
    const rjWeekStart           = reciboJPMapped.find(r => r.weekStart)?.weekStart ?? null
    const reciboJP = {
      weekStart:              rjWeekStart,
      rows:                   reciboJPMapped,
      totalEfectivo:          rjTotalEfectivo,
      totalBanco:             rjTotalBanco,
      totalContabilidad:      rjTotalContabilidad,
      totalRetiroSinTarjeta:  rjTotalEfectivo + rjTotalContabilidad,
      totalSemana:            rjTotalEfectivo + rjTotalBanco + rjTotalContabilidad,
    }

    return NextResponse.json({
      stats: { ...stats, rentaCapacity: Number(rentaCapacity?.total ?? 0), insuranceAlertCount },
      revenueByVehicle,
      alerts,
      recruitmentFunnel,
      maintenanceUpcoming,
      cobrosPendientes,
      weeklyHistory,
      fleetRoster: fleetRosterMapped,
      reciboJP,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      kmAlerts: (kmAlertRows as any[]).map(r => ({
        eco:               String(r.eco),
        plates:            String(r.plates),
        kmActual:          Number(r.km_actual          ?? 0),
        kmUltimaRevision:  Number(r.km_ultima_revision ?? 0),
        kmDesdeRevision:   Number(r.km_desde_revision  ?? 0),
      })),
    });
  } catch (err) {
    console.error('[dashboard] Error:', err);
    return NextResponse.json({ message: 'Error al cargar dashboard' }, { status: 500 });
  }
}
