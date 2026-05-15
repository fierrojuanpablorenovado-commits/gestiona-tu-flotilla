'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { NAV_PERMISSIONS, ROLE_LABELS, ROLE_COLORS, UserRole } from '@/lib/roles';
import {
  LayoutDashboard,
  Truck,
  Users,
  Wrench,
  Wallet,
  Handshake,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  FileSpreadsheet,
  FileText,
  DollarSign,
  BookOpen,
  Receipt,
  Calculator,
  AlertTriangle,
  MapPin,
  Bell,
  Activity,
} from 'lucide-react';

// ─── Notification helpers ─────────────────────────────────────────────────────

interface AppNotif {
  id: string;
  type: string;
  title: string;
  message?: string;
  severity?: string;
  read: boolean;
  link?: string;
  createdAt?: string;
}

const NOTIF_ICON: Record<string, React.ElementType> = {
  maintenance: Wrench,
  payment:     DollarSign,
  insurance:   Shield,
  alert:       AlertTriangle,
};

const NOTIF_COLOR: Record<string, string> = {
  maintenance: 'text-orange-500 bg-orange-50',
  payment:     'text-green-600 bg-green-50',
  insurance:   'text-blue-500 bg-blue-50',
  alert:       'text-red-500 bg-red-50',
};

const SEV_BORDER: Record<string, string> = {
  danger:  'border-l-2 border-red-400',
  warning: 'border-l-2 border-yellow-400',
};

function fmtTime(iso?: string): string {
  if (!iso) return '';
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60_000);
    if (min < 1)  return 'ahora';
    if (min < 60) return `hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24)   return `hace ${h}h`;
    return `hace ${Math.floor(h / 24)}d`;
  } catch { return ''; }
}

// ─── Nav structure ─────────────────────────────────────────────────────────────

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const ALL_SECTIONS: NavSection[] = [
  {
    label: 'INICIO',
    items: [
      { name: 'Resumen Final', href: '/resumen-final', icon: LayoutDashboard },
    ],
  },
  {
    label: 'FLOTILLA',
    items: [
      { name: 'Vehículos',         href: '/vehiculos',          icon: Truck },
      { name: 'Choferes',          href: '/choferes',           icon: Users },
      { name: 'Cuentas Semanales', href: '/cuentas-semanales',  icon: FileSpreadsheet },
      { name: 'Seguros',           href: '/seguros',            icon: Shield },
      { name: 'Mantenimiento',     href: '/mantenimiento',      icon: Wrench },
      { name: 'Incidencias',       href: '/incidencias',        icon: AlertTriangle },
      { name: 'Ubicación GPS',     href: '/ubicacion',          icon: MapPin },
    ],
  },
  {
    label: 'FINANZAS',
    items: [
      { name: 'Tesorería',     href: '/tesoreria',   icon: Wallet },
      { name: 'Mis Ingresos',  href: '/mis-ingresos', icon: DollarSign },
      { name: 'Contabilidad',  href: '/contabilidad', icon: BookOpen },
      { name: 'Facturación',   href: '/facturacion',  icon: Receipt },
      { name: 'Cálculo Fiscal',href: '/fiscal',       icon: Calculator },
      { name: 'Socios',        href: '/socios',       icon: Handshake },
    ],
  },
  {
    label: 'REPORTES',
    items: [
      { name: 'Reportes',        href: '/reportes',         icon: BarChart3 },
      { name: 'Reporte Semanal', href: '/reportes/semanal', icon: FileText },
      { name: 'Reporte GPS',     href: '/reportes/gps',     icon: Activity },
      { name: 'Configuración',   href: '/configuracion',    icon: Settings },
    ],
  },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed]       = useState(false);
  const [notifOpen, setNotifOpen]       = useState(false);
  const [notifs, setNotifs]             = useState<AppNotif[]>([]);
  const [notifLoaded, setNotifLoaded]   = useState(false);
  const { user, logout } = useAuth();

  // Cerrar sidebar móvil al navegar
  useEffect(() => {
    if (onMobileClose) onMobileClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const role = (user?.role ?? 'administrador') as UserRole;

  // ── Fetch notificaciones ────────────────────────────────────────────────────
  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data: AppNotif[] = await res.json();
      setNotifs(Array.isArray(data) ? data : []);
      setNotifLoaded(true);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    fetchNotifs();
    const timer = setInterval(fetchNotifs, 2 * 60_000);
    return () => clearInterval(timer);
  }, [fetchNotifs]);

  const unreadCount = notifs.filter(n => !n.read).length;

  async function handleNotifClick(n: AppNotif) {
    setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    setNotifOpen(false);
    fetch(`/api/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {});
    if (n.link) router.push(n.link);
  }

  async function handleMarkAllRead() {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    setNotifOpen(false);
    fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'all' }),
    }).catch(() => {});
  }

  const visibleSections = ALL_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      const allowed = NAV_PERMISSIONS[item.href];
      if (!allowed) return true;
      if (role === 'super_admin') return true;
      return allowed.includes(role);
    }),
  })).filter((section) => section.items.length > 0);

  const isActive = (href: string) => {
    if (href === '/resumen-final') return pathname === '/resumen-final' || pathname === '/dashboard' || pathname === '/';
    return pathname?.startsWith(href);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const initials = user?.avatar || (user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'GT');

  const roleLabel = user ? (ROLE_LABELS[role] || role) : '';
  const roleColor = user ? ROLE_COLORS[role] : 'bg-slate-100 text-slate-600';

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-900 transition-all duration-300 ease-in-out',
        // Móvil: oculto por defecto, visible cuando mobileOpen
        'translate-x-[-100%] md:translate-x-0',
        mobileOpen && 'translate-x-0',
        collapsed ? 'w-[64px]' : 'w-[252px]'
      )}
    >
      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className={clsx(
        'flex items-center gap-2.5 border-b border-slate-700/50 flex-shrink-0',
        collapsed ? 'h-12 justify-center px-0' : 'h-12 px-4'
      )}>
        <div style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0, overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/fleet-icon.png"
            alt="Gestiona tu Flotilla"
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.5)', transformOrigin: 'center' }}
          />
        </div>
        {!collapsed && (
          <span className="text-[13px] font-bold text-white tracking-tight truncate leading-tight">
            Gestiona tu Flotilla
          </span>
        )}
      </div>

      {/* ── Super admin badge ─────────────────────────────────────────────── */}
      {!collapsed && role === 'super_admin' && (
        <div className="mx-2.5 mt-2 flex items-center gap-1.5 rounded-md bg-red-900/30 border border-red-700/40 px-2.5 py-1.5">
          <Shield className="h-3 w-3 text-red-400 flex-shrink-0" />
          <span className="text-[10px] text-red-400 font-medium">Multi-Tenant</span>
        </div>
      )}

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-3 scrollbar-none">
        {visibleSections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="mb-0.5 px-2 text-[9px] font-bold uppercase tracking-widest text-slate-600">
                {section.label}
              </p>
            )}
            {collapsed && (
              <div className="my-1 mx-auto w-6 border-t border-slate-700/60" />
            )}
            <div className="space-y-px">
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    className={clsx(
                      'relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-all duration-150',
                      active
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/50'
                        : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200',
                      collapsed && 'justify-center px-0'
                    )}
                  >
                    <item.icon
                      className={clsx(
                        'h-[15px] w-[15px] flex-shrink-0',
                        active ? 'text-white' : 'text-slate-500'
                      )}
                    />
                    {!collapsed && (
                      <span className="truncate">{item.name}</span>
                    )}
                    {/* Active indicator dot */}
                    {active && !collapsed && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/60 flex-shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Notificaciones ───────────────────────────────────────────────── */}
      <div className="px-2 pb-1 flex-shrink-0 relative">
        <button
          onClick={() => setNotifOpen(o => !o)}
          className={clsx(
            'relative flex items-center gap-2.5 w-full rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-all duration-150',
            'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200',
            collapsed && 'justify-center px-0',
            notifOpen && 'bg-slate-800/70 text-slate-200'
          )}
          title={collapsed ? `Notificaciones${unreadCount > 0 ? ` (${unreadCount})` : ''}` : undefined}
        >
          <Bell className="h-[15px] w-[15px] flex-shrink-0 text-slate-500" />
          {!collapsed && <span className="truncate flex-1 text-left">Notificaciones</span>}
          {unreadCount > 0 && (
            <span className={clsx(
              'flex items-center justify-center rounded-full bg-red-500 text-white font-bold leading-none',
              collapsed
                ? 'absolute top-0.5 right-0.5 h-3.5 w-3.5 text-[8px]'
                : 'h-4 min-w-[16px] px-1 text-[9px]'
            )}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown notificaciones */}
        {notifOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
            <div
              className="fixed z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
              style={{ left: collapsed ? 72 : 260, bottom: 80 }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 text-sm">Notificaciones</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs text-blue-500 hover:text-blue-600 font-medium">
                    Marcar leídas
                  </button>
                )}
              </div>
              <div className="divide-y divide-gray-50" style={{ maxHeight: 320, overflowY: 'auto' }}>
                {notifLoaded && notifs.length === 0 && (
                  <div className="py-8 text-center">
                    <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Sin notificaciones</p>
                  </div>
                )}
                {!notifLoaded && (
                  <div className="py-6 text-center text-xs text-gray-400">Cargando...</div>
                )}
                {notifs.map(n => {
                  const Icon  = NOTIF_ICON[n.type] ?? Bell;
                  const color = NOTIF_COLOR[n.type] ?? 'text-slate-500 bg-slate-50';
                  const sev   = SEV_BORDER[n.severity ?? ''] ?? '';
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={clsx(
                        'w-full flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left',
                        sev,
                        !n.read && 'bg-blue-50/40'
                      )}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 leading-tight">{n.title}</p>
                        {n.message && (
                          <p className="text-xs text-gray-500 mt-0.5 leading-tight line-clamp-2">{n.message}</p>
                        )}
                        {n.createdAt && (
                          <p className="text-[10px] text-gray-400 mt-1">{fmtTime(n.createdAt)}</p>
                        )}
                      </div>
                      {!n.read && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Separador ────────────────────────────────────────────────────── */}
      <div className="mx-2.5 border-t border-slate-700/50" />

      {/* ── User section + Collapse ──────────────────────────────────────── */}
      <div className={clsx(
        'flex items-center py-2 flex-shrink-0',
        collapsed ? 'flex-col gap-2 px-0' : 'gap-2 px-2'
      )}>
        {/* Avatar + info */}
        <div className={clsx(
          'flex items-center gap-2 flex-1 rounded-md px-2 py-1.5 min-w-0',
          !collapsed && 'hover:bg-slate-800/50 cursor-default'
        )}>
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-600">
            <span className="text-[10px] font-bold text-white">{initials}</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-slate-200 truncate leading-tight">
                {user ? `${user.firstName} ${user.lastName}` : 'Usuario'}
              </p>
              <span className={`inline-block text-[9px] font-semibold px-1.5 py-px rounded-full border ${roleColor} leading-tight`}>
                {roleLabel}
              </span>
            </div>
          )}
        </div>

        {/* Botones logout + colapsar en fila */}
        {!collapsed ? (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setCollapsed(true)}
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
              title="Colapsar"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setCollapsed(false)}
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
              title="Expandir sidebar"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
