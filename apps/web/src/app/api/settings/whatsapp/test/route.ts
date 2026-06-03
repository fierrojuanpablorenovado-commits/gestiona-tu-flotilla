/**
 * POST /api/settings/whatsapp/test
 *
 * Verifica que las credenciales Meta WhatsApp Business Cloud API del tenant
 * sean válidas consultando el endpoint de información del número de teléfono.
 *
 * Lee las credenciales desde tenant_settings (nunca desde el body) para evitar
 * que un cliente malintencionado use el endpoint para probar tokens ajenos.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { verifyMetaCredentials } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session?.tenantId) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  const tid = session.tenantId;

  try {
    // Leer credenciales Meta del tenant desde la DB
    const rows = await sql`
      SELECT setting_key, value FROM tenant_settings
      WHERE tenant_id = ${tid}::uuid
        AND setting_key = ANY(ARRAY[
          'wa_meta_phone_number_id',
          'wa_phone_number_id',
          'wa_meta_access_token',
          'wa_access_token'
        ]::text[])
    `;

    const map: Record<string, string> = {};
    for (const r of rows) map[r.setting_key as string] = r.value as string;

    // Resolver claves canónicas con fallback a alias legados
    const phoneNumberId = map['wa_meta_phone_number_id'] || map['wa_phone_number_id'] || '';
    const accessToken   = map['wa_meta_access_token']    || map['wa_access_token']    || '';

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json(
        { ok: false, message: 'Credenciales Meta no configuradas. Guarda Phone Number ID y Access Token primero.' },
        { status: 400 },
      );
    }

    const result = await verifyMetaCredentials(phoneNumberId, accessToken);

    if (!result.valid) {
      return NextResponse.json(
        { ok: false, message: result.error ?? 'Credenciales inválidas' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      displayPhone: result.displayPhone,
      verifiedName: result.verifiedName,
      message: `Conexión exitosa — ${result.verifiedName ?? ''} (${result.displayPhone ?? ''})`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al probar la conexión';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
