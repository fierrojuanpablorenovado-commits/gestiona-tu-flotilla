/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ROLES & PERMISSIONS — Gestiona tu Flotilla SaaS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Arquitectura multi-tenant escalable:
 *  • super_admin     → Nivel plataforma. Ve y gestiona todos los tenants.
 *  • admin_general   → Dueño del tenant. Acceso total a su empresa.
 *  • administrador   → Mano derecha del admin. Sin configuración ni billing.
 *  • tesoreria       → Solo módulos financieros.
 *  • operaciones     → Vehículos, choferes, contratos, incidencias.
 *  • mecanico        → Solo órdenes de mantenimiento.
 *  • supervisor      → Supervisión de campo: ubicación, cobranza, incidencias.
 *  • socio           → Sólo su dashboard financiero (inversionista).
 *  • chofer          → App móvil únicamente (sin acceso web).
 */

export type UserRole =
  | 'super_admin'
  | 'admin_general'
  | 'administrador'
  | 'tesoreria'
  | 'operaciones'
  | 'mecanico'
  | 'supervisor'
  | 'socio'
  | 'chofer';

// ─── Display ─────────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin_general: 'Admin General',
  administrador: 'Administrador',
  tesoreria: 'Tesorería',
  operaciones: 'Operaciones',
  mecanico: 'Mecánico',
  supervisor: 'Supervisor',
  socio: 'Socio / Inversionista',
  chofer: 'Chofer',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'bg-red-100 text-red-700 border-red-200',
  admin_general: 'bg-blue-100 text-blue-700 border-blue-200',
  administrador: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  tesoreria: 'bg-green-100 text-green-700 border-green-200',
  operaciones: 'bg-orange-100 text-orange-700 border-orange-200',
  mecanico: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  supervisor: 'bg-purple-100 text-purple-700 border-purple-200',
  socio: 'bg-teal-100 text-teal-700 border-teal-200',
  chofer: 'bg-slate-100 text-slate-700 border-slate-200',
};

// ─── Navigation permissions ───────────────────────────────────────────────────
// Each nav item lists which roles CAN see it.
// Omit a role → that item is hidden from their sidebar.

export type NavPermission = UserRole[];

export const NAV_PERMISSIONS: Record<string, NavPermission> = {
  // PORTALES PERSONALES
  '/chofer':   ['chofer', 'super_admin', 'admin_general', 'administrador'],
  '/mecanico': ['mecanico', 'super_admin', 'admin_general', 'administrador'],

  // PRINCIPAL
  '/': ['super_admin', 'admin_general', 'administrador', 'tesoreria', 'operaciones', 'supervisor', 'socio'],
  '/vehiculos': ['super_admin', 'admin_general', 'administrador', 'operaciones', 'mecanico', 'supervisor'],
  '/choferes': ['super_admin', 'admin_general', 'administrador', 'operaciones', 'supervisor'],

  // RECLUTAMIENTO
  '/reclutamiento': ['super_admin', 'admin_general', 'administrador', 'operaciones'],
  '/reclutamiento/candidatos': ['super_admin', 'admin_general', 'administrador', 'operaciones'],
  '/reclutamiento/entrevistas': ['super_admin', 'admin_general', 'administrador', 'operaciones'],

  // OPERACIONES
  '/mantenimiento': ['super_admin', 'admin_general', 'administrador', 'operaciones', 'mecanico', 'supervisor'],
  '/incidencias': ['super_admin', 'admin_general', 'administrador', 'operaciones', 'supervisor'],
  '/ubicacion': ['super_admin', 'admin_general', 'administrador', 'operaciones', 'supervisor'],

  // FINANCIERO
  '/tesoreria': ['super_admin', 'admin_general', 'administrador', 'tesoreria'],
  '/cuentas-semanales': ['super_admin', 'admin_general', 'administrador', 'tesoreria', 'operaciones'],
  '/socios': ['super_admin', 'admin_general', 'administrador', 'tesoreria', 'socio'],

  // FINANCIERO — CONTABILIDAD
  '/contabilidad': ['super_admin', 'admin_general', 'administrador', 'tesoreria'],

  // FINANCIERO — FACTURACIÓN
  '/facturacion': ['super_admin', 'admin_general'],

  // FINANCIERO — FISCAL
  '/fiscal': ['super_admin', 'admin_general', 'administrador', 'tesoreria'],

  // OPERACIONES — SEGUROS E IMPORTACIÓN
  '/seguros': ['super_admin', 'admin_general', 'administrador', 'operaciones'],
  '/cuentas-semanales/importar-didi': ['super_admin', 'admin_general', 'administrador', 'tesoreria', 'operaciones'],

  // SISTEMA
  '/reportes': ['super_admin', 'admin_general', 'administrador', 'tesoreria', 'socio'],
  '/reportes/semanal': ['super_admin', 'admin_general', 'administrador', 'tesoreria', 'socio'],
  '/configuracion': ['super_admin', 'admin_general'],
};

// ─── Permission helpers ───────────────────────────────────────────────────────

export function canAccess(role: UserRole, path: string): boolean {
  // Super admin always has access
  if (role === 'super_admin') return true;
  const allowed = NAV_PERMISSIONS[path];
  if (!allowed) return true; // unlisted paths are allowed by default
  return allowed.includes(role);
}

export function isAdminRole(role: UserRole): boolean {
  return ['super_admin', 'admin_general', 'administrador'].includes(role);
}

export function isFinanceRole(role: UserRole): boolean {
  return ['super_admin', 'admin_general', 'administrador', 'tesoreria'].includes(role);
}

export function isOpsRole(role: UserRole): boolean {
  return ['super_admin', 'admin_general', 'administrador', 'operaciones', 'supervisor'].includes(role);
}

export function canManageTenant(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin_general';
}

// ─── Default redirect after login (by role) ──────────────────────────────────

export const ROLE_HOME: Record<UserRole, string> = {
  super_admin: '/resumen-final',
  admin_general: '/resumen-final',
  administrador: '/resumen-final',
  tesoreria: '/tesoreria',
  operaciones: '/vehiculos',
  mecanico: '/mecanico',
  supervisor: '/ubicacion',
  socio: '/socios',
  chofer: '/chofer',
};
