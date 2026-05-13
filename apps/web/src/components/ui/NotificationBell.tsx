'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, AlertTriangle, Wrench, Shield, DollarSign } from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: 'maintenance' | 'payment' | 'insurance' | 'alert' | 'document';
  title: string;
  message?: string;
  description?: string; // legacy compat
  severity?: 'info' | 'warning' | 'danger';
  read: boolean;
  createdAt?: string;
  time?: string; // legacy compat
}

interface NotificationBellProps {
  /** Si se pasan desde fuera, se usan; si no, el componente hace fetch propio */
  notifications?: Notification[];
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
}

// ── Iconos y colores por tipo ─────────────────────────────────────────────────

const TYPE_ICON: Record<string, React.ElementType> = {
  maintenance: Wrench,
  payment:     DollarSign,
  insurance:   Shield,
  alert:       AlertTriangle,
  document:    Bell,
};

const TYPE_COLOR: Record<string, string> = {
  maintenance: 'text-orange-500 bg-orange-50',
  payment:     'text-green-500 bg-green-50',
  insurance:   'text-blue-500 bg-blue-50',
  alert:       'text-red-500 bg-red-50',
  document:    'text-slate-500 bg-slate-50',
};

const SEVERITY_BORDER: Record<string, string> = {
  danger:  'border-l-2 border-red-400',
  warning: 'border-l-2 border-yellow-400',
  info:    '',
};

function formatTime(iso?: string): string {
  if (!iso) return '';
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const min  = Math.floor(diff / 60_000);
    if (min < 1)   return 'ahora';
    if (min < 60)  return `hace ${min} min`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24)  return `hace ${hrs}h`;
    return `hace ${Math.floor(hrs / 24)} días`;
  } catch {
    return iso;
  }
}

// ── Componente ────────────────────────────────────────────────────────────────

export function NotificationBell({
  notifications: externalNotifs,
  onMarkRead: externalMarkRead,
  onMarkAllRead: externalMarkAllRead,
}: NotificationBellProps) {
  const [open, setOpen]           = useState(false);
  const [notifs, setNotifs]       = useState<Notification[]>(externalNotifs ?? []);
  const [fetchError, setFetchError] = useState(false);

  // Si se controla externamente, sincronizar
  useEffect(() => {
    if (externalNotifs) setNotifs(externalNotifs);
  }, [externalNotifs]);

  // Fetch autónomo cuando no se pasan desde fuera
  const fetchNotifs = useCallback(async () => {
    if (externalNotifs !== undefined) return; // controlado externamente
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Notification[] = await res.json();
      setNotifs(Array.isArray(data) ? data : []);
      setFetchError(false);
    } catch {
      setFetchError(true);
    }
  }, [externalNotifs]);

  // Carga inicial
  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  // Auto-refresh cada 2 minutos
  useEffect(() => {
    const timer = setInterval(fetchNotifs, 2 * 60_000);
    return () => clearInterval(timer);
  }, [fetchNotifs]);

  // ── Marcar como leída ───────────────────────────────────────────────────────

  async function handleMarkRead(id: string) {
    if (externalMarkRead) {
      externalMarkRead(id);
      return;
    }

    // Optimistic UI
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));

    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    } catch {
      // Revertir si falla
      setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: false } : n));
    }
  }

  async function handleMarkAllRead() {
    if (externalMarkAllRead) {
      externalMarkAllRead();
      return;
    }

    const unread = notifs.filter((n) => !n.read);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));

    for (const n of unread) {
      try {
        await fetch(`/api/notifications/${n.id}/read`, { method: 'PATCH' });
      } catch {
        // Silencioso — UI ya está actualizado
      }
    }
  }

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-40 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 dark:text-white text-sm">Notificaciones</span>
                {unread > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
                    {unread}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                  >
                    Marcar todas leídas
                  </button>
                )}
              </div>
            </div>

            {/* Lista */}
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
              {fetchError && (
                <div className="py-4 text-center text-xs text-red-400 px-4">
                  No se pudieron cargar las notificaciones
                </div>
              )}
              {!fetchError && notifs.length === 0 && (
                <div className="py-8 text-center">
                  <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Sin notificaciones</p>
                </div>
              )}
              {notifs.map((n) => {
                const Icon  = TYPE_ICON[n.type] ?? Bell;
                const color = TYPE_COLOR[n.type] ?? TYPE_COLOR.document;
                const sev   = SEVERITY_BORDER[n.severity ?? 'info'] ?? '';
                const msg   = n.message ?? n.description ?? '';
                const time  = n.time ?? formatTime(n.createdAt);

                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${sev} ${!n.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                    onClick={() => handleMarkRead(n.id)}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-white leading-tight">{n.title}</p>
                      {msg && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight line-clamp-2">{msg}</p>
                      )}
                      {time && (
                        <p className="text-[10px] text-gray-400 mt-1">{time}</p>
                      )}
                    </div>
                    {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0" />}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            {notifs.length > 0 && (
              <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 text-center">
                <a href="/configuracion" className="text-xs text-blue-500 hover:text-blue-600 font-medium">
                  Ver todas las notificaciones
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
