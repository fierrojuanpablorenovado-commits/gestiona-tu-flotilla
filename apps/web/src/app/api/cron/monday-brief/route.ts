/**
 * /api/cron/monday-brief
 *
 * Cron de lunes 9AM — genera un brief ejecutivo inteligente por tenant.
 * Para cada tenant activo:
 *   1. Recopila métricas reales de la semana (vehículos, choferes, cuentas, seguros, etc.)
 *   2. Llama a GPT-4o-mini para producir un párrafo narrativo contextual
 *   3. Inserta una notificación enriquecida en el dashboard
 *   4. Envía email HTML al admin_general del tenant
 *
 * Autenticación: header Authorization: Bearer $CRON_SECRET (Vercel lo pone automáticamente)
 * Variables requeridas: CRON_SECRET, OPENAI_API_KEY (opcional — si no hay, usa fallback)
 * Variables opcionales: RESEND_API_KEY, EMAIL_FROM
 *
 * NO toca: FleetAdvisor, cron weekly-report, cron generar-semana.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql }                        from '@/lib/db';
import { sendEmail, emailMondayBrief, type MondayBriefData } from '@/lib/email';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface TenantRow {
  id:   string;
  name: string;
}

interface AdminRow {
  email:      string;
  first_name: string;
}

interface MetricsResult {
  vehiculosActivos:         number;
  vehiculosTaller:          number;
  choferes:                 number;
  cuentasPagadas:           number;
  cuentasPendientes:        number;
  ingresosSemana:           number;
  segurosPorVencer:         number;
  mantenimientosPendientes: number;
  infraccionesNuevas:       number;
}

// ── Helper: semana anterior (lun–dom) ─────────────────────────────────────────

function getLastWeekRange(): { start: string; end: string; label: string } {
  const now   = new Date();
  const day   = now.getDay(); // 0=dom … 6=sáb
  const diff  = day === 0 ? -6 : 1 - day; // días hasta el último lunes

  const lastMon = new Date(now);
  lastMon.setDate(now.getDate() + diff - 7);
  lastMon.setHours(0, 0, 0, 0);

  const lastSun = new Date(lastMon);
  lastSun.setDate(lastMon.getDate() + 6);

  const fmt = (d: Date) =>
    d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

  return {
    start: lastMon.toISOString().slice(0, 10),
    end:   lastSun.toISOString().slice(0, 10),
    label: `${fmt(lastMon)} – ${fmt(lastSun)}`,
  };
}

// ── Recopilar métricas del tenant ─────────────────────────────────────────────

async function getTenantMetrics(tenantId: string, weekStart: string): Promise<MetricsResult> {
  const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try { return await fn(); } catch { return fallback; }
  };

  // Vehículos
  const [vehicles] = await safe(() => sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'active')::int  AS activos,
      COUNT(*) FILTER (WHERE status = 'workshop')::int AS taller
    FROM vehicles WHERE tenant_id = ${tenantId}
  `, [{ activos: 0, taller: 0 }]);

  // Choferes activos
  const [drivers] = await safe(() => sql`
    SELECT COUNT(*)::int AS activos
    FROM drivers WHERE tenant_id = ${tenantId} AND status = 'active'
  `, [{ activos: 0 }]);

  // Cuentas semanales de la semana pasada
  const [accounts] = await safe(() => sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'paid')::int    AS pagadas,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pendientes,
      COALESCE(SUM(
        COALESCE(uber_income,0) + COALESCE(didi_income,0) +
        COALESCE(indriver_income,0) + COALESCE(other_income,0)
      ), 0)::float AS ingresos
    FROM weekly_accounts
    WHERE tenant_id = ${tenantId}
      AND week_start = ${weekStart}::date
  `, [{ pagadas: 0, pendientes: 0, ingresos: 0 }]);

  // Seguros por vencer en 30 días
  const [insurance] = await safe(() => sql`
    SELECT COUNT(*)::int AS count
    FROM vehicle_insurance
    WHERE tenant_id   = ${tenantId}
      AND expiry_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
  `, [{ count: 0 }]);

  // Mantenimientos pendientes/en taller
  const [maintenance] = await safe(() => sql`
    SELECT COUNT(*)::int AS count
    FROM maintenance_orders
    WHERE tenant_id = ${tenantId}
      AND status IN ('Programado', 'En reparacion', 'En diagnostico', 'Esperando refacciones')
  `, [{ count: 0 }]);

  // Infracciones de la última semana
  const [infractions] = await safe(() => sql`
    SELECT COUNT(*)::int AS count
    FROM infracciones
    WHERE tenant_id  = ${tenantId}
      AND created_at >= ${weekStart}::date
  `, [{ count: 0 }]);

  return {
    vehiculosActivos:         Number((vehicles as Record<string,unknown>)?.activos        ?? 0),
    vehiculosTaller:          Number((vehicles as Record<string,unknown>)?.taller         ?? 0),
    choferes:                 Number((drivers  as Record<string,unknown>)?.activos        ?? 0),
    cuentasPagadas:           Number((accounts as Record<string,unknown>)?.pagadas        ?? 0),
    cuentasPendientes:        Number((accounts as Record<string,unknown>)?.pendientes     ?? 0),
    ingresosSemana:           Number((accounts as Record<string,unknown>)?.ingresos       ?? 0),
    segurosPorVencer:         Number((insurance   as Record<string,unknown>)?.count       ?? 0),
    mantenimientosPendientes: Number((maintenance as Record<string,unknown>)?.count       ?? 0),
    infraccionesNuevas:       Number((infractions as Record<string,unknown>)?.count       ?? 0),
  };
}

// ── Generar brief con GPT-4o-mini ─────────────────────────────────────────────

async function generateBriefText(empresa: string, m: MetricsResult): Promise<string> {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) return generateFallbackBrief(m);

  const prompt = `Eres el asesor de flotillas de "${empresa}". Escribe UN SOLO párrafo (3-4 oraciones, máx 120 palabras) en español, tono profesional y directo, con el análisis más importante de esta semana basado en estos datos:

- Vehículos activos: ${m.vehiculosActivos} (${m.vehiculosTaller} en taller)
- Choferes activos: ${m.choferes}
- Ingresos semana anterior: $${m.ingresosSemana.toLocaleString('es-MX')} MXN
- Cuentas pagadas: ${m.cuentasPagadas} | Pendientes: ${m.cuentasPendientes}
- Seguros por vencer (30 días): ${m.segurosPorVencer}
- Mantenimientos pendientes: ${m.mantenimientosPendientes}
- Infracciones nuevas: ${m.infraccionesNuevas}

Destaca lo más urgente primero. Si todo está bien, dilo con confianza. No uses listas, solo prosa.`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:       'gpt-4o-mini',
        messages:    [{ role: 'user', content: prompt }],
        max_tokens:  200,
        temperature: 0.6,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return generateFallbackBrief(m);
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content?.trim() || generateFallbackBrief(m);
  } catch {
    return generateFallbackBrief(m);
  }
}

function generateFallbackBrief(m: MetricsResult): string {
  const parts: string[] = [];

  if (m.cuentasPendientes > 0)
    parts.push(`Tienes ${m.cuentasPendientes} cuenta${m.cuentasPendientes !== 1 ? 's' : ''} pendiente${m.cuentasPendientes !== 1 ? 's' : ''} de cobro esta semana — es la prioridad número uno.`);

  if (m.segurosPorVencer > 0)
    parts.push(`${m.segurosPorVencer} seguro${m.segurosPorVencer !== 1 ? 's' : ''} vence${m.segurosPorVencer !== 1 ? 'n' : ''} en los próximos 30 días; revísalos antes del fin de semana.`);

  if (m.mantenimientosPendientes > 0)
    parts.push(`Hay ${m.mantenimientosPendientes} mantenimiento${m.mantenimientosPendientes !== 1 ? 's' : ''} pendiente${m.mantenimientosPendientes !== 1 ? 's' : ''} — no los dejes pasar para evitar fallas en calle.`);

  if (m.ingresosSemana > 0)
    parts.push(`La flotilla generó $${m.ingresosSemana.toLocaleString('es-MX')} en ingresos la semana pasada con ${m.vehiculosActivos} unidades activas.`);

  if (parts.length === 0)
    parts.push(`Tu flotilla de ${m.vehiculosActivos} unidades y ${m.choferes} choferes arranca la semana sin alertas urgentes. Buen inicio.`);

  return parts.join(' ');
}

// ── Insertar notificación en el dashboard ─────────────────────────────────────

async function createDashboardNotification(
  tenantId: string,
  briefTexto: string,
  m: MetricsResult,
  weekLabel: string,
): Promise<void> {
  const alertCount =
    (m.cuentasPendientes > 0 ? 1 : 0) +
    (m.segurosPorVencer   > 0 ? 1 : 0) +
    (m.mantenimientosPendientes > 0 ? 1 : 0) +
    (m.infraccionesNuevas > 0 ? 1 : 0) +
    (m.vehiculosTaller    > 0 ? 1 : 0);

  const severity = alertCount >= 3 ? 'warning' : alertCount > 0 ? 'info' : 'success';
  const title    = `📋 Brief del lunes — Semana ${weekLabel}`;
  const message  = briefTexto.length > 300 ? briefTexto.slice(0, 297) + '...' : briefTexto;

  await sql`
    INSERT INTO notifications (tenant_id, type, title, message, severity)
    VALUES (
      ${tenantId},
      'monday_brief',
      ${title},
      ${message},
      ${severity}
    )
  `;
}

// ── Procesar un tenant ────────────────────────────────────────────────────────

async function processTenant(
  tenant: TenantRow,
  weekStart: string,
  weekLabel: string,
): Promise<{ ok: boolean; emailSent: boolean; error?: string }> {
  // 1. Obtener email del admin_general
  const admins = await sql`
    SELECT email, first_name
    FROM users
    WHERE tenant_id = ${tenant.id}
      AND role      = 'admin_general'
      AND active    = true
    LIMIT 1
  ` as AdminRow[];

  const admin = admins[0];

  // 2. Recopilar métricas
  const metrics = await getTenantMetrics(tenant.id, weekStart);

  // 3. Generar brief con IA
  const briefTexto = await generateBriefText(tenant.name, metrics);

  // 4. Notificación en dashboard
  await createDashboardNotification(tenant.id, briefTexto, metrics, weekLabel);

  // 5. Email al admin (si existe)
  let emailSent = false;
  if (admin?.email) {
    const briefData: MondayBriefData = {
      empresa:                  tenant.name,
      nombre:                   admin.first_name || 'Administrador',
      semana:                   weekLabel,
      briefTexto,
      vehiculosActivos:         metrics.vehiculosActivos,
      vehiculosTaller:          metrics.vehiculosTaller,
      choferes:                 metrics.choferes,
      cuentasPagadas:           metrics.cuentasPagadas,
      cuentasPendientes:        metrics.cuentasPendientes,
      ingresosSemana:           metrics.ingresosSemana,
      segurosPorVencer:         metrics.segurosPorVencer,
      mantenimientosPendientes: metrics.mantenimientosPendientes,
      infraccionesNuevas:       metrics.infraccionesNuevas,
    };

    emailSent = await sendEmail({
      to:      admin.email,
      subject: `📋 Brief del lunes — ${tenant.name} — ${weekLabel}`,
      html:    emailMondayBrief(briefData),
    });
  }

  return { ok: true, emailSent };
}

// ── GET — llamado por Vercel Cron ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { start: weekStart, label: weekLabel } = getLastWeekRange();

  try {
    // Obtener todos los tenants con datos (excluir tenant demo)
    const tenants = await sql`
      SELECT id, name
      FROM tenants
      WHERE slug != 'demo'
        AND EXISTS (
          SELECT 1 FROM vehicles v WHERE v.tenant_id = tenants.id
        )
      ORDER BY id
    ` as TenantRow[];

    const results: Array<{
      tenant: string;
      ok: boolean;
      emailSent?: boolean;
      error?: string;
    }> = [];

    for (const tenant of tenants) {
      try {
        const result = await processTenant(tenant, weekStart, weekLabel);
        results.push({ tenant: tenant.name, ...result });
      } catch (err) {
        results.push({
          tenant: tenant.name,
          ok:     false,
          error:  err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({
      ok:          true,
      weekStart,
      weekLabel,
      processed:   tenants.length,
      successful:  results.filter(r => r.ok).length,
      failed:      results.filter(r => !r.ok).length,
      emailsSent:  results.filter(r => r.emailSent).length,
      results,
    });
  } catch (err) {
    console.error('[cron/monday-brief] Error fatal:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// ── POST — disparo manual desde el dashboard ──────────────────────────────────

export async function POST(request: NextRequest) {
  const { getSessionUser } = await import('@/lib/session');
  const session = await getSessionUser(request as NextRequest);

  if (!session?.tenantId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { start: weekStart, label: weekLabel } = getLastWeekRange();

  try {
    const tenants = await sql`
      SELECT id, name FROM tenants WHERE id = ${session.tenantId} LIMIT 1
    ` as TenantRow[];

    if (!tenants[0]) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }

    const result = await processTenant(tenants[0], weekStart, weekLabel);

    return NextResponse.json({
      weekStart,
      weekLabel,
      ...result,
    });
  } catch (err) {
    console.error('[monday-brief POST] Error:', err);
    return NextResponse.json({ error: 'Error generando brief' }, { status: 500 });
  }
}
