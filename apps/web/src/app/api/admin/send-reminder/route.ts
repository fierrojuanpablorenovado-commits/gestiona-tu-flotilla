import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendEmail, emailTrialReminder } from '@/lib/email';
import { sendWhapiMessage, WhatsAppTemplates } from '@/lib/whatsapp';

const APP_URL    = process.env.NEXT_PUBLIC_APP_URL || 'https://gestiona-tu-flotilla.vercel.app';
const PLANES_URL = `${APP_URL}/planes`;

/**
 * POST /api/admin/send-reminder
 * Envía recordatorio manual de trial (email + WhatsApp) a un tenant.
 * Body: { tenantId: string }
 * Header: x-admin-secret
 */
export async function POST(req: NextRequest) {
  const secret   = req.headers.get('x-admin-secret');
  const expected = process.env.ADMIN_SECRET || 'gtf-admin-secret';
  if (secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { tenantId } = await req.json() as { tenantId: string };
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });
  }

  const rows = await sql`
    SELECT
      t.id, t.name AS empresa, t.plan, t.trial_ends_at,
      u.email, u.first_name AS nombre, u.phone
    FROM tenants t
    JOIN users u ON u.tenant_id = t.id AND u.role = 'admin_general' AND u.active = true
    WHERE t.id = ${tenantId}
    LIMIT 1
  `.catch(() => []);

  if (!rows.length) {
    return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
  }

  const t = rows[0];
  const trialDate     = t.trial_ends_at
    ? new Date(String(t.trial_ends_at).slice(0, 10) + 'T12:00:00')
    : null;
  const diasRestantes = trialDate
    ? Math.round((trialDate.getTime() - Date.now()) / 86400000)
    : 0;

  const emailOk = await sendEmail({
    to: t.email,
    subject: diasRestantes <= 0
      ? '⛔ Reactiva tu cuenta en Gestiona tu Flotilla'
      : `⏳ Tu prueba vence en ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''} — Gestiona tu Flotilla`,
    html: emailTrialReminder({
      nombre:        t.nombre,
      empresa:       t.empresa,
      diasRestantes,
      trialEndsAt:   t.trial_ends_at ? String(t.trial_ends_at).slice(0, 10) : '',
      plan:          t.plan,
    }),
  });

  let waOk = false;
  if (t.phone) {
    const msg = diasRestantes <= 0
      ? WhatsAppTemplates.trialD0(t.nombre, t.empresa, PLANES_URL)
      : diasRestantes <= 1
      ? WhatsAppTemplates.trialD1(t.nombre, t.empresa, PLANES_URL)
      : diasRestantes <= 3
      ? WhatsAppTemplates.trialD3(t.nombre, t.empresa, PLANES_URL)
      : WhatsAppTemplates.trialD7(t.nombre, t.empresa, PLANES_URL);

    const res = await sendWhapiMessage(t.phone, msg);
    waOk = res.ok;
  }

  return NextResponse.json({
    ok: true,
    empresa: t.empresa,
    emailOk,
    waOk,
    phone: t.phone ?? null,
  });
}
