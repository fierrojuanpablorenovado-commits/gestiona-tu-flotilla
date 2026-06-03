/**
 * GET /api/whatsapp/groups
 *
 * Proxy de la API Whapi.Cloud GET /groups para el tenant actual.
 * Devuelve la lista de grupos de WhatsApp a los que pertenece el canal configurado.
 * Multi-tenant: usa el token wa_whapi_token del tenant autenticado.
 *
 * Respuesta:
 *   { groups: [{ id: "120363...@g.us", name: "Nombre del grupo", participants: number }] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session?.tenantId) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  const tid = session.tenantId;

  try {
    // Leer token y canal Whapi del tenant
    const rows = await sql`
      SELECT setting_key, value FROM tenant_settings
      WHERE tenant_id = ${tid}::uuid
        AND setting_key IN ('wa_whapi_token', 'wa_whapi_channel', 'wa_mode')
    `;

    const cfg: Record<string, string> = {};
    for (const r of rows) cfg[r.setting_key as string] = r.value as string;

    if (cfg['wa_mode'] !== 'whapi') {
      return NextResponse.json(
        { message: 'El modo WhatsApp no es Whapi. Activa el modo Whapi primero.' },
        { status: 422 }
      );
    }

    const token = cfg['wa_whapi_token'];
    if (!token) {
      return NextResponse.json(
        { message: 'No hay token Whapi configurado para este tenant.' },
        { status: 422 }
      );
    }

    const channelSub = cfg['wa_whapi_channel']?.trim();
    const baseUrl    = channelSub ? `https://${channelSub}.whapi.cloud` : 'https://gate.whapi.cloud';

    // Obtener grupos — puede haber paginación, pedimos los primeros 100
    const whapiRes = await fetch(`${baseUrl}/groups?count=100&offset=0`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(20_000),
    });

    if (!whapiRes.ok) {
      const errJson = await whapiRes.json().catch(() => ({}));
      const errMsg  = (errJson as { message?: string }).message ?? `Error Whapi ${whapiRes.status}`;
      console.error('[whatsapp/groups GET]', whapiRes.status, errJson);
      return NextResponse.json({ message: errMsg }, { status: 502 });
    }

    const data = await whapiRes.json() as {
      groups?: Array<{
        id:           string;
        name:         string;
        participants?: unknown[];
        participants_count?: number;
      }>;
    };

    const groups = (data.groups ?? []).map((g) => ({
      id:           g.id,
      name:         g.name ?? g.id,
      participants: g.participants_count ?? (Array.isArray(g.participants) ? g.participants.length : 0),
    }));

    // Ordenar alfabéticamente
    groups.sort((a, b) => a.name.localeCompare(b.name, 'es'));

    return NextResponse.json({ groups, total: groups.length });

  } catch (err: unknown) {
    const isTimeout = err instanceof Error && (err.name === 'TimeoutError' || err.message.includes('abort'));
    console.error('[whatsapp/groups GET]', err);
    return NextResponse.json(
      { message: isTimeout ? 'Whapi no respondió a tiempo (>20 s)' : 'Error al obtener grupos' },
      { status: 500 }
    );
  }
}
