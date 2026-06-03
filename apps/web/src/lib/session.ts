import { NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

export interface SessionUser {
  id: string;
  email: string;
  role: string;
  tenantId: string | null;
  company: string;
  firstName: string;
  lastName: string;
  plan?: string;        // 'basic' | 'pro' | 'enterprise'
  maxVehicles?: number;
  trialEndsAt?: string | null;
}

// JWT_SECRET se verifica en runtime (no en build-time) para evitar fallos en "Collecting page data".
// Si no está configurado en producción, los tokens no se podrán verificar/firmar, lo cual es seguro:
// las rutas protegidas retornan 401 sin fallar el build.
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'gtf-dev-secret-local-only-32chars!'
)

export async function signToken(
  payload: Record<string, unknown>,
  expiresIn: string = '30d',
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * Extrae el usuario de la sesión desde el cookie gtf_session.
 * Solo acepta tokens JWT firmados con HS256 — el fallback base64 sin firma fue eliminado
 * por ser un vector de ataque (cualquier usuario podía forjar sesiones).
 */
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  try {
    const token = req.cookies.get('gtf_session')?.value;
    if (!token) return null;

    const jwtPayload = await verifyToken(token);
    if (!jwtPayload) return null;

    return {
      id:          jwtPayload.sub as string,
      email:       jwtPayload.email as string,
      role:        jwtPayload.role as string,
      tenantId:    jwtPayload.tenantId as string | null,
      company:     jwtPayload.company as string,
      firstName:   jwtPayload.firstName as string,
      lastName:    jwtPayload.lastName as string,
      plan:        jwtPayload.plan as string | undefined,
      maxVehicles: jwtPayload.maxVehicles as number | undefined,
      trialEndsAt: jwtPayload.trialEndsAt as string | null | undefined,
    };
  } catch {
    return null;
  }
}
