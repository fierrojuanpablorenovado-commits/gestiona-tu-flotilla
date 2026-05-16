/**
 * POST /api/whatsapp/send
 *
 * Envía cuenta semanal por WhatsApp — multi-tenant, dos modos:
 *
 * MODO A — Meta Business Cloud API (sin Make ni ManyChat):
 *   Cada tenant tiene su propio phone_number_id + access_token de Meta.
 *   El app llama a Meta directamente. Envío al teléfono del chofer.
 *   Requiere: wa_mode='meta', wa_phone_number_id, wa_access_token en tenant_settings.
 *
 * MODO B — Webhook relay (con soporte a grupos WA):
 *   El app hace POST al webhook del tenant (Make, n8n, WAHA, etc.) con payload completo.
 *   El webhook reenvía al grupo del vehículo.
 *   Requiere: wa_mode='webhook' (o no configurado), wa_webhook_url en tenant_settings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session?.tenantId) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  const tid = session.tenantId;

  try {
    const body = await req.json();
    const {
      accountId,
      vehicleId: vehicleIdParam,
      imageBase64,
      tipo = 'cuenta',
    } = body as {
      accountId?:   string;
      vehicleId?:   string;
      imageBase64?: string;
      tipo?:        'cuenta' | 'recibo';
    };

    if (!accountId && !vehicleIdParam) {
      return NextResponse.json({ message: 'accountId o vehicleId requerido' }, { status: 400 });
    }

    // Resolver vehicleId desde accountId si es necesario
    let vehicleId = vehicleIdParam;
    if (!vehicleId && accountId) {
      const accLookup = await sql`
        SELECT vehicle_id::text AS vehicle_id
        FROM weekly_accounts
        WHERE id = ${accountId}::uuid AND tenant_id = ${tid}::uuid
        LIMIT 1
      `.catch(() => []);
      if (!accLookup.length) {
        return NextResponse.json({ message: 'Cuenta no encontrada' }, { status: 404 });
      }
      vehicleId = accLookup[0].vehicle_id as string;
    }

    // 1. Leer config WA del tenant
    const settingsRows = await sql`
      SELECT setting_key, value FROM tenant_settings
      WHERE tenant_id = ${tid}::uuid
        AND setting_key IN (
          'wa_mode', 'wa_phone_number_id', 'wa_access_token',
          'wa_template_name', 'wa_webhook_url', 'wa_webhook_secret'
        )
    `;
    const cfg: Record<string, string> = {};
    for (const r of settingsRows) cfg[r.setting_key as string] = r.value as string;

    const mode = (cfg['wa_mode'] ?? 'webhook') as 'meta' | 'webhook';

    // 2. Leer vehículo + chofer
    const vRows = await sql`
      SELECT
        v.eco, v.plates, v.wa_group_link,
        CONCAT(d.first_name, ' ', d.last_name) AS driver_name,
        d.phone AS driver_phone
      FROM vehicles v
      LEFT JOIN drivers d ON d.vehicle_id = v.id AND d.status = 'active'
      WHERE v.id = ${vehicleId!}::uuid AND v.tenant_id = ${tid}::uuid
    `.catch(() => []);

    if (!vRows.length) {
      return NextResponse.json({ message: 'Vehículo no encontrado' }, { status: 404 });
    }
    const vehicle = vRows[0];

    // 3. Leer datos de la cuenta semanal
    let accountData: Record<string, unknown> = {};
    let weekLabel = '';
    if (accountId) {
      const accRows = await sql`
        SELECT efectivo_a_entregar, didi_balance, didi_income,
               contabilidad, viajes_pagados, week_start, status
        FROM weekly_accounts
        WHERE id = ${accountId}::uuid AND tenant_id = ${tid}::uuid
      `.catch(() => []);

      if (accRows.length) {
        const acc = accRows[0];
        const ws = new Date(acc.week_start as string);
        const we = new Date(ws);
        we.setDate(ws.getDate() + 6);
        const fmt = (d: Date) => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
        weekLabel = `${fmt(ws)} al ${fmt(we)} ${ws.getFullYear()}`;
        accountData = {
          efectivo:     Number(acc.efectivo_a_entregar ?? 0),
          banco:        Number(acc.didi_balance ?? 0),
          didiIncome:   Number(acc.didi_income ?? 0),
          contabilidad: Number(acc.contabilidad ?? 0),
          viajes:       Number(acc.viajes_pagados ?? 0),
          status:       acc.status,
          weekLabel,
        };
      }
    }

    const driverPhone = (vehicle.driver_phone as string | null)?.replace(/\D/g, '') ?? null;
    const driverName  = (vehicle.driver_name  as string | null)?.trim() ?? '';

    // ── MODO A: Meta Business Cloud API ──────────────────────────────────────
    if (mode === 'meta') {
      const phoneNumberId = cfg['wa_phone_number_id'];
      const accessToken   = cfg['wa_access_token'];
      const templateName  = cfg['wa_template_name'] ?? 'cuenta_semanal';

      if (!phoneNumberId || !accessToken) {
        return NextResponse.json(
          { message: 'Credenciales de Meta WhatsApp no configuradas. Ve a Configuración → WhatsApp.' },
          { status: 422 }
        );
      }
      if (!driverPhone) {
        return NextResponse.json(
          { message: `Sin teléfono registrado para ${vehicle.eco}. Configura el teléfono del chofer.` },
          { status: 422 }
        );
      }

      // Llamada a Meta Cloud API — texto de plantilla
      // (Para imagen se necesita template con header tipo IMAGE aprobado)
      const metaBody = {
        messaging_product: 'whatsapp',
        to: `52${driverPhone}`,                   // México +52
        type: 'text',
        text: {
          body: buildTextMessage(vehicle.eco as string, driverName, weekLabel, accountData),
        },
      };

      const metaRes = await fetch(
        `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metaBody),
          signal: AbortSignal.timeout(15_000),
        }
      );

      if (!metaRes.ok) {
        const errJson = await metaRes.json().catch(() => ({}));
        const errMsg = (errJson as { error?: { message?: string } }).error?.message ?? `Error Meta ${metaRes.status}`;
        console.error('[whatsapp/send META]', metaRes.status, errJson);
        return NextResponse.json({ message: errMsg }, { status: 502 });
      }

      return NextResponse.json({
        ok:      true,
        mode:    'meta',
        message: `Enviado a ${vehicle.eco} — ${driverName} (${driverPhone})`,
      });
    }

    // ── MODO B: Webhook relay ─────────────────────────────────────────────────
    const webhookUrl = cfg['wa_webhook_url'];
    if (!webhookUrl) {
      return NextResponse.json(
        { message: 'WhatsApp no configurado. Ve a Configuración → WhatsApp.' },
        { status: 422 }
      );
    }

    const payload = {
      tenantId:      tid,
      tipo,
      groupLink:     vehicle.wa_group_link ?? null,
      vehicleEco:    vehicle.eco,
      vehiclePlates: vehicle.plates,
      driverName,
      driverPhone,
      weekLabel,
      amounts:       accountData,
      imageBase64:   imageBase64 ?? null,
      sentAt:        new Date().toISOString(),
    };

    const webhookHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (cfg['wa_webhook_secret']) {
      webhookHeaders['X-Webhook-Secret'] = cfg['wa_webhook_secret'];
    }

    const webhookRes = await fetch(webhookUrl, {
      method:  'POST',
      headers: webhookHeaders,
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(15_000),
    });

    if (!webhookRes.ok) {
      const errText = await webhookRes.text().catch(() => '');
      console.error('[whatsapp/send WEBHOOK]', webhookRes.status, errText);
      return NextResponse.json(
        { message: `El webhook respondió con error ${webhookRes.status}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok:        true,
      mode:      'webhook',
      message:   `Enviado a ${vehicle.eco} — ${driverName}`,
      groupLink: vehicle.wa_group_link,
    });

  } catch (err: unknown) {
    const isTimeout = err instanceof Error && (err.name === 'TimeoutError' || err.message.includes('abort'));
    console.error('[whatsapp/send]', err);
    return NextResponse.json(
      { message: isTimeout ? 'WhatsApp no respondió a tiempo (>15 s)' : 'Error al enviar' },
      { status: 500 }
    );
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildTextMessage(
  eco: string,
  driverName: string,
  weekLabel: string,
  amounts: Record<string, unknown>
): string {
  const fmt = (n: unknown) =>
    '$' + Math.abs(Number(n || 0)).toLocaleString('es-MX', { minimumFractionDigits: 0 });

  return [
    `🚗 *${eco} — Cuenta Semanal*`,
    driverName ? `👤 ${driverName}` : '',
    weekLabel  ? `📅 ${weekLabel}` : '',
    '',
    `💰 *JP cobra en efectivo:* ${fmt(amounts.efectivo)}`,
    `🏦 Depósito Didi:         ${fmt(amounts.banco)}`,
    `📊 Total bruto Didi:      ${fmt(amounts.didiIncome)}`,
    amounts.viajes ? `🛣️ Viajes semana:         ${amounts.viajes}` : '',
    '',
    '✅ Por favor confirma tu pago.',
  ].filter(Boolean).join('\n');
}
