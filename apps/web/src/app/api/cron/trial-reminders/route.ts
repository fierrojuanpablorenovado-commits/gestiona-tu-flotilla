import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendEmail, emailTrialReminder } from '@/lib/email';
import { sendWhapiMessage, WhatsAppTemplates } from '@/lib/whatsapp';

const APP_URL   = process.env.NEXT_PUBLIC_APP_URL || 'https://gestiona-tu-flotilla.vercel.app';
const PLANES_URL = `${APP_URL}/planes`;

/**
 * Cron diario 9:00 AM CDT
 * Secuencia de retención de trial — Email + WhatsApp
 *
 * D-7  → Email + WhatsApp
 * D-3  → Email + WhatsApp
 * D-1  → Email + WhatsApp
 * D+0  → Email + WhatsApp  (día que vence)
 * D+3  → Email + WhatsApp  (último intento)
 *
 * Deduplicación via trial_reminder_sent (array texto en tenants).
 * GET /api/cron/trial-reminders
 * Authorization: Bearer {CRON_SECRET}
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const log: string[] = [];
  let emailsEnviados  = 0;
  let wasEnviados     = 0;
  let revisados       = 0;

  try {
    // Asegurar columnas necesarias
    await Promise.all([
      sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at DATE`.catch(() => {}),
      sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_reminder_sent TEXT[] DEFAULT '{}'`.catch(() => {}),
    ]);

    // Traer tenants con trial en ventana D-8 a D+4
    const tenants = await sql`
      SELECT
        t.id,
        t.name        AS empresa,
        t.plan,
        t.trial_ends_at,
        COALESCE(t.trial_reminder_sent, '{}') AS reminder_sent,
        u.email,
        u.first_name  AS nombre,
        u.phone
      FROM tenants t
      JOIN users u ON u.tenant_id = t.id
        AND u.role = 'admin_general'
        AND u.active = true
      WHERE t.trial_ends_at IS NOT NULL
        AND t.trial_ends_at >= (CURRENT_DATE - INTERVAL '4 days')
        AND t.trial_ends_at <= (CURRENT_DATE + INTERVAL '8 days')
      ORDER BY t.trial_ends_at ASC
    `.catch(() => []);

    revisados = tenants.length;

    // Hitos: positivo = días antes de vencer; negativo = días después
    // Los mapeamos como: diasRestantes = trialDate - hoy
    // D-7 → diasRestantes === 7
    // D+3 → diasRestantes === -3
    const HITOS: { key: string; dias: number; canales: ('email' | 'wa')[] }[] = [
      { key: 'd7',    dias:  7, canales: ['email', 'wa'] },
      { key: 'd3',    dias:  3, canales: ['email', 'wa'] },
      { key: 'd1',    dias:  1, canales: ['email', 'wa'] },
      { key: 'd0',    dias:  0, canales: ['email', 'wa'] },
      { key: 'd-3',   dias: -3, canales: ['email', 'wa'] },
    ];

    for (const t of tenants) {
      const trialDate     = new Date(String(t.trial_ends_at).slice(0, 10) + 'T12:00:00');
      const hoy           = new Date();
      const diasRestantes = Math.round((trialDate.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      const reminderSent  = (t.reminder_sent as string[]) ?? [];

      for (const hito of HITOS) {
        if (diasRestantes !== hito.dias) continue;
        if (reminderSent.includes(hito.key)) continue; // ya enviado este hito

        const sentKeys: string[] = [];

        // ── Email ──────────────────────────────────────────────────────────────
        if (hito.canales.includes('email') && t.email) {
          const subject = diasRestantes <= 0
            ? '⛔ Tu prueba de Gestiona tu Flotilla terminó — tus datos siguen guardados'
            : diasRestantes === 1
            ? `⚠️ Último día — activa tu plan hoy en Gestiona tu Flotilla`
            : `⏳ Tu prueba vence en ${diasRestantes} días — Gestiona tu Flotilla`;

          const ok = await sendEmail({
            to:      t.email,
            subject,
            html: emailTrialReminder({
              nombre:        t.nombre,
              empresa:       t.empresa,
              diasRestantes,
              trialEndsAt:   String(t.trial_ends_at).slice(0, 10),
              plan:          t.plan,
            }),
          });

          if (ok) {
            emailsEnviados++;
            sentKeys.push(`email_${hito.key}`);
            log.push(`✉️  ${t.empresa} D${hito.dias >= 0 ? '-' : '+'}${Math.abs(hito.dias)} → ${t.email}`);
          } else {
            log.push(`❌  email ${t.empresa} D${hito.dias} falló`);
          }
        }

        // ── WhatsApp ───────────────────────────────────────────────────────────
        if (hito.canales.includes('wa') && t.phone) {
          let waMsg = '';
          switch (hito.key) {
            case 'd7':
              waMsg = WhatsAppTemplates.trialD7(t.nombre, t.empresa, PLANES_URL);
              break;
            case 'd3':
              waMsg = WhatsAppTemplates.trialD3(t.nombre, t.empresa, PLANES_URL);
              break;
            case 'd1':
              waMsg = WhatsAppTemplates.trialD1(t.nombre, t.empresa, PLANES_URL);
              break;
            case 'd0':
              waMsg = WhatsAppTemplates.trialD0(t.nombre, t.empresa, PLANES_URL);
              break;
            case 'd-3':
              waMsg = WhatsAppTemplates.trialD3post(t.nombre, t.empresa, PLANES_URL);
              break;
          }

          if (waMsg) {
            const waResult = await sendWhapiMessage(t.phone, waMsg);
            if (waResult.ok) {
              wasEnviados++;
              sentKeys.push(`wa_${hito.key}`);
              log.push(`📱  ${t.empresa} D${hito.dias >= 0 ? '-' : '+'}${Math.abs(hito.dias)} WA → ${t.phone}`);
            } else {
              log.push(`❌  WA ${t.empresa} D${hito.dias}: ${waResult.error}`);
            }
          }
        } else if (hito.canales.includes('wa') && !t.phone) {
          log.push(`⚠️  ${t.empresa}: sin teléfono — WA omitido`);
        }

        // Marcar hito completo (email y/o WA)
        if (sentKeys.length > 0) {
          await sql`
            UPDATE tenants
            SET trial_reminder_sent = array_append(
              COALESCE(trial_reminder_sent, '{}'), ${hito.key}
            )
            WHERE id = ${t.id}
          `.catch(() => {});
        }
      }
    }

    // Alerta a JP cuando alguien tiene trial activo y vence pronto
    const urgentes = tenants.filter(t => {
      const d = Math.round((new Date(String(t.trial_ends_at).slice(0,10) + 'T12:00:00').getTime() - Date.now()) / 86400000);
      return d >= 0 && d <= 3;
    });

    if (urgentes.length > 0) {
      const lista = urgentes.map(u => `• ${u.empresa} (plan ${u.plan})`).join('\n');
      await sendEmail({
        to: 'info@jupaficonsultores.com',
        subject: `🔔 ${urgentes.length} trial(s) vencen en ≤3 días — GTF`,
        html: `<div style="font-family:Arial;padding:24px;max-width:480px;">
          <h2 style="color:#dc2626">⚡ Clientes con trial por vencer</h2>
          <p>Los siguientes tenants tienen el trial venciendo en 3 días o menos:</p>
          <pre style="background:#f8fafc;padding:16px;border-radius:8px;font-size:14px;">${lista}</pre>
          <p>Contáctalos directamente para cerrar la conversión.</p>
          <a href="${APP_URL}/super-admin" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Ver panel →</a>
        </div>`,
      }).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      revisados,
      emailsEnviados,
      wasEnviados,
      urgentes: urgentes.length,
      log,
    });

  } catch (err) {
    console.error('[cron/trial-reminders]', err);
    return NextResponse.json({ error: String(err), log }, { status: 500 });
  }
}
