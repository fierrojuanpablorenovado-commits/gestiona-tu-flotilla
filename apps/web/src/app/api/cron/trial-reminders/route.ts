import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendEmail, emailTrialReminder } from '@/lib/email';

/**
 * Cron: diario 9:00am
 * Envía emails de recordatorio de trial a tenants con trial activo:
 *   - 7 días antes de vencer
 *   - 3 días antes de vencer
 *   - 1 día antes de vencer
 *   - El día que vence (día 0)
 *   - 1 día después (ya expirado)
 * Evita reenvíos con la columna trial_reminder_sent (array de días enviados).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    // Asegurar columnas necesarias
    await Promise.all([
      sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at DATE`.catch(() => {}),
      sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_reminder_sent TEXT[] DEFAULT '{}'`.catch(() => {}),
    ]);

    // Obtener tenants con trial activo (± 2 días alrededor de los hitos)
    const tenants = await sql`
      SELECT
        t.id,
        t.name AS empresa,
        t.trial_ends_at,
        COALESCE(t.trial_reminder_sent, '{}') AS reminder_sent,
        u.email,
        u.first_name AS nombre
      FROM tenants t
      JOIN users u ON u.tenant_id = t.id
        AND u.role = 'admin_general'
        AND u.active = true
      WHERE t.trial_ends_at IS NOT NULL
        AND t.trial_ends_at >= (CURRENT_DATE - INTERVAL '2 days')
        AND t.trial_ends_at <= (CURRENT_DATE + INTERVAL '8 days')
      ORDER BY t.trial_ends_at ASC
    `.catch(() => []);

    const HITOS = [7, 3, 1, 0, -1]; // días antes/después del vencimiento
    let enviados = 0;

    for (const t of tenants) {
      const trialDate    = new Date(t.trial_ends_at + 'T00:00:00');
      const diasRestantes = Math.ceil((trialDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const reminderSent  = (t.reminder_sent as string[]) ?? [];

      for (const hito of HITOS) {
        const key = `d${hito}`;
        if (diasRestantes !== hito) continue;
        if (reminderSent.includes(key)) continue; // ya enviado

        const ok = await sendEmail({
          to:      t.email,
          subject: diasRestantes <= 0
            ? '🔒 Tu prueba de Gestiona tu Flotilla terminó'
            : `⏳ Tu prueba vence en ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''} — Gestiona tu Flotilla`,
          html: emailTrialReminder({
            nombre:        t.nombre,
            empresa:       t.empresa,
            diasRestantes,
            trialEndsAt:   String(t.trial_ends_at).slice(0, 10),
          }),
        });

        if (ok) {
          await sql`
            UPDATE tenants
            SET trial_reminder_sent = array_append(COALESCE(trial_reminder_sent, '{}'), ${key})
            WHERE id = ${t.id}
          `.catch(() => {});
          enviados++;
        }
      }
    }

    return NextResponse.json({ ok: true, enviados, revisados: tenants.length });
  } catch (err) {
    console.error('[cron/trial-reminders]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
