import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/admin/super-stats
 * Panel Super Admin — visión completa de todos los tenants GTF.
 * Protegido por x-admin-secret header.
 */
export async function GET(req: NextRequest) {
  const secret   = req.headers.get('x-admin-secret');
  const expected = process.env.ADMIN_SECRET || 'gtf-admin-secret';
  if (secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Resumen por plan
    const planSummary = await sql`
      SELECT
        plan,
        COUNT(*)::int                                    AS tenants,
        SUM(max_vehicles)::int                           AS max_vehicles_total,
        COUNT(*) FILTER (WHERE trial_ends_at >= CURRENT_DATE)::int AS en_trial,
        COUNT(*) FILTER (WHERE trial_ends_at < CURRENT_DATE OR trial_ends_at IS NULL)::int AS post_trial
      FROM tenants
      GROUP BY plan
      ORDER BY plan
    `.catch(() => []);

    // MRR estimado
    const MRR_PER_PLAN: Record<string, number> = { basic: 999, pro: 1999, enterprise: 2999 };

    // Paso 1: todos los tenants base
    const tenantBase = await sql`
      SELECT id, name AS empresa, plan, max_vehicles, trial_ends_at, created_at,
             COALESCE(trial_reminder_sent, '{}') AS reminders_sent
      FROM tenants
      ORDER BY created_at DESC
    `.catch(() => []);

    // Paso 2: admins por tenant (un usuario por tenant)
    const admins = await sql`
      SELECT DISTINCT ON (tenant_id)
        tenant_id, email, first_name AS nombre, phone
      FROM users
      WHERE role IN ('admin_general', 'super_admin')
      ORDER BY tenant_id, created_at ASC
    `.catch(() => []);

    const adminMap = Object.fromEntries(admins.map(a => [String(a.tenant_id), a]));

    // Paso 3: conteo de vehículos
    const vehs = await sql`
      SELECT tenant_id,
             COUNT(*)::int                                     AS total,
             COUNT(*) FILTER (WHERE status != 'inactivo')::int AS activos
      FROM vehicles GROUP BY tenant_id
    `.catch(() => []);
    const vehMap = Object.fromEntries(vehs.map(v => [String(v.tenant_id), v]));

    // Paso 4: conteo de choferes
    const drvs = await sql`
      SELECT tenant_id, COUNT(*)::int AS activos
      FROM drivers WHERE active = true GROUP BY tenant_id
    `.catch(() => []);
    const drvMap = Object.fromEntries(drvs.map(d => [String(d.tenant_id), d]));

    // Paso 5: conteo de cuentas
    const ctas = await sql`
      SELECT tenant_id, COUNT(*)::int AS total
      FROM weekly_accounts GROUP BY tenant_id
    `.catch(() => []);
    const ctaMap = Object.fromEntries(ctas.map(c => [String(c.tenant_id), c]));

    // Unir todo
    const tenants = tenantBase.map(t => ({
      ...t,
      ...(adminMap[String(t.id)] ?? { email: null, nombre: null, phone: null }),
      vehiculos_activos: vehMap[String(t.id)]?.activos  ?? 0,
      vehiculos_total:   vehMap[String(t.id)]?.total    ?? 0,
      choferes_activos:  drvMap[String(t.id)]?.activos  ?? 0,
      cuentas_total:     ctaMap[String(t.id)]?.total    ?? 0,
      ultima_cuenta:     null,
      ultimo_login:      null,
    }));

    const today = new Date();

    const tenantsMapped = tenants.map((t) => {
      // Normalizar trial_ends_at: puede llegar como Date, ISO string o "Sat Jun 06 2026..."
      let trialDate: Date | null = null;
      if (t.trial_ends_at) {
        const raw = t.trial_ends_at instanceof Date
          ? t.trial_ends_at
          : new Date(t.trial_ends_at as string);
        if (!isNaN(raw.getTime())) {
          // Anclar al mediodía UTC para evitar desfases de timezone
          trialDate = new Date(raw.toISOString().slice(0, 10) + 'T12:00:00Z');
        }
      }
      const diasTrial = trialDate !== null
        ? Math.round((trialDate.getTime() - today.getTime()) / 86400000)
        : null;

      let status: 'activo' | 'en_trial' | 'por_vencer' | 'vencido_hoy' | 'vencido' = 'activo';
      if (trialDate) {
        if (diasTrial !== null && diasTrial > 3) status = 'en_trial';
        else if (diasTrial !== null && diasTrial > 0) status = 'por_vencer';
        else if (diasTrial === 0) status = 'vencido_hoy';
        else status = 'vencido';
      }

      const mrr = status === 'activo' ? (MRR_PER_PLAN[t.plan] ?? 0) : 0;
      const mrrPotencial = MRR_PER_PLAN[t.plan] ?? 0;

      return {
        id:             t.id,
        empresa:        t.empresa,
        nombre:         t.nombre,
        email:          t.email,
        phone:          t.phone,
        plan:           t.plan,
        status,
        diasTrial,
        trialEndsAt:    trialDate ? trialDate.toISOString().slice(0, 10) : null,
        vehiculosActivos:  t.vehiculos_activos ?? 0,
        vehiculosTotal:    t.vehiculos_total   ?? 0,
        maxVehicles:       t.max_vehicles,
        choferes:          t.choferes_activos  ?? 0,
        cuentasTotal:      t.cuentas_total     ?? 0,
        ultimaCuenta:      t.ultima_cuenta,
        ultimoLogin:       t.ultimo_login,
        remindersSent:     (t.reminders_sent as string[]) ?? [],
        mrr,
        mrrPotencial,
        createdAt:      t.created_at,
        usoActivo:      (t.vehiculos_activos ?? 0) > 0 || (t.choferes_activos ?? 0) > 0,
      };
    });

    const mrrTotal = tenantsMapped.reduce((sum, t) => sum + t.mrr, 0);
    const mrrPotencialTotal = tenantsMapped.reduce((sum, t) => sum + t.mrrPotencial, 0);

    const porVencer = tenantsMapped.filter(t =>
      t.diasTrial !== null && t.diasTrial >= 0 && t.diasTrial <= 3
    );
    const vencidosRecientes = tenantsMapped.filter(t =>
      t.diasTrial !== null && t.diasTrial < 0 && t.diasTrial >= -7
    );
    const enTrial = tenantsMapped.filter(t => t.status === 'en_trial');

    return NextResponse.json({
      generado: new Date().toISOString(),
      resumen: {
        totalTenants:    tenantsMapped.length,
        mrrEstimado:     mrrTotal,
        mrrPotencial:    mrrPotencialTotal,
        enTrial:         enTrial.length,
        porVencer:       porVencer.length,
        vencidosRecientes: vencidosRecientes.length,
        planDistribucion: planSummary,
      },
      alertas: {
        porVencerHoy: tenantsMapped.filter(t => t.diasTrial === 0),
        urgentes:     porVencer,
        sinActividad: tenantsMapped.filter(t => !t.usoActivo && t.status !== 'vencido'),
      },
      tenants: tenantsMapped,
    });

  } catch (err) {
    console.error('[super-stats]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
