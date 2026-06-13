// Rate limiter en memoria por IP + endpoint
// Para escala enterprise, reemplazar Map con Redis (upstash-redis)

interface Entry { count: number; resetAt: number }

const stores = new Map<string, Map<string, Entry>>();

export function createRateLimit(key: string, windowMs: number, max: number) {
  if (!stores.has(key)) stores.set(key, new Map());
  const store = stores.get(key)!;

  return function check(ip: string): { ok: boolean; resetAt: number } {
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      return { ok: true, resetAt: now + windowMs };
    }
    if (entry.count >= max) return { ok: false, resetAt: entry.resetAt };
    entry.count++;
    return { ok: true, resetAt: entry.resetAt };
  };
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export function tooManyRequestsResponse(resetAt: number) {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return Response.json(
    { message: 'Demasiados intentos. Intenta de nuevo más tarde.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}

// Limiters pre-configurados para los endpoints más sensibles
export const limiters = {
  stripeCheckout: createRateLimit('stripe-checkout', 60 * 60 * 1000, 5),   // 5/hora
  whatsappSend:   createRateLimit('wa-send',          60 * 1000,      10),  // 10/min
  fileUpload:     createRateLimit('file-upload',      60 * 1000,      20),  // 20/min
  accountExport:  createRateLimit('account-export',   60 * 60 * 1000, 3),   // 3/hora
  accountDelete:  createRateLimit('account-delete',   24 * 60 * 60 * 1000, 3), // 3/día
  passwordChange: createRateLimit('password-change',  60 * 60 * 1000, 5),   // 5/hora
};
