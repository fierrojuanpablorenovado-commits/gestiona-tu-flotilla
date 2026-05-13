import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const tid = String(session.tenantId);
    const rawId = String(params.id);

    // ── Notificación de cuenta semanal de chofer (id = "wa_FECHA") ────────────
    if (rawId.startsWith('wa_')) {
      const weekStart = rawId.slice(3); // quitar "wa_"
      const [driver] = await sql`
        SELECT id FROM drivers
        WHERE user_id = ${session.id} AND tenant_id = ${tid}
        LIMIT 1
      `.catch(() => [null]);

      if (driver) {
        await sql`
          UPDATE weekly_accounts
          SET notified_driver = TRUE
          WHERE driver_id  = ${driver.id}
            AND tenant_id  = ${tid}
            AND week_start = ${weekStart}
        `.catch(() => {});
      }
      return NextResponse.json({ ok: true });
    }

    // ── Alerta de flotilla (fleet_alerts) → dismissed_at ─────────────────────
    const notifId = Number(rawId);
    if (isNaN(notifId)) {
      return NextResponse.json({ ok: true }); // ID desconocido, ignorar silenciosamente
    }

    await sql`
      UPDATE fleet_alerts
      SET dismissed_at = NOW()
      WHERE id = ${notifId} AND tenant_id::text = ${tid}
    `.catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Notifications] PATCH read error:', err);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
