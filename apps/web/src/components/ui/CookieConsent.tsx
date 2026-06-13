'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie, X } from 'lucide-react';

const STORAGE_KEY = 'gtf_cookie_consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  };

  const reject = () => {
    localStorage.setItem(STORAGE_KEY, 'rejected');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-lg mx-auto md:mx-0 md:left-6 md:right-auto">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Cookie className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 mb-1">Usamos cookies esenciales</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Utilizamos cookies para mantener tu sesión activa y mejorar la seguridad de la plataforma.
              No usamos cookies de seguimiento ni de publicidad.{' '}
              <Link href="/privacidad" className="text-blue-600 hover:underline">
                Política de privacidad
              </Link>
            </p>
          </div>
          <button
            onClick={reject}
            className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={accept}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            Aceptar
          </button>
          <button
            onClick={reject}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            Solo esenciales
          </button>
        </div>
      </div>
    </div>
  );
}
