'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, ChevronRight, X } from 'lucide-react';

const DISMISS_KEY = 'gtf_setup_dismissed';

export interface SetupChecklistProps {
  vehicleCount: number;
  driverCount: number;
  whatsappConfigured: boolean;
  accountsGenerated: boolean;
}

interface Step {
  label: string;
  href: string;
  done: boolean;
}

export function SetupChecklist({
  vehicleCount,
  driverCount,
  whatsappConfigured,
  accountsGenerated,
}: SetupChecklistProps) {
  const [dismissed, setDismissed] = useState(true); // empieza en true para evitar flash
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const val = localStorage.getItem(DISMISS_KEY);
    setDismissed(val === 'true');
  }, []);

  const steps: Step[] = [
    { label: 'Añade tu primer vehículo',          href: '/vehiculos',           done: vehicleCount > 0 },
    { label: 'Registra a tus choferes',           href: '/choferes',            done: driverCount > 0 },
    { label: 'Configura WhatsApp',                href: '/configuracion',       done: whatsappConfigured },
    { label: 'Genera tu primera cuenta semanal',  href: '/cuentas-semanales',   done: accountsGenerated },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const allDone = completedCount === steps.length;
  const progressPct = (completedCount / steps.length) * 100;

  // Cuando se completan todos los pasos, mostrar celebración y luego ocultar
  useEffect(() => {
    if (allDone && !dismissed) {
      setShowSuccess(true);
      const t = setTimeout(() => {
        handleDismiss();
      }, 3500);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone, dismissed]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  if (dismissed) return null;

  if (showSuccess) {
    return (
      <div className="border-l-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl shadow-sm p-5 flex items-center gap-4 animate-pulse">
        <span className="text-3xl select-none">🎉</span>
        <div>
          <p className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">
            ¡Tu flotilla está lista!
          </p>
          <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-0.5">
            Completaste los 4 pasos de configuración. ¡A operar!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-l-4 border-emerald-500 bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Configura tu flotilla en 4 pasos
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {completedCount} de {steps.length} completados
          </p>
        </div>
        <button
          onClick={handleDismiss}
          title="Descartar"
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Barra de progreso */}
      <div className="px-5 pb-3">
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {steps.map((step, i) => (
          <Link
            key={i}
            href={step.href}
            className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
            {step.done ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
            )}
            <span className={`flex-1 text-sm ${
              step.done
                ? 'text-slate-400 dark:text-slate-500 line-through'
                : 'text-slate-700 dark:text-slate-200 font-medium'
            }`}>
              {step.label}
            </span>
            {!step.done && (
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 flex-shrink-0 transition-colors" />
            )}
          </Link>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Puedes descartar este panel en cualquier momento. Volverá a aparecer si reinicias la sesión.
        </p>
      </div>
    </div>
  );
}
