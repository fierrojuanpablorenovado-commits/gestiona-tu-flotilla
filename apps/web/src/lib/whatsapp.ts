/**
 * ─────────────────────────────────────────────────────────────────────────────
 * WhatsApp — librería central de envío
 * Prioridad: Make (ManyChat) → UltraMsg → log mock
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Envío via Make → ManyChat ────────────────────────────────────────────────

export async function sendMakeWebhook(webhookUrl: string, payload: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.error('[Make Webhook] Error:', err);
    return false;
  }
}

// ─── Envío de cuenta semanal via Make ─────────────────────────────────────────

export async function sendCuentaSemanal(data: {
  chofer_nombre: string;
  telefono?: string;
  subscriber_id?: string;
  ingresos_didi: number;
  viajes: number;
  renta: number;
  deducciones: number;
  neto: number;
}): Promise<boolean> {
  const webhookUrl = process.env.MAKE_WEBHOOK_CUENTAS;
  if (webhookUrl) return sendMakeWebhook(webhookUrl, data);
  // Fallback UltraMsg
  return sendWhatsApp(data.telefono || '', WhatsAppTemplates.cuentaSemanal(
    data.chofer_nombre, data.ingresos_didi, data.viajes, data.renta, data.deducciones, data.neto
  ));
}

// ─── Envío de alerta urgente via Make ─────────────────────────────────────────

export async function sendAlertaAdmin(data: {
  tipo: string;
  vehiculo: string;
  mensaje: string;
  urgencia?: string;
}): Promise<boolean> {
  const webhookUrl = process.env.MAKE_WEBHOOK_ALERTAS;
  if (webhookUrl) return sendMakeWebhook(webhookUrl, data);
  console.log('[Alerta Admin Mock]', data);
  return true;
}

// ─── Envío de lead de landing via Make ───────────────────────────────────────

export async function sendLeadLanding(data: {
  nombre: string;
  telefono: string;
  empresa?: string;
  vehiculos?: string;
  mensaje?: string;
}): Promise<boolean> {
  const webhookUrl = process.env.MAKE_WEBHOOK_LEADS;
  if (webhookUrl) return sendMakeWebhook(webhookUrl, data);
  console.log('[Lead Landing Mock]', data);
  return true;
}

// ─── Envío directo via UltraMsg (fallback) ────────────────────────────────────

export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
  const token = process.env.ULTRAMSG_TOKEN;

  if (!instanceId || !token) {
    console.log(`[WhatsApp Mock] To: ${phone} | Message: ${message.substring(0, 50)}...`);
    return true;
  }

  try {
    const response = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token, to: phone, body: message }),
    });
    const data = await response.json() as { sent?: string };
    return data.sent === 'true';
  } catch (err) {
    console.error('[WhatsApp] Error enviando mensaje:', err);
    return false;
  }
}

// ─── Templates ────────────────────────────────────────────────────────────────

export const WhatsAppTemplates = {
  cuentaSemanal: (nombre: string, ingresos: number, viajes: number, renta: number, deducciones: number, neto: number) =>
    `📊 *CUENTA SEMANAL*\n━━━━━━━━━━━━━━━\n👤 ${nombre}\n💰 Didi: $${ingresos.toLocaleString()}\n🚗 Viajes: ${viajes}\n📉 Renta: -$${renta.toLocaleString()}\n📉 Deducciones: -$${deducciones.toLocaleString()}\n✅ *Neto: $${neto.toLocaleString()} MXN*\n━━━━━━━━━━━━━━━`,

  weeklyReport: (empresa: string, ingresos: number, gastos: number, pendientes: number) =>
    `📊 *REPORTE SEMANAL — ${empresa}*\n━━━━━━━━━━━━━━━\n💰 Ingresos: $${ingresos.toLocaleString()} MXN\n📉 Gastos: $${gastos.toLocaleString()} MXN\n✅ Utilidad: $${(ingresos - gastos).toLocaleString()} MXN\n⚠️ Pagos pendientes: ${pendientes}\n━━━━━━━━━━━━━━━\n🔗 https://app.gestionatuflotilla.com/dashboard`,

  insuranceAlert: (vehiculo: string, poliza: string, diasRestantes: number) =>
    `🛡️ *ALERTA DE SEGURO*\n━━━━━━━━━━━━━━━\n🚗 Vehículo: ${vehiculo}\n📋 Póliza: ${poliza}\n⏰ Vence en: ${diasRestantes} días\n━━━━━━━━━━━━━━━\n⚡ https://app.gestionatuflotilla.com/seguros`,

  maintenanceAlert: (vehiculo: string, tipo: string, fecha: string) =>
    `🔧 *ALERTA DE MANTENIMIENTO*\n━━━━━━━━━━━━━━━\n🚗 Vehículo: ${vehiculo}\n🛠️ Tipo: ${tipo}\n📅 Fecha: ${fecha}\n━━━━━━━━━━━━━━━\n📱 https://app.gestionatuflotilla.com/mantenimiento`,

  bienvenida: (nombre: string, empresa: string) =>
    `🎉 *¡Bienvenido a Gestiona tu Flotilla!*\n━━━━━━━━━━━━━━━\n👋 Hola ${nombre},\n🏢 ${empresa} ya está activa.\n\n🚀 Primeros pasos:\n1️⃣ Agrega tus vehículos\n2️⃣ Registra tus choferes\n3️⃣ Conecta tu GPS\n━━━━━━━━━━━━━━━\n🔗 https://app.gestionatuflotilla.com/dashboard`,

  pagoRecibido: (empresa: string, monto: number, plan: string) =>
    `✅ *PAGO CONFIRMADO*\n━━━━━━━━━━━━━━━\n🏢 ${empresa}\n💰 $${monto.toLocaleString()} MXN\n📦 Plan: ${plan}\n━━━━━━━━━━━━━━━\nGracias por tu confianza 🙏`,
};
