import { createHmac } from 'crypto';

const SECRET = process.env.NEXTAUTH_SECRET ?? process.env.GPS_SHARE_SECRET ?? 'gps-share-gtf-2024';

export function makeShareToken(tenantId: string, vehicleId: string, hours = 4): string {
  const expires = Date.now() + hours * 3_600_000;
  const payload = `${tenantId}__${vehicleId}__${expires}`;
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex').slice(0, 20);
  return Buffer.from(`${payload}__${sig}`).toString('base64url');
}

export function verifyShareToken(token: string): { tenantId: string; vehicleId: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = decoded.split('__');
    if (parts.length !== 4) return null;
    const [tenantId, vehicleId, expiresStr, sig] = parts;
    if (Date.now() > Number(expiresStr)) return null;
    const payload = `${tenantId}__${vehicleId}__${expiresStr}`;
    const expected = createHmac('sha256', SECRET).update(payload).digest('hex').slice(0, 20);
    if (sig !== expected) return null;
    return { tenantId, vehicleId };
  } catch {
    return null;
  }
}
