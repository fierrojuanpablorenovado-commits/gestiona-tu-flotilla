'use client';

import { Header } from '@/components/layout/Header';
import { FileUpload, UploadedFile } from '@/components/ui/FileUpload';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import {
  Wrench,
  Car,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  X,
  Plus,
  Trash2,
  Camera,
  ClipboardList,
  TrendingUp,
  CheckSquare,
  Square,
  Loader2,
  ArrowRight,
  CalendarDays,
  DollarSign,
  FileText,
  Zap,
  BarChart3,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkOrder {
  id: string;
  orden: string;
  vehiculo: string;
  modelo: string;
  tipo: 'Preventivo' | 'Correctivo' | 'Urgente';
  descripcion: string;
  cliente: string;
  taller?: string;
  fechaIngreso: string;
  fechaSalida?: string | null;
  costoEstimado: number;
  costoReal?: number | null;
  status: WorkOrderStatus;
  prioridad: 'alta' | 'media' | 'baja';
  notas?: string;
}

type WorkOrderStatus =
  | 'Asignada'
  | 'En diagnostico'
  | 'En reparacion'
  | 'Esperando refacciones'
  | 'Completado';

interface Part {
  id: string;
  nombre: string;
  cantidad: number;
  precio: number;
}

// ─── Mock data removed — data is fetched from API ─────────────────────────────

const CONDITION_CHECKS = [
  'Frenos delanteros',
  'Frenos traseros',
  'Aceite de motor',
  'Líquido de frenos',
  'Refrigerante',
  'Batería',
  'Llantas (presión y desgaste)',
  'Luces delanteras',
  'Luces traseras',
  'Dirección',
  'Suspensión delantera',
  'Suspensión trasera',
  'Correa de distribución',
  'Filtro de aire',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_FLOW: WorkOrderStatus[] = [
  'Asignada',
  'En diagnostico',
  'En reparacion',
  'Esperando refacciones',
  'Completado',
];

const STATUS_COLORS: Record<WorkOrderStatus, string> = {
  'Asignada':              'bg-slate-100 text-slate-700 border-slate-200',
  'En diagnostico':        'bg-yellow-50 text-yellow-700 border-yellow-200',
  'En reparacion':         'bg-blue-50 text-blue-700 border-blue-200',
  'Esperando refacciones': 'bg-orange-50 text-orange-700 border-orange-200',
  'Completado':            'bg-green-50 text-green-700 border-green-200',
};

const STATUS_DOT: Record<WorkOrderStatus, string> = {
  'Asignada':              'bg-slate-400',
  'En diagnostico':        'bg-yellow-400',
  'En reparacion':         'bg-blue-500',
  'Esperando refacciones': 'bg-orange-400',
  'Completado':            'bg-green-500',
};

const TIPO_COLORS = {
  Urgente:    'bg-red-100 text-red-700 border-red-200',
  Correctivo: 'bg-orange-100 text-orange-700 border-orange-200',
  Preventivo: 'bg-blue-100 text-blue-700 border-blue-200',
};

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Detail Modal ──────────────────────────────────────────────────────────────

function DetalleModal({
  order,
  onClose,
  onSave,
}: {
  order: WorkOrder;
  onClose: () => void;
  onSave: (id: string, update: Partial<WorkOrder> & { costoReal?: number; parts?: Part[]; checks?: Record<string, boolean>; fotos?: UploadedFile[] }) => void;
}) {
  const [tab, setTab] = useState<'diagnostico' | 'partes' | 'fotos'>('diagnostico');
  const [notas, setNotas] = useState(order.notas ?? '');
  const [costoReal, setCostoReal] = useState('');
  const [parts, setParts] = useState<Part[]>([]);
  const [newPart, setNewPart] = useState({ nombre: '', cantidad: '1', precio: '' });
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [fotos, setFotos] = useState<UploadedFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1] as WorkOrderStatus | undefined;

  const addPart = () => {
    if (!newPart.nombre || !newPart.precio) return;
    setParts(prev => [...prev, {
      id: Date.now().toString(),
      nombre: newPart.nombre,
      cantidad: parseInt(newPart.cantidad) || 1,
      precio: parseFloat(newPart.precio) || 0,
    }]);
    setNewPart({ nombre: '', cantidad: '1', precio: '' });
  };

  const totalParts = parts.reduce((s, p) => s + p.cantidad * p.precio, 0);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    onSave(order.id, { notas, costoReal: costoReal ? parseFloat(costoReal) : undefined, parts, checks, fotos });
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  };

  const handleAdvanceStatus = async () => {
    if (!nextStatus) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    onSave(order.id, { status: nextStatus, notas });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${TIPO_COLORS[order.tipo]}`}>{order.tipo}</span>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${STATUS_DOT[order.status]}`} />
                {order.status}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">{order.orden}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{order.vehiculo} · {order.modelo} · {order.cliente}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-5">
          {(['diagnostico', 'partes', 'fotos'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              {t === 'diagnostico' ? '🔍 Diagnóstico' : t === 'partes' ? '🔩 Refacciones' : '📷 Fotos'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {tab === 'diagnostico' && (
            <>
              <div>
                <label className="label">Notas de diagnóstico</label>
                <textarea
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  rows={4}
                  placeholder="Describe lo que encontraste en el vehículo..."
                  className="input resize-none"
                />
              </div>

              <div>
                <p className="label mb-2">Checklist de condición del vehículo</p>
                <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {CONDITION_CHECKS.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setChecks(prev => ({ ...prev, [item]: !prev[item] }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs text-left transition-all ${checks[item] ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    >
                      {checks[item]
                        ? <CheckSquare className="h-3.5 w-3.5 flex-shrink-0 text-green-600" />
                        : <Square className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />}
                      {item}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {Object.values(checks).filter(Boolean).length}/{CONDITION_CHECKS.length} revisados
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Costo real (MXN)</label>
                  <input
                    type="number"
                    value={costoReal}
                    onChange={e => setCostoReal(e.target.value)}
                    placeholder={`Est. $${order.costoEstimado.toLocaleString()}`}
                    className="input"
                  />
                </div>
                <div className="flex items-end">
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 w-full">
                    <p className="text-xs text-slate-500">Costo estimado</p>
                    <p className="text-lg font-bold text-slate-800">${order.costoEstimado.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === 'partes' && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newPart.nombre}
                  onChange={e => setNewPart(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Nombre de la refacción"
                  className="input col-span-3 sm:col-span-1"
                />
                <input
                  type="number"
                  value={newPart.cantidad}
                  onChange={e => setNewPart(p => ({ ...p, cantidad: e.target.value }))}
                  placeholder="Cant."
                  min="1"
                  className="input"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newPart.precio}
                    onChange={e => setNewPart(p => ({ ...p, precio: e.target.value }))}
                    placeholder="Precio"
                    className="input flex-1"
                  />
                  <button
                    type="button"
                    onClick={addPart}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex-shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {parts.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Wrench className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Sin refacciones agregadas</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {parts.map(part => (
                    <div key={part.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{part.nombre}</p>
                        <p className="text-xs text-slate-500">{part.cantidad} × ${part.precio.toLocaleString()} = <span className="font-semibold text-slate-700">${(part.cantidad * part.precio).toLocaleString()}</span></p>
                      </div>
                      <button onClick={() => setParts(prev => prev.filter(p => p.id !== part.id))} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-200">
                    <span className="text-sm font-bold text-blue-800">Total refacciones</span>
                    <span className="text-lg font-black text-blue-700">${totalParts.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'fotos' && (
            <FileUpload
              label="Fotos del vehículo"
              sublabel="Sube fotos del diagnóstico, daños o reparación • Máx 10"
              maxFiles={10}
              onFilesChange={setFotos}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 flex items-center gap-3">
          {saved ? (
            <div className="flex-1 flex items-center gap-2 text-green-600 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4" /> ¡Guardado correctamente!
            </div>
          ) : (
            <>
              <button onClick={onClose} className="btn-secondary flex-1">Cerrar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : '💾 Guardar cambios'}
              </button>
              {nextStatus && (
                <button
                  onClick={handleAdvanceStatus}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  → {nextStatus}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Order Card ────────────────────────────────────────────────────────────────

function OrderCard({ order, onClick }: { order: WorkOrder; onClick: () => void }) {
  const isUrgent = order.tipo === 'Urgente';
  const isWaiting = order.status === 'Esperando refacciones';

  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 group ${isUrgent ? 'border-red-200 bg-red-50/30 hover:border-red-300' : 'border-slate-200 bg-white hover:border-blue-200'}`}
    >
      {isUrgent && (
        <div className="absolute top-3 right-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 ring-2 ring-white">
            <Zap className="h-3 w-3 text-white" />
          </span>
        </div>
      )}

      <div className="flex items-start gap-3 mb-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 ${isUrgent ? 'bg-red-100' : 'bg-blue-100'}`}>
          <Wrench className={`h-5 w-5 ${isUrgent ? 'text-red-600' : 'text-blue-600'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-slate-500">{order.orden}</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${TIPO_COLORS[order.tipo]}`}>{order.tipo}</span>
          </div>
          <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">{order.descripcion}</p>
          <p className="text-xs text-slate-500 mt-0.5">{order.vehiculo} · {order.modelo}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[order.status]}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[order.status]}`} />
            {order.status}
          </span>
          {isWaiting && (
            <span className="text-[11px] text-orange-600 font-medium animate-pulse">Esperando piezas...</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDate(order.fechaIngreso)}
        </div>
      </div>

      {order.notas && (
        <div className="mt-3 p-2.5 rounded-lg bg-yellow-50 border border-yellow-100">
          <p className="text-[11px] text-yellow-800 line-clamp-2">📝 {order.notas}</p>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          <DollarSign className="h-3.5 w-3.5 inline" /> Est. ${order.costoEstimado.toLocaleString()}
        </span>
        <span className="text-xs font-semibold text-blue-600 group-hover:underline flex items-center gap-1">
          Ver detalles <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MecanicoPortalPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WorkOrder | null>(null);
  const [filter, setFilter] = useState<WorkOrderStatus | 'todas'>('todas');

  useEffect(() => {
    fetch('/api/maintenance')
      .then(r => r.json())
      .then(json => setOrders((json.data || []).map((r: any) => {
        const tipo: WorkOrder['tipo'] = (['Preventivo','Correctivo','Urgente'] as const).includes(r.tipo)
          ? r.tipo : 'Correctivo';
        const urgencia = tipo === 'Urgente' ? 'alta' : tipo === 'Correctivo' ? 'media' : 'baja';
        return {
          id:            String(r.id),
          orden:         r.orden || `MNT-${String(r.id).padStart(4,'0')}`,
          vehiculo:      r.vehiculo || r.eco || '—',
          modelo:        r.modelo   || '—',
          tipo,
          descripcion:   r.descripcion || '',
          cliente:       r.chofer  || '—',
          taller:        r.taller  || '—',
          fechaIngreso:  r.fechaIngreso || '',
          fechaSalida:   r.fechaSalida  || null,
          costoEstimado: Number(r.costoEstimado ?? 0),
          costoReal:     r.costoReal != null ? Number(r.costoReal) : null,
          status:        (['Asignada','En diagnostico','En reparacion','Esperando refacciones','Completado'] as const).includes(r.status)
            ? r.status : 'En diagnostico',
          prioridad:     urgencia,
          notas:         r.notas || '',
        };
      })))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = (id: string, update: Partial<WorkOrder>) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...update } : o));
    setSelected(null);
  };

  const activas = orders.filter(o => o.status !== 'Completado');
  const completadas = orders.filter(o => o.status === 'Completado');
  const urgentes = orders.filter(o => o.tipo === 'Urgente' && o.status !== 'Completado');
  const enProceso = orders.filter(o => ['En diagnostico', 'En reparacion'].includes(o.status));

  const filtered = filter === 'todas'
    ? orders.filter(o => o.status !== 'Completado')
    : orders.filter(o => o.status === filter);

  const stats = [
    { label: 'OTs activas',     value: activas.length,     icon: ClipboardList, color: 'from-blue-500 to-blue-700',       sub: `${enProceso.length} en proceso` },
    { label: 'Urgentes',        value: urgentes.length,     icon: AlertTriangle,  color: 'from-red-500 to-red-700',         sub: urgentes.length > 0 ? 'Requieren atención' : 'Sin urgentes' },
    { label: 'Completadas',     value: completadas.length,  icon: CheckCircle2,  color: 'from-green-500 to-emerald-600',   sub: 'Este mes' },
    { label: 'Eficiencia',      value: '94%',               icon: TrendingUp,    color: 'from-purple-500 to-purple-700',   sub: 'Tasa de cierre a tiempo' },
  ];

  return (
    <div>
      <Header breadcrumbs={[{ label: 'Órdenes de Servicio Mecánico' }]} />

      <div className="p-6 space-y-6">

        {/* Welcome banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 via-slate-700 to-blue-900 p-6 shadow-lg">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          <div className="relative flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 flex-shrink-0 ring-2 ring-white/20">
              <Wrench className="h-9 w-9 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-300 text-sm font-medium">🔧 Portal del Mecánico</p>
              <h1 className="text-2xl font-black text-white mt-0.5">
                {user ? `${user.firstName} ${user.lastName}` : 'Miguel Torres'}
              </h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <Wrench className="h-3 w-3" /> Mecánico Senior
                </span>
                <span className="inline-flex items-center gap-1.5 bg-green-500/20 border border-green-400/30 text-green-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> Turno activo
                </span>
                <span className="text-slate-400 text-sm">· Al Volante GDL</span>
              </div>
            </div>
            <div className="hidden lg:grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-white/10 px-4 py-2.5">
                <p className="text-2xl font-black text-white">{activas.length}</p>
                <p className="text-slate-300 text-xs mt-0.5">OTs activas</p>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-2.5">
                <p className="text-2xl font-black text-yellow-300">{urgentes.length}</p>
                <p className="text-slate-300 text-xs mt-0.5">Urgentes</p>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, color, sub }) => (
            <div key={label} className={`rounded-2xl bg-gradient-to-br ${color} p-5 shadow-lg relative overflow-hidden`}>
              <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
              <Icon className="h-5 w-5 text-white/70 mb-2" />
              <p className="text-2xl font-black text-white">{value}</p>
              <p className="text-white/80 text-xs font-semibold mt-0.5">{label}</p>
              <p className="text-white/50 text-[11px] mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['todas', 'Asignada', 'En diagnostico', 'En reparacion', 'Esperando refacciones'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {f === 'todas' ? `Todas (${activas.length})` : f}
            </button>
          ))}
        </div>

        {/* Orders grid */}
        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto my-8" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-600">Sin órdenes de mantenimiento asignadas</p>
            <p className="text-sm mt-1">Las órdenes asignadas a este mecánico aparecerán aquí.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-400" />
            <p className="font-semibold text-slate-600">Sin órdenes en esta categoría</p>
            <p className="text-sm mt-1">¡Excelente trabajo!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered
              .sort((a, b) => {
                const priority = { Urgente: 0, Correctivo: 1, Preventivo: 2 };
                return priority[a.tipo] - priority[b.tipo];
              })
              .map(order => (
                <OrderCard key={order.id} order={order} onClick={() => setSelected(order)} />
              ))}
          </div>
        )}

        {/* Completed section */}
        {completadas.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> Completadas este turno ({completadas.length})
            </h3>
            <div className="space-y-2">
              {completadas.map(order => (
                <div key={order.id} className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-100">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{order.orden} — {order.descripcion}</p>
                    <p className="text-xs text-slate-500">{order.vehiculo} · {order.modelo}</p>
                  </div>
                  <span className="text-xs font-mono text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{order.tipo}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rendimiento real: calculado desde las órdenes cargadas */}
        {orders.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" /> 📊 Resumen de Órdenes
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'OTs activas',      value: String(activas.length),     icon: ClipboardList, color: 'text-blue-600 bg-blue-50' },
                { label: 'Urgentes',         value: String(urgentes.length),    icon: AlertTriangle, color: urgentes.length > 0 ? 'text-red-600 bg-red-50' : 'text-slate-500 bg-slate-50' },
                { label: 'Completadas',      value: String(completadas.length), icon: CheckCircle2,  color: 'text-green-600 bg-green-50' },
                { label: 'En proceso',       value: String(enProceso.length),   icon: Clock,         color: 'text-purple-600 bg-purple-50' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-center">
                  <div className={`h-9 w-9 rounded-lg ${color} flex items-center justify-center mx-auto mb-2`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-black text-slate-900">{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <DetalleModal
          order={selected}
          onClose={() => setSelected(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
