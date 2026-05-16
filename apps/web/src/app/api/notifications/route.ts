import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

// ── Mapeo de tipo interno → tipo visual ───────────────────────────────────────
function mapTipo(tipo: string): string {
  if (tipo.includes('SEGURO'))        return 'insurance';
  if (tipo.includes('MANTENIMIENTO')) return 'maintenance';
  if (tipo.includes('PAGO'))          return 'payment';
  if (tipo.includes('VEHICULO'))      return 'alert';
  return 'alert';
}

function mapSeveridad(sev: string): 'danger' | 'warning' | 'info' {
  if (sev === 'alta')  return 'danger';
  if (sev === 'media') return 'warning';
  return 'info';
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  } catch { return iso; }
}

// ── GET: notificaciones según rol ─────────────────────────────────────────────
// • chofer    → weekly_accounts con notified_driver = FALSE
// • otros     → fleet_alerts activas (dismissed_at IS NULL)

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json([], { status: 200 });
    }

    const tid = String(session.tenantId);

    // ── Chofer: cuentas nuevas sin ver ────────────────────────────────────────
    if (session.role === 'chofer') {
      const [driver] = await sql`
        SELECT id FROM drivers
        WHERE user_id = ${session.id} AND tenant_id = ${tid}
        LIMIT 1
      `.catch(() => [null]);

      if (!driver) return NextResponse.json([]);

      // Asegurar columna (safe)
      await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS notified_driver BOOLEAN DEFAULT FALSE`.catch(() => {});

      const accounts = await sql`
        SELECT week_start, week_end
        FROM weekly_accounts
        WHERE driver_id = ${driver.id}
          AND tenant_id = ${tid}
          AND notified_driver = FALSE
        ORDER BY week_start DESC
      `.catch(() => []);

      return NextResponse.json(accounts.map((a: any) => ({
        id:        `wa_${a.week_start}`,
        type:      'payment',
        title:     'Nueva cuenta semanal 📊',
        message:   `Semana del ${fmtDate(a.week_start)} — toca para ver tus ingresos`,
        severity:  'info',
        read:      false,
        link:      '/mis-ingresos',
        createdAt: a.week_start,
      })));
    }

    // ── Admin / Operaciones / Mecánico / etc.: fleet_alerts ───────────────────
    const rows = await sql`
      SELECT
        id::text,
        tipo,
        mensaje,
        severidad,
        created_at
      FROM fleet_alerts
      WHERE tenant_id::text = ${tid}
        AND dismissed_at IS NULL
        AND (
          -- Alertas no-GPS siempre visibles hasta que se descarten
          tipo NOT ILIKE '%GPS%'
          -- Alertas GPS: solo las de los últimos 90 min (evita acumulación de cron stale)
          OR created_at > NOW() - INTERVAL '90 minutes'
        )
      ORDER BY
        CASE severidad WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END,
        created_at DESC
      LIMIT 20
    `.catch(() => []);

    return NextResponse.json(rows.map((n: any) => ({
      id:        String(n.id),
      type:      mapTipo(String(n.tipo)),
      title:     String(n.mensaje ?? '').split(' — ')[0] ?? String(n.tipo),
      message:   String(n.mensaje ?? ''),
      severity:  mapSeveridad(String(n.severidad ?? 'baja')),
      read:      false,
      createdAt: n.created_at,
    })));

  } catch (err) {
    console.error('[Notifications] GET error:', err);
    return NextResponse.json([], { status: 200 });
  }
}

// ── PATCH: descartar alerta (body: { id: string | 'all' }) ───────────────────
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const tid = String(session.tenantId);
    const body = await req.json().catch(() => ({}));
    const { id } = body as { id?: string };

    if (id === 'all') {
      await sql`
        UPDATE fleet_alerts
        SET dismissed_at = NOW()
        WHERE tenant_id::text = ${tid}
          AND dismissed_at IS NULL
      `.catch(() => {});
    } else if (id) {
      await sql`
        UPDATE fleet_alerts
        SET dismissed_at = NOW()
        WHERE id = ${Number(id)} AND tenant_id::text = ${tid}
      `.catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Notifications] PATCH error:', err);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}

// ── DELETE: descartar todas las alertas del tenant ────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }
    const tid = String(session.tenantId);
    await sql`
      UPDATE fleet_alerts
      SET dismissed_at = NOW()
      WHERE tenant_id::text = ${tid}
        AND dismissed_at IS NULL
    `.catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Notifications] DELETE error:', err);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}

