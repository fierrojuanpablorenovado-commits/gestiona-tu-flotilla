'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  CheckCircle2,
  ArrowRight,
  Loader2,
  Zap,
  Shield,
  Building2,
  Phone,
  Mail,
  CreditCard,
  Star,
} from 'lucide-react';

// ─── Planes ───────────────────────────────────────────────────────────────────

const PLANES = [
  {
    key: 'basic',
    name: 'Starter',
    price: 499,
    desc: 'Para flotillas de hasta 10 vehículos',
    icon: Star,
    color: 'text-slate-700',
    iconBg: 'bg-slate-100',
    borderClass: 'border border-slate-200 shadow-sm',
    popular: false,
    features: [
      'Hasta 10 vehículos',
      '2 usuarios incluidos',
      'Vehículos y choferes (altas, bajas, estados)',
      'Cuentas semanales y cobro manual',
      'Mantenimiento + alertas km',
      'Seguros e infracciones',
      'Gastos y contabilidad RESICO',
      'Portal chofer web',
      'Notificaciones in-app',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 999,
    desc: 'Para flotillas de hasta 50 vehículos',
    icon: Shield,
    color: 'text-blue-600',
    iconBg: 'bg-blue-100',
    borderClass: 'ring-2 ring-blue-500/40 shadow-2xl shadow-blue-200 scale-105',
    popular: true,
    features: [
      'Hasta 50 vehículos',
      'Usuarios ilimitados',
      'Todo Starter +',
      'GPS TrackSolid integrado',
      'WhatsApp automático (Meta/Whapi)',
      'Sync infracciones SSIM + Jalisco',
      'Tesorería + socios inversionistas',
      'Reclutamiento de choferes',
      'Reportes semanales automáticos',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 1999,
    desc: 'Vehículos ilimitados, funciones avanzadas',
    icon: Building2,
    color: 'text-purple-600',
    iconBg: 'bg-purple-100',
    borderClass: 'border border-purple-200 shadow-sm',
    popular: false,
    features: [
      'Vehículos ilimitados',
      'Multi-sucursal / multi-empresa',
      'Todo Pro +',
      'Facturación CFDI 4.0',
      'API + Webhooks propios',
      'Soporte prioritario',
      'Capacitación incluida',
      'SLA 99.9%',
    ],
  },
];

// ─── Contenido principal ──────────────────────────────────────────────────────

function PlanesContent() {
  useEffect(() => {
    document.title = 'Planes y precios | Gestiona tu Flotilla';
  }, []);

  const searchParams = useSearchParams();
  const planParam = searchParams.get('plan') ?? '';

  const [user, setUser] = useState<{ tenantId?: string; email?: string; company?: string } | null>(null);
  const [loadingPlan, setLoadingPlan] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) setUser(d.user);
      })
      .catch(() => {});
  }, []);

  async function handleElegir(planKey: string) {
    if (!user?.tenantId) {
      window.location.href = `/registro?plan=${planKey}`;
      return;
    }
    setLoadingPlan(planKey);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: user.tenantId,
          plan: planKey,
          email: user.email,
          empresa: user.company,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.message || 'Error al crear sesión de pago');
      }
    } catch {
      alert('Error de red');
    } finally {
      setLoadingPlan('');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/fleet-icon.png"
            alt="Gestiona tu Flotilla"
            width={64}
            height={64}
            className="rounded-xl shadow-md object-cover"
          />
          <div>
            <span className="text-lg font-black text-slate-900">Gestiona tu Flotilla</span>
            <span className="block text-[10px] text-slate-500">Gestión vehicular inteligente para México</span>
          </div>
        </Link>
        <Link
          href="/login"
          className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Iniciar sesión <ArrowRight className="h-4 w-4" />
        </Link>
      </nav>

      {/* Hero */}
      <div className="text-center pt-16 pb-12 px-4">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 border border-blue-200 px-4 py-1.5 text-sm font-medium text-blue-700 mb-5">
          <Zap className="h-3.5 w-3.5" /> Gestión inteligente de flotillas
        </span>
        <h1 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight">
          Un plan para cada<br />
          <span className="text-blue-600">tamaño de flotilla</span>
        </h1>
        <p className="text-slate-500 text-lg mt-4 max-w-xl mx-auto">
          Sin contratos forzosos. Cancela cuando quieras. Todos los planes incluyen
          14 días de prueba gratuita.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 mt-6 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-500" /> Sin tarjeta para iniciar
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-500" /> Soporte en español
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-500" /> Datos en México
          </span>
        </div>
      </div>

      {/* Plans grid */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start mb-10">
          {PLANES.map((plan) => {
            const Icon = plan.icon;
            const isHighlighted = planParam === plan.key;
            const isLoading = loadingPlan === plan.key;

            return (
              <div
                key={plan.key}
                className={`relative rounded-3xl flex flex-col transition-all duration-200 ${
                  plan.popular
                    ? `bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-8 ${plan.borderClass} ${isHighlighted ? 'ring-4 ring-yellow-400/60' : ''}`
                    : `bg-white p-8 ${plan.borderClass} ${isHighlighted ? 'ring-2 ring-yellow-400/60' : ''}`
                }`}
              >
                {/* Badge popular */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-slate-900 text-xs font-black px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                      🔥 Más popular — Precio de lanzamiento
                    </div>
                  </div>
                )}

                {/* Badge highlighted desde URL */}
                {isHighlighted && !plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-slate-900 text-xs font-black px-3 py-1 rounded-full shadow whitespace-nowrap">
                    Plan seleccionado
                  </div>
                )}

                {/* Icon */}
                <div
                  className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-4 ${
                    plan.popular ? 'bg-white/20' : plan.iconBg
                  }`}
                >
                  <Icon className={`h-6 w-6 ${plan.popular ? 'text-white' : plan.color}`} />
                </div>

                {/* Name + desc */}
                <h3
                  className={`text-xl font-black ${plan.popular ? 'text-white' : 'text-slate-900'}`}
                >
                  {plan.name}
                </h3>
                <p
                  className={`text-sm mt-1 mb-4 ${plan.popular ? 'text-blue-200' : 'text-slate-500'}`}
                >
                  {plan.desc}
                </p>

                {/* Price */}
                <div className="mb-6">
                  <span
                    className={`text-4xl font-black ${plan.popular ? 'text-white' : 'text-slate-900'}`}
                  >
                    ${plan.price.toLocaleString('es-MX')}
                  </span>
                  <span className={`text-sm ${plan.popular ? 'text-blue-200' : 'text-slate-500'}`}>
                    {' '}MXN/mes
                  </span>
                </div>

                {/* Features */}
                <ul className="flex-1 space-y-2.5 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle2
                        className={`h-4 w-4 flex-shrink-0 ${plan.popular ? 'text-green-300' : 'text-green-500'}`}
                      />
                      <span className={plan.popular ? 'text-blue-100' : 'text-slate-600'}>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleElegir(plan.key)}
                  disabled={!!loadingPlan}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-colors disabled:opacity-50 ${
                    plan.popular
                      ? 'bg-white text-blue-600 hover:bg-blue-50'
                      : plan.key === 'basic'
                      ? 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                      : 'border border-purple-300 text-purple-700 hover:bg-purple-50'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Redirigiendo...
                    </>
                  ) : (
                    <>
                      Empezar prueba gratis <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Nota trial */}
        <p className="text-center text-slate-500 text-sm mb-6">
          Los 14 días de prueba son completamente gratis. Solo pagas cuando decides continuar.
          Los precios mostrados son antes de IVA (se aplica 16% al cobro).
        </p>

        {/* Garantía 14 días */}
        <div className="rounded-2xl border border-green-200 bg-green-50 px-6 py-5 flex flex-col sm:flex-row items-center gap-4 mb-4 text-center sm:text-left">
          <div className="text-3xl flex-shrink-0">🛡️</div>
          <div>
            <p className="font-bold text-green-800 text-sm">Garantía de 14 días</p>
            <p className="text-green-700 text-sm mt-0.5">
              Si en los primeros 14 días no estás satisfecho, te devolvemos tu dinero. Sin preguntas.
            </p>
          </div>
        </div>

        {/* Urgencia suave */}
        <p className="text-center text-slate-500 text-xs mb-10">
          ⏰ Precio de lanzamiento disponible para los primeros 50 clientes
        </p>

        {/* Payment methods banner */}
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 mb-16">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Pago seguro — Tarjeta o PayPal</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Aceptamos Visa, Mastercard, American Express y PayPal. Sin cargos ocultos.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <svg width="46" height="28" viewBox="0 0 46 28" fill="none">
              <rect width="46" height="28" rx="4" fill="#F0F4FF" />
              <text x="5" y="20" fontFamily="Arial" fontSize="13" fontWeight="bold" fill="#1A1F71">VISA</text>
            </svg>
            <svg width="40" height="28" viewBox="0 0 40 28" fill="none">
              <rect width="40" height="28" rx="4" fill="#F0F4FF" />
              <circle cx="16" cy="14" r="8" fill="#EB001B" opacity="0.9" />
              <circle cx="24" cy="14" r="8" fill="#F79E1B" opacity="0.9" />
            </svg>
            <svg width="60" height="28" viewBox="0 0 60 28" fill="none">
              <rect width="60" height="28" rx="4" fill="#F0F4FF" />
              <text x="5" y="19" fontFamily="Arial" fontSize="12" fontWeight="bold" fill="#003087">Pay</text>
              <text x="24" y="19" fontFamily="Arial" fontSize="12" fontWeight="bold" fill="#009CDE">Pal</text>
            </svg>
            <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> SSL seguro
            </span>
          </div>
        </div>

        {/* FAQ + contacto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl border border-slate-200 p-8">
            <h3 className="text-xl font-bold text-slate-900 mb-5">Preguntas frecuentes</h3>
            <div className="space-y-5">
              {[
                ['¿Necesito tarjeta para el trial?', 'No. Los 14 días de prueba no requieren ningún método de pago.'],
                ['¿Puedo cambiar de plan después?', 'Sí. Puedes upgradar o downgradar tu plan en cualquier momento desde Configuración.'],
                ['¿Cómo funciona el pago?', 'El pago es mensual vía tarjeta de crédito/débito procesado por Stripe. Cancela cuando quieras.'],
                ['¿Mis datos están seguros?', 'Sí. Usamos cifrado de extremo a extremo y servidores con respaldos automáticos diarios.'],
              ].map(([q, a]) => (
                <div key={q}>
                  <p className="text-sm font-semibold text-slate-800">{q}</p>
                  <p className="text-sm text-slate-500 mt-1">{a}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border border-blue-200 p-8">
              <p className="text-3xl font-black text-slate-900">5+</p>
              <p className="text-slate-600 text-sm mt-1">Flotillas activas</p>
              <p className="text-3xl font-black text-slate-900 mt-4">35+</p>
              <p className="text-slate-600 text-sm mt-1">Vehículos gestionados</p>
              <p className="text-3xl font-black text-slate-900 mt-4">99.9%</p>
              <p className="text-slate-600 text-sm mt-1">Disponibilidad garantizada</p>
            </div>
            <div className="bg-white rounded-3xl border border-slate-200 p-6">
              <p className="text-sm font-semibold text-slate-900 mb-3">Tienes dudas? Contáctanos</p>
              <div className="space-y-2">
                <a
                  href="tel:+523312933906"
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600"
                >
                  <Phone className="h-4 w-4" /> +52 33 1293 3906
                </a>
                <a
                  href="mailto:noreply@gestionatuflotilla.com"
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600"
                >
                  <Mail className="h-4 w-4" /> noreply@gestionatuflotilla.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 bg-white py-6 text-center">
        <p className="text-sm text-slate-400">
          2026 Gestiona tu Flotilla · Hecho en Mexico ·
          <Link href="/login" className="text-blue-600 hover:underline ml-1">
            Iniciar sesion
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Export con Suspense (requerido para useSearchParams en SSG) ──────────────

export default function PlanesPage() {
  return (
    <>
      <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50" />}>
        <PlanesContent />
      </Suspense>
    </>
  );
}
