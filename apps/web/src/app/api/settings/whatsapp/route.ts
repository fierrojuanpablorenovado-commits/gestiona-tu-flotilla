/**
 * GET  /api/settings/whatsapp  → lee config WhatsApp del tenant
 * POST /api/settings/whatsapp  → guarda webhook URL + links de grupos por vehículo
 *
 * Diseño multi-tenant: cada cliente configura su propio webhook (Make.com, n8n, etc.)
 * El app envía el JSON y el cliente conecta su WhatsApp como prefiera.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session?.tenantId) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  const tid = session.tenantId;

  try {
    // Leer webhook URL del tenant
    const settings = await sql`
      SELECT setting_key, value FROM tenant_settings
      WHERE tenant_id = ${tid}::uuid
        AND setting_key IN ('wa_webhook_url', 'wa_webhook_secret')
    `;

    const map: Record<string, string> = {};
    for (const r of settings) map[r.setting_key as string] = r.value as string;

    // Leer grupos WA configurados por vehículo
    const vehicles = await sql`
      SELECT id::text, eco, plates,
             CONCAT(d.first_name, ' ', d.last_name) AS driver_name,
             d.phone AS driver_phone,
             v.wa_group_link
      FROM vehicles v
      LEFT JOIN drivers d ON d.vehicle_id = v.id AND d.status = 'active'
      WHERE v.tenant_id = ${tid}::uuid AND v.status != 'inactive'
      ORDER BY v.eco
    `.catch(() => []);

    return NextResponse.json({
      webhookUrl:       map['wa_webhook_url'] ? '***configured***' : null,
      webhookConfigured: !!map['wa_webhook_url'],
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
    const { webhookUrl, webhookSecret, groups } = body as {
      webhookUrl?:    string;
      webhookSecret?: string;
      groups?: { vehicleId: string; groupLink: string }[];
    };

    // Guardar webhook URL
    if (webhookUrl !== undefined) {
      const cleanUrl = webhookUrl.trim();
      await sql`
        INSERT INTO tenant_settings (tenant_id, setting_key, value, updated_at)
        VALUES (${tid}::uuid, 'wa_webhook_url', ${cleanUrl}, NOW())
        ON CONFLICT (tenant_id, setting_key)
        DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `;
    }

    // Guardar webhook secret (para verificar que el request viene del app)
    if (webhookSecret !== undefined) {
      await sql`
        INSERT INTO tenant_settings (tenant_id, setting_key, value, updated_at)
        VALUES (${tid}::uuid, 'wa_webhook_secret', ${webhookSecret.trim()}, NOW())
        ON CONFLICT (tenant_id, setting_key)
        DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `;
    }

    // Guardar links de grupos por vehículo
    let groupsUpdated = 0;
    if (Array.isArray(groups)) {
      for (const { vehicleId, groupLink } of groups) {
        if (!vehicleId) continue;
        // Asegurar columna existe (safe migration)
        await sql`
          ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS wa_group_link TEXT
        `.catch(() => {});
        await sql`
          UPDATE vehicles
          SET wa_group_link = ${groupLink?.trim() || null}
          WHERE id = ${vehicleId}::uuid AND tenant_id = ${tid}::uuid
        `;
        groupsUpdated++;
      }
    }

    return NextResponse.json({
      ok: true,
      message: `WhatsApp configurado. ${groupsUpdated} grupos actualizados.`,
    });
  } catch (err) {
    console.error('[settings/whatsapp POST]', err);
    return NextResponse.json({ message: 'Error al guardar configuración' }, { status: 500 });
  }
}
