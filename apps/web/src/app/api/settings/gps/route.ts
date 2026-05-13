/**
 * GET  /api/settings/gps  → lee config GPS del tenant (keys enmascaradas)
 * POST /api/settings/gps  → guarda/actualiza credenciales GPS + IMEIs
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

// ── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }
    const tid = session.tenantId;

    // Leer settings GPS del tenant
    const rows = await sql`
      SELECT setting_key, value
      FROM tenant_settings
      WHERE tenant_id = ${tid}::uuid
        AND setting_key IN ('gps_provider', 'tracksolid_app_key', 'tracksolid_app_secret')
    `;

    const map: Record<string, string> = {};
    for (const r of rows) {
      map[r.setting_key as string] = r.value as string;
    }

    // Leer IMEIs de vehículos
    const vehicles = await sql`
      SELECT id::text, eco, plates, gps_imei
      FROM vehicles
      WHERE tenant_id = ${tid}::uuid
        AND status != 'inactive'
      ORDER BY eco
    `;

    return NextResponse.json({
      gpsProvider:     map['gps_provider']         || 'none',
      appKey:          map['tracksolid_app_key']    ? '***configured***' : '',
      appSecretSet:    !!map['tracksolid_app_secret'],
      vehicles:        vehicles.map((v) => ({
        id:     v.id,
        eco:    v.eco,
        plates: v.plates,
        imei:   v.gps_imei ?? '',
      })),
    });
  } catch (err: any) {
    console.error('[settings/gps GET]', err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}

// ── POST ────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId || session.role !== 'admin_general') {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }
    const tid = session.tenantId;

    const body = await req.json();
    const { gpsProvider, appKey, appSecret, imeis } = body;
    // imeis: { vehicleId: string, imei: string }[]

    // ── Guardar proveedor GPS ────────────────────────────────────────────────
    if (gpsProvider) {
      await sql`
        INSERT INTO tenant_settings (tenant_id, setting_key, value, updated_at)
        VALUES (${tid}::uuid, 'gps_provider', ${gpsProvider}, NOW())
        ON CONFLICT (tenant_id, setting_key) DO UPDATE
          SET value = EXCLUDED.value, updated_at = NOW()
      `;
    }

    // ── Guardar App Key (solo si se envió y no es placeholder) ──────────────
    if (appKey && appKey !== '***configured***') {
      await sql`
        INSERT INTO tenant_settings (tenant_id, setting_key, value, updated_at)
        VALUES (${tid}::uuid, 'tracksolid_app_key', ${appKey}, NOW())
        ON CONFLICT (tenant_id, setting_key) DO UPDATE
          SET value = EXCLUDED.value, updated_at = NOW()
      `;
    }

    // ── Guardar App Secret ───────────────────────────────────────────────────
    if (appSecret) {
      await sql`
        INSERT INTO tenant_settings (tenant_id, setting_key, value, updated_at)
        VALUES (${tid}::uuid, 'tracksolid_app_secret', ${appSecret}, NOW())
        ON CONFLICT (tenant_id, setting_key) DO UPDATE
          SET value = EXCLUDED.value, updated_at = NOW()
      `;
    }

    // ── Actualizar IMEIs de vehículos ────────────────────────────────────────
    let imeisUpdated = 0;
    if (Array.isArray(imeis)) {
      for (const { vehicleId, imei } of imeis) {
        if (!vehicleId) continue;
        const imeiClean = (imei || '').trim();
        await sql`
          UPDATE vehicles
          SET gps_imei = ${imeiClean || null}
          WHERE id = ${vehicleId}::uuid
            AND tenant_id = ${tid}::uuid
        `;
        imeisUpdated++;
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Configuración GPS guardada. ${imeisUpdated} IMEIs actualizados.`,
    });
  } catch (err: any) {
    console.error('[settings/gps POST]', err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
