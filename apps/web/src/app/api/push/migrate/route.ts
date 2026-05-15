import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

// Ejecutar UNA vez: crea la tabla push_subscriptions
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.role || session.role !== 'superadmin') {
      return NextResponse.json({ error: 'Solo superadmin' }, { status: 403 });
    }

    await sql`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id      UUID,
        subscription JSONB NOT NULL,
        endpoint_hash TEXT GENERATED ALWAYS AS (md5(subscription->>'endpoint')) STORED UNIQUE,
        user_agent   TEXT,
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        updated_at   TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_push_subs_tenant ON push_subscriptions(tenant_id)`;

    return NextResponse.json({ ok: true, message: 'Tabla push_subscriptions creada' });
  } catch (err) {
    console.error('[push/migrate]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
