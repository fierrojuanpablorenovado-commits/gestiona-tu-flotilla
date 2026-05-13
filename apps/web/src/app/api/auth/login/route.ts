import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db';
import { ROLE_HOME } from '@/lib/roles';
import { signToken } from '@/lib/session';

// ─── Rate limiting básico en memoria ──────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const RATE_LIMIT_MAX       = 10;               // max intentos por ventana

interface RateLimitEntry { count: number; resetAt: number }
const rateLimitMap = new Map<string, RateLimitEntry>();

function checkRateLimit(ip: string): boolean {
  const now  = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true; // permitido
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) return false; // bloqueado
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting por IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
              || req.headers.get('x-real-ip')
              || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { message: 'Demasiados intentos. Intenta en 15 minutos.' },
        { status: 429 },
      );
    }

    const body = await req.json();
    const { email, password, rememberMe } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Correo y contraseña son requeridos' },
        { status: 400 },
      );
    }

    // Buscar usuario en la base de datos
    const rows = await sql`
      SELECT
        u.id,
        u.email,
        u.first_name  AS "firstName",
        u.last_name   AS "lastName",
        u.role,
        u.avatar,
        u.phone,
        u.active,
        u.password_hash,
        u.tenant_id   AS "tenantId",
        t.name        AS company
      FROM users u
      LEFT JOIN tenants t ON t.id = u.tenant_id
      WHERE u.email = ${email.toLowerCase().trim()}
        AND u.active = true
      LIMIT 1
    `;

    const user = rows[0];

    if (!user) {
      return NextResponse.json(
        { message: 'Correo o contraseña incorrectos' },
        { status: 401 },
      );
    }

    // Verificar contraseña con bcrypt
    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      return NextResponse.json(
        { message: 'Correo o contraseña incorrectos' },
        { status: 401 },
      );
    }

    // Generar token JWT firmado con jose
    const tokenPayload: Record<string, unknown> = {
      sub:       user.id,
      email:     user.email,
      role:      user.role,
      tenantId:  user.tenantId,
      company:   user.company,
      firstName: user.firstName,
      lastName:  user.lastName,
      avatar:    user.avatar || (user.firstName[0] + user.lastName[0]).toUpperCase(),
    };

    const jwtExpiry = rememberMe ? '30d' : '1d';
    const access_token = await signToken(tokenPayload, jwtExpiry);
    const homeRoute = ROLE_HOME[user.role as keyof typeof ROLE_HOME] || '/dashboard';

    const { password_hash: _pw, ...userSafe } = user;

    const response = NextResponse.json({
      access_token,
      user: { ...userSafe, avatar: tokenPayload.avatar },
      redirectTo: homeRoute,
    });

    response.cookies.set('gtf_session', access_token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24,  // 30 días si recordar, 1 día si no
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('[login] Error:', err);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
