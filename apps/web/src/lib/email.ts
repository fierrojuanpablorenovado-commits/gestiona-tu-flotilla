/**
 * Email utility — Gestiona tu Flotilla
 * SMTP Gmail nativo via nodemailer.
 * Variables de entorno (Vercel):
 *   SMTP_USER     = fierro.juanpablorenovado@gmail.com
 *   SMTP_PASS     = rnmukkijlqgjenza   (app password)
 *   EMAIL_FROM    = info@jupaficonsultores.com  (alias Gmail)
 *   NEXT_PUBLIC_APP_URL = https://gestiona-tu-flotilla.vercel.app
 */

import nodemailer from 'nodemailer';

const APP_URL  = process.env.NEXT_PUBLIC_APP_URL || 'https://gestiona-tu-flotilla.vercel.app';
const FROM     = process.env.EMAIL_FROM || 'Gestiona tu Flotilla <info@jupaficonsultores.com>';
const SMTP_USER = process.env.SMTP_USER || 'fierro.juanpablorenovado@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS;

function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (!SMTP_PASS) {
    console.log(`[email] No SMTP_PASS — omitiendo: ${payload.subject} → ${payload.to}`);
    return false;
  }
  try {
    const transporter = createTransporter();
    await transporter.sendMail({ from: FROM, to: payload.to, subject: payload.subject, html: payload.html });
    console.log(`[email] Enviado: ${payload.subject} → ${payload.to}`);
    return true;
  } catch (err) {
    console.error('[email] Error enviando:', err);
    return false;
  }
}

// ── Template: Trial reminder ───────────────────────────────────────────────────

export function emailTrialReminder(opts: {
  nombre: string;
  empresa: string;
  diasRestantes: number;
  trialEndsAt: string;
  plan?: string;
}): string {
  const cta = `${APP_URL}/planes`;
  const vencido = opts.diasRestantes <= 0;
  const fechaFin = new Date(opts.trialEndsAt + 'T00:00:00').toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const planText = opts.plan === 'enterprise'
    ? 'Plan Enterprise — $2,999/mes · 60 vehículos'
    : opts.plan === 'pro'
    ? 'Plan Pro — $1,999/mes · 30 vehículos'
    : 'Plan Starter — $999/mes · 10 vehículos';

  let heroColor = '#2563eb';
  let heroMsg   = `Tu prueba vence en <strong>${opts.diasRestantes} día${opts.diasRestantes !== 1 ? 's' : ''}</strong>`;
  let bodyMsg   = `Activa tu plan antes del <strong>${fechaFin}</strong> para continuar sin interrupciones.`;
  let ctaLabel  = 'Activar mi plan ahora →';

  if (opts.diasRestantes <= 0) {
    heroColor = '#dc2626';
    heroMsg   = '⛔ Tu acceso está pausado';
    bodyMsg   = 'Tu período de prueba terminó. Tus datos siguen guardados — reactiva tu cuenta en menos de 2 minutos.';
    ctaLabel  = 'Reactivar mi cuenta →';
  } else if (opts.diasRestantes <= 1) {
    heroColor = '#ea580c';
    heroMsg   = '⚠️ Último día de prueba';
    bodyMsg   = `Tu acceso se bloqueará mañana. Activa tu plan <strong>hoy mismo</strong> para continuar sin perder nada.`;
    ctaLabel  = 'Activar antes de que sea tarde →';
  } else if (opts.diasRestantes <= 3) {
    heroColor = '#d97706';
    heroMsg   = `🔔 Solo quedan <strong>${opts.diasRestantes} días</strong> de prueba`;
  }

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f1f5f9;margin:0;padding:0;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:24px 32px;">
      <h1 style="color:#fff;font-size:18px;margin:0;">🚗 Gestiona tu Flotilla</h1>
    </div>

    <!-- Hero banner -->
    <div style="background:${heroColor};padding:20px 32px;">
      <p style="color:#fff;font-size:18px;font-weight:700;margin:0;">${heroMsg}</p>
    </div>

    <div style="padding:32px;">
      <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Hola <strong>${opts.nombre}</strong>,
      </p>
      <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Tu cuenta de <strong>${opts.empresa}</strong> está activa y con datos guardados.
        ${bodyMsg}
      </p>

      <!-- Plan recomendado -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 22px;margin:0 0 28px;">
        <p style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;">Tu plan actual</p>
        <p style="color:#1e293b;font-size:15px;font-weight:700;margin:0 0 4px;">${planText}</p>
        <p style="color:#94a3b8;font-size:13px;margin:0;">Sin tarjeta de crédito para activar.</p>
      </div>

      <!-- Opciones -->
      <div style="margin:0 0 28px;">
        <p style="color:#1e293b;font-size:14px;font-weight:700;margin:0 0 12px;">¿Qué quieres hacer?</p>
        <p style="color:#475569;font-size:14px;line-height:2;margin:0;">
          1️⃣ <strong>Activar mi plan</strong> — continuar usando la app<br/>
          2️⃣ <strong>Cambiar de plan</strong> — ver todas las opciones<br/>
          3️⃣ <strong>Hablar con alguien</strong> — resolver dudas
        </p>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin:0 0 28px;">
        <a href="${cta}" style="display:inline-block;background:${heroColor};color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:16px;">
          ${ctaLabel}
        </a>
      </div>

      <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">
        ¿Tienes dudas? Contáctanos a <a href="mailto:info@jupaficonsultores.com" style="color:#2563eb;">info@jupaficonsultores.com</a>
        o responde este correo.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        <strong>Gestiona tu Flotilla</strong> · gestiona-tu-flotilla.vercel.app<br/>
        <a href="${APP_URL}/planes" style="color:#64748b;">Ver planes</a> ·
        <a href="mailto:info@jupaficonsultores.com" style="color:#64748b;">Soporte</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ── Template: Bienvenida ──────────────────────────────────────────────────────

export function emailBienvenida(opts: {
  nombre: string;
  empresa: string;
  email: string;
  trialEndsAt: string;
}): string {
  const fechaFin = new Date(opts.trialEndsAt + 'T00:00:00').toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f1f5f9;margin:0;padding:0;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10);">
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:24px 32px;">
      <h1 style="color:#fff;font-size:18px;margin:0;">🚗 Gestiona tu Flotilla</h1>
    </div>
    <div style="background:#16a34a;padding:16px 32px;">
      <p style="color:#fff;font-size:18px;font-weight:700;margin:0;">🎉 ¡Tu cuenta está lista, ${opts.nombre}!</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 16px;">
        <strong>${opts.empresa}</strong> está activa con <strong>14 días de prueba gratis</strong> — sin tarjeta de crédito.
      </p>
      <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Tu período de prueba vence el <strong>${fechaFin}</strong>.
      </p>
      <div style="background:#f8fafc;border-radius:10px;padding:20px;border:1px solid #e2e8f0;margin:0 0 28px;">
        <p style="color:#1e293b;font-size:14px;font-weight:700;margin:0 0 12px;">Primeros pasos:</p>
        <ol style="color:#475569;font-size:14px;margin:0;padding-left:20px;line-height:2;">
          <li>Agrega tus vehículos (placas, GPS IMEI)</li>
          <li>Registra a tus choferes</li>
          <li>Configura la renta semanal</li>
          <li>Conecta tu WhatsApp</li>
          <li>Genera tu primera cuenta semanal</li>
        </ol>
      </div>
      <div style="text-align:center;">
        <a href="${APP_URL}/resumen-final" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:16px;">
          Ir al dashboard →
        </a>
      </div>
    </div>
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        <strong>Gestiona tu Flotilla</strong> · <a href="mailto:info@jupaficonsultores.com" style="color:#64748b;">info@jupaficonsultores.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ── Template: Monday Brief ────────────────────────────────────────────────────

export interface MondayBriefData {
  empresa: string;
  nombre: string;
  semana: string;
  briefTexto: string;
  vehiculosActivos: number;
  vehiculosTaller: number;
  choferes: number;
  cuentasPagadas: number;
  cuentasPendientes: number;
  ingresosSemana: number;
  segurosPorVencer: number;
  mantenimientosPendientes: number;
  infraccionesNuevas: number;
}

export function emailMondayBrief(opts: MondayBriefData): string {
  const dashboardUrl = `${APP_URL}/resumen-final`;
  const cuentasUrl   = `${APP_URL}/cuentas-semanales`;
  const formatMXN    = (n: number) => `$${n.toLocaleString('es-MX')}`;

  const alerts: string[] = [];
  if (opts.cuentasPendientes > 0)
    alerts.push(`💰 <strong>${opts.cuentasPendientes}</strong> cuenta${opts.cuentasPendientes !== 1 ? 's' : ''} pendiente${opts.cuentasPendientes !== 1 ? 's' : ''} de cobro`);
  if (opts.segurosPorVencer > 0)
    alerts.push(`🛡️ <strong>${opts.segurosPorVencer}</strong> seguro${opts.segurosPorVencer !== 1 ? 's' : ''} vence${opts.segurosPorVencer !== 1 ? 'n' : ''} en 30 días`);
  if (opts.mantenimientosPendientes > 0)
    alerts.push(`🔧 <strong>${opts.mantenimientosPendientes}</strong> mantenimiento${opts.mantenimientosPendientes !== 1 ? 's' : ''} programado${opts.mantenimientosPendientes !== 1 ? 's' : ''}`);
  if (opts.infraccionesNuevas > 0)
    alerts.push(`🚦 <strong>${opts.infraccionesNuevas}</strong> infracción${opts.infraccionesNuevas !== 1 ? 'es' : ''} nueva${opts.infraccionesNuevas !== 1 ? 's' : ''}`);
  if (opts.vehiculosTaller > 0)
    alerts.push(`🚗 <strong>${opts.vehiculosTaller}</strong> unidad${opts.vehiculosTaller !== 1 ? 'es' : ''} en taller`);

  const alertsHtml = alerts.length
    ? `<div style="background:#fef9c3;border-left:4px solid #eab308;border-radius:6px;padding:16px 20px;margin:24px 0;">
        <p style="margin:0 0 8px;font-weight:700;color:#713f12;font-size:14px;">⚠️ ATENCIÓN ESTA SEMANA</p>
        <ul style="margin:0;padding-left:18px;color:#854d0e;line-height:2;">${alerts.map(a => `<li>${a}</li>`).join('')}</ul>
       </div>`
    : `<div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:6px;padding:14px 20px;margin:24px 0;">
        <p style="margin:0;color:#15803d;font-weight:600;">✅ Todo en orden — sin alertas urgentes esta semana</p>
       </div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f1f5f9;margin:0;padding:0;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10);">
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:28px 32px;">
      <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;letter-spacing:1px;text-transform:uppercase;">Brief del lunes</p>
      <h1 style="color:#fff;font-size:22px;margin:0 0 2px;font-weight:700;">🚗 ${opts.empresa}</h1>
      <p style="color:#64748b;font-size:13px;margin:0;">Semana del ${opts.semana}</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Hola <strong>${opts.nombre}</strong>, aquí está el resumen de tu flotilla para arrancar la semana.
      </p>
      <div style="background:#f8fafc;border-radius:10px;padding:20px 24px;border:1px solid #e2e8f0;margin-bottom:24px;">
        <p style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 10px;">✨ ANÁLISIS INTELIGENTE</p>
        <p style="color:#1e293b;font-size:15px;line-height:1.7;margin:0;">${opts.briefTexto}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:4px 8px 4px 0;width:50%;vertical-align:top;">
            <div style="background:#f8fafc;border-radius:10px;padding:16px 18px;border:1px solid #e2e8f0;">
              <p style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin:0 0 6px;">Flota activa</p>
              <p style="color:#0f172a;font-size:28px;font-weight:800;margin:0;">${opts.vehiculosActivos}</p>
              <p style="color:#94a3b8;font-size:12px;margin:4px 0 0;">${opts.vehiculosTaller > 0 ? `${opts.vehiculosTaller} en taller` : 'Todo en calle'}</p>
            </div>
          </td>
          <td style="padding:4px 0 4px 8px;width:50%;vertical-align:top;">
            <div style="background:#f8fafc;border-radius:10px;padding:16px 18px;border:1px solid #e2e8f0;">
              <p style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin:0 0 6px;">Ingresos semana</p>
              <p style="color:#16a34a;font-size:24px;font-weight:800;margin:0;">${formatMXN(opts.ingresosSemana)}</p>
              <p style="color:#94a3b8;font-size:12px;margin:4px 0 0;">${opts.choferes} choferes activos</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 8px 0 0;width:50%;vertical-align:top;">
            <div style="background:#f8fafc;border-radius:10px;padding:16px 18px;border:1px solid #e2e8f0;">
              <p style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin:0 0 6px;">Cuentas pagadas</p>
              <p style="color:#0f172a;font-size:28px;font-weight:800;margin:0;">${opts.cuentasPagadas}</p>
              <p style="color:${opts.cuentasPendientes > 0 ? '#dc2626' : '#94a3b8'};font-size:12px;margin:4px 0 0;">${opts.cuentasPendientes > 0 ? `${opts.cuentasPendientes} pendiente${opts.cuentasPendientes !== 1 ? 's' : ''}` : 'Sin pendientes ✓'}</p>
            </div>
          </td>
          <td style="padding:8px 0 0 8px;width:50%;vertical-align:top;">
            <div style="background:#f8fafc;border-radius:10px;padding:16px 18px;border:1px solid #e2e8f0;">
              <p style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin:0 0 6px;">Alertas activas</p>
              <p style="color:${alerts.length > 0 ? '#dc2626' : '#16a34a'};font-size:28px;font-weight:800;margin:0;">${alerts.length}</p>
              <p style="color:#94a3b8;font-size:12px;margin:4px 0 0;">${alerts.length > 0 ? 'Requieren atención' : 'Ninguna urgente'}</p>
            </div>
          </td>
        </tr>
      </table>
      ${alertsHtml}
      <div style="text-align:center;margin:28px 0 8px;">
        <a href="${dashboardUrl}" style="display:inline-block;background:#1e293b;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:700;font-size:15px;margin:0 6px 10px;">
          Ver dashboard →
        </a>
        ${opts.cuentasPendientes > 0
          ? `<a href="${cuentasUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:700;font-size:15px;margin:0 6px 10px;">Cobrar pendientes →</a>`
          : ''}
      </div>
    </div>
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 32px;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        Generado automáticamente por <strong>Gestiona tu Flotilla</strong> · Cada lunes a las 9AM<br/>
        <a href="${APP_URL}/configuracion" style="color:#64748b;">Configurar notificaciones</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
