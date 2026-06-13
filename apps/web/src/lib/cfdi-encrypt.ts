import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

function getKey(): Buffer {
  const hexKey = process.env.CFDI_ENCRYPTION_KEY ?? '';
  if (hexKey.length === 64) return Buffer.from(hexKey, 'hex');
  // Fallback solo en dev — en prod CFDI_ENCRYPTION_KEY debe estar configurada
  return Buffer.from('636669642d6465762d6b65792d756e73616665213132333435363738393031323334', 'hex');
}

export function cfdiEncrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

export function cfdiDecrypt(data: string): string {
  const key = getKey();
  const parts = data.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted data');
  const [ivHex, encHex, tagHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const enc = Buffer.from(encHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
