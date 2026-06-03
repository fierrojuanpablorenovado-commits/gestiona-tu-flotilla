'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Lock, CheckCircle2, ArrowRight, LogOut } from 'lucide-react';

export default function TrialExpiradoPage() {
  useEffect(() => { document.title = 'Trial expirado | Gestiona tu Flotilla'; }, []);

  const planes = [
    {
      key: 'basic',
      name: 'Starter',
      price: '$499',
      desc: 'Hasta 10 vehículos',
      features: ['Vehículos y choferes', 'Cuentas semanales', 'Mantenimiento', 'Seguros e infracciones', 'Gastos y contabilidad'],
      href: '/planes?plan=basic',
      color: 'border-slate-600',
      badge: '',
    },
    {
      key: 'pro',
      name: 'Pro',
      price: '$999',
      desc: 'Hasta 50 vehículos',
      features: ['Todo Starter +', 'GPS TrackSolid', 'WhatsApp automático', 'Tesorería y socios', 'Reclutamiento', 'Reportes avanzados'],
      href: '/planes?plan=pro',
      color: 'border-blue-500 ring-2 ring-blue-500/30',
      badge: 'Más popular',
    },
    {
      key: 'enterprise',
      name: 'Enterprise',
      price: '$1,999',
      desc: 'Vehículos ilimitados',
      features: ['Todo Pro +', 'Facturación CFDI', 'Multi-sucursal', 'API / Webhooks', 'Soporte prioritario'],
      href: '/planes?plan=enterprise',
      color: 'border-purple-500',
      badge: '',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <Lock className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Tu prueba gratuita terminó</h1>
        <p className="text-slate-400 max-w-md mx-auto">
          Tu período de prueba de 14 días ha concluido. Elige un plan para seguir gestionando tu flotilla sin interrupciones.
        </p>
      </div>

      {/* Planes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mb-10">
        {planes.map((p) => (
          <div
            key={p.key}
            className={`relative flex flex-col rounded-2xl border bg-slate-900 p-6 ${p.color}`}
          >
            {p.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-3 py-0.5 text-xs font-semibold text-white">
                {p.badge}
              </span>
            )}
            <div className="mb-4">
              <h2 className="text-lg font-bold text-white">{p.name}</h2>
              <p className="text-slate-400 text-sm">{p.desc}</p>
              <p className="mt-3 text-3xl font-bold text-white">
                {p.price}<span className="text-sm font-normal text-slate-400">/mes</span>
              </p>
            </div>
            <ul className="flex-1 space-y-2 mb-6">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={p.href}
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                p.key === 'pro'
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              }`}
            >
              Elegir {p.name} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ))}
      </div>

      {/* Acciones secundarias */}
      <div className="flex items-center gap-6">
        <Link
          href="/planes"
          className="text-sm text-slate-400 hover:text-white underline underline-offset-4 transition-colors"
        >
          Ver comparativa completa
        </Link>
        <span className="text-slate-700">·</span>
        <Link
          href="/api/auth/logout"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Salir
        </Link>
      </div>
    </div>
  );
}
