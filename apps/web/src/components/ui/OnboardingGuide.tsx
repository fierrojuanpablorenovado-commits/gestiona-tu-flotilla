'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck, Users, DollarSign, MessageCircle, FileSpreadsheet,
  CheckCircle2, ChevronRight, X, Sparkles,
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  label: string;
  desc: string;
  href: string;
  icon: React.ElementType;
  color: string;
  check: (data: OnboardingData) => boolean;
}

interface OnboardingData {
  totalVehiculos: number;
  choferes: number;
  hasWeeklyRent: boolean;
  hasWhatsapp: boolean;
  hasWeeklyAccount: boolean;
}

const STEPS: OnboardingStep[] = [
  {
    id: 'vehiculo',
    label: 'Agrega tu primer vehículo',
    desc: 'Da de alta el primer carro de tu flotilla con sus datos básicos.',
    href: '/vehiculos',
    icon: Truck,
    color: 'bg-blue-600',
    check: d => d.totalVehiculos > 0,
  },
  {
    id: 'chofer',
    label: 'Asigna un chofer',
    desc: 'Registra un chofer y asígnalo a un vehículo.',
    href: '/choferes',
    icon: Users,
    color: 'bg-indigo-600',
    check: d => d.choferes > 0,
  },
  {
    id: 'renta',
    label: 'Configura la renta semanal',
    desc: 'Define cuánto paga el chofer por semana en el detalle del vehículo.',
    href: '/vehiculos',
    icon: DollarSign,
    color: 'bg-emerald-600',
    check: d => d.hasWeeklyRent,
  },
  {
    id: 'whatsapp',
    label: 'Conecta WhatsApp',
    desc: 'Envía cuentas y alertas automáticamente al chofer por WhatsApp.',
    href: '/configuracion',
    icon: MessageCircle,
    color: 'bg-green-600',
    check: d => d.hasWhatsapp,
  },
  {
    id: 'cuenta',
    label: 'Crea tu primera cuenta semanal',
    desc: 'Importa o crea manualmente la primera cuenta semanal de la flotilla.',
    href: '/cuentas-semanales',
    icon: FileSpreadsheet,
    color: 'bg-violet-600',
    check: d => d.hasWeeklyAccount,
  },
];

export function OnboardingGuide() {
  const router = useRouter();
  const [onbData, setOnbData]     = useState<OnboardingData | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    // Dismiss permanente por localStorage
    if (typeof window !== 'undefined' && localStorage.getItem('onboarding_dismissed') === '1') {
      setDismissed(true);
      setLoading(false);
      return;
    }
    fetchOnboardingData();
  }, []);

  async function fetchOnboardingData() {
    try {
      const [statsRes, waRes, waRes2] = await Promise.all([
        fetch('/api/dashboard').then(r => r.ok ? r.json() : null),
        fetch('/api/settings/whatsapp').then(r => r.ok ? r.json() : null),
        Promise.resolve(null),
      ]);

      const stats = statsRes?.stats;
      const wa    = waRes;

      setOnbData({
        totalVehiculos:   Number(stats?.totalVehiculos ?? 0),
        choferes:         Number(stats?.choferes ?? 0),
        hasWeeklyRent:    Number(stats?.totalVehiculos ?? 0) > 0, // simplificado
        hasWhatsapp:      !!(wa?.mode && wa?.mode !== 'none' && (wa?.token || wa?.phoneNumberId)),
        hasWeeklyAccount: Number(stats?.vehiculosActivos ?? 0) > 0,
      });
    } catch { /* silencioso */ }
    setLoading(false);
  }

  function handleDismiss() {
    localStorage.setItem('onboarding_dismissed', '1');
    setDismissed(true);
  }

  if (loading || dismissed || !onbData) return null;

  const completedSteps = STEPS.filter(s => s.check(onbData));
  const allDone = completedSteps.length === STEPS.length;

  // Si todos completados, ocultar permanentemente
  if (allDone) {
    if (typeof window !== 'undefined') localStorage.setItem('onboarding_dismissed', '1');
    return null;
  }

  const progress = (completedSteps.length / STEPS.length) * 100;
  const nextStep = STEPS.find(s => !s.check(onbData));

  return (
    <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/60 text-slate-400 hover:text-slate-600 transition-colors"
        title="Cerrar guía"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-semibold text-blue-800">Configura tu flotilla</span>
        <span className="ml-auto mr-6 text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
          {completedSteps.length}/{STEPS.length}
        </span>
      </div>

      {/* Barra de progreso */}
      <div className="h-1.5 bg-blue-200 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {STEPS.map((step, i) => {
          const done = step.check(onbData);
          const isNext = step.id === nextStep?.id;
          const Icon = step.icon;

          return (
            <button
              key={step.id}
              onClick={() => router.push(step.href)}
              className={`flex sm:flex-col items-center sm:items-start gap-2.5 sm:gap-1.5 rounded-lg p-2.5 text-left transition-all ${
                done
                  ? 'bg-white/50 border border-white/80 opacity-60'
                  : isNext
                  ? 'bg-white border-2 border-blue-400 shadow-sm hover:shadow-md'
                  : 'bg-white/60 border border-white/60 hover:bg-white hover:border-blue-200'
              }`}
            >
              <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
                done ? 'bg-emerald-100' : step.color
              }`}>
                {done
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  : <Icon className="h-3.5 w-3.5 text-white" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-semibold leading-tight ${done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                  {i + 1}. {step.label}
                </p>
                {isNext && (
                  <p className="text-[10px] text-blue-600 mt-0.5 line-clamp-2 hidden sm:block">{step.desc}</p>
                )}
              </div>
              {isNext && !done && (
                <ChevronRight className="h-3 w-3 text-blue-500 flex-shrink-0 hidden sm:block" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
