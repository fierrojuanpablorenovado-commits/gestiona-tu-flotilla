'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, AlertTriangle, Wrench, Shield, DollarSign, Siren } from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  tipo?: string;                   // tipo interno GPS_IMPACT, GPS_HARD_STOP, etc.
  type: 'maintenance' | 'payment' | 'insurance' | 'alert' | 'document';
  title: string;
  message?: string;
  description?: string;
  severity?: 'info' | 'warning' | 'danger';
  read: boolean;
  createdAt?: string;
  time?: string;
}

interface NotificationBellProps {
  notifications?: Notification[];
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
}

// Tipos que NUNCA se silencian — alarma de sonido siempre
const CRITICAL_TIPOS = new Set(['GPS_IMPACT', 'GPS_HARD_STOP']);

// ── Alarma de sonido (Web Audio API — sin archivos externos) ──────────────────

function playAlarmSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const pulsos = 3;
    const durPulso = 0.35;
    for (let i = 0; i < pulsos; i++) {
      const t0 = ctx.currentTime + i * (durPulso + 0.12);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(960, t0);
      osc.frequency.linearRampToValueAtTime(720, t0 + durPulso);
      gain.gain.setValueAtTime(0.0, t0);
      gain.gain.linearRampToValueAtTime(0.7, t0 + 0.02);
      gain.gain.setValueAtTime(0.7, t0 + durPulso - 0.05);
      gain.gain.linearRampToValueAtTime(0.0, t0 + durPulso);
      osc.start(t0);
      osc.stop(t0 + durPulso);
    }
  } catch { /* navegador bloquea audio sin interacción — ok */ }
}

// ── Iconos y colores ──────────────────────────────────────────────────────────

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
  } catch { return iso; }
}

// ── Componente ────────────────────────────────────────────────────────────────

export function NotificationBell({
  notifications: externalNotifs,
  onMarkRead: externalMarkRead,
  onMarkAllRead: externalMarkAllRead,
}: NotificationBellProps) {
  const [open, setOpen]             = useState(false);
  const [notifs, setNotifs]         = useState<Notification[]>(externalNotifs ?? []);
  const [fetchError, setFetchError] = useState(false);

  // IDs de alertas críticas ya sonadas — para no repetir el sonido en cada refresh
  const soundedCriticals = useRef<Set<string>>(new Set());

  if (externalNotifs !== undefined && notifs !== externalNotifs) {
    // Sincronización externa directa (evita el efecto para evitar re-render cíclico)
  }

  // Sincronizar notificaciones externas
  useEffect(() => {
    if (externalNotifs) setNotifs(externalNotifs);
  }, [externalNotifs]);

  // ── Detectar nuevas alertas críticas y sonar ───────────────────────────────
  useEffect(() => {
    const nuevasCriticas = notifs.filter(
      n => n.tipo && CRITICAL_TIPOS.has(n.tipo) && !soundedCriticals.current.has(n.id)
    );
    if (nuevasCriticas.length > 0) {
      playAlarmSound();
      nuevasCriticas.forEach(n => soundedCriticals.current.add(n.id));
    }
  }, [notifs]);

  // Fetch autónomo cuando no se pasan desde fuera
  const fetchNotifs = useCallback(async () => {
    if (externalNotifs !== undefined) return;
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

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  // Auto-refresh cada 2 minutos
  useEffect(() => {
    const timer = setInterval(fetchNotifs, 2 * 60_000);
    return () => clearInterval(timer);
  }, [fetchNotifs]);

  // ── Marcar leídas ──────────────────────────────────────────────────────────

  async function handleMarkRead(id: string) {
    if (externalMarkRead) { externalMarkRead(id); return; }
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    } catch {
      setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: false } : n));
    }
  }

  async function handleMarkAllRead() {
    if (externalMarkAllRead) { externalMarkAllRead(); return; }
    // Alertas críticas NUNCA se marcan como leídas con "marcar todas"
    setNotifs((prev) => prev.map((n) =>
      (n.tipo && CRITICAL_TIPOS.has(n.tipo)) ? n : { ...n, read: true }
    ));
    const unread = notifs.filter((n) => !n.read && !(n.tipo && CRITICAL_TIPOS.has(n.tipo)));
    for (const n of unread) {
      try { await fetch(`/api/notifications/${n.id}/read`, { method: 'PATCH' }); } catch { /* ok */ }
    }
  }

  // Alertas críticas van siempre primero
  const criticalNotifs  = notifs.filter(n => n.tipo && CRITICAL_TIPOS.has(n.tipo));
  const normalNotifs    = notifs.filter(n => !n.tipo || !CRITICAL_TIPOS.has(n.tipo));
  const sortedNotifs    = [...criticalNotifs, ...normalNotifs];
  const unread          = notifs.filter((n) => !n.read).length;
  const hasCritical     = criticalNotifs.length > 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`relative p-2 rounded-xl transition-colors ${
          hasCritical
            ? 'bg-red-100 hover:bg-red-200 animate-pulse'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        aria-label="Notificaciones"
      >
        {hasCritical
          ? <Siren className="w-5 h-5 text-red-600" />
          : <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        }
        {unread > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 w-4 h-4 text-white text-[10px] font-bold rounded-full flex items-center justify-center ${hasCritical ? 'bg-red-600' : 'bg-red-500'}`}>
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
              {unread > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs text-blue-500 hover:text-blue-600 font-medium">
                  Marcar leídas
                </button>
              )}
            </div>

            {/* Banner crítico — choque / frenada brusca */}
            {hasCritical && (
              <div className="bg-red-600 text-white px-4 py-2.5 flex items-center gap-2">
                <Siren className="w-4 h-4 flex-shrink-0 animate-bounce" />
                <span className="text-xs font-bold uppercase tracking-wide">
                  ¡ALERTA DE SEGURIDAD ACTIVA!
                </span>
              </div>
            )}

            {/* Lista */}
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
              {fetchError && (
                <div className="py-4 text-center text-xs text-red-400 px-4">
                  No se pudieron cargar las notificaciones
                </div>
              )}
              {!fetchError && sortedNotifs.length === 0 && (
                <div className="py-8 text-center">
                  <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Sin notificaciones</p>
                </div>
              )}
              {sortedNotifs.map((n) => {
                const isCritical = n.tipo && CRITICAL_TIPOS.has(n.tipo);
                const Icon  = isCritical ? Siren : (TYPE_ICON[n.type] ?? Bell);
                const color = isCritical ? 'text-white bg-red-600' : (TYPE_COLOR[n.type] ?? TYPE_COLOR.document);
                const sev   = isCritical ? '' : (SEVERITY_BORDER[n.severity ?? 'info'] ?? '');
                const msg   = n.message ?? n.description ?? '';
                const time  = n.time ?? formatTime(n.createdAt);

                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${sev} ${
                      isCritical
                        ? 'bg-red-50 border-l-4 border-red-600'
                        : !n.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''
                    }`}
                    onClick={() => handleMarkRead(n.id)}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {isCritical && (
                        <p className="text-[10px] font-black text-red-600 uppercase tracking-wide mb-0.5">
                          🚨 Alerta crítica
                        </p>
                      )}
                      <p className={`text-xs font-medium leading-tight ${isCritical ? 'text-red-900' : 'text-gray-900 dark:text-white'}`}>
                        {n.title}
                      </p>
                      {msg && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight line-clamp-2">{msg}</p>
                      )}
                      {time && (
                        <p className="text-[10px] text-gray-400 mt-1">{time}</p>
                      )}
                    </div>
                    {!n.read && <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${isCritical ? 'bg-red-600' : 'bg-blue-500'}`} />}
                  </div>
                );
              })}
            </div>

            {sortedNotifs.length > 0 && (
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
