'use client';

import { useAuth } from '@/context/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import {
  Wrench, AlertTriangle, CheckCircle2, Clock, ChevronRight, X, Plus,
  Trash2, Loader2, ArrowRight, DollarSign, Gauge, ClipboardList,
  CheckSquare, Square, Car, CalendarDays, BarChart3, RefreshCw,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface WorkOrder {
  id: string; orden: string; vehiculo: string; modelo: string; plates: string;
  tipo: 'Preventivo' | 'Correctivo' | 'Urgente';
  descripcion: string; chofer: string; taller: string;
  fechaIngreso: string; fechaSalida?: string | null;
  costoEstimado: number; costoReal?: number | null;
  status: OTStatus; notas: string;
}
type OTStatus = 'Asignada' | 'En diagnostico' | 'En reparacion' | 'Esperando refacciones' | 'Completado';

interface KmAlert {
  id: string; eco: string; plates: string; driver: string;
  kmActual: number;
  mostUrgent: { key: string; label: string; kmRemaining: number; nextKm: number; urgency: string } | null;
  alerts: { key: string; label: string; kmRemaining: number; nextKm: number; urgency: string }[];
}

interface Part { id: string; nombre: string; cantidad: number; precio: number; }

// ─── Constantes ───────────────────────────────────────────────────────────────
const STATUS_FLOW: OTStatus[] = ['Asignada','En diagnostico','En reparacion','Esperando refacciones','Completado'];
const STATUS_STYLE: Record<OTStatus, string> = {
  'Asignada':              'bg-slate-100 text-slate-700 border-slate-200',
  'En diagnostico':        'bg-yellow-50 text-yellow-700 border-yellow-200',
  'En reparacion':         'bg-blue-50 text-blue-700 border-blue-200',
  'Esperando refacciones': 'bg-orange-50 text-orange-700 border-orange-200',
  'Completado':            'bg-green-50 text-green-700 border-green-200',
};
const STATUS_DOT: Record<OTStatus, string> = {
  'Asignada': 'bg-slate-400', 'En diagnostico': 'bg-yellow-400',
  'En reparacion': 'bg-blue-500', 'Esperando refacciones': 'bg-orange-400', 'Completado': 'bg-green-500',
};
const TIPO_STYLE = {
  Urgente:    'bg-red-100 text-red-700 border-red-200',
  Correctivo: 'bg-orange-100 text-orange-700 border-orange-200',
  Preventivo: 'bg-blue-100 text-blue-700 border-blue-200',
};
const URGENCY_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  overdue: { bg: 'bg-red-50 border-red-200',    text: 'text-red-700',    dot: 'bg-red-500',    label: 'Vencido'  },
  danger:  { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', dot: 'bg-orange-400', label: '< 500 km' },
  warning: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700', dot: 'bg-yellow-400', label: '< 2,000 km' },
  ok:      { bg: 'bg-green-50 border-green-200',  text: 'text-green-700',  dot: 'bg-green-400',  label: 'Al día'   },
};
const CONDITION_CHECKS = [
  'Frenos delanteros','Frenos traseros','Aceite de motor','Líquido de frenos',
  'Refrigerante','Batería','Llantas (presión y desgaste)','Luces delanteras',
  'Luces traseras','Dirección','Suspensión delantera','Suspensión trasera',
  'Correa de distribución','Filtro de aire',
];

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtPeso(n: number) {
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 0 });
}

// ─── Modal detalle OT ─────────────────────────────────────────────────────────
function DetalleModal({ order, onClose, onSaved }: {
  order: WorkOrder; onClose: () => void;
  onSaved: (id: string, update: Partial<WorkOrder>) => void;
}) {
  const [tab, setTab] = useState<'diagnostico' | 'partes'>('diagnostico');
  const [notas, setNotas] = useState(order.notas ?? '');
  const [costoReal, setCostoReal] = useState(order.costoReal ? String(order.costoReal) : '');
  const [parts, setParts] = useState<Part[]>([]);
  const [newPart, setNewPart] = useState({ nombre: '', cantidad: '1', precio: '' });
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1] as OTStatus | undefined;
  const totalParts = parts.reduce((s, p) => s + p.cantidad * p.precio, 0);

  const addPart = () => {
    if (!newPart.nombre || !newPart.precio) return;
    setParts(prev => [...prev, { id: Date.now().toString(), nombre: newPart.nombre, cantidad: parseInt(newPart.cantidad)||1, precio: parseFloat(newPart.precio)||0 }]);
    setNewPart({ nombre: '', cantidad: '1', precio: '' });
  };

  const persist = async (update: Partial<WorkOrder>) => {
    await fetch('/api/maintenance', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: order.id, ...update }),
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const costoFinal = costoReal ? parseFloat(costoReal) : undefined;
    const notasChecks = Object.keys(checks).filter(k => checks[k]).length > 0
      ? `[Checklist: ${Object.keys(checks).filter(k => checks[k]).join(', ')}]\n` + notas
      : notas;
    await persist({ notas: notasChecks, costoReal: costoFinal });
    onSaved(order.id, { notas: notasChecks, costoReal: costoFinal });
    setSaving(false); setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1000);
  };

  const handleAdvance = async () => {
    if (!nextStatus) return;
    setSaving(true);
    await persist({ status: nextStatus });
    onSaved(order.id, { status: nextStatus });
    setSaving(false); onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${TIPO_STYLE[order.tipo]}`}>{order.tipo}</span>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${STATUS_STYLE[order.status]}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[order.status]}`}/>{order.status}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">{order.orden}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{order.vehiculo} {order.modelo} · {order.chofer}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="h-5 w-5 text-slate-400"/></button>
        </div>

        {/* Info rápida */}
        <div className="grid grid-cols-3 gap-3 px-5 pt-4">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
            <p className="text-xs text-slate-500">Est.</p>
            <p className="text-base font-bold text-slate-800">{fmtPeso(order.costoEstimado)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
            <p className="text-xs text-slate-500">Real</p>
            <p className="text-base font-bold text-slate-800">{order.costoReal ? fmtPeso(order.costoReal) : '—'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
            <p className="text-xs text-slate-500">Ingreso</p>
            <p className="text-base font-bold text-slate-800">{order.fechaIngreso ? fmtDate(order.fechaIngreso) : '—'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-5 mt-4">
          {(['diagnostico','partes'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab===t?'border-blue-600 text-blue-600':'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t === 'diagnostico' ? '🔍 Diagnóstico' : '🔩 Refacciones'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {tab === 'diagnostico' && (
            <>
              <div>
                <label className="label">Notas de diagnóstico</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3}
                  placeholder="Describe lo encontrado..." className="input resize-none"/>
              </div>
              <div>
                <p className="label mb-2">Checklist de condición</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {CONDITION_CHECKS.map(item => (
                    <button key={item} type="button" onClick={() => setChecks(p => ({ ...p, [item]: !p[item] }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs text-left transition-all ${checks[item]?'bg-green-50 border-green-200 text-green-700':'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                      {checks[item] ? <CheckSquare className="h-3.5 w-3.5 flex-shrink-0 text-green-600"/> : <Square className="h-3.5 w-3.5 flex-shrink-0 text-slate-400"/>}
                      {item}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">{Object.values(checks).filter(Boolean).length}/{CONDITION_CHECKS.length} revisados</p>
              </div>
              <div>
                <label className="label">Costo real (MXN)</label>
                <input type="number" value={costoReal} onChange={e => setCostoReal(e.target.value)}
                  placeholder={`Estimado: ${fmtPeso(order.costoEstimado)}`} className="input"/>
              </div>
            </>
          )}

          {tab === 'partes' && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <input type="text" value={newPart.nombre} onChange={e => setNewPart(p => ({...p,nombre:e.target.value}))}
                  placeholder="Nombre de la refacción" className="input col-span-3 sm:col-span-1"/>
                <input type="number" value={newPart.cantidad} onChange={e => setNewPart(p => ({...p,cantidad:e.target.value}))}
                  placeholder="Cant." min="1" className="input"/>
                <div className="flex gap-2">
                  <input type="number" value={newPart.precio} onChange={e => setNewPart(p => ({...p,precio:e.target.value}))}
                    placeholder="Precio" className="input flex-1"/>
                  <button type="button" onClick={addPart}
                    className="h-10 w-10 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex-shrink-0">
                    <Plus className="h-4 w-4"/>
                  </button>
                </div>
              </div>
              {parts.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Wrench className="h-8 w-8 mx-auto mb-2 opacity-40"/>
                  <p className="text-sm">Sin refacciones agregadas</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {parts.map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{p.nombre}</p>
                        <p className="text-xs text-slate-500">{p.cantidad} × {fmtPeso(p.precio)} = <span className="font-semibold">{fmtPeso(p.cantidad*p.precio)}</span></p>
                      </div>
                      <button onClick={() => setParts(prev => prev.filter(x => x.id !== p.id))} className="p-1.5 hover:bg-red-50 rounded-lg">
                        <Trash2 className="h-4 w-4 text-red-400"/>
                      </button>
                    </div>
                  ))}
                  <div className="flex justify-between items-center p-3 rounded-xl bg-blue-50 border border-blue-200">
                    <span className="text-sm font-bold text-blue-800">Total refacciones</span>
                    <span className="text-lg font-black text-blue-700">{fmtPeso(totalParts)}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 flex items-center gap-3">
          {saved ? (
            <div className="flex-1 flex items-center gap-2 text-green-600 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4"/> ¡Guardado!
            </div>
          ) : (
            <>
              <button onClick={onClose} className="btn-secondary">Cerrar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin"/> Guardando...</> : '💾 Guardar'}
              </button>
              {nextStatus && (
                <button onClick={handleAdvance} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold">
                  <ArrowRight className="h-4 w-4"/> {nextStatus}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MecanicoPage() {
  const { user } = useAuth();
  const [orders, setOrders]       = useState<WorkOrder[]>([]);
  const [kmAlerts, setKmAlerts]   = useState<KmAlert[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<WorkOrder | null>(null);
  const [filter, setFilter]       = useState<OTStatus | 'todas'>('todas');
  const [summary, setSummary]     = useState({ total:0, enProceso:0, completado:0, costoTotal:0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, kmRes] = await Promise.all([
        fetch('/api/maintenance'),
        fetch('/api/maintenance/km-alerts'),
      ]);
      const mJson  = await mRes.json();
      const kmJson = await kmRes.json();

      const mapped: WorkOrder[] = (mJson.data || []).map((r: any) => ({
        id:            String(r.id),
        orden:         r.orden || `MNT-${String(r.id).slice(0,6)}`,
        vehiculo:      r.vehiculo || r.eco || '—',
        modelo:        r.modelo || '—',
        plates:        r.plates || '—',
        tipo:          (['Preventivo','Correctivo','Urgente'] as const).includes(r.tipo) ? r.tipo : 'Correctivo',
        descripcion:   r.descripcion || '',
        chofer:        r.chofer || '—',
        taller:        r.taller || '',
        fechaIngreso:  r.fechaIngreso || '',
        fechaSalida:   r.fechaSalida ?? null,
        costoEstimado: Number(r.costoEstimado ?? 0),
        costoReal:     r.costoReal != null ? Number(r.costoReal) : null,
        status:        (['Asignada','En diagnostico','En reparacion','Esperando refacciones','Completado'] as const).includes(r.status) ? r.status : 'En diagnostico',
        notas:         r.notas || '',
      }));

      setOrders(mapped);
      setSummary(mJson.summary || { total:0, enProceso:0, completado:0, costoTotal:0 });
      setKmAlerts(Array.isArray(kmJson) ? kmJson : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (id: string, update: Partial<WorkOrder>) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...update } : o));
    setSelected(null);
  };

  // Cálculos
  const activas    = orders.filter(o => o.status !== 'Completado');
  const urgentes   = orders.filter(o => o.tipo === 'Urgente' && o.status !== 'Completado');
  const completadas = orders.filter(o => o.status === 'Completado');
  const costoMes   = orders.reduce((s, o) => s + (o.costoReal ?? o.costoEstimado ?? 0), 0);

  // Km alerts — solo los que necesitan atención (overdue + danger + warning)
  const alertasKm = kmAlerts
    .filter(v => v.mostUrgent && v.mostUrgent.urgency !== 'ok')
    .sort((a, b) => {
      const order = { overdue:0, danger:1, warning:2 };
      const au = (order as any)[a.mostUrgent?.urgency ?? 'warning'] ?? 3;
      const bu = (order as any)[b.mostUrgent?.urgency ?? 'warning'] ?? 3;
      return au - bu;
    });

  const filtered = filter === 'todas'
    ? activas
    : orders.filter(o => o.status === filter);

  return (
    <div className="p-4 md:p-6 pb-20 space-y-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Portal Mecánico</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {user ? `${user.firstName} ${user.lastName}` : 'Mecánico'} · {user?.company ?? 'Al Volante GDL'}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/> Actualizar
        </button>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'OTs activas',      value: activas.length,     icon: ClipboardList, color: 'text-blue-600',   bg: 'bg-blue-50',   sub: `${urgentes.length} urgentes` },
          { label: 'En proceso',       value: summary.enProceso,  icon: Clock,         color: 'text-orange-600', bg: 'bg-orange-50', sub: 'diagnóstico + reparación' },
          { label: 'Completadas',      value: completadas.length, icon: CheckCircle2,  color: 'text-green-600',  bg: 'bg-green-50',  sub: 'en total' },
          { label: 'Costo acumulado',  value: fmtPeso(costoMes),  icon: DollarSign,    color: 'text-slate-700',  bg: 'bg-slate-50',  sub: 'real + estimado' },
        ].map(({ label, value, icon: Icon, color, bg, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${bg} mb-2`}>
              <Icon className={`w-4 h-4 ${color}`}/>
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs font-semibold text-slate-600 mt-0.5">{label}</p>
            <p className="text-xs text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Alertas de Km ── */}
      {!loading && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Gauge className="w-4 h-4 text-slate-500"/>
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Mantenimiento por Km</h2>
            {alertasKm.filter(v => v.mostUrgent?.urgency === 'overdue').length > 0 && (
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {alertasKm.filter(v => v.mostUrgent?.urgency === 'overdue').length} vencidos
              </span>
            )}
          </div>

          {alertasKm.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0"/>
              <p className="text-sm text-green-700 font-medium">Toda la flota al día en mantenimiento por km</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {alertasKm.map(v => {
                const u = v.mostUrgent!;
                const s = URGENCY_STYLE[u.urgency] ?? URGENCY_STYLE.warning;
                return (
                  <div key={v.id} className={`rounded-xl border p-4 ${s.bg}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`}/>
                          <span className="font-bold text-slate-900">{v.eco}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.bg} ${s.text}`}>{s.label}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{v.plates} · {v.driver !== 'null null' ? v.driver : 'Sin chofer'}</p>
                      </div>
                      <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                        <Gauge className="w-3 h-3"/>{v.kmActual.toLocaleString()} km
                      </span>
                    </div>

                    {/* Servicio más urgente */}
                    <div className={`rounded-lg px-3 py-2 border ${s.bg} border-current/20 mb-2`}>
                      <p className={`text-xs font-bold ${s.text}`}>{u.label}</p>
                      <p className={`text-xs ${s.text}`}>
                        {u.kmRemaining <= 0
                          ? `⚠️ Vencido hace ${Math.abs(u.kmRemaining).toLocaleString()} km`
                          : `Faltan ${u.kmRemaining.toLocaleString()} km → ${u.nextKm.toLocaleString()} km`}
                      </p>
                    </div>

                    {/* Otros servicios próximos */}
                    {v.alerts.filter(a => a.urgency !== 'ok' && a.key !== v.mostUrgent?.key).slice(0,2).map(a => (
                      <p key={a.key} className="text-[11px] text-slate-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0"/>
                        {a.label}: {a.kmRemaining <= 0 ? `vencido ${Math.abs(a.kmRemaining).toLocaleString()} km` : `en ${a.kmRemaining.toLocaleString()} km`}
                      </p>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Órdenes de trabajo ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Wrench className="w-4 h-4 text-slate-500"/>
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Órdenes de Trabajo</h2>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(['todas','Asignada','En diagnostico','En reparacion','Esperando refacciones','Completado'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                filter === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}>
              {f === 'todas' ? `Todas activas (${activas.length})` : f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-600"/></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
            <ClipboardList className="h-10 w-10 mx-auto mb-2 text-slate-300"/>
            <p className="text-slate-500 font-medium text-sm">Sin órdenes en esta categoría</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered
              .sort((a,b) => { const p={Urgente:0,Correctivo:1,Preventivo:2}; return p[a.tipo]-p[b.tipo]; })
              .map(order => (
                <div key={order.id} onClick={() => setSelected(order)}
                  className={`bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group ${order.tipo==='Urgente'?'border-red-200 bg-red-50/20':'border-slate-200'}`}>

                  {/* Top */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${order.tipo==='Urgente'?'bg-red-100':'bg-slate-100'}`}>
                      <Wrench className={`h-4 w-4 ${order.tipo==='Urgente'?'text-red-600':'text-slate-600'}`}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-1.5 flex-wrap mb-0.5">
                        <span className="text-[10px] font-mono font-bold text-slate-400">{order.orden}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${TIPO_STYLE[order.tipo]}`}>{order.tipo}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 truncate">{order.descripcion || 'Sin descripción'}</p>
                      <p className="text-xs text-slate-500">{order.vehiculo} · {order.modelo}</p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLE[order.status]}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[order.status]}`}/>{order.status}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <CalendarDays className="w-3 h-3"/>{order.fechaIngreso ? fmtDate(order.fechaIngreso) : '—'}
                    </span>
                  </div>

                  {/* Chofer + costo */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="truncate">{order.chofer}</span>
                    <span className="font-semibold text-slate-700 flex items-center gap-1 flex-shrink-0 ml-2">
                      <DollarSign className="w-3 h-3"/>{fmtPeso(order.costoReal ?? order.costoEstimado)}
                    </span>
                  </div>

                  {order.notas && (
                    <p className="mt-2 text-[11px] text-yellow-700 bg-yellow-50 border border-yellow-100 rounded-lg px-2.5 py-1.5 line-clamp-1">
                      📝 {order.notas}
                    </p>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ── Completadas (colapsable) ── */}
      {completadas.length > 0 && filter === 'todas' && (
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500"/> Completadas ({completadas.length})
          </h3>
          <div className="space-y-2">
            {completadas.slice(0,5).map(o => (
              <div key={o.id} onClick={() => setSelected(o)}
                className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-100 cursor-pointer hover:bg-green-100 transition-colors">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{o.orden} — {o.descripcion}</p>
                  <p className="text-xs text-slate-500">{o.vehiculo} · {o.chofer}</p>
                </div>
                <span className="text-xs font-semibold text-slate-600 flex-shrink-0">{fmtPeso(o.costoReal ?? o.costoEstimado)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {selected && (
        <DetalleModal order={selected} onClose={() => setSelected(null)} onSaved={handleSaved}/>
      )}
    </div>
  );
}
