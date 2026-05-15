import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/planes',
  '/registro',
  '/api/registro',
  '/api/stripe/webhook',
  '/terminos',
  '/privacidad',
  '/forgot-password',
  '/reset-password',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/track/',               // public GPS share pages
  '/api/gps/track/',       // public GPS share API
];
const LANDING_PATH = '/';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Solo el dominio RAÍZ muestra la landing page
  // app., demo., vercel.app y cualquier otro van directo al login
  const isRootDomain =
    hostname === 'gestionatuflotilla.com' ||
    hostname === 'www.gestionatuflotilla.com';

  if (!isRootDomain && pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
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
    // If authenticated user visits landing, redirect to dashboard
    const session = request.cookies.get('gtf_session');
    if (pathname === LANDING_PATH && session) {
      return NextResponse.redirect(new URL('/resumen-final', request.url));
    }
    return NextResponse.next();
  }

  // Check for session cookie
  const session = request.cookies.get('gtf_session');

  // Also check for token in Authorization header (for API calls from client)
  const authHeader = request.headers.get('authorization');
  const hasToken = !!authHeader?.startsWith('Bearer ');

  // Allow API routes with token (they handle their own auth)
  if (pathname.startsWith('/api/') && (hasToken || !pathname.startsWith('/api/'))) {
    return NextResponse.next();
  }

  // Redirect to login if no session for dashboard pages
  if (!session && !pathname.startsWith('/api/')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
