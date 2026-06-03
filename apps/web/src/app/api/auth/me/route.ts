import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);

    if (!session) {
      return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    }

    // Refrescar company/plan/maxVehicles desde la DB (evita que el JWT desactualizado
    // muestre datos anteriores del tenant)
    const rows = await sql`
      SELECT t.name AS company, t.plan, t.max_vehicles AS "maxVehicles",
             t.trial_ends_at AS "trialEndsAt"
      FROM users u
      LEFT JOIN tenants t ON t.id = u.tenant_id
      WHERE u.id = ${session.id}
      LIMIT 1
    `.catch(() => []);

    const fresh = rows[0] ?? {};

    return NextResponse.json({
      user: {
        ...session,
        id:          session.id,
        company:     fresh.company     ?? session.company,
        plan:        fresh.plan        ?? session.plan ?? 'basic',
        maxVehicles: fresh.maxVehicles ?? session.maxVehicles ?? 10,
        trialEndsAt: fresh.trialEndsAt ? String(fresh.trialEndsAt).slice(0, 10) : (session.trialEndsAt ?? null),
      },
    });
  } catch {
    return NextResponse.json({ message: 'Sesión inválida' }, { status: 401 });
  }
}
