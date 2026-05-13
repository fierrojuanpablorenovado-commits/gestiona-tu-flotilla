'use client';

import { useState } from 'react';
import { CreditCard, CheckCircle2, Zap, ArrowRight } from 'lucide-react';
import { PaymentModal } from './PaymentModal';

const PLANES = [
  { id: 'basico',      nombre: 'Básico',       precio: 999,  vehiculos: 15  },
  { id: 'profesional', nombre: 'Profesional',  precio: 2499, vehiculos: 50  },
  { id: 'enterprise',  nombre: 'Enterprise',   precio: 5999, vehiculos: 999 },
];

const PLAN_GRADIENT: Record<string, string> = {
  basico:      'from-slate-600 to-slate-700',
  profesional: 'from-blue-600 to-indigo-600',
  enterprise:  'from-purple-600 to-purple-700',
};

interface BillingSectionProps {
  currentPlan?: string;
  email?: string;
  tenantId?: string;
}

export function BillingSection({ currentPlan = 'profesional', email, tenantId }: BillingSectionProps) {
  const [selectedPlan, setSelectedPlan] = useState(currentPlan);
  const [showPayment, setShowPayment]   = useState(false);

  const plan     = PLANES.find(p => p.id === currentPlan) || PLANES[1];
  const selPlan  = PLANES.find(p => p.id === selectedPlan) || PLANES[1];
  const gradient = PLAN_GRADIENT[currentPlan] || PLAN_GRADIENT.profesional;

  return (
    <div className="space-y-6">
      {/* Plan actual */}
      <div className={`bg-gradient-to-r ${gradient} rounded-2xl p-6 text-white`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium opacity-80">Plan actual</p>
            <h3 className="text-2xl font-black mt-1">{plan.nombre}</h3>
            <p className="text-3xl font-black mt-2">
              ${plan.precio.toLocaleString('es-MX')}
              <span className="text-base font-normal opacity-80">/mes</span>
            </p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
            <Zap className="h-6 w-6 text-white" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-300" />
          <span className="text-sm opacity-90">Activo — Prueba gratuita (14 días restantes)</span>
        </div>
      </div>

      {/* Cambiar plan */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Cambiar plan</h3>
        <div className="grid grid-cols-3 gap-3">
          {PLANES.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPlan(p.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedPlan === p.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <p className="font-bold text-slate-900 text-sm">{p.nombre}</p>
              <p className="text-lg font-black text-slate-900 mt-0.5">
                ${p.precio.toLocaleString('es-MX')}
                <span className="text-xs font-normal text-slate-500">/mes</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {p.vehiculos === 999 ? 'Vehículos ilimitados' : `Hasta ${p.vehiculos} vehículos`}
              </p>
              {selectedPlan === p.id && (
                <p className="text-xs font-semibold text-blue-600 mt-2">✓ Seleccionado</p>
              )}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <button
            onClick={() => setShowPayment(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            <CreditCard className="h-4 w-4" />
            Pagar plan {selPlan.nombre}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Método de pago */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">Método de pago</p>
            <p className="text-xs text-slate-500">No tienes un método de pago registrado</p>
          </div>
        </div>
      </div>

      {/* Historial */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Historial de pagos</h4>
        <div className="text-center py-6 text-slate-400">
          <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Sin pagos registrados aún</p>
          <p className="text-xs">Tu historial aparecerá aquí</p>
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          plan={selectedPlan}
          planNombre={selPlan.nombre}
          precio={selPlan.precio}
          email={email}
          tenantId={tenantId}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  );
}
