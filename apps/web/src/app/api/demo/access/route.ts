import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { signToken } from '@/lib/session';

export async function GET(_req: NextRequest) {
  try {
    // 1. Buscar ÚNICAMENTE el tenant demo aislado (NUNCA datos reales de clientes)
    const tenantRows = await sql`
      SELECT id, name, plan, max_vehicles, trial_ends_at
      FROM tenants
      WHERE slug = 'demo'
      LIMIT 1
    `;

    const tenant = tenantRows[0];
    if (!tenant) {
      return NextResponse.json(
        { message: 'Tenant demo no encontrado. Contacta al administrador.' },
        { status: 404 },
      );
    }

    // 2. Buscar el user admin_general del tenant demo
    const userRows = await sql`
      SELECT id, email, first_name AS "firstName", last_name AS "lastName",
             role, avatar, phone
      FROM users
      WHERE tenant_id = ${tenant.id}
        AND role = 'admin_general'
        AND active = true
      LIMIT 1
    `;

    const user = userRows[0];
    if (!user) {
      return NextResponse.json(
        { message: 'No se encontró usuario admin para la demo' },
        { status: 404 },
      );
    }

    // 5. Crear JWT igual que en login/route.ts
    const avatarFallback = user.avatar
      || ((user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')).toUpperCase();

    const tokenPayload: Record<string, unknown> = {
      sub:         user.id,
      email:       user.email,
      role:        user.role,
      tenantId:    tenant.id,
      company:     tenant.name,
      firstName:   user.firstName,
      lastName:    user.lastName,
      avatar:      avatarFallback,
      plan:        tenant.plan        ?? 'basic',
      maxVehicles: tenant.max_vehicles ?? 10,
      trialEndsAt: tenant.trial_ends_at
        ? String(tenant.trial_ends_at).slice(0, 10)
        : null,
    };

    const access_token = await signToken(tokenPayload, '1d');

    // 6. Setear cookie gtf_session igual que en login y redirigir
    const response = NextResponse.redirect(
      new URL('/resumen-final', _req.url),
    );

    response.cookies.set('gtf_session', access_token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 7, // 7 días
      path:     '/',
    });

    return response;
  } catch (err) {
    console.error('[demo/access] Error:', err);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
