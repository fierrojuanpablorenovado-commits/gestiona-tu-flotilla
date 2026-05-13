import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendWhatsApp, WhatsAppTemplates } from '@/lib/whatsapp';

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface TenantRow {
  id: number;
  company_name: string;
  phone?: string | null;
}

interface TreasurySummaryRow {
  total_income: string | number;
  total_expenses: string | number;
  pending_payments: string | number;
}

interface MaintenanceAlertRow {
  count: string | number;
}

interface InsuranceAlertRow {
  count: string | number;
}

// ─── Crear tabla si no existe ─────────────────────────────────────────────────

async function ensureWeeklyReportsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS weekly_reports (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      week_start DATE NOT NULL,
      total_income DECIMAL(12,2) DEFAULT 0,
      total_expenses DECIMAL(12,2) DEFAULT 0,
      pending_payments INTEGER DEFAULT 0,
      maintenance_alerts INTEGER DEFAULT 0,
      insurance_alerts INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

// ─── Lógica principal del reporte ─────────────────────────────────────────────

async function generateReportForTenant(tenant: TenantRow, weekStart: Date) {
  const tenantId = tenant.id;

  // Ingresos y gastos de los últimos 7 días
  const [summary] = await sql`
    SELECT
      COALESCE(SUM(monto) FILTER (WHERE tipo = 'ingreso' AND status = 'completed'), 0)::float AS total_income,
      COALESCE(SUM(monto) FILTER (WHERE tipo = 'egreso'  AND status = 'completed'), 0)::float AS total_expenses,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_payments
    FROM treasury_transactions
    WHERE tenant_id = ${tenantId}
      AND fecha >= ${weekStart.toISOString().split('T')[0]}::date
  ` as TreasurySummaryRow[];

  // Mantenimientos próximos (7 días)
  let maintenanceAlerts = 0;
  try {
    const [maint] = await sql`
      SELECT COUNT(*)::int AS count
      FROM maintenance_orders
      WHERE tenant_id = ${tenantId}
        AND status = 'pendiente'
        AND scheduled_date <= NOW() + INTERVAL '7 days'
        AND scheduled_date >= NOW()
    ` as MaintenanceAlertRow[];
    maintenanceAlerts = Number(maint?.count ?? 0);
  } catch {
    // Tabla puede no existir aún
  }

  // Seguros por vencer (30 días)
  let insuranceAlerts = 0;
  try {
    const [insur] = await sql`
      SELECT COUNT(*)::int AS count
      FROM vehicle_insurance
      WHERE tenant_id = ${tenantId}
        AND expiry_date <= NOW() + INTERVAL '30 days'
        AND expiry_date >= NOW()
    ` as InsuranceAlertRow[];
    insuranceAlerts = Number(insur?.count ?? 0);
  } catch {
    // Tabla puede no existir aún
  }

  const totalIncome = Number(summary?.total_income ?? 0);
  const totalExpenses = Number(summary?.total_expenses ?? 0);
  const pendingPayments = Number(summary?.pending_payments ?? 0);

  // Guardar reporte en BD
  await sql`
    INSERT INTO weekly_reports
      (tenant_id, week_start, total_income, total_expenses, pending_payments, maintenance_alerts, insurance_alerts)
    VALUES
      (${tenantId}, ${weekStart.toISOString().split('T')[0]}, ${totalIncome}, ${totalExpenses}, ${pendingPayments}, ${maintenanceAlerts}, ${insuranceAlerts})
  `;

  // Crear notificación en tabla notifications
  await sql`
    INSERT INTO notifications
      (tenant_id, type, title, message, severity)
    VALUES
      (
        ${tenantId},
        'weekly_report',
        'Reporte semanal generado',
        ${`Semana del ${weekStart.toLocaleDateString('es-MX')} — Ingresos: $${totalIncome.toLocaleString()} | Gastos: $${totalExpenses.toLocaleString()} | Pendientes: ${pendingPayments}`},
        'info'
      )
  `;

  // Enviar WhatsApp si el tenant tiene teléfono configurado
  if (tenant.phone) {
    const msg = WhatsAppTemplates.weeklyReport(
      tenant.company_name,
      totalIncome,
      totalExpenses,
      pendingPayments
    );
    await sendWhatsApp(tenant.phone, msg);
  }

  return { totalIncome, totalExpenses, pendingPayments, maintenanceAlerts, insuranceAlerts };
}

// ─── GET: llamado por Vercel Cron (o manualmente) ─────────────────────────────

export async function GET(request: NextRequest) {
  // 1. Verificar autorización del cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureWeeklyReportsTable();

    // 2. Obtener todos los tenants activos
    const tenants = await sql`
      SELECT id, company_name, phone
      FROM tenants
      WHERE status = 'active'
      ORDER BY id
    ` as TenantRow[];

    // 3. Calcular inicio de semana actual (lunes)
    const now = new Date();
    const day = now.getDay(); // 0=dom, 1=lun, ...
    const diffToMonday = (day === 0 ? -6 : 1 - day);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    // 4. Procesar cada tenant
    const results: Array<{ tenantId: number; company: string; ok: boolean; data?: Record<string, number>; error?: string }> = [];

    for (const tenant of tenants) {
      try {
        const data = await generateReportForTenant(tenant, weekStart);
        results.push({ tenantId: tenant.id, company: tenant.company_name, ok: true, data });
      } catch (err) {
        results.push({
          tenantId: tenant.id,
          company: tenant.company_name,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // 5. Retornar resumen de ejecución
    const successful = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;

    return NextResponse.json({
      ok: true,
      weekStart: weekStart.toISOString().split('T')[0],
      tenantsProcessed: tenants.length,
      successful,
      failed,
      results,
    });
  } catch (err) {
    console.error('[cron/weekly-report] Error:', err);
    return NextResponse.json({ error: 'Error interno del cron' }, { status: 500 });
  }
}

// ─── POST: versión manual (llamada desde el dashboard) ───────────────────────

export async function POST(request: NextRequest) {
  // Para uso manual desde el dashboard — requiere sesión de usuario
  // Importamos dinámicamente para no cargar el módulo en el cron
  const { getSessionUser } = await import('@/lib/session');
  const session = await getSessionUser(request as NextRequest);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    await ensureWeeklyReportsTable();

    const tenantId = Number(session.tenantId);

    const tenants = await sql`
      SELECT id, company_name, phone
      FROM tenants
      WHERE id = ${tenantId} AND status = 'active'
    ` as TenantRow[];

    if (!tenants.length) {
      return NextResponse.json({ error: 'Tenant no encontrado o inactivo' }, { status: 404 });
    }

    const now = new Date();
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1 - day);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const data = await generateReportForTenant(tenants[0], weekStart);

    return NextResponse.json({
      ok: true,
      weekStart: weekStart.toISOString().split('T')[0],
      data,
    });
  } catch (err) {
    console.error('[cron/weekly-report POST] Error:', err);
    return NextResponse.json({ error: 'Error generando reporte' }, { status: 500 });
  }
}
