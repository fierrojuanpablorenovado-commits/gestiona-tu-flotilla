'use client';

import { useState } from 'react';
import { X, CreditCard, Loader2, AlertCircle } from 'lucide-react';

interface PaymentModalProps {
  plan: string;
  planNombre: string;
  precio: number;
  email?: string;
  tenantId?: string;
  onClose: () => void;
}

const PLAN_GRADIENT: Record<string, string> = {
  basico:      'from-slate-600 to-slate-700',
  profesional: 'from-blue-600 to-indigo-600',
  enterprise:  'from-purple-600 to-purple-700',
};

export function PaymentModal({ plan, planNombre, precio, email, tenantId, onClose }: PaymentModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError]     = useState('');

  async function handlePayment(method: 'stripe' | 'paypal' | 'mercadopago') {
    setLoading(method);
    setError('');
    try {
      const body = JSON.stringify({ plan, email: email || '', tenantId: tenantId || '' });
      const headers = { 'Content-Type': 'application/json' };

      let url = '';
      if (method === 'stripe') {
        const res  = await fetch('/api/payments/stripe/checkout', { method: 'POST', headers, body });
        const data = await res.json();
        if (!res.ok) { setError(data.message || 'Error con Stripe'); return; }
        url = data.url;
      } else if (method === 'paypal') {
        const res  = await fetch('/api/payments/paypal/create', { method: 'POST', headers, body });
        const data = await res.json();
        if (!res.ok) { setError(data.message || 'Error con PayPal'); return; }
        url = data.url;
      } else {
        const res  = await fetch('/api/payments/mercadopago/create', { method: 'POST', headers, body });
        const data = await res.json();
        if (!res.ok) { setError(data.message || 'Error con MercadoPago'); return; }
        // En desarrollo usar sandboxUrl, en producción usar url
        url = data.sandboxUrl || data.url;
      }

      if (url) window.location.href = url;
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(null);
    }
  }

  const gradient = PLAN_GRADIENT[plan] || PLAN_GRADIENT.profesional;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${gradient} p-6 text-white`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium opacity-80">Suscripción mensual</p>
              <h2 className="text-2xl font-black mt-1">Plan {planNombre}</h2>
              <p className="text-3xl font-black mt-2">
                ${precio.toLocaleString('es-MX')}
                <span className="text-base font-normal opacity-80">/mes</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-500 text-center font-medium">
            Elige tu método de pago preferido
          </p>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Stripe — Tarjeta */}
          <button
            onClick={() => handlePayment('stripe')}
            disabled={!!loading}
            className="w-full flex items-center gap-4 p-4 border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-60 group"
          >
            <div className="w-10 h-10 bg-blue-100 group-hover:bg-blue-200 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
              {loading === 'stripe'
                ? <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                : <CreditCard className="h-5 w-5 text-blue-600" />}
            </div>
            <div className="text-left">
              <p className="font-semibold text-slate-900">Tarjeta de crédito / débito</p>
              <p className="text-xs text-slate-500">Visa · Mastercard · AMEX — procesado por Stripe</p>
            </div>
          </button>

          {/* PayPal */}
          <button
            onClick={() => handlePayment('paypal')}
            disabled={!!loading}
            className="w-full flex items-center gap-4 p-4 border-2 border-slate-200 rounded-xl hover:border-yellow-400 hover:bg-yellow-50 transition-all disabled:opacity-60 group"
          >
            <div className="w-10 h-10 bg-yellow-50 group-hover:bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors border border-yellow-200">
              {loading === 'paypal'
                ? <Loader2 className="h-5 w-5 text-[#003087] animate-spin" />
                : <span className="text-sm font-black text-[#003087] italic">Pay</span>}
            </div>
            <div className="text-left">
              <p className="font-semibold text-slate-900">PayPal</p>
              <p className="text-xs text-slate-500">Paga con tu cuenta PayPal de forma segura</p>
            </div>
          </button>

          {/* MercadoPago */}
          <button
            onClick={() => handlePayment('mercadopago')}
            disabled={!!loading}
            className="w-full flex items-center gap-4 p-4 border-2 border-slate-200 rounded-xl hover:border-[#009EE3] hover:bg-sky-50 transition-all disabled:opacity-60 group"
          >
            <div className="w-10 h-10 bg-sky-50 group-hover:bg-sky-100 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors border border-sky-200">
              {loading === 'mercadopago'
                ? <Loader2 className="h-5 w-5 text-[#009EE3] animate-spin" />
                : <span className="text-xs font-black text-[#009EE3]">MP</span>}
            </div>
            <div className="text-left">
              <p className="font-semibold text-slate-900">MercadoPago</p>
              <p className="text-xs text-slate-500">OXXO · SPEI · Tarjetas mexicanas · Efectivo</p>
            </div>
          </button>

          <p className="text-xs text-slate-400 text-center pt-1">
            Pago 100% seguro. 14 días de prueba gratis. Cancela en cualquier momento.
          </p>
        </div>
      </div>
    </div>
  );
}
