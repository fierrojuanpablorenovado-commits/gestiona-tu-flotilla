import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2, Star, Zap, Building2, ArrowRight, Phone, Mail, CreditCard } from 'lucide-react';

const PLANES = [
  {
    id: 'basico',
    nombre: 'Básico',
    precio: 499,
    periodo: 'mes',
    descripcion: 'Ideal para flotillas pequeñas que quieren empezar a organizarse',
    icon: Star,
    color: 'text-slate-700',
    iconBg: 'bg-slate-100',
    destacado: false,
    features: [
      'Hasta 15 vehículos',
      '3 usuarios incluidos',
      'Gestión de choferes',
      'Control de pagos semanales',
      'Reportes básicos (PDF/Excel)',
      'Soporte por email',
    ],
    cta: 'Empezar gratis',
    ctaHref: '/registro',
    ctaStyle: 'border border-slate-300 text-slate-700 hover:bg-slate-50',
  },
  {
    id: 'profesional',
    nombre: 'Profesional',
    precio: 999,
    periodo: 'mes',
    descripcion: 'El plan favorito de flotillas medianas. Todo incluido.',
    icon: Zap,
    color: 'text-blue-600',
    iconBg: 'bg-blue-100',
    destacado: true,
    features: [
      'Hasta 50 vehículos',
      'Usuarios ilimitados',
      'GPS y monitoreo en tiempo real',
      'Reclutamiento y pipeline',
      'Mantenimiento preventivo',
      'Reportes avanzados + automáticos',
      'Módulo de socios / inversionistas',
      'Soporte prioritario 24/5',
    ],
    cta: 'Comenzar ahora',
    ctaHref: '/registro',
    ctaStyle: 'bg-blue-600 text-white hover:bg-blue-700',
  },
  {
    id: 'enterprise',
    nombre: 'Enterprise',
    precio: 1999,
    periodo: 'mes',
    descripcion: 'Para flotillas grandes y empresas con múltiples sucursales.',
    icon: Building2,
    color: 'text-purple-600',
    iconBg: 'bg-purple-100',
    destacado: false,
    features: [
      'Vehículos ilimitados',
      'Multi-sucursal / multi-empresa',
      'API para integraciones (SAP, ERP)',
      'Gerente de cuenta dedicado',
      'Onboarding personalizado',
      'SLA 99.9% garantizado',
      'Reportes white-label',
      'Facturación electrónica incluida',
    ],
    cta: 'Contactar ventas',
    ctaHref: 'mailto:ventas@gestionatuflotilla.mx',
    ctaStyle: 'border border-purple-300 text-purple-700 hover:bg-purple-50',
  },
];

export default function PlanesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <Link href="/login" className="flex items-center gap-3">
          <Image src="/fleet-icon.png" alt="Gestiona tu Flotilla" width={64} height={64} className="rounded-xl shadow-md object-cover" />
          <div>
            <span className="text-lg font-black text-slate-900">Gestiona tu Flotilla</span>
            <span className="block text-[10px] text-slate-500">Gestión vehicular inteligente para México</span>
          </div>
        </Link>
        <Link href="/login" className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
          Iniciar sesión <ArrowRight className="h-4 w-4" />
        </Link>
      </nav>

      {/* Hero */}
      <div className="text-center pt-16 pb-12 px-4">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 border border-blue-200 px-4 py-1.5 text-sm font-medium text-blue-700 mb-5">
          <Zap className="h-3.5 w-3.5" /> ✦ Nuevo · Gestión inteligente de flotillas
        </span>
        <h1 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight">
          Un plan para cada<br />
          <span className="text-blue-600">tamaño de flotilla</span>
        </h1>
        <p className="text-slate-500 text-lg mt-4 max-w-xl mx-auto">
          Sin contratos forzosos. Cancela cuando quieras. Todos los planes incluyen 14 días de prueba gratuita.
        </p>
        <div className="flex items-center justify-center gap-6 mt-6 text-sm text-slate-500">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-500" /> Sin tarjeta para iniciar</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-500" /> Soporte en español</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-500" /> Datos en México</span>
        </div>
      </div>

      {/* Plans grid */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANES.map((plan) => {
            const Ic = plan.icon;
            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-8 flex flex-col ${
                  plan.destacado
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-2xl shadow-blue-200 scale-105'
                    : 'bg-white border border-slate-200 shadow-sm'
                }`}
              >
                {plan.destacado && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-lg">
                    ⭐ MÁS POPULAR
                  </div>
                )}
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-4 ${plan.destacado ? 'bg-white/20' : plan.iconBg}`}>
                  <Ic className={`h-6 w-6 ${plan.destacado ? 'text-white' : plan.color}`} />
                </div>
                <h3 className={`text-xl font-black ${plan.destacado ? 'text-white' : 'text-slate-900'}`}>{plan.nombre}</h3>
                <p className={`text-sm mt-1 mb-4 ${plan.destacado ? 'text-blue-200' : 'text-slate-500'}`}>{plan.descripcion}</p>
                <div className="mb-6">
                  <span className={`text-4xl font-black ${plan.destacado ? 'text-white' : 'text-slate-900'}`}>${plan.precio.toLocaleString()}</span>
                  <span className={`text-sm ${plan.destacado ? 'text-blue-200' : 'text-slate-500'}`}> MXN/{plan.periodo}</span>
                </div>
                <div className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${plan.destacado ? 'text-green-300' : 'text-green-500'}`} />
                      <span className={plan.destacado ? 'text-blue-100' : 'text-slate-600'}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href={(plan as typeof plan & { ctaHref?: string }).ctaHref ?? '/registro'}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-colors ${
                    plan.destacado ? 'bg-white text-blue-600 hover:bg-blue-50' : plan.ctaStyle
                  }`}
                >
                  {plan.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Payment methods banner */}
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Pago seguro — Tarjeta o PayPal</p>
              <p className="text-xs text-slate-500 mt-0.5">Aceptamos Visa, Mastercard, American Express y PayPal. Sin cargos ocultos.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Visa */}
            <svg width="46" height="28" viewBox="0 0 46 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="46" height="28" rx="4" fill="#F0F4FF"/>
              <text x="5" y="20" fontFamily="Arial" fontSize="13" fontWeight="bold" fill="#1A1F71">VISA</text>
            </svg>
            {/* Mastercard */}
            <svg width="40" height="28" viewBox="0 0 40 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="28" rx="4" fill="#F0F4FF"/>
              <circle cx="16" cy="14" r="8" fill="#EB001B" opacity="0.9"/>
              <circle cx="24" cy="14" r="8" fill="#F79E1B" opacity="0.9"/>
            </svg>
            {/* PayPal */}
            <svg width="60" height="28" viewBox="0 0 60 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="60" height="28" rx="4" fill="#F0F4FF"/>
              <text x="5" y="19" fontFamily="Arial" fontSize="12" fontWeight="bold" fill="#003087">Pay</text>
              <text x="24" y="19" fontFamily="Arial" fontSize="12" fontWeight="bold" fill="#009CDE">Pal</text>
            </svg>
            <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5"/> SSL seguro
            </span>
          </div>
        </div>

        {/* FAQ / testimonials section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl border border-slate-200 p-8">
            <h3 className="text-xl font-bold text-slate-900 mb-5">Preguntas frecuentes</h3>
            <div className="space-y-5">
              {[
                { q: '¿Puedo cambiar de plan en cualquier momento?', a: 'Sí. Puedes upgradear o degradar tu plan cuando quieras. El cambio aplica al siguiente ciclo.' },
                { q: '¿Necesito instalar algo?', a: 'No. Gestiona tu Flotilla es 100% en la nube. Funciona desde cualquier navegador o dispositivo móvil.' },
                { q: '¿Mis datos están seguros?', a: 'Sí. Usamos cifrado de extremo a extremo y servidores en México con respaldos automáticos diarios.' },
                { q: '¿Hay soporte en español?', a: 'Sí. Nuestro equipo de soporte es 100% en español, con respuesta garantizada en menos de 4 horas.' },
              ].map(({ q, a }) => (
                <div key={q}>
                  <p className="text-sm font-semibold text-slate-800">{q}</p>
                  <p className="text-sm text-slate-500 mt-1">{a}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border border-blue-200 p-8">
              <p className="text-3xl font-black text-slate-900">50+</p>
              <p className="text-slate-600 text-sm mt-1">Flotillas activas</p>
              <p className="text-3xl font-black text-slate-900 mt-4">800+</p>
              <p className="text-slate-600 text-sm mt-1">Vehículos gestionados</p>
              <p className="text-3xl font-black text-slate-900 mt-4">$180K+</p>
              <p className="text-slate-600 text-sm mt-1">Ingresos procesados mensualmente</p>
            </div>
            <div className="bg-white rounded-3xl border border-slate-200 p-6">
              <p className="text-sm font-semibold text-slate-900 mb-3">¿Tienes dudas? Contáctanos</p>
              <div className="space-y-2">
                <a href="tel:+525512345678" className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600">
                  <Phone className="h-4 w-4" /> +52 55 1234 5678
                </a>
                <a href="mailto:ventas@gestionatuflotilla.mx" className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600">
                  <Mail className="h-4 w-4" /> ventas@gestionatuflotilla.mx
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 bg-white py-6 text-center">
        <p className="text-sm text-slate-400">
          © 2026 Gestiona tu Flotilla · Hecho en México 🇲🇽 ·
          <Link href="/login" className="text-blue-600 hover:underline ml-1">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
