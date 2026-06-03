'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Check, ArrowRight, Loader2, AlertCircle, ChevronLeft } from 'lucide-react';

// ─── Planes ───────────────────────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  price: number;
  vehicles: string;
  features: string[];
  highlight: boolean;
  badge?: string;
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 999,
    vehicles: 'Hasta 10 vehículos',
    highlight: false,
    features: [
      'Vehículos y choferes',
      'Cuentas semanales automáticas',
      'Control de seguros y vencimientos',
      'Mantenimiento preventivo por km',
      'Portal chofer (cuentas y recibos)',
      '2 usuarios incluidos',
      'Soporte por correo',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 1999,
    vehicles: 'Hasta 30 vehículos',
    highlight: true,
    badge: 'Más popular',
    features: [
      'Todo lo del plan Starter',
      'GPS en tiempo real',
      'WhatsApp automático al chofer/grupo',
      'Importación Didi Fleet Excel',
      'Contabilidad PFAE / Plataformas Tecnológicas',
      'Sync infracciones automático',
      'Usuarios ilimitados',
      'Soporte prioritario 5 días/semana',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 2999,
    vehicles: 'Vehículos ilimitados',
    highlight: false,
    badge: 'Sin límites',
    features: [
      'Todo lo del plan Pro',
      'Multi-sucursal',
      'API + webhooks propios',
      'Integración con tu ERP',
      'Manager de cuenta dedicado',
      'SLA garantizado 99.9%',
    ],
  },
];

// ─── Inner component (needs useSearchParams) ──────────────────────────────────

function RegistroContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pre-seleccionar plan desde ?plan=XXX; si no es válido, cae a 'pro'
  const planFromUrl = searchParams.get('plan') ?? '';
  const validPlanIds = PLANS.map((p) => p.id);
  const initialPlan = validPlanIds.includes(planFromUrl) ? planFromUrl : 'pro';

  const [selectedPlan, setSelectedPlan] = useState<string>(initialPlan);
  const [step, setStep] = useState<'plan' | 'form'>(() => {
    // Si viene ?plan= en la URL, saltar directo al formulario
    return validPlanIds.includes(planFromUrl) ? 'form' : 'plan';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    nombre: '',
    empresa: '',
    email: '',
    telefono: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      // 1. Crear cuenta en BD
      const res = await fetch('/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre:   form.nombre,
          empresa:  form.empresa,
          email:    form.email,
          telefono: form.telefono,
          password: form.password,
          plan:     selectedPlan,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Error al crear la cuenta.');
        return;
      }

      const { tenant } = data;

      // 2. Plan Starter → login directo (sin pago)
      if (selectedPlan === 'starter') {
        router.push(`/login?registered=true`);
        return;
      }

      // 3. Pro / Enterprise → Stripe Checkout
      const stripeRes = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant.id,
          plan:     selectedPlan,
          email:    form.email,
          empresa:  form.empresa,
        }),
      });

      const stripeData = await stripeRes.json();

      if (!stripeRes.ok || !stripeData.url) {
        setError(stripeData.message || 'No se pudo iniciar el pago. Intenta de nuevo.');
        return;
      }

      window.location.href = stripeData.url;
    } catch {
      setError('Error de conexión. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlanData = PLANS.find((p) => p.id === selectedPlan)!;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/fleet-icon.png" alt="" width={36} height={36} className="rounded-xl" />
            <span className="text-white font-bold text-lg hidden sm:block">Gestiona tu Flotilla</span>
          </Link>
          <Link href="/login" className="text-slate-400 hover:text-white text-sm transition-colors">
            ¿Ya tienes cuenta?{' '}
            <span className="text-blue-400 font-semibold">Inicia sesión</span>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-3 mb-10">
          {[
            { key: 'plan', label: 'Elige tu plan', n: 1 },
            { key: 'form', label: 'Crea tu cuenta', n: 2 },
          ].map(({ key, label, n }, i) => (
            <div key={key} className="flex items-center gap-3">
              <div className={`flex items-center gap-2 ${
                step === key || (step === 'form' && key === 'plan') ? 'text-white' : 'text-slate-500'
              }`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step === 'form' && key === 'plan'
                    ? 'bg-green-500 text-white'
                    : step === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-500'
                }`}>
                  {step === 'form' && key === 'plan' ? <Check className="h-3.5 w-3.5" /> : n}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{label}</span>
              </div>
              {i === 0 && <div className="w-10 h-px bg-slate-700" />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Selector de plan ─────────────────────────────────────── */}
        {step === 'plan' && (
          <div>
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-4xl font-black text-white mb-3">
                Elige tu plan
              </h1>
              <p className="text-slate-400 text-lg">
                14 días de prueba gratis. Sin tarjeta requerida para el plan Básico.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {PLANS.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative text-left rounded-2xl p-6 border-2 transition-all duration-200 ${
                    selectedPlan === plan.id
                      ? plan.highlight
                        ? 'border-blue-500 bg-blue-950/40 shadow-xl shadow-blue-900/30'
                        : 'border-blue-500 bg-slate-800/60 shadow-xl'
                      : 'border-slate-700 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50'
                  }`}
                >
                  {plan.badge && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                      plan.highlight ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-200'
                    }`}>
                      {plan.badge}
                    </div>
                  )}

                  {/* Check selector */}
                  <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedPlan === plan.id
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-slate-600'
                  }`}>
                    {selectedPlan === plan.id && <Check className="h-3 w-3 text-white" />}
                  </div>

                  <div className="mb-4">
                    <h3 className="text-white font-bold text-xl mb-1">{plan.name}</h3>
                    <p className="text-slate-400 text-sm">{plan.vehicles}</p>
                  </div>

                  <div className="mb-5">
                    <span className="text-4xl font-black text-white">
                      ${plan.price.toLocaleString()}
                    </span>
                    <span className="text-slate-400 text-sm ml-1">MXN/mes</span>
                  </div>

                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                        <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={() => { setStep('form'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg shadow-blue-900/40"
              >
                Continuar con {selectedPlanData.name} — $
                {selectedPlanData.price.toLocaleString()}/mes
                <ArrowRight className="h-5 w-5" />
              </button>
              <p className="text-slate-500 text-sm mt-3">
                {selectedPlan === 'starter'
                  ? 'Sin tarjeta de crédito requerida'
                  : 'Pago seguro con Stripe. Cancela cuando quieras.'}
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 2: Formulario de cuenta ─────────────────────────────────── */}
        {step === 'form' && (
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-8">
              <button
                onClick={() => setStep('plan')}
                className="inline-flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-4 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Cambiar plan
              </button>
              <h1 className="text-3xl font-black text-white mb-2">Crea tu cuenta</h1>
              <p className="text-slate-400">
                Plan seleccionado:{' '}
                <span className="text-blue-400 font-semibold">
                  {selectedPlanData.name} — $
                  {selectedPlanData.price.toLocaleString()}/mes
                </span>
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-4"
            >
              {error && (
                <div className="flex items-start gap-3 bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Nombre completo <span className="text-red-400">*</span>
                  </label>
                  <input
                    name="nombre"
                    type="text"
                    value={form.nombre}
                    onChange={handleChange}
                    required
                    placeholder="Juan Pablo Fierro"
                    className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Empresa <span className="text-red-400">*</span>
                  </label>
                  <input
                    name="empresa"
                    type="text"
                    value={form.empresa}
                    onChange={handleChange}
                    required
                    placeholder="Flotilla Premier S.A."
                    className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Correo electrónico <span className="text-red-400">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="juan@empresa.com"
                  className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Teléfono
                </label>
                <input
                  name="telefono"
                  type="tel"
                  value={form.telefono}
                  onChange={handleChange}
                  placeholder="+52 55 1234 5678"
                  className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Contraseña <span className="text-red-400">*</span>
                  </label>
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    minLength={8}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Confirmar contraseña <span className="text-red-400">*</span>
                  </label>
                  <input
                    name="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Repite tu contraseña"
                    className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-base transition-all mt-2 shadow-lg shadow-blue-900/30"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {selectedPlan === 'starter' ? 'Creando cuenta...' : 'Preparando pago...'}
                  </>
                ) : (
                  <>
                    {selectedPlan === 'starter' ? 'Crear cuenta gratis' : 'Crear cuenta y pagar'}
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              <p className="text-center text-xs text-slate-500 pt-1">
                Al registrarte aceptas nuestros{' '}
                <a href="#" className="text-slate-400 hover:text-white underline">
                  Términos de servicio
                </a>{' '}
                y{' '}
                <a href="#" className="text-slate-400 hover:text-white underline">
                  Política de privacidad
                </a>
                .
              </p>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Export con Suspense (requerido para useSearchParams en SSG) ──────────────

export default function RegistroPage() {
  return (
    <>
      <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
        <RegistroContent />
      </Suspense>
    </>
  );
}
