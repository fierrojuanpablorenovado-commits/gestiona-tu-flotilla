import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

const COBROS_KEYS = [
  'pago_modo',           // 'retiro_oxxo' | 'spei'
  'pago_clabe',          // CLABE del dueño de flotilla
  'pago_banco',          // Banco (BBVA, Banamex, etc.)
  'pago_nombre',         // Nombre del titular
  'pago_instrucciones',  // Texto libre para el chofer
] as const;

// ── GET /api/settings/cobros ───────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const tid = session.tenantId;

    const rows = await sql`
      SELECT setting_key, value FROM tenant_settings
      WHERE tenant_id = ${tid}::uuid
        AND setting_key = ANY(${COBROS_KEYS as unknown as string[]}::text[])
    `.catch(() => []);

    const map: Record<string, string> = {};
    for (const r of rows) map[r.setting_key as string] = r.value as string;

    return NextResponse.json({
      pago_modo:           map['pago_modo']           ?? 'retiro_oxxo',
      pago_clabe:          map['pago_clabe']           ?? '',
      pago_banco:          map['pago_banco']           ?? '',
      pago_nombre:         map['pago_nombre']          ?? '',
      pago_instrucciones:  map['pago_instrucciones']   ?? '',
    });
  } catch (err) {
    console.error('[settings/cobros GET]', err);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}

// ── POST /api/settings/cobros ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const tid  = session.tenantId;
    const body = await req.json();

    const updates: Record<string, string> = {
      pago_modo:          body.pago_modo          ?? 'retiro_oxxo',
      pago_clabe:         body.pago_clabe          ?? '',
      pago_banco:         body.pago_banco          ?? '',
      pago_nombre:        body.pago_nombre         ?? '',
      pago_instrucciones: body.pago_instrucciones  ?? '',
    };

    for (const [key, value] of Object.entries(updates)) {
      await sql`
        INSERT INTO tenant_settings (tenant_id, setting_key, value, updated_at)
        VALUES (${tid}::uuid, ${key}, ${value}, NOW())
        ON CONFLICT (tenant_id, setting_key)
        DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[settings/cobros POST]', err);
    return NextResponse.json({ message: 'Error al guardar' }, { status: 500 });
  }
}
