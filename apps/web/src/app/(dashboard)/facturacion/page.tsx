'use client';

import { Header } from '@/components/layout/Header';
import { useState, useEffect } from 'react';
import {
  CreditCard, CheckCircle2, Download, AlertCircle,
  Star, Zap, Building2, ChevronRight, Clock, Receipt,
  TrendingUp, Shield, X, Loader2,
} from 'lucide-react';

const PLAN_ACTUAL = {
  nombre: 'Profesional',
  precio: 2499,
  periodo: 'mensual',
  proximoPago: '25 Abr 2026',
  metodoPago: 'Visa •••• 4821',
  vencimiento: '12/27',
  estado: 'Activo',
  vehiculosIncluidos: 50,
  vehiculosUsados: 48,
};

const HISTORIAL_FACTURAS = [
  { id: 'INV-0012', fecha: '25 Mar 2026', concepto: 'Plan Profesional — Marzo 2026', monto: 2499, estado: 'Pagado' },
  { id: 'INV-0011', fecha: '25 Feb 2026', concepto: 'Plan Profesional — Febrero 2026', monto: 2499, estado: 'Pagado' },
  { id: 'INV-0010', fecha: '25 Ene 2026', concepto: 'Plan Profesional — Enero 2026', monto: 2499, estado: 'Pagado' },
  { id: 'INV-0009', fecha: '25 Dic 2025', concepto: 'Plan Profesional — Diciembre 2025', monto: 2499, estado: 'Pagado' },
  { id: 'INV-0008', fecha: '25 Nov 2025', concepto: 'Plan Profesional — Noviembre 2025', monto: 2499, estado: 'Pagado' },
  { id: 'INV-0007', fecha: '25 Oct 2025', concepto: 'Upgrade: Básico → Profesional', monto: 1200, estado: 'Pagado' },
];

const PLANES = [
  {
    id: 'basico',
    nombre: 'Básico',
    precio: 999,
    icon: Star,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    vehiculos: 15,
    features: ['Hasta 15 vehículos', '3 usuarios', 'Gestión de choferes', 'Reportes básicos', 'Soporte por email'],
    actual: false,
  },
  {
    id: 'profesional',
    nombre: 'Profesional',
    precio: 2499,
    icon: Zap,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    border: 'border-blue-500',
    vehiculos: 50,
    features: ['Hasta 50 vehículos', 'Usuarios ilimitados', 'GPS incluido', 'Reportes avanzados', 'Reclutamiento', 'Mantenimiento preventivo', 'Soporte prioritario'],
    actual: true,
  },
  {
    id: 'enterprise',
    nombre: 'Enterprise',
    precio: 5999,
    icon: Building2,
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    border: 'border-purple-200',
    vehiculos: 999,
    features: ['Vehículos ilimitados', 'Multi-sucursal', 'API personalizada', 'Integraciones SAP/ERP', 'Gerente de cuenta dedicado', 'SLA garantizado 99.9%', 'Onboarding personalizado'],
    actual: false,
  },
];

export default function FacturacionPage() {
  useEffect(() => { document.title = 'Facturación | Gestiona tu Flotilla'; }, []);
  const [showCambiarPlan, setShowCambiarPlan] = useState(false);
  const [planSeleccionado, setPlanSeleccionado] = useState('profesional');
  const [guardando, setGuardando] = useState(false);
  const [showMetodoPago, setShowMetodoPago] = useState(false);
  const [metodoPagoSuccess, setMetodoPagoSuccess] = useState(false);

  const handleCambiarPlan = async () => {
    setGuardando(true);
    await new Promise(r => setTimeout(r, 1200));
    setGuardando(false);
    setShowCambiarPlan(false);
  };

  const handleDescargar = (id: string) => {
    const blob = new Blob([`FACTURA ${id}\nGestiona tu Flotilla\nFecha: ${new Date().toLocaleDateString('es-MX')}\nTotal: $2,499 MXN\nConcepto: Plan Profesional\n\nGracias por tu pago.`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Factura_${id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const p = PLAN_ACTUAL;
  const usoPct = Math.round((p.vehiculosUsados / p.vehiculosIncluidos) * 100);

  return (
    <div>
      <Header breadcrumbs={[{ label: 'Facturación' }]} />
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Facturación y Plan</h1>
            <p className="text-sm text-slate-500 mt-0.5">Gestiona tu suscripción, facturas y métodos de pago</p>
          </div>
          <button
            onClick={() => setShowCambiarPlan(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Zap className="h-4 w-4" /> Cambiar plan
          </button>
        </div>

        {/* Plan actual */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 shadow-xl text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-blue-200 text-sm font-medium">Plan actual</span>
                    <span className="bg-green-400/20 border border-green-400/30 text-green-300 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> {p.estado}
                    </span>
                  </div>
                  <h2 className="text-3xl font-black text-white">{p.nombre}</h2>
                  <p className="text-blue-200 text-lg font-bold mt-1">${p.precio.toLocaleString()} <span className="text-sm font-normal">MXN/{p.periodo}</span></p>
                </div>
                <div className="hidden md:block text-right">
                  <p className="text-blue-200 text-xs">Próximo cargo</p>
                  <p className="text-white text-xl font-bold">{p.proximoPago}</p>
                  <p className="text-blue-300 text-xs mt-1 flex items-center gap-1 justify-end">
                    <CreditCard className="h-3 w-3" /> {p.metodoPago}
                  </p>
                </div>
              </div>
              <div className="relative mt-5">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-blue-200 text-xs">Uso de vehículos</p>
                  <p className="text-white text-xs font-bold">{p.vehiculosUsados}/{p.vehiculosIncluidos}</p>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${usoPct > 90 ? 'bg-red-400' : usoPct > 70 ? 'bg-yellow-400' : 'bg-green-400'}`} style={{ width: `${usoPct}%` }} />
                </div>
                {usoPct > 90 && (
                  <p className="text-red-300 text-xs mt-1.5 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Casi al límite — considera actualizar al plan Enterprise
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Método de pago</p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-16 rounded-lg bg-slate-900 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{p.metodoPago}</p>
                  <p className="text-xs text-slate-500">Vence {p.vencimiento}</p>
                </div>
              </div>
              <button
                onClick={() => setShowMetodoPago(true)}
                className="mt-3 w-full text-xs text-blue-600 font-medium hover:underline text-center"
              >
                + Agregar método de pago
              </button>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Beneficios activos</p>
              <div className="space-y-2">
                {['GPS incluido', 'Soporte prioritario', 'Reportes avanzados', 'Reclutamiento'].map(b => (
                  <div key={b} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                    {b}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Historial de facturas */}
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-slate-500" />
              <h3 className="text-base font-semibold text-slate-900">Historial de Facturas</h3>
            </div>
            <span className="text-xs text-slate-400">Últimos 6 meses</span>
          </div>
          <div className="divide-y divide-slate-50">
            {HISTORIAL_FACTURAS.map(f => (
              <div key={f.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Receipt className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{f.concepto}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="h-3 w-3" /> {f.fecha}</span>
                      <span className="text-xs font-mono text-slate-400">{f.id}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">${f.monto.toLocaleString()}</p>
                    <span className="text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{f.estado}</span>
                  </div>
                  <button onClick={() => handleDescargar(f.id)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Descargar factura">
                    <Download className="h-4 w-4 text-slate-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
            <TrendingUp className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-black text-slate-900">$14,994</p>
            <p className="text-sm text-slate-500">Invertido en 2026</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
            <Shield className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-black text-slate-900">99.9%</p>
            <p className="text-sm text-slate-500">Disponibilidad garantizada</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
            <CheckCircle2 className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-black text-slate-900">18 meses</p>
            <p className="text-sm text-slate-500">Como cliente activo</p>
          </div>
        </div>

      </div>

      {/* Modal método de pago */}
      {showMetodoPago && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowMetodoPago(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Agregar método de pago</h2>
                <p className="text-xs text-slate-500">Tus datos están protegidos con cifrado SSL</p>
              </div>
              <button onClick={() => setShowMetodoPago(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            {metodoPagoSuccess ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="font-bold text-slate-800">¡Método de pago agregado!</p>
                <p className="text-sm text-slate-500 mt-1">Tu tarjeta ha sido guardada de forma segura.</p>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Número de tarjeta</label>
                  <input type="text" placeholder="1234 5678 9012 3456" maxLength={19}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Vencimiento</label>
                    <input type="text" placeholder="MM/AA" maxLength={5}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">CVV</label>
                    <input type="text" placeholder="123" maxLength={4}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre en la tarjeta</label>
                  <input type="text" placeholder="JUAN PABLO FIERRO"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200">
                  <Shield className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <p className="text-xs text-green-700">Tus datos están protegidos con cifrado de 256 bits</p>
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setShowMetodoPago(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">Cancelar</button>
                  <button onClick={() => { setMetodoPagoSuccess(true); setTimeout(() => { setShowMetodoPago(false); setMetodoPagoSuccess(false); }, 2000); }}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                    Guardar tarjeta
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal cambiar plan */}
      {showCambiarPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCambiarPlan(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Cambiar Plan</h2>
                <p className="text-xs text-slate-500">Selecciona el plan que mejor se adapte a tu flotilla</p>
              </div>
              <button onClick={() => setShowCambiarPlan(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PLANES.map(plan => {
                  const Ic = plan.icon;
                  const selected = planSeleccionado === plan.id;
                  return (
                    <button key={plan.id} onClick={() => setPlanSeleccionado(plan.id)}
                      className={`p-5 rounded-2xl border-2 text-left transition-all ${selected ? 'border-blue-500 bg-blue-50 shadow-md' : `border-slate-200 hover:border-slate-300 bg-white`}`}
                    >
                      <div className={`h-10 w-10 rounded-xl ${plan.bg} flex items-center justify-center mb-3`}>
                        <Ic className={`h-5 w-5 ${plan.color}`} />
                      </div>
                      <p className="font-bold text-slate-900">{plan.nombre}</p>
                      <p className="text-2xl font-black text-slate-900 mt-1">${plan.precio.toLocaleString()}<span className="text-sm font-normal text-slate-500">/mes</span></p>
                      {plan.actual && <p className="text-[11px] font-bold text-blue-600 mt-1">Plan actual</p>}
                      <div className="mt-3 space-y-1.5">
                        {plan.features.map(f => (
                          <div key={f} className="flex items-center gap-1.5 text-xs text-slate-600">
                            <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                            {f}
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">El cambio aplica en tu próximo ciclo de facturación</p>
              <div className="flex gap-3">
                <button onClick={() => setShowCambiarPlan(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm hover:bg-slate-50">Cancelar</button>
                <button onClick={handleCambiarPlan} disabled={guardando} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-70 flex items-center gap-2">
                  {guardando ? <><Loader2 className="h-4 w-4 animate-spin" /> Aplicando...</> : 'Confirmar cambio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
