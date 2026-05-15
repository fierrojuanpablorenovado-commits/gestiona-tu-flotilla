import webpush from 'web-push';

// Inicialización lazy — evita error en build time cuando las env vars no están cargadas
let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return;
  const pub  = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sub  = process.env.VAPID_SUBJECT || 'mailto:admin@gestionatuflotilla.com';
  if (!pub || !priv) return; // silencioso en build/dev sin claves
  webpush.setVapidDetails(sub, pub, priv);
  vapidConfigured = true;
}

export interface PushPayload {
  title:  string;
  body:   string;
  url?:   string;
  tag?:   string;
  urgent?: boolean;  // requireInteraction en la notificación
}

export interface PushSubscriptionRow {
  id: string;
  subscription: webpush.PushSubscription;
}

/**
 * Envía una notificación push a una suscripción específica.
 * Devuelve false si la suscripción expiró (para poder borrarla).
 */
export async function sendPush(
  sub: webpush.PushSubscription,
  payload: PushPayload
): Promise<boolean> {
  ensureVapid();
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload));
    return true;
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 410 || status === 404) return false; // suscripción expirada
    console.error('[webpush] send error:', err);
    return true; // error temporal — no borrar
  }
}

/**
 * Envía a todas las suscripciones activas de un tenant.
 * Borra automáticamente las que expiraron (410/404).
 */
export async function sendPushToTenant(
  tenantId: string,
  payload: PushPayload
): Promise<void> {
  const { sql } = await import('@/lib/db');
  try {
    const subs = (await sql`
      SELECT id, subscription FROM push_subscriptions
      WHERE tenant_id = ${tenantId}::uuid
    `) as PushSubscriptionRow[];
    const toDelete: string[] = [];
    await Promise.all(subs.map(async (row) => {
      const ok = await sendPush(row.subscription as webpush.PushSubscription, payload);
      if (!ok) toDelete.push(row.id);
    }));
    if (toDelete.length) {
      await sql`DELETE FROM push_subscriptions WHERE id = ANY(${toDelete}::uuid[])`;
    }
  } catch (err) {
    console.error('[webpush] tenant send error:', err);
  }
}

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || '';
