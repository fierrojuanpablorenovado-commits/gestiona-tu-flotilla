/**
 * POST /api/whatsapp/send
 *
 * Webhook relay multi-tenant para WhatsApp.
 * El app NO envía WhatsApp directamente — hace POST al webhook del tenant
 * (Make.com, n8n, WAHA, etc.) con el payload completo.
 * Cada tenant configura su propio webhook con su propia cuenta de WA.
 *
 * Payload enviado al webhook del tenant:
 * {
 *   groupLink: string,        // enlace del grupo WA del vehículo
 *   vehicleEco: string,       // número económico
 *   driverName: string,       // nombre del chofer
 *   weekLabel: string,        // "semana del 12 al 18 may 2025"
 *   amounts: { ... },
 *   imageBase64: string,      // PNG base64 (opcional)
 *   tipo: 'cuenta' | 'recibo'
 * }
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
      accountId?: string;
      vehicleId?: string;
      imageBase64?: string;
      tipo?: 'cuenta' | 'recibo';
    };

    if (!accountId && !vehicleIdParam) {
      return NextResponse.json({ message: 'accountId o vehicleId requerido' }, { status: 400 });
    }

    // Si solo tenemos accountId, resolver vehicleId desde la cuenta
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

    // 1. Leer webhook URL del tenant
    const settings = await sql`
      SELECT setting_key, value FROM tenant_settings
      WHERE tenant_id = ${tid}::uuid
        AND setting_key IN ('wa_webhook_url', 'wa_webhook_secret')
    `;
    const settingsMap: Record<string, string> = {};
    for (const r of settings) settingsMap[r.setting_key as string] = r.value as string;

    const webhookUrl = settingsMap['wa_webhook_url'];
    if (!webhookUrl) {
      return NextResponse.json(
        { message: 'WhatsApp no configurado. Ve a Configuración → WhatsApp.' },
        { status: 422 }
      );
    }

    // 2. Leer datos del vehículo + chofer + grupo WA
    const vRows = await sql`
      SELECT
        v.eco,
        v.plates,
        v.wa_group_link,
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

    // 3. Leer cuenta semanal si se proporcionó accountId
    let accountData: Record<string, unknown> = {};
    let weekLabel = '';
    if (accountId) {
      const accRows = await sql`
        SELECT
          wa.efectivo_a_entregar,
          wa.didi_balance,
          wa.didi_income,
          wa.contabilidad,
          wa.viajes_pagados,
          wa.week_start,
          wa.status
        FROM weekly_accounts wa
        WHERE wa.id = ${accountId}::uuid AND wa.tenant_id = ${tid}::uuid
      `.catch(() => []);

      if (accRows.length) {
        const acc = accRows[0];
        const ws = new Date(acc.week_start as string);
        const we = new Date(ws);
        we.setDate(ws.getDate() + 6);
        const fmtDate = (d: Date) =>
          d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
        weekLabel = `${fmtDate(ws)} al ${fmtDate(we)} ${ws.getFullYear()}`;

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

    // 4. Construir payload para el webhook del tenant
    const payload = {
      tenantId:      tid,
      tipo,                                       // 'cuenta' | 'recibo'
      groupLink:     vehicle.wa_group_link ?? null,
      vehicleEco:    vehicle.eco,
      vehiclePlates: vehicle.plates,
      driverName:    (vehicle.driver_name as string)?.trim() || '',
      driverPhone:   vehicle.driver_phone ?? null,
      weekLabel,
      amounts:       accountData,
      imageBase64:   imageBase64 ?? null,         // PNG base64 — el webhook puede enviarlo como media
      sentAt:        new Date().toISOString(),
    };

    // 5. Relay al webhook del tenant
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (settingsMap['wa_webhook_secret']) {
      headers['X-Webhook-Secret'] = settingsMap['wa_webhook_secret'];
    }

    const webhookRes = await fetch(webhookUrl, {
      method:  'POST',
      headers,
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(15_000), // 15 s timeout
    });

    if (!webhookRes.ok) {
      const errText = await webhookRes.text().catch(() => '');
      console.error('[whatsapp/send] Webhook error', webhookRes.status, errText);
      return NextResponse.json(
        { message: `El webhook respondió con error ${webhookRes.status}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok:        true,
      message:   `Enviado a ${vehicle.eco} — ${(vehicle.driver_name as string)?.trim() || 'chofer'}`,
      groupLink: vehicle.wa_group_link,
    });
  } catch (err: unknown) {
    const isTimeout =
      err instanceof Error &&
      (err.name === 'TimeoutError' || err.message.includes('abort'));

    console.error('[whatsapp/send]', err);
    return NextResponse.json(
      { message: isTimeout ? 'El webhook no respondió a tiempo (>15 s)' : 'Error al enviar' },
      { status: 500 }
    );
  }
}
