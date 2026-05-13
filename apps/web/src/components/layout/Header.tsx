'use client';

import { Search, Menu, ChevronRight, LogOut, ChevronDown, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useDarkMode } from '@/hooks/useDarkMode';
import { NotificationBell } from '@/components/ui/NotificationBell';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface HeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export function Header({ breadcrumbs = [], actions }: HeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();
  const { dark, toggle } = useDarkMode();

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'GT';

  const roleLabels: Record<string, string> = {
    admin_general: 'Admin General',
    tesoreria: 'Tesorería',
    operaciones: 'Operaciones',
    mecanico: 'Mecánico',
    super_admin: 'Super Admin',
    socio: 'Socio',
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6">
      <div className="flex items-center gap-4">
        <button className="lg:hidden p-2 rounded-lg hover:bg-slate-100">
          <Menu className="h-5 w-5 text-slate-500" />
        </button>

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/" className="text-slate-500 hover:text-slate-700 transition-colors">
            Gestiona tu Flotilla
          </Link>
          {breadcrumbs.map((item, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              {item.href ? (
                <Link href={item.href} className="text-slate-500 hover:text-slate-700 transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className="font-medium text-slate-900">{item.label}</span>
              )}
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-500 transition-all">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar (Ctrl+K)..."
            readOnly
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'k', bubbles: true }))}
            className="w-56 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 cursor-pointer"
          />
          <kbd className="hidden lg:inline-flex items-center rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
            Ctrl+K
          </kbd>
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          className="rounded-lg p-2 hover:bg-slate-100 transition-colors"
          title={dark ? 'Modo claro' : 'Modo oscuro'}
        >
          {dark ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-slate-500" />}
        </button>

        {/* Notifications — fetcha de /api/notifications, sin datos hardcodeados */}
        <NotificationBell />

        {/* Actions slot */}
        {actions}

        {/* User dropdown */}
        <div className="relative pl-2 border-l border-slate-200 ml-1">
          <button
            onClick={() => setUserMenuOpen((o) => !o)}
            className="flex items-center gap-2.5 hover:bg-slate-50 rounded-lg px-2 py-1 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-slate-900 leading-tight">
                {user ? `${user.firstName} ${user.lastName}` : 'Usuario'}
              </p>
              <p className="text-xs text-slate-500 leading-tight">
                {user ? (roleLabels[user.role] ?? user.role) : 'Cargando...'}
              </p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* Dropdown menu */}
          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl border border-slate-200 shadow-lg z-20 py-1">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-medium text-slate-900">
                    {user ? `${user.firstName} ${user.lastName}` : ''}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
                <Link
                  href="/configuracion"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Configuración
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
