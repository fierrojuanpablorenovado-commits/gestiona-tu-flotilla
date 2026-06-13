'use client';

import { Header } from '@/components/layout/Header';
import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, CheckCircle2, Download, AlertCircle,
  Star, Zap, Building2, Clock, Receipt,
  TrendingUp, Shield, X, Loader2, FileText,
  Settings, PlusCircle, RefreshCw, XCircle,
  ChevronRight, Info, Eye, AlertTriangle,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface CFDIConfig {
  id: string;
  rfc: string;
  razonSocial: string;
  codigoPostal: string;
  regimenFiscal: string;
  pacUser: string;
  pacSandbox: boolean;
  serieIngreso: string;
  serieGlobal: string;
  verified: boolean;
}

interface CFDIDoc {
  id: string;
  facturamaId?: string;
  uuidSat?: string;
  serie?: string;
  folio?: string;
  tipo: 'ingreso' | 'global';
  mes?: number;
  anio?: number;
  periodLabel?: string;
  receptorRfc: string;
  receptorNombre: string;
  subtotal: number;
  iva: number;
  total: number;
  status: 'draft' | 'timbrado' | 'cancelado' | 'error';
  errorMessage?: string;
  createdAt: string;
}

interface GlobalPreview {
  mes: number;
  anio: number;
  mesLabel: string;
  totalRentas: number;
  cuentasPagadas: number;
  cuentasTotal: number;
  existing?: CFDIDoc | null;
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const REGIMENES = [
  { value: '625', label: '625 — Plataformas Tecnológicas (Didi/Uber)' },
  { value: '626', label: '626 — RESICO Personas Físicas' },
  { value: '612', label: '612 — Actividades Empresariales y Profesionales' },
  { value: '606', label: '606 — Arrendamiento' },
  { value: '601', label: '601 — General de Ley Personas Morales' },
  { value: '603', label: '603 — Personas Morales sin Fines de Lucro' },
];
const USO_CFDI_OPTIONS = [
  { value: 'G03', label: 'G03 — Gastos en general' },
  { value: 'S01', label: 'S01 — Sin efectos fiscales' },
  { value: 'D10', label: 'D10 — Pagos por servicios educativos' },
  { value: 'CP01', label: 'CP01 — Pagos' },
];

// ─── Utilidades ──────────────────────────────────────────────────────────────

function statusBadge(status: CFDIDoc['status']) {
  const map = {
    timbrado:  { bg: 'bg-green-50',  text: 'text-green-700',  label: 'Timbrado' },
    cancelado: { bg: 'bg-red-50',    text: 'text-red-700',    label: 'Cancelado' },
    error:     { bg: 'bg-amber-50',  text: 'text-amber-700',  label: 'Error' },
    draft:     { bg: 'bg-slate-50',  text: 'text-slate-600',  label: 'Borrador' },
  };
  const s = map[status] ?? map.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

// ─── Tab Suscripción ──────────────────────────────────────────────────────────

const PLAN_ACTUAL = {
  nombre: 'Enterprise', precio: 1999, periodo: 'mensual',
  proximoPago: '25 Jul 2026', metodoPago: 'Stripe', estado: 'Activo',
  vehiculosIncluidos: 60, vehiculosUsados: 8,
};

function SuscripcionTab() {
  const [showCambiarPlan, setShowCambiarPlan] = useState(false);
  const [planSeleccionado, setPlanSeleccionado] = useState('enterprise');
  const [guardando, setGuardando] = useState(false);
  const p = PLAN_ACTUAL;
  const usoPct = Math.round((p.vehiculosUsados / p.vehiculosIncluidos) * 100);

  const PLANES = [
    { id: 'basico',      nombre: 'Básico',      precio: 999,  icon: Star,      vehiculos: 10, features: ['10 vehículos', '3 usuarios', 'Gestión básica'] },
    { id: 'pro',         nombre: 'Pro',          precio: 1499, icon: Zap,       vehiculos: 30, features: ['30 vehículos', 'GPS incluido', 'Reportes avanzados', 'Reclutamiento'] },
    { id: 'enterprise',  nombre: 'Enterprise',   precio: 1999, icon: Building2, vehiculos: 60, features: ['60 vehículos', 'CFDIs SAT', 'Multi-sucursal', 'API personalizada', 'Gerente de cuenta'] },
  ];

  return (
    <div className="space-y-6">
      {/* Plan actual */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 shadow-xl text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,white 1px,transparent 0)', backgroundSize: '24px 24px' }} />
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
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Beneficios activos</p>
          <div className="space-y-2">
            {['CFDIs SAT incluidos', 'GPS incluido', 'Soporte prioritario', 'Multi-sucursal', 'API personalizada'].map(b => (
              <div key={b} className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />{b}
              </div>
            ))}
          </div>
          <button onClick={() => setShowCambiarPlan(true)}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors">
            <Zap className="h-4 w-4" /> Cambiar plan
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: TrendingUp, color: 'text-blue-500', value: '$11,994', label: 'Invertido en 2026' },
          { icon: Shield, color: 'text-green-500', value: '99.9%', label: 'Disponibilidad' },
          { icon: CheckCircle2, color: 'text-purple-500', value: '6 meses', label: 'Como cliente activo' },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
            <s.icon className={`h-8 w-8 ${s.color} mx-auto mb-2`} />
            <p className="text-2xl font-black text-slate-900">{s.value}</p>
            <p className="text-sm text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Modal cambiar plan */}
      {showCambiarPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCambiarPlan(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Cambiar Plan</h2>
              <button onClick={() => setShowCambiarPlan(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANES.map(plan => {
                const Ic = plan.icon;
                const selected = planSeleccionado === plan.id;
                return (
                  <button key={plan.id} onClick={() => setPlanSeleccionado(plan.id)}
                    className={`p-5 rounded-2xl border-2 text-left transition-all ${selected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                    <Ic className={`h-6 w-6 mb-2 ${selected ? 'text-blue-600' : 'text-slate-400'}`} />
                    <p className="font-bold text-slate-900">{plan.nombre}</p>
                    <p className="text-xl font-black text-slate-900 mt-1">${plan.precio.toLocaleString()}<span className="text-xs font-normal text-slate-500">/mes</span></p>
                    {plan.id === 'enterprise' && <p className="text-[11px] font-bold text-blue-600 mt-1">Plan actual</p>}
                    <div className="mt-3 space-y-1.5">
                      {plan.features.map(f => (
                        <div key={f} className="flex items-center gap-1.5 text-xs text-slate-600">
                          <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />{f}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="p-5 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">El cambio aplica en el próximo ciclo de facturación</p>
              <div className="flex gap-3">
                <button onClick={() => setShowCambiarPlan(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm hover:bg-slate-50">Cancelar</button>
                <button onClick={async () => { setGuardando(true); await new Promise(r => setTimeout(r, 800)); setGuardando(false); setShowCambiarPlan(false); }}
                  disabled={guardando} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-70 flex items-center gap-2">
                  {guardando ? <><Loader2 className="h-4 w-4 animate-spin" /> Aplicando...</> : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab CFDIs SAT ────────────────────────────────────────────────────────────

function CFDITab() {
  const [config, setConfig]       = useState<CFDIConfig | null>(null);
  const [docs, setDocs]           = useState<CFDIDoc[]>([]);
  const [stats, setStats]         = useState<{ timbrados: number; cancelados: number; total_timbrado: number }>({ timbrados: 0, cancelados: 0, total_timbrado: 0 });
  const [loading, setLoading]     = useState(true);
  const [showConfig, setShowConfig]         = useState(false);
  const [showGlobal, setShowGlobal]         = useState(false);
  const [showNueva, setShowNueva]           = useState(false);
  const [showCancel, setShowCancel]         = useState<string | null>(null);
  const [testing, setTesting]              = useState(false);
  const [testResult, setTestResult]        = useState<{ ok: boolean; error?: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [cfgRes, docsRes] = await Promise.all([
      fetch('/api/cfdi/config').then(r => r.json()).catch(() => ({})),
      fetch('/api/cfdi/documents').then(r => r.json()).catch(() => ({})),
    ]);
    setConfig(cfgRes.config ?? null);
    setDocs(docsRes.docs ?? []);
    setStats(docsRes.stats ?? { timbrados: 0, cancelados: 0, total_timbrado: 0 });
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await fetch('/api/cfdi/config/test', { method: 'POST' }).then(r => r.json()).catch(() => ({ ok: false, error: 'Error de red' }));
    setTestResult(res);
    setTesting(false);
    if (res.ok) loadData();
  };

  const handleCancel = async (id: string) => {
    const res = await fetch(`/api/cfdi/documents/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ motivo: '02' }) }).then(r => r.json()).catch(() => ({ error: 'Error' }));
    if (res.ok) { setShowCancel(null); loadData(); }
    else alert(res.error ?? 'Error al cancelar');
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Banner configuración si no hay config */}
      {!config ? (
        <div className="rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 p-8 text-center">
          <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-7 w-7 text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Configura tu RFC y Facturama</h3>
          <p className="text-sm text-slate-500 mb-4 max-w-sm mx-auto">
            Para emitir CFDIs necesitas tu RFC fiscal y una cuenta en <strong>Facturama</strong> (PAC autorizado SAT).
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => setShowConfig(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
              <Settings className="h-4 w-4" /> Configurar RFC y PAC
            </button>
            <a href="https://facturama.mx" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 border border-blue-300 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors">
              <ChevronRight className="h-4 w-4" /> Crear cuenta en Facturama
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* Header config + stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold ${config.verified ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {config.verified
                  ? <><CheckCircle2 className="h-4 w-4" /> Conectado a Facturama</>
                  : <><AlertTriangle className="h-4 w-4" /> Sin verificar</>
                }
              </div>
              <span className="text-sm text-slate-500 font-mono">{config.rfc}</span>
              {config.pacSandbox && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">SANDBOX</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleTest} disabled={testing}
                className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Probar conexión
              </button>
              <button onClick={() => setShowConfig(true)}
                className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                <Settings className="h-3.5 w-3.5" /> Configurar
              </button>
            </div>
          </div>

          {testResult && (
            <div className={`flex items-center gap-3 p-3 rounded-xl text-sm ${testResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {testResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {testResult.ok ? '¡Conexión exitosa con Facturama!' : `Error: ${testResult.error}`}
              <button onClick={() => setTestResult(null)} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
            </div>
          )}

          {/* Stats del mes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'CFDIs timbrados (mes)', value: stats.timbrados ?? 0, icon: CheckCircle2, color: 'text-green-500' },
              { label: 'Total timbrado (mes)',  value: `$${Number(stats.total_timbrado ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-blue-500' },
              { label: 'Cancelados (mes)',      value: stats.cancelados ?? 0, icon: XCircle, color: 'text-red-400' },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Botones de acción */}
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setShowGlobal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
              <FileText className="h-4 w-4" /> CFDI Global — {MESES[new Date().getMonth() - 1] ?? 'Mes anterior'}
            </button>
            <button onClick={() => setShowNueva(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
              <PlusCircle className="h-4 w-4" /> Nueva Factura
            </button>
            <button onClick={loadData} className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              <RefreshCw className="h-4 w-4" /> Actualizar
            </button>
          </div>
        </>
      )}

      {/* Lista CFDIs */}
      {docs.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-slate-500" />
              <h3 className="text-base font-semibold text-slate-900">CFDIs Emitidos</h3>
            </div>
            <span className="text-xs text-slate-400">{docs.length} documentos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Folio</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-left px-4 py-3">Período / Receptor</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {docs.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">
                      {doc.serie ?? ''}{doc.folio ?? '—'}
                      {doc.uuidSat && <div className="text-[10px] text-slate-400 truncate max-w-[80px]" title={doc.uuidSat}>{doc.uuidSat.slice(0, 8)}…</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${doc.tipo === 'global' ? 'bg-indigo-50 text-indigo-700' : 'bg-blue-50 text-blue-700'}`}>
                        {doc.tipo === 'global' ? 'Global' : 'Ingreso'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {doc.tipo === 'global' ? doc.periodLabel : doc.receptorNombre}
                      <div className="text-xs text-slate-400 font-mono">{doc.receptorRfc}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      ${Number(doc.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">{statusBadge(doc.status)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(doc.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {doc.facturamaId && doc.status === 'timbrado' && (
                          <>
                            <a href={`/api/cfdi/documents/${doc.id}/download?tipo=pdf`}
                              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-red-600" title="Descargar PDF">
                              <Download className="h-3.5 w-3.5" />
                            </a>
                            <a href={`/api/cfdi/documents/${doc.id}/download?tipo=xml`}
                              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-blue-600" title="Descargar XML">
                              <FileText className="h-3.5 w-3.5" />
                            </a>
                          </>
                        )}
                        {doc.status === 'timbrado' && (
                          <button onClick={() => setShowCancel(doc.id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-600" title="Cancelar CFDI">
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {doc.status === 'error' && doc.errorMessage && (
                          <button title={doc.errorMessage} className="p-1.5 text-amber-500">
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {docs.length === 0 && config && !loading && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Aún no has emitido ningún CFDI.</p>
          <p className="text-slate-400 text-xs mt-1">Usa los botones de arriba para generar tu primer CFDI.</p>
        </div>
      )}

      {/* Modal Configuración */}
      {showConfig && <ModalConfig config={config} onClose={() => setShowConfig(false)} onSaved={loadData} />}
      {/* Modal CFDI Global */}
      {showGlobal && config && <ModalGlobal onClose={() => setShowGlobal(false)} onCreated={loadData} />}
      {/* Modal Nueva Factura */}
      {showNueva && config && <ModalNuevaFactura onClose={() => setShowNueva(false)} onCreated={loadData} />}
      {/* Modal Cancelar */}
      {showCancel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCancel(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">¿Cancelar este CFDI?</h3>
                <p className="text-sm text-slate-500 mt-0.5">Esta acción se enviará al SAT. El receptor será notificado.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCancel(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm">Regresar</button>
              <button onClick={() => handleCancel(showCancel)}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modal Configuración ──────────────────────────────────────────────────────

function ModalConfig({ config, onClose, onSaved }: { config: CFDIConfig | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    rfc: config?.rfc ?? '',
    razonSocial: config?.razonSocial ?? '',
    codigoPostal: config?.codigoPostal ?? '44100',
    regimenFiscal: config?.regimenFiscal ?? '626',
    pacUser: config?.pacUser ?? '',
    pacPassword: '',
    pacSandbox: config?.pacSandbox ?? true,
    serieIngreso: config?.serieIngreso ?? 'A',
    serieGlobal: config?.serieGlobal ?? 'G',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleSave = async () => {
    if (!form.rfc || !form.razonSocial || !form.codigoPostal || !form.pacUser) {
      setError('RFC, Razón Social, CP y Usuario Facturama son requeridos');
      return;
    }
    if (!config && !form.pacPassword) {
      setError('La contraseña de Facturama es requerida la primera vez');
      return;
    }
    setSaving(true);
    setError('');
    const res = await fetch('/api/cfdi/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    }).then(r => r.json()).catch(() => ({ error: 'Error de red' }));
    setSaving(false);
    if (res.error) { setError(res.error); return; }
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Configuración Fiscal y PAC</h2>
            <p className="text-xs text-slate-500">Datos para emitir CFDIs con Facturama</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Datos fiscales */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Datos Fiscales del Emisor</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">RFC *</label>
                <input value={form.rfc} onChange={e => setForm(f => ({ ...f, rfc: e.target.value.toUpperCase() }))}
                  placeholder="FIEL123456789" maxLength={13}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Razón Social *</label>
                <input value={form.razonSocial} onChange={e => setForm(f => ({ ...f, razonSocial: e.target.value.toUpperCase() }))}
                  placeholder="JUAN PABLO FIERRO LEAL"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Código Postal Fiscal *</label>
                <input value={form.codigoPostal} onChange={e => setForm(f => ({ ...f, codigoPostal: e.target.value }))}
                  placeholder="44100" maxLength={5}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Régimen Fiscal</label>
                <select value={form.regimenFiscal} onChange={e => setForm(f => ({ ...f, regimenFiscal: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {REGIMENES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Credenciales Facturama */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Credenciales Facturama (PAC)</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Usuario Facturama *</label>
                <input value={form.pacUser} onChange={e => setForm(f => ({ ...f, pacUser: e.target.value }))}
                  placeholder="usuario@empresa.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Contraseña Facturama {config ? '(dejar vacío para no cambiar)' : '*'}
                </label>
                <input type="password" value={form.pacPassword} onChange={e => setForm(f => ({ ...f, pacPassword: e.target.value }))}
                  placeholder={config ? '••••••••' : 'Contraseña de tu cuenta Facturama'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Serie Facturas</label>
                  <input value={form.serieIngreso} onChange={e => setForm(f => ({ ...f, serieIngreso: e.target.value.toUpperCase() }))}
                    maxLength={5}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Serie Global</label>
                  <input value={form.serieGlobal} onChange={e => setForm(f => ({ ...f, serieGlobal: e.target.value.toUpperCase() }))}
                    maxLength={5}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.pacSandbox} onChange={e => setForm(f => ({ ...f, pacSandbox: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                <span className="text-xs text-slate-700">Modo Sandbox (pruebas) — desactivar en producción</span>
              </label>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200">
            <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              Regístrate en <strong>facturama.mx</strong> y sube tu CSD ahí. Las credenciales son las de tu cuenta Facturama, no de tu FIEL.
            </p>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
        </div>
        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-70 flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal CFDI Global ────────────────────────────────────────────────────────

function ModalGlobal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const prevYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const [mes,  setMes]  = useState(prevMonth);
  const [anio, setAnio] = useState(prevYear);
  const [preview, setPreview]   = useState<GlobalPreview | null>(null);
  const [montoManual, setMontoManual] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [emitting, setEmitting] = useState(false);
  const [result, setResult] = useState<{ ok?: boolean; error?: string; uuid?: string; folio?: string; total?: number } | null>(null);

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    const res = await fetch(`/api/cfdi/global?mes=${mes}&anio=${anio}`).then(r => r.json()).catch(() => null);
    setPreview(res);
    if (res?.totalRentas) setMontoManual(String(res.totalRentas));
    setLoadingPreview(false);
  }, [mes, anio]);

  useEffect(() => { loadPreview(); }, [loadPreview]);

  const handleEmitir = async () => {
    const monto = parseFloat(montoManual);
    if (!monto || monto <= 0) { alert('Ingresa un monto válido'); return; }
    setEmitting(true);
    const res = await fetch('/api/cfdi/global', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mes, anio, montoManual: monto }),
    }).then(r => r.json()).catch(() => ({ error: 'Error de red' }));
    setEmitting(false);
    setResult(res);
    if (res.ok) onCreated();
  };

  const monto = parseFloat(montoManual) || 0;
  const iva   = parseFloat((monto * 0.16).toFixed(2));
  const total = parseFloat((monto + iva).toFixed(2));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">CFDI Global Mensual</h2>
            <p className="text-xs text-slate-500">Factura a Público en General (XAXX010101000)</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        {result ? (
          <div className="p-6 text-center">
            {result.ok ? (
              <>
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="font-bold text-slate-900 text-lg">¡CFDI Timbrado!</p>
                <p className="text-sm text-slate-500 mt-1">UUID: <span className="font-mono text-xs">{result.uuid}</span></p>
                <p className="text-sm text-slate-500">Folio: {result.folio} · Total: ${Number(result.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                <button onClick={onClose} className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Cerrar</button>
              </>
            ) : (
              <>
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                <p className="font-bold text-slate-900">Error al timbrar</p>
                <p className="text-sm text-slate-500 mt-1 break-words">{result.error}</p>
                <button onClick={() => setResult(null)} className="mt-4 px-6 py-2.5 bg-slate-100 rounded-xl text-sm font-medium">Reintentar</button>
              </>
            )}
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Selector mes/año */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Mes</label>
                <select value={mes} onChange={e => setMes(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Año</label>
                <select value={anio} onChange={e => setAnio(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Preview rentas del mes */}
            {loadingPreview ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Calculando rentas del mes...
              </div>
            ) : preview && (
              <div className={`rounded-xl p-3 text-sm ${preview.existing?.status === 'timbrado' ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-200'}`}>
                {preview.existing?.status === 'timbrado' ? (
                  <div className="flex items-start gap-2 text-amber-700">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <p>Ya existe un CFDI Global timbrado para {preview.mesLabel} {anio}. <br />
                    Folio: {preview.existing.folio} · UUID: <span className="font-mono text-xs">{(preview.existing.uuidSat ?? '').slice(0, 8)}…</span></p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-slate-700">{preview.mesLabel} {anio}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {preview.cuentasPagadas} cuentas pagadas de {preview.cuentasTotal} — Rentas cobradas: <strong className="text-slate-700">${Number(preview.totalRentas).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Monto */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Monto base (sin IVA) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input type="number" step="0.01" value={montoManual} onChange={e => setMontoManual(e.target.value)}
                  placeholder="15000.00"
                  className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <p className="text-xs text-slate-400 mt-1">Auto-calculado desde rentas cobradas. Puedes editarlo.</p>
            </div>

            {/* Resumen */}
            {monto > 0 && (
              <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3 space-y-1 text-sm">
                <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>${monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between text-slate-600"><span>IVA 16%</span><span>${iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between font-bold text-slate-900 border-t border-indigo-200 pt-1"><span>Total CFDI</span><span>${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm">Cancelar</button>
              <button onClick={handleEmitir} disabled={emitting || monto <= 0}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-70 flex items-center justify-center gap-2">
                {emitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Timbrando...</> : 'Timbrar CFDI Global'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal Nueva Factura ──────────────────────────────────────────────────────

function ModalNuevaFactura({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    receptorRfc: '',
    receptorNombre: '',
    usoCfdi: 'G03',
    regimenFiscalReceptor: '605',
    codigoPostalReceptor: '',
    descripcion: 'Servicio de arrendamiento de vehículo',
    monto: '',
  });
  const [emitting, setEmitting] = useState(false);
  const [result, setResult] = useState<{ ok?: boolean; error?: string; uuid?: string; folio?: string } | null>(null);
  const [error, setError] = useState('');

  const monto    = parseFloat(form.monto) || 0;
  const iva      = parseFloat((monto * 0.16).toFixed(2));
  const total    = parseFloat((monto + iva).toFixed(2));

  const handleEmitir = async () => {
    if (!form.receptorRfc || !form.receptorNombre || !form.descripcion || monto <= 0 || !form.codigoPostalReceptor) {
      setError('Todos los campos son requeridos');
      return;
    }
    setError('');
    setEmitting(true);
    const res = await fetch('/api/cfdi/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receptorRfc: form.receptorRfc,
        receptorNombre: form.receptorNombre,
        usoCfdi: form.usoCfdi,
        regimenFiscalReceptor: form.regimenFiscalReceptor,
        codigoPostalReceptor: form.codigoPostalReceptor,
        items: [{ descripcion: form.descripcion, monto }],
      }),
    }).then(r => r.json()).catch(() => ({ error: 'Error de red' }));
    setEmitting(false);
    setResult(res);
    if (res.ok) onCreated();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Nueva Factura</h2>
            <p className="text-xs text-slate-500">CFDI de Ingreso con RFC del receptor</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        {result ? (
          <div className="p-6 text-center">
            {result.ok ? (
              <>
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="font-bold text-slate-900 text-lg">¡CFDI Timbrado!</p>
                <p className="text-sm text-slate-500 mt-1">Folio: {result.folio}</p>
                <p className="text-xs font-mono text-slate-400 mt-0.5 break-all">{result.uuid}</p>
                <button onClick={onClose} className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Cerrar</button>
              </>
            ) : (
              <>
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                <p className="font-bold text-slate-900">Error al timbrar</p>
                <p className="text-sm text-slate-500 mt-1 break-words">{result.error}</p>
                <button onClick={() => setResult(null)} className="mt-4 px-6 py-2.5 bg-slate-100 rounded-xl text-sm font-medium">Reintentar</button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Datos del Receptor</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">RFC Receptor *</label>
                    <input value={form.receptorRfc} onChange={e => setForm(f => ({ ...f, receptorRfc: e.target.value.toUpperCase() }))}
                      placeholder="VECJ880326XXX" maxLength={13}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">CP Fiscal *</label>
                    <input value={form.codigoPostalReceptor} onChange={e => setForm(f => ({ ...f, codigoPostalReceptor: e.target.value }))}
                      placeholder="44100" maxLength={5}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nombre / Razón Social *</label>
                  <input value={form.receptorNombre} onChange={e => setForm(f => ({ ...f, receptorNombre: e.target.value.toUpperCase() }))}
                    placeholder="JUAN PÉREZ GARCÍA"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Uso CFDI</label>
                    <select value={form.usoCfdi} onChange={e => setForm(f => ({ ...f, usoCfdi: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {USO_CFDI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Régimen Receptor</label>
                    <select value={form.regimenFiscalReceptor} onChange={e => setForm(f => ({ ...f, regimenFiscalReceptor: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="605">605 — Sueldos y Salarios</option>
                      <option value="606">606 — Arrendamiento</option>
                      <option value="612">612 — Actividades Empresariales</option>
                      <option value="626">626 — RESICO</option>
                      <option value="616">616 — Sin Obligaciones</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Concepto</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Descripción *</label>
                  <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Monto (sin IVA) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input type="number" step="0.01" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                      placeholder="1500.00"
                      className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
            </div>

            {monto > 0 && (
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 space-y-1 text-sm">
                <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>${monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between text-slate-600"><span>IVA 16%</span><span>${iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between font-bold text-slate-900 border-t border-blue-200 pt-1"><span>Total CFDI</span><span>${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
              </div>
            )}

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm">Cancelar</button>
              <button onClick={handleEmitir} disabled={emitting || monto <= 0}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-70 flex items-center justify-center gap-2">
                {emitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Timbrando...</> : 'Timbrar Factura'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function FacturacionPage() {
  const [tab, setTab] = useState<'suscripcion' | 'cfdi'>('cfdi');

  useEffect(() => { document.title = 'Facturación | Gestiona tu Flotilla'; }, []);

  return (
    <div>
      <Header breadcrumbs={[{ label: 'Facturación' }]} />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Facturación</h1>
          <p className="text-sm text-slate-500 mt-0.5">Emite CFDIs SAT y gestiona tu suscripción</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {[
            { key: 'cfdi',        label: 'CFDIs SAT',    icon: FileText },
            { key: 'suscripcion', label: 'Suscripción',  icon: CreditCard },
          ].map(t => {
            const Ic = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                <Ic className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'cfdi'        && <CFDITab />}
        {tab === 'suscripcion' && <SuscripcionTab />}
      </div>
    </div>
  );
}
