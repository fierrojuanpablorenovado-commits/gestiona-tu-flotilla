import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

// POST — guardar suscripción
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { subscription } = await req.json();
    if (!subscription?.endpoint) return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 });

    const ua = req.headers.get('user-agent')?.slice(0, 200) ?? '';

    await sql`
      INSERT INTO push_subscriptions (tenant_id, user_id, subscription, user_agent)
      VALUES (
        ${session.tenantId}::uuid,
        ${session.id ?? null}::uuid,
        ${JSON.stringify(subscription)}::jsonb,
        ${ua}
      )
      ON CONFLICT (endpoint_hash)
      DO UPDATE SET
        subscription = EXCLUDED.subscription,
        tenant_id    = EXCLUDED.tenant_id,
        user_id      = EXCLUDED.user_id,
        updated_at   = NOW()
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[push/subscribe]', err);
    return NextResponse.json({ error: 'Error guardando suscripción' }, { status: 500 });
  }
}

// DELETE — eliminar suscripción
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { endpoint } = await req.json();
    if (!endpoint) return NextResponse.json({ error: 'Endpoint requerido' }, { status: 400 });

    await sql`
      DELETE FROM push_subscriptions
      WHERE tenant_id = ${session.tenantId}::uuid
        AND subscription->>'endpoint' = ${endpoint}
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[push/unsubscribe]', err);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

// GET — estado de suscripción del usuario actual
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) return NextResponse.json({ subscribed: false });

    const rows = await sql`
      SELECT COUNT(*) as cnt FROM push_subscriptions
      WHERE tenant_id = ${session.tenantId}::uuid
        AND user_id = ${session.id ?? null}::uuid
    `;
    return NextResponse.json({ subscribed: Number(rows[0]?.cnt ?? 0) > 0 });
  } catch {
    return NextResponse.json({ subscribed: false });
  }
}
