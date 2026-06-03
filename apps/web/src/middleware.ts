import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const ALLOWED_ORIGINS = [
  'https://gestiona-tu-flotilla.vercel.app',
  'https://gestionatuflotilla.com',
  'https://www.gestionatuflotilla.com',
  'http://localhost:3000',
  'http://localhost:3001',
];

function applyCors(req: NextRequest, res: NextResponse): NextResponse {
  const origin = req.headers.get('origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin);

  if (req.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 });
    preflight.headers.set('Access-Control-Allow-Origin', allowed ? origin : '');
    preflight.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    preflight.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    preflight.headers.set('Access-Control-Max-Age', '86400');
    return preflight;
  }

  if (allowed && origin) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  return res;
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'gtf-dev-secret-local-only-32chars!'
);

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/planes',
  '/trial-expirado',
  '/registro',
  '/api/registro',
  '/api/stripe/webhook',
  '/terminos',
  '/privacidad',
  '/datos',
  '/marca',
  '/forgot-password',
  '/reset-password',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/track/',               // public GPS share pages
  '/api/gps/track/',       // public GPS share API
];
const LANDING_PATH = '/';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Handle CORS preflight early
  if (request.method === 'OPTIONS') {
    return applyCors(request, new NextResponse(null, { status: 204 }));
  }

  // Solo el dominio RAÍZ muestra la landing page
  // app., demo., vercel.app y cualquier otro van directo al login
  const isRootDomain =
    hostname === 'gestionatuflotilla.com' ||
    hostname === 'www.gestionatuflotilla.com';

  if (!isRootDomain && pathname === '/') {
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return applyCors(request, res);
  }

  // Noindex en TODOS los dominios no-root (vercel.app, etc.)
  if (!isRootDomain) {
    const res = NextResponse.next();
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return applyCors(request, res);
  }

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname === LANDING_PATH ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/manifest.json' ||
    /\.(png|jpg|jpeg|webp|svg|gif|ico|woff|woff2|json)$/i.test(pathname)
  ) {
    // Si usuario autenticado visita la landing → redirigir al dashboard
    // EXCEPCIONES: ?preview=1  O  el usuario es admin/super_admin
    const session = request.cookies.get('gtf_session');
    const isPreview = request.nextUrl.searchParams.get('preview') === '1';
    if (pathname === LANDING_PATH && session && !isPreview) {
      try {
        const { payload } = await jwtVerify(session.value, JWT_SECRET);
        const role = payload.role as string;
        // Solo choferes y mecánicos se redirigen al dashboard — admins siempre ven la landing
        const REDIRECT_ROLES = ['chofer', 'mecanico'];
        if (REDIRECT_ROLES.includes(role)) {
          return applyCors(request, NextResponse.redirect(new URL('/resumen-final', request.url)));
        }
      } catch {
        // JWT inválido u otro error → mostrar landing (es pública de todas formas)
      }
    }
    return applyCors(request, NextResponse.next());
  }

  // Check for session cookie
  const session = request.cookies.get('gtf_session');

  // Also check for token in Authorization header (for API calls from client)
  const authHeader = request.headers.get('authorization');
  const hasToken = !!authHeader?.startsWith('Bearer ');

  // Allow API routes with token (they handle their own auth)
  if (pathname.startsWith('/api/') && (hasToken || !pathname.startsWith('/api/'))) {
    return applyCors(request, NextResponse.next());
  }

  // Redirect to login if no session for dashboard pages
  if (!session && !pathname.startsWith('/api/')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return applyCors(request, NextResponse.redirect(loginUrl));
  }

  // ── Verificar trial expirado (solo rutas de dashboard, no APIs) ────────────
  if (session && !pathname.startsWith('/api/') && !pathname.startsWith('/trial-expirado')) {
    try {
      const { payload } = await jwtVerify(session.value, JWT_SECRET);
      const trialEndsAt = payload.trialEndsAt as string | null | undefined;
      const role        = payload.role as string;
      const plan        = payload.plan as string | undefined;

      // Super admin y tenants con plan activo nunca se bloquean
      const isBlocked =
        trialEndsAt &&
        role !== 'super_admin' &&
        !plan?.startsWith('paid') &&
        new Date(trialEndsAt) < new Date();

      if (isBlocked) {
        // Permitir logout y configuración para que puedan pagar/salir
        const allowed = ['/logout', '/configuracion', '/planes'];
        if (!allowed.some(p => pathname.startsWith(p))) {
          return applyCors(request, NextResponse.redirect(new URL('/trial-expirado', request.url)));
        }
      }
    } catch {
      // JWT inválido o sin trialEndsAt — no bloquear
    }
  }

  // ── Noindex en todas las rutas privadas del dashboard ──────────────────────
  // Triple protección: robots.txt + metadata + este header HTTP
  const PRIVATE_PREFIXES = [
    '/dashboard', '/resumen-final', '/vehiculos', '/choferes',
    '/cuentas-semanales', '/seguros', '/mantenimiento', '/contabilidad',
    '/fiscal', '/tesoreria', '/reportes', '/configuracion', '/incidencias',
    '/ubicacion', '/socios', '/facturacion', '/reclutamiento', '/mis-ingresos',
    '/chofer', '/mecanico', '/portal',
  ];
  const isPrivate = PRIVATE_PREFIXES.some((p) => pathname.startsWith(p));
  if (isPrivate) {
    const res = NextResponse.next();
    res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    return applyCors(request, res);
  }

  return applyCors(request, NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
