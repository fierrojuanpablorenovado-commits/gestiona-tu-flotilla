'use client';

import { useState } from 'react';

interface OnboardingWizardProps {
  tenantId: number;
  userName: string;
  onClose: () => void;
}

const STEPS = [0, 1, 2] as const;

const quickLinks = [
  { icon: '🚗', label: 'Añade tus vehículos',              href: '/vehiculos' },
  { icon: '👤', label: 'Registra tus choferes',             href: '/choferes' },
  { icon: '💬', label: 'Configura WhatsApp',                href: '/configuracion' },
  { icon: '📊', label: 'Genera tu primera cuenta semanal',  href: '/cuentas-semanales' },
];

export default function OnboardingWizard({ tenantId, userName, onClose }: OnboardingWizardProps) {
  const [step, setStep] = useState<0 | 1 | 2>(0);

  const handleClose = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`gtf_onboarding_done_${tenantId}`, 'true');
    }
    onClose();
  };

  const handleLinkClick = () => {
    handleClose();
  };

  const goNext = () => setStep(s => (s < 2 ? ((s + 1) as 0 | 1 | 2) : s));
  const goPrev = () => setStep(s => (s > 0 ? ((s - 1) as 0 | 1 | 2) : s));

  return (
    /* Overlay */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Card */}
      <div className="relative bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-8 overflow-hidden">

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map(i => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                step === i ? 'w-6 bg-emerald-400' : 'w-2 bg-slate-600'
              }`}
              aria-label={`Paso ${i + 1}`}
            />
          ))}
        </div>

        {/* ── Pantalla 1: Bienvenida ─────────────────────────────────── */}
        {step === 0 && (
          <div className="text-center space-y-5">
            <div className="text-6xl">🚗</div>
            <h2 className="text-2xl font-black text-white leading-tight">
              ¡Bienvenido, {userName}!<br />
              <span className="text-emerald-400">Tu flotilla digital está lista.</span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              En los próximos 14 días de prueba, te ayudamos a configurar todo.
            </p>
            <button
              onClick={goNext}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
            >
              Empezar →
            </button>
          </div>
        )}

        {/* ── Pantalla 2: Primeros pasos ────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-black text-white">Primeros pasos</h2>
              <p className="text-slate-400 text-sm mt-1">Da click en cualquier acción para empezar ahora.</p>
            </div>

            <div className="space-y-2">
              {quickLinks.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={handleLinkClick}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500 transition-all group"
                >
                  <span className="text-xl">{link.icon}</span>
                  <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                    {link.label}
                  </span>
                  <span className="ml-auto text-slate-500 group-hover:text-emerald-400 transition-colors text-xs">→</span>
                </a>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={goPrev}
                className="flex-none px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-sm transition-colors"
              >
                ← Atrás
              </button>
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-sm transition-colors"
              >
                Hacer esto después
              </button>
            </div>
          </div>
        )}

        {/* ── Pantalla 3: Soporte ───────────────────────────────────── */}
        {step === 2 && (
          <div className="text-center space-y-5">
            <div className="text-5xl">🤝</div>
            <h2 className="text-xl font-black text-white">¿Necesitas ayuda para configurar?</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Nuestro equipo te guía por WhatsApp en menos de 24 horas.
            </p>

            <a
              href="https://wa.me/523312933906?text=Hola%2C%20acabo%20de%20registrarme%20en%20Gestiona%20tu%20Flotilla%20y%20necesito%20ayuda"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
            >
              💬 Escribirnos por WhatsApp
            </a>

            <div className="flex items-center gap-3">
              <button
                onClick={goPrev}
                className="flex-none px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-sm transition-colors"
              >
                ← Atrás
              </button>
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium transition-colors"
              >
                Ya sé cómo usarlo →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
