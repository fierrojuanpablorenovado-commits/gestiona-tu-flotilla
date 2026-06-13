/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PLAN FEATURES — Gestiona tu Flotilla SaaS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Define qué módulos/rutas están disponibles en cada plan.
 * Planes (valor en DB): basic | pro | enterprise
 * Nombres comerciales: Starter | Pro | Enterprise
 *
 *  STARTER (basic)   → Control operativo completo, hasta 10 vehículos
 *  PRO     (pro)     → + GPS, WhatsApp, RESICO, socios, reclutamiento, tesorería
 *  ENTERPRISE        → + Facturación CFDI, multi-sucursal, API/webhooks
 */

export type TenantPlan = 'basic' | 'pro' | 'enterprise';

/** Jerarquía numérica para comparar planes */
export const PLAN_HIERARCHY: Record<TenantPlan, number> = {
  basic:      1,
  pro:        2,
  enterprise: 3,
};

/**
 * Límite de vehículos activos por plan.
 * FUENTE ÚNICA DE VERDAD — usar aquí, no hardcodear en ningún otro lugar.
 * El campo max_vehicles en la tabla tenants debe coincidir siempre.
 */
export const PLAN_MAX_VEHICLES: Record<TenantPlan, number> = {
  basic:      10,
  pro:        30,
  enterprise: 60,
};

/** Nombre comercial de cada plan */
export const PLAN_LABELS: Record<TenantPlan, string> = {
  basic:      'Starter',
  pro:        'Pro',
  enterprise: 'Enterprise',
};

/** Color badge para cada plan */
export const PLAN_BADGE_CLASS: Record<TenantPlan, string> = {
  basic:      'bg-slate-700 text-slate-300',
  pro:        'bg-blue-900/80 text-blue-300',
  enterprise: 'bg-purple-900/80 text-purple-300',
};

/**
 * Mínimo plan requerido por ruta.
 * Si la ruta NO está aquí → disponible en TODOS los planes (incluido Starter).
 */
export const PLAN_REQUIRED: Record<string, TenantPlan> = {
  // PRO: GPS + finanzas avanzadas + socios + reclutamiento + plataformas + WhatsApp
  '/ubicacion':               'pro',
  '/reportes/gps':            'pro',
  '/contabilidad':            'pro',
  '/fiscal':                  'pro',
  '/socios':                  'pro',
  '/tesoreria':               'pro',
  '/reclutamiento':           'pro',
  '/reclutamiento/banco':     'pro',
  '/reclutamiento/candidatos':'pro',
  '/reclutamiento/entrevistas':'pro',
  '/plataformas':             'pro',

  // ENTERPRISE: facturación CFDI
  '/facturacion':             'enterprise',
};

/**
 * Features internas que requieren plan (para tabs, botones, secciones)
 * Uso: planHasFeature(user.plan, 'cfdi')
 */
export const FEATURE_REQUIRED: Record<string, TenantPlan> = {
  'cfdi':           'enterprise',   // Tab CFDI en contabilidad
  'whatsapp':       'pro',          // Config WhatsApp
  'gps_multimarca': 'pro',          // GPS multi-proveedor
  'importar_didi':  'pro',          // Import Didi Fleet Excel
  'infracciones_sync': 'pro',       // Sync automático SSIM/Jalisco
  'plataformas':    'pro',          // Módulo InDrive/ML/Amazon
  'api_webhooks':   'enterprise',   // API + Webhooks propios
  'multi_sucursal': 'enterprise',   // Multi-sucursal
};

/**
 * ¿El plan del usuario tiene acceso a una feature interna?
 */
export function planHasFeature(
  userPlan: string | undefined | null,
  feature: string,
): boolean {
  const required = FEATURE_REQUIRED[feature];
  if (!required) return true;
  const userLevel = PLAN_HIERARCHY[(userPlan ?? 'basic') as TenantPlan] ?? 1;
  const reqLevel  = PLAN_HIERARCHY[required];
  return userLevel >= reqLevel;
}

/**
 * ¿El plan del usuario tiene acceso a una ruta dada?
 */
export function planHasAccess(
  userPlan: string | undefined | null,
  route: string,
): boolean {
  const required = PLAN_REQUIRED[route];
  if (!required) return true; // sin restricción de plan
  const userLevel = PLAN_HIERARCHY[(userPlan ?? 'basic') as TenantPlan] ?? 1;
  const reqLevel  = PLAN_HIERARCHY[required];
  return userLevel >= reqLevel;
}

/**
 * Retorna el plan mínimo requerido para una ruta, o null si no hay restricción.
 */
export function requiredPlanFor(route: string): TenantPlan | null {
  return PLAN_REQUIRED[route] ?? null;
}
