'use client';
import { useEffect, useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from(Array.from(raw).map(c => c.charCodeAt(0)));
}

export function PushBanner() {
  const [state, setState] = useState<'loading' | 'unsupported' | 'denied' | 'subscribed' | 'prompt'>('loading');
  const [dismissed, setDismissed] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      return;
    }
    const perm = Notification.permission;
    if (perm === 'denied') { setState('denied'); return; }
    if (perm === 'granted') {
      // Verificar si ya tenemos suscripción activa
      navigator.serviceWorker.ready.then(reg => reg.pushManager.getSubscription()).then(sub => {
        setState(sub ? 'subscribed' : 'prompt');
      });
    } else {
      setState('prompt');
    }
    // Revisar si ya lo descartó antes
    if (sessionStorage.getItem('push-dismissed')) setDismissed(true);
  }, []);

  const handleSubscribe = async () => {
    if (!VAPID_KEY || working) return;
    setWorking(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setState('denied'); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });

      if (res.ok) setState('subscribed');
    } catch (err) {
      console.error('[PushBanner]', err);
    } finally {
      setWorking(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('push-dismissed', '1');
  };

  // No mostrar si ya está suscrito, no soportado, o descartado
  if (state === 'loading' || state === 'unsupported' || state === 'subscribed' || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full">
      <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-4 flex gap-3 items-start">
        <div className="bg-blue-600 rounded-lg p-2 shrink-0">
          <Bell className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">
            Alertas en tiempo real
          </p>
          <p className="text-xs text-slate-400 mt-0.5 leading-snug">
            {state === 'denied'
              ? 'Notificaciones bloqueadas en tu navegador. Actívalas en Configuración.'
              : 'Recibe avisos de impactos, velocidad y más directo en tu dispositivo.'}
          </p>
          {state !== 'denied' && (
            <button
              onClick={handleSubscribe}
              disabled={working}
              className="mt-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              {working ? 'Activando...' : 'Activar notificaciones'}
            </button>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="text-slate-500 hover:text-slate-300 transition-colors shrink-0 mt-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
