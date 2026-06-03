/**
 * Email utility — Gestiona tu Flotilla
 * Usa Resend API (https://resend.com) vía fetch puro, sin paquete npm.
 * Configura RESEND_API_KEY en variables de entorno de Vercel para activar.
 * Si no hay API key, los emails se omiten silenciosamente (no rompe el cron).
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = process.env.EMAIL_FROM || 'noreply@gestionatuflotilla.com';
const APP_URL        = process.env.NEXT_PUBLIC_APP_URL || 'https://gestionatuflotilla.com';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log(`[email] No RESEND_API_KEY — omitiendo: ${payload.subject} → ${payload.to}`);
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to:   payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch (err) {
    console.error('[email] Error enviando:', err);
    return false;
  }
}

// ── Templates ─────────────────────────────────────────────────────────────────

export function emailTrialReminder(opts: {
  nombre: string;
  empresa: string;
  diasRestantes: number;
  trialEndsAt: string;
}): string {
  const urgency = opts.diasRestantes <= 1 ? '⚠️ URGENTE: ' : opts.diasRestantes <= 3 ? '🔔 ' : '';
  const cta = `${APP_URL}/planes`;
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
    <div style="background:#1e293b;padding:24px 32px;">
      <h1 style="color:#fff;font-size:20px;margin:0;">🚗 Gestiona tu Flotilla</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1e293b;font-size:18px;margin-top:0;">
        ${urgency}Tu prueba gratuita ${opts.diasRestantes <= 0 ? 'terminó' : `vence en ${opts.diasRestantes} día${opts.diasRestantes !== 1 ? 's' : ''}`}
      </h2>
      <p style="color:#475569;line-height:1.6;">
        Hola <strong>${opts.nombre}</strong>, tu período de prueba de <strong>${opts.empresa}</strong>
        ${opts.diasRestantes <= 0
          ? 'ha terminado. Tu acceso está actualmente bloqueado.'
          : `vence el <strong>${new Date(opts.trialEndsAt + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.`
        }
      </p>
      <p style="color:#475569;line-height:1.6;">
        Elige tu plan para continuar gestionando tu flotilla sin interrupciones. Los planes comienzan desde <strong>$499/mes</strong>.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${cta}" style="background:#2563eb;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:16px;display:inline-block;">
          Ver planes y precios →
        </a>
      </div>
      <p style="color:#94a3b8;font-size:13px;">
        ¿Tienes dudas? Escríbenos a <a href="mailto:noreply@gestionatuflotilla.com" style="color:#2563eb;">noreply@gestionatuflotilla.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ── Monday Brief template ─────────────────────────────────────────────────────

export interface MondayBriefData {
  empresa: string;
  nombre: string;
  semana: string;           // "2 jun – 8 jun 2025"
  briefTexto: string;       // Párrafo narrativo generado por IA (o fallback)
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

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:28px 32px;">
      <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;letter-spacing:1px;text-transform:uppercase;">Brief del lunes</p>
      <h1 style="color:#fff;font-size:22px;margin:0 0 2px;font-weight:700;">🚗 ${opts.empresa}</h1>
      <p style="color:#64748b;font-size:13px;margin:0;">Semana del ${opts.semana}</p>
    </div>

    <div style="padding:32px;">

      <!-- Saludo -->
      <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Hola <strong>${opts.nombre}</strong>, aquí está el resumen de tu flotilla para arrancar la semana.
      </p>

      <!-- Brief de IA -->
      <div style="background:#f8fafc;border-radius:10px;padding:20px 24px;border:1px solid #e2e8f0;margin-bottom:24px;">
        <p style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 10px;">✨ ANÁLISIS INTELIGENTE</p>
        <p style="color:#1e293b;font-size:15px;line-height:1.7;margin:0;">${opts.briefTexto}</p>
      </div>

      <!-- KPIs -->
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

      <!-- Alertas -->
      ${alertsHtml}

      <!-- CTAs -->
      <div style="text-align:center;margin:28px 0 8px;">
        <a href="${dashboardUrl}" style="display:inline-block;background:#1e293b;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:700;font-size:15px;margin:0 6px 10px;">
          Ver dashboard →
        </a>
        ${opts.cuentasPendientes > 0
          ? `<a href="${cuentasUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:700;font-size:15px;margin:0 6px 10px;">Cobrar pendientes →</a>`
          : ''}
      </div>

    </div>

    <!-- Footer -->
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

export function emailBienvenida(opts: {
  nombre: string;
  empresa: string;
  email: string;
  trialEndsAt: string;
}): string {
  const fechaFin = new Date(opts.trialEndsAt + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
    <div style="background:#1e293b;padding:24px 32px;">
      <h1 style="color:#fff;font-size:20px;margin:0;">🚗 Gestiona tu Flotilla</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1e293b;font-size:20px;margin-top:0;">¡Bienvenido, ${opts.nombre}! 🎉</h2>
      <p style="color:#475569;line-height:1.6;">
        Tu cuenta de <strong>${opts.empresa}</strong> está lista. Tienes <strong>14 días gratis</strong> para probar todo — sin tarjeta de crédito.
      </p>
      <p style="color:#475569;line-height:1.6;">Tu período de prueba vence el <strong>${fechaFin}</strong>.</p>
      <div style="background:#f1f5f9;border-radius:8px;padding:20px;margin:24px 0;">
        <p style="margin:0 0 8px;font-weight:bold;color:#1e293b;">Primeros pasos:</p>
        <ol style="color:#475569;margin:0;padding-left:20px;line-height:1.8;">
          <li>Agrega tus vehículos (ECO, placas, GPS)</li>
          <li>Registra a tus choferes</li>
          <li>Configura tu renta semanal</li>
          <li>Conecta tu WhatsApp</li>
          <li>Genera tu primera cuenta semanal</li>
        </ol>
      </div>
      <div style="text-align:center;margin:32px 0;">
        <a href="${APP_URL}/resumen-final" style="background:#2563eb;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:16px;display:inline-block;">
          Ir al dashboard →
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;
}
