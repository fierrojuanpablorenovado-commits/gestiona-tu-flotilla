/**
 * GET  /api/settings/whatsapp  → lee config WhatsApp del tenant
 * POST /api/settings/whatsapp  → guarda config WA + links por vehículo
 *
 * Soporta dos modos, ambos multi-tenant (cada cliente su propia cuenta):
 *
 * MODO A — Meta Business Cloud API (recomendado, sin Make ni ManyChat):
 *   El tenant configura su phone_number_id + access_token desde Meta for Developers.
 *   El app llama a Meta directamente con las credenciales del tenant.
 *   Envío a números de teléfono individuales de los choferes.
 *
 * MODO B — Webhook relay (avanzado, permite grupos WA):
 *   El tenant configura una URL de webhook propia (Make.com, n8n, WAHA, etc.).
 *   El app hace POST al webhook con payload completo (imagen base64 incluida).
 *   El webhook reenvía al grupo del vehículo.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

const SETTINGS_KEYS = [
  'wa_mode',                  // 'meta' | 'webhook' | 'whapi'
  'wa_phone_number_id',       // Meta: phone_number_id (alias legado — se guarda también en wa_meta_phone_number_id)
  'wa_access_token',          // Meta: access_token (alias legado — se guarda también en wa_meta_access_token)
  'wa_meta_phone_number_id',  // Meta: phone_number_id de la cuenta del tenant
  'wa_meta_access_token',     // Meta: access_token del tenant
  'wa_meta_waba_id',          // Meta: WhatsApp Business Account ID del tenant
  'wa_template_name',         // Meta: nombre del template aprobado (opcional, default: 'cuenta_semanal')
  'wa_webhook_url',           // Webhook: URL del webhook del tenant
  'wa_webhook_secret',        // Webhook: secret para verificar autenticidad
  'wa_whapi_token',           // Whapi.Cloud: API token del tenant (Bearer)
  'wa_whapi_channel',         // Whapi.Cloud: subdominio del canal (opcional, si no usa gate.whapi.cloud)
  'wa_test_phone',            // Pruebas: número personal (override temporal — vaciar cuando ya no se necesite)
] as const;

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session?.tenantId) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  const tid = session.tenantId;

  try {
    const settings = await sql`
      SELECT setting_key, value FROM tenant_settings
      WHERE tenant_id = ${tid}::uuid
        AND setting_key = ANY(${SETTINGS_KEYS as unknown as string[]}::text[])
    `;

    const map: Record<string, string> = {};
    for (const r of settings) map[r.setting_key as string] = r.value as string;

    const mode = (map['wa_mode'] ?? 'webhook') as 'meta' | 'webhook' | 'whapi';

    // Leer vehículos con teléfono de chofer y grupo WA
    const vehicles = await sql`
      SELECT
        v.id::text,
        v.eco,
        v.plates,
        CONCAT(d.first_name, ' ', d.last_name) AS driver_name,
        d.phone AS driver_phone,
        v.wa_group_link
      FROM vehicles v
      LEFT JOIN drivers d ON d.vehicle_id = v.id AND d.status = 'active'
      WHERE v.tenant_id = ${tid}::uuid AND v.status != 'inactive'
      ORDER BY v.eco
    `.catch(() => []);

    // Resolver phone_number_id y access_token (soporte alias legado + nuevas claves)
    const metaPhoneNumberId = map['wa_meta_phone_number_id'] || map['wa_phone_number_id'] || '';
    const metaAccessToken   = map['wa_meta_access_token']    || map['wa_access_token']    || '';
    const metaWabaId        = map['wa_meta_waba_id'] || '';

    // Detectar si WA está configurado en cualquier modo
    const metaConfigured    = !!(metaPhoneNumberId && metaAccessToken);
    const webhookConfigured = !!map['wa_webhook_url'];
    const whapiConfigured   = !!map['wa_whapi_token'];
    const waConfigured      = mode === 'meta'    ? metaConfigured
                            : mode === 'whapi'   ? whapiConfigured
                            : webhookConfigured;

    return NextResponse.json({
      mode,
      waConfigured,
      metaConfigured,
      webhookConfigured,
      whapiConfigured,
      testPhone: map['wa_test_phone'] ?? null,
      // Meta — nunca enviar el token en claro, solo indicador
      phoneNumberId:    metaPhoneNumberId ? '***configured***' : null,
      metaTokenSet:     !!metaAccessToken,
      metaWabaIdSet:    !!metaWabaId,
      templateName:     map['wa_template_name'] ?? 'cuenta_semanal',
      // Webhook
      webhookUrl:       map['wa_webhook_url'] ? '***configured***' : null,
      // Whapi.Cloud
      whapiTokenSet:    !!map['wa_whapi_token'],
      whapiChannel:     map['wa_whapi_channel'] ?? null,
      vehicles: vehicles.map((v) => ({
        id:          v.id,
        eco:         v.eco,
        plates:      v.plates,
        driverName:  v.driver_name ?? '',
        driverPhone: v.driver_phone ?? '',
        groupLink:   v.wa_group_link ?? '',
      })),
    });
  } catch (err) {
    console.error('[settings/whatsapp GET]', err);
    return NextResponse.json({ message: 'Error al leer configuración' }, { status: 500 });
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session?.tenantId || session.role !== 'admin_general') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  const tid = session.tenantId;

  try {
    const body = await req.json();
    const {
      mode,
      // Meta (nuevas claves canónicas)
      metaPhoneNumberId,
      metaAccessToken,
      metaWabaId,
      // Meta (alias legados — aceptados por compatibilidad con la UI actual)
      phoneNumberId,
      accessToken,
      templateName,
      // Webhook
      webhookUrl,
      webhookSecret,
      // Whapi.Cloud
      whapiToken,
      whapiChannel,
      // Comunes
      groups,
    } = body as {
      mode?:               'meta' | 'webhook' | 'whapi';
      metaPhoneNumberId?:  string;
      metaAccessToken?:    string;
      metaWabaId?:         string;
      phoneNumberId?:      string;
      accessToken?:        string;
      templateName?:       string;
      webhookUrl?:         string;
      webhookSecret?:      string;
      whapiToken?:         string;
      whapiChannel?:       string;
      groups?:             { vehicleId: string; groupLink: string }[];
    };

    const upsert = async (key: string, val: string) => {
      await sql`
        INSERT INTO tenant_settings (tenant_id, setting_key, value, updated_at)
        VALUES (${tid}::uuid, ${key}, ${val}, NOW())
        ON CONFLICT (tenant_id, setting_key)
        DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `;
    };

    // Guardar modo
    if (mode) await upsert('wa_mode', mode);

    // Meta API credentials — guardar en claves canónicas + alias legados para compat
    const resolvedPhoneNumberId = metaPhoneNumberId?.trim() || phoneNumberId?.trim();
    const resolvedAccessToken   = metaAccessToken?.trim()   || accessToken?.trim();
    if (resolvedPhoneNumberId) {
      await upsert('wa_meta_phone_number_id', resolvedPhoneNumberId);
      await upsert('wa_phone_number_id',      resolvedPhoneNumberId);
    }
    if (resolvedAccessToken) {
      await upsert('wa_meta_access_token', resolvedAccessToken);
      await upsert('wa_access_token',      resolvedAccessToken);
    }
    if (metaWabaId?.trim())    await upsert('wa_meta_waba_id',    metaWabaId.trim());
    if (templateName?.trim())  await upsert('wa_template_name',   templateName.trim());

    // Webhook
    if (webhookUrl?.trim())    await upsert('wa_webhook_url',    webhookUrl.trim());
    if (webhookSecret?.trim()) await upsert('wa_webhook_secret', webhookSecret.trim());

    // Whapi.Cloud
    if (whapiToken?.trim())   await upsert('wa_whapi_token',   whapiToken.trim());
    if (whapiChannel?.trim()) await upsert('wa_whapi_channel', whapiChannel.trim());

    // Número de prueba (override temporal)
    const testPhone = (body as { testPhone?: string }).testPhone;
    if (testPhone !== undefined) {
      if (testPhone.trim()) {
        await upsert('wa_test_phone', testPhone.trim());
      } else {
        // Vaciar → borrar el setting
        await sql`DELETE FROM tenant_settings WHERE tenant_id=${tid}::uuid AND setting_key='wa_test_phone'`.catch(() => {});
      }
    }

    // Guardar teléfono/grupo por vehículo
    let vehiclesUpdated = 0;
    if (Array.isArray(groups)) {
      // Asegurar columna existe (safe migration)
      await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS wa_group_link TEXT`.catch(() => {});

      for (const { vehicleId, groupLink } of groups) {
        if (!vehicleId) continue;
        await sql`
          UPDATE vehicles
          SET wa_group_link = ${groupLink?.trim() || null}
          WHERE id = ${vehicleId}::uuid AND tenant_id = ${tid}::uuid
        `;
        vehiclesUpdated++;
      }
    }

    return NextResponse.json({
      ok: true,
      message: `WhatsApp configurado (modo: ${mode ?? 'sin cambio'}). ${vehiclesUpdated} vehículos actualizados.`,
    });
  } catch (err) {
    console.error('[settings/whatsapp POST]', err);
    return NextResponse.json({ message: 'Error al guardar configuración' }, { status: 500 });
  }
}
