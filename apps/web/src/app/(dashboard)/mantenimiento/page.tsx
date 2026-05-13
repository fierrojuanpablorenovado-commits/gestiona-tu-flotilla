'use client';

import { Header } from '@/components/layout/Header';
import { FileUpload, UploadedFile } from '@/components/ui/FileUpload';
import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  X,
  Wrench,
  CalendarDays,
  AlertTriangle,
  DollarSign,
  Eye,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Trash2,
  CheckCircle2,
  Loader2,
  Gauge,
  Car,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MaintenanceRecord {
  id: string;
  orden: string;
  vehiculo: string;
  modelo: string;
  tipo: 'Preventivo' | 'Correctivo' | 'Urgente';
  descripcion: string;
  taller: string;
  fechaIngreso: string;
  fechaSalida: string | null;
  costoEstimado: number;
  costoReal: number | null;
  status: string;
  fotos?: number;
}

interface Part {
  id: string;
  nombre: string;
  cantidad: number;
  precio: number;
}


// Vehículos se cargan dinámicamente desde el API
interface VehicleOption { id: string; eco: string; label: string; }
const VEHICLES: string[] = [];
const VEHICLE_MODELS: Record<string, string> = {};

const CONDITION_CHECKS = [
  'Frenos delanteros ✅',
  'Frenos traseros ✅',
  'Llantas y presión ✅',
  'Aceite del motor ✅',
  'Refrigerante ✅',
  'Transmisión ✅',
  'Suspensión delantera ✅',
  'Suspensión trasera ✅',
  'Sistema eléctrico ✅',
  'Luces delanteras ✅',
  'Luces traseras ✅',
  'Carrocería ✅',
  'Vidrios y espejos ✅',
  'Aire acondicionado ✅',
];

// ─── Style maps ───────────────────────────────────────────────────────────────

const tipoConfig: Record<string, { bg: string; text: string; dot: string; emoji: string }> = {
  Preventivo: { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500',   emoji: '🔵' },
  Correctivo: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500', emoji: '🟠' },
  Urgente:    { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500',    emoji: '🔴' },
};

const statusColors: Record<string, string> = {
  'Programado':            'bg-slate-100  text-slate-600',
  'En diagnostico':        'bg-blue-50    text-blue-700',
  'En reparacion':         'bg-indigo-50  text-indigo-700',
  'Completado':            'bg-green-50   text-green-700',
  'Esperando refacciones': 'bg-amber-50   text-amber-700',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n: number) { return '$' + n.toLocaleString('es-MX'); }
function formatDate(s: string) { return new Date(s + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }); }

// ─── Nueva Orden Modal ────────────────────────────────────────────────────────

function NuevaOrdenModal({ onClose, onSave }: { onClose: () => void; onSave: (data: Partial<MaintenanceRecord>) => void }) {
  const [step, setStep] = useState(1);
  const [vehiculo, setVehiculo] = useState('');
  const [vehicleOptions, setVehicleOptions] = useState<VehicleOption[]>([]);
  const [tipo, setTipo] = useState<'Preventivo' | 'Correctivo' | 'Urgente'>('Correctivo');

  useEffect(() => {
    fetch('/api/vehicles')
      .then(r => r.json())
      .then(d => {
        const list: VehicleOption[] = (d.data ?? d ?? []).map((v: { id: string; eco: string; brand: string; model: string; year: number }) => ({
          id: v.id,
          eco: v.eco,
          label: `${v.eco} — ${v.brand} ${v.model} ${v.year ?? ''}`.trim(),
        }));
        setVehicleOptions(list);
      })
      .catch(() => {});
  }, []);
  const [descripcion, setDescripcion] = useState('');
  const [findings, setFindings] = useState('');
  const [taller, setTaller] = useState('');
  const [costoEstimado, setCostoEstimado] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().split('T')[0]);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [parts, setParts] = useState<Part[]>([]);
  const [newPart, setNewPart] = useState({ nombre: '', cantidad: '1', precio: '' });
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [saved, setSaved] = useState(false);

  const toggleCheck = (c: string) => setChecks(prev => ({ ...prev, [c]: !prev[c] }));
  const failedChecks = CONDITION_CHECKS.filter(c => checks[c] === false);

  const addPart = () => {
    if (!newPart.nombre || !newPart.precio) return;
    setParts(prev => [...prev, { id: Math.random().toString(36).slice(2), nombre: newPart.nombre, cantidad: Number(newPart.cantidad), precio: Number(newPart.precio) }]);
    setNewPart({ nombre: '', cantidad: '1', precio: '' });
  };
  const removePart = (id: string) => setParts(prev => prev.filter(p => p.id !== id));

  const totalParts = parts.reduce((s, p) => s + p.cantidad * p.precio, 0);

  const handleSave = () => {
    if (!vehiculo || !descripcion || !taller) return;
    onSave({
      vehiculo,
      modelo: vehicleOptions.find(v => v.eco === vehiculo)?.label.split(' — ')[1] ?? '',
      tipo,
      descripcion,
      taller,
      costoEstimado: Number(costoEstimado) || totalParts,
      fechaIngreso,
      fechaSalida: null,
      costoReal: null,
      status: 'En diagnostico',
    });
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1500);
  };

  const steps = ['Vehículo', 'Inspección', 'Refacciones', 'Archivos'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">🔧 Nueva Orden de Trabajo</h2>
            <p className="text-blue-200 text-xs mt-0.5">Paso {step} de {steps.length}: {steps[step - 1]}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex border-b border-slate-100 flex-shrink-0">
          {steps.map((s, i) => (
            <button
              key={s}
              onClick={() => i + 1 < step && setStep(i + 1)}
              className={`flex-1 py-3 text-xs font-semibold transition-colors ${i + 1 === step ? 'text-blue-600 border-b-2 border-blue-600' : i + 1 < step ? 'text-green-600' : 'text-slate-400'}`}
            >
              {i + 1 < step ? '✅' : `${i + 1}.`} {s}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {saved && (
            <div className="flex items-center justify-center gap-3 py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <div>
                <p className="text-lg font-bold text-slate-900">¡Orden creada!</p>
                <p className="text-sm text-slate-500">Se agregó al registro de mantenimiento</p>
              </div>
            </div>
          )}

          {!saved && step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="label">Vehículo *</label>
                <select className="input" value={vehiculo} onChange={e => setVehiculo(e.target.value)}>
                  <option value="">— Seleccionar vehículo —</option>
                  {vehicleOptions.map(v => (
                    <option key={v.id} value={v.eco}>{v.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Tipo de orden *</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['Preventivo', 'Correctivo', 'Urgente'] as const).map(t => {
                    const cfg = tipoConfig[t];
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTipo(t)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${tipo === t ? `${cfg.bg} border-current ${cfg.text} shadow-sm` : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                      >
                        <span className="text-2xl">{cfg.emoji}</span>
                        <span className="text-sm font-semibold">{t}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="label">Descripción del problema *</label>
                <textarea
                  rows={3}
                  className="input resize-none"
                  placeholder="Ej: El chofer reporta ruido al frenar y vibración en el volante..."
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Taller / Servicio *</label>
                  <input className="input" placeholder="Nombre del taller" value={taller} onChange={e => setTaller(e.target.value)} />
                </div>
                <div>
                  <label className="label">Fecha de ingreso</label>
                  <input type="date" className="input" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {!saved && step === 2 && (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold text-slate-800 mb-1">🔍 Lo que encontró el mecánico</p>
                <p className="text-xs text-slate-500 mb-3">Describe detalladamente las condiciones y hallazgos del vehículo.</p>
                <textarea
                  rows={4}
                  className="input resize-none"
                  placeholder="Ej: Al revisar los frenos delanteros se encontró el disco con ranuras profundas y las balatas con menos del 10% de vida útil. La mordaza derecha presenta fuga de líquido..."
                  value={findings}
                  onChange={e => setFindings(e.target.value)}
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800 mb-3">📋 Checklist de condición del vehículo</p>
                <div className="grid grid-cols-2 gap-2">
                  {CONDITION_CHECKS.map(c => {
                    const state = checks[c]; // undefined = no revisado, true = OK, false = falla
                    return (
                      <div key={c} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${state === true ? 'bg-green-50 border-green-200' : state === false ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setChecks(prev => ({ ...prev, [c]: true }))} className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs transition-colors ${state === true ? 'bg-green-500 text-white' : 'bg-white border border-slate-200 text-slate-400 hover:bg-green-50'}`}>✓</button>
                          <button type="button" onClick={() => setChecks(prev => ({ ...prev, [c]: false }))} className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs transition-colors ${state === false ? 'bg-red-500 text-white' : 'bg-white border border-slate-200 text-slate-400 hover:bg-red-50'}`}>✗</button>
                        </div>
                        <span className="text-xs text-slate-700 flex-1 truncate">{c.replace(' ✅', '')}</span>
                      </div>
                    );
                  })}
                </div>
                {failedChecks.length > 0 && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-xs font-semibold text-red-700 mb-1">⚠️ Fallas detectadas ({failedChecks.length}):</p>
                    {failedChecks.map(c => <p key={c} className="text-xs text-red-600">• {c.replace(' ✅', '')}</p>)}
                  </div>
                )}
              </div>

              <div>
                <label className="label">Costo estimado total</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">$</span>
                  <input type="number" className="input pl-7" placeholder="0.00" value={costoEstimado} onChange={e => setCostoEstimado(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {!saved && step === 3 && (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold text-slate-800 mb-3">🔩 Refacciones y materiales</p>

                {/* Add part */}
                <div className="flex gap-2 mb-3">
                  <input className="input flex-1" placeholder="Nombre de la refacción" value={newPart.nombre} onChange={e => setNewPart(p => ({ ...p, nombre: e.target.value }))} />
                  <input type="number" className="input w-20" placeholder="Cant." value={newPart.cantidad} onChange={e => setNewPart(p => ({ ...p, cantidad: e.target.value }))} />
                  <input type="number" className="input w-28" placeholder="Precio" value={newPart.precio} onChange={e => setNewPart(p => ({ ...p, precio: e.target.value }))} />
                  <button type="button" onClick={addPart} className="btn-primary px-3 flex-shrink-0">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Parts list */}
                {parts.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <span className="text-3xl">🔩</span>
                    <p className="text-sm mt-2">Sin refacciones agregadas</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {parts.map(p => (
                      <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">{p.nombre}</p>
                          <p className="text-xs text-slate-500">{p.cantidad} × {formatCurrency(p.precio)}</p>
                        </div>
                        <p className="text-sm font-bold text-slate-900">{formatCurrency(p.cantidad * p.precio)}</p>
                        <button type="button" onClick={() => removePart(p.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
                      <p className="text-sm font-semibold text-blue-800">Total refacciones</p>
                      <p className="text-base font-black text-blue-900">{formatCurrency(totalParts)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!saved && step === 4 && (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold text-slate-800 mb-1">📸 Fotos del daño</p>
                <p className="text-xs text-slate-500 mb-3">Toma fotos de las fallas, piezas dañadas o condición general del vehículo.</p>
                <FileUpload
                  label="Subir fotos del vehículo"
                  sublabel="JPG, PNG, HEIC • Máx 10 fotos"
                  accept="image/*"
                  maxFiles={10}
                  onFilesChange={(f) => setFiles(prev => {
                    const existing = prev.filter(x => x.type !== 'image');
                    return [...existing, ...f];
                  })}
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800 mb-1">📄 Facturas y documentos</p>
                <p className="text-xs text-slate-500 mb-3">Adjunta cotizaciones, facturas del taller o cualquier documento relacionado.</p>
                <FileUpload
                  label="Subir facturas / PDF"
                  sublabel="PDF • Máx 5 documentos"
                  accept="application/pdf"
                  maxFiles={5}
                  onFilesChange={(f) => setFiles(prev => {
                    const existing = prev.filter(x => x.type !== 'pdf');
                    return [...existing, ...f];
                  })}
                />
              </div>

              {files.length > 0 && (
                <div className="p-3 rounded-xl bg-green-50 border border-green-200">
                  <p className="text-sm font-semibold text-green-800">
                    ✅ {files.length} archivo{files.length !== 1 ? 's' : ''} adjunto{files.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">Se guardarán con la orden de trabajo.</p>
                </div>
              )}

              {/* Summary */}
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Resumen de la orden</p>
                {[
                  ['Vehículo', vehiculo ? `${vehiculo} — ${VEHICLE_MODELS[vehiculo]}` : '—'],
                  ['Tipo', tipo],
                  ['Problema', descripcion || '—'],
                  ['Taller', taller || '—'],
                  ['Costo estimado', costoEstimado ? formatCurrency(Number(costoEstimado)) : totalParts > 0 ? formatCurrency(totalParts) : '—'],
                  ['Refacciones', `${parts.length} ítem${parts.length !== 1 ? 's' : ''}`],
                  ['Archivos', `${files.length} adjunto${files.length !== 1 ? 's' : ''}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-semibold text-slate-800 text-right max-w-[60%] truncate">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!saved && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
            <button
              onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
              className="btn-secondary"
            >
              {step > 1 ? '← Anterior' : 'Cancelar'}
            </button>

            {step < 4 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={step === 1 && (!vehiculo || !descripcion || !taller)}
                className="btn-primary disabled:opacity-50"
              >
                Siguiente →
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={!vehiculo || !descripcion || !taller}
                className="btn-primary disabled:opacity-50"
              >
                ✅ Guardar Orden
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Detalle Modal ────────────────────────────────────────────────────────────

function DetalleModal({ record, onClose }: { record: MaintenanceRecord; onClose: () => void }) {
  const cfg = tipoConfig[record.tipo];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className={`px-6 py-5 ${cfg.bg} border-b border-slate-100`}>
          <div className="flex items-start justify-between">
            <div>
              <span className={`text-xs font-bold uppercase tracking-wider ${cfg.text}`}>{cfg.emoji} {record.tipo}</span>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">{record.orden}</h3>
              <p className="text-sm text-slate-600 mt-1">{record.descripcion}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/50 text-slate-500 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              ['🚗 Vehículo', record.vehiculo],
              ['📐 Modelo', record.modelo],
              ['🏭 Taller', record.taller],
              ['📅 Ingreso', formatDate(record.fechaIngreso)],
              ['📤 Salida', record.fechaSalida ? formatDate(record.fechaSalida) : 'En proceso'],
              ['💰 Estimado', formatCurrency(record.costoEstimado)],
              ['✅ Real', record.costoReal ? formatCurrency(record.costoReal) : '—'],
              ['📸 Fotos', `${record.fotos || 0} adjunto${(record.fotos || 0) !== 1 ? 's' : ''}`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] text-slate-500 font-medium">{k}</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{v}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
            <span className="text-sm text-slate-600">Estado</span>
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${statusColors[record.status] || 'bg-slate-100 text-slate-600'}`}>
              {record.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── KM Alerts Tab ───────────────────────────────────────────────────────────

interface KmAlertItem {
  vehicleId: string; vehicleEco: string; vehiclePlates: string
  vehicleBrand: string; vehicleModel: string; driver: string
  kmActual: number; purchasePrice: number; jpParticipation: number
  mostUrgent: { key: string; label: string; nextKm: number; kmRemaining: number; urgency: string } | null
  alerts: { key: string; label: string; interval: number; nextKm: number; kmRemaining: number; urgency: string }[]
}

const URGENCY_CONFIG = {
  overdue:  { bg: 'bg-red-50',    border: 'border-red-300',   dot: 'bg-red-500',    text: 'text-red-700',   badge: 'VENCIDO',      badgeBg: 'bg-red-600 text-white' },
  danger:   { bg: 'bg-orange-50', border: 'border-orange-300',dot: 'bg-orange-500', text: 'text-orange-700',badge: 'MUY PRONTO',   badgeBg: 'bg-orange-500 text-white' },
  warning:  { bg: 'bg-yellow-50', border: 'border-yellow-200',dot: 'bg-yellow-400', text: 'text-yellow-700',badge: 'PRÓXIMO',      badgeBg: 'bg-yellow-400 text-yellow-900' },
  ok:       { bg: 'bg-white',     border: 'border-gray-100',  dot: 'bg-green-500',  text: 'text-green-700', badge: '',             badgeBg: '' },
}

function KmAlertsTab() {
  const [data, setData]       = useState<KmAlertItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/maintenance/km-alerts')
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-7 w-7 text-blue-500 animate-spin" />
    </div>
  )

  const urgent  = data.filter(v => v.mostUrgent?.urgency === 'overdue' || v.mostUrgent?.urgency === 'danger')
  const warning = data.filter(v => v.mostUrgent?.urgency === 'warning')
  const ok      = data.filter(v => !v.mostUrgent)

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-center">
          <p className="text-3xl font-black text-red-600">{urgent.length}</p>
          <p className="text-xs text-red-500 mt-1 font-semibold">⚠️ Urgentes / vencidos</p>
        </div>
        <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-4 text-center">
          <p className="text-3xl font-black text-yellow-600">{warning.length}</p>
          <p className="text-xs text-yellow-600 mt-1 font-semibold">📅 Próximos (0-2,000 km)</p>
        </div>
        <div className="rounded-2xl bg-green-50 border border-green-200 p-4 text-center">
          <p className="text-3xl font-black text-green-600">{ok.length}</p>
          <p className="text-xs text-green-600 mt-1 font-semibold">✅ Al corriente</p>
        </div>
      </div>

      {/* Vehículos ordenados por urgencia */}
      <div className="space-y-3">
        {data.map((v) => {
          const urgentAlerts = v.alerts.filter(a => a.urgency !== 'ok')
          const topAlert     = v.alerts[0]
          const cfg          = URGENCY_CONFIG[topAlert?.urgency as keyof typeof URGENCY_CONFIG] ?? URGENCY_CONFIG.ok

          return (
            <div key={v.vehicleId} className={`rounded-2xl border p-4 ${cfg.bg} ${cfg.border}`}>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-gray-100 flex-shrink-0">
                  <Car className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-gray-900">{v.vehicleEco}</p>
                    <span className="text-xs text-gray-400">{v.vehicleBrand} {v.vehicleModel} · {v.vehiclePlates}</span>
                    {urgentAlerts.length > 0 && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badgeBg}`}>
                        {urgentAlerts.length} alerta{urgentAlerts.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Gauge className="w-3 h-3" />
                      {v.kmActual.toLocaleString()} km actuales
                    </span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">{v.driver}</span>
                  </div>

                  {/* Alertas de km */}
                  {urgentAlerts.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {urgentAlerts.map(a => {
                        const ac = URGENCY_CONFIG[a.urgency as keyof typeof URGENCY_CONFIG]
                        return (
                          <div key={a.key} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${ac.bg} ${ac.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${ac.dot}`} />
                            <span className="text-xs font-semibold text-gray-800">{a.label}</span>
                            <span className={`text-xs ${ac.text}`}>
                              {a.kmRemaining <= 0
                                ? `${Math.abs(a.kmRemaining).toLocaleString()} km vencido`
                                : `${a.kmRemaining.toLocaleString()} km restantes → ${a.nextKm.toLocaleString()} km`}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="mt-1.5 text-xs text-green-600 font-medium">
                      ✅ Próximo: {topAlert?.label} en {topAlert?.kmRemaining.toLocaleString()} km ({topAlert?.nextKm.toLocaleString()} km)
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {data.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Gauge className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay vehículos con km registrados</p>
            <p className="text-xs mt-1">Actualiza el km de cada vehículo para ver alertas</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MantenimientoPage() {
  const [activeTab, setActiveTab]       = useState<'ordenes' | 'km'>('ordenes');
  const [searchQuery, setSearchQuery]   = useState('');
  const [tipoFilter, setTipoFilter]     = useState('all');
  const [page, setPage]                 = useState(1);
  const [showModal, setShowModal]       = useState(false);
  const [detalle, setDetalle]           = useState<MaintenanceRecord | null>(null);
  const [records, setRecords]           = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading]           = useState(true);
  const perPage = 10;

  function fetchData() {
    setLoading(true);
    fetch('/api/maintenance')
      .then(r => r.json())
      .then(json => {
        // Map API fields to component fields
        const mapped = (json.data || []).map((r: any) => ({
          id: r.id,
          orden: r.orden || r.id.slice(0, 8).toUpperCase(),
          vehiculo: r.vehiculo || r.eco || '—',
          modelo: r.modelo ? `${r.marca || ''} ${r.modelo} ${r.anio || ''}`.trim() : '—',
          tipo: r.tipo as MaintenanceRecord['tipo'],
          descripcion: r.descripcion || '',
          taller: r.taller || '',
          fechaIngreso: r.fechaIngreso || r.fecha_ingreso,
          fechaSalida: r.fechaSalida || r.fecha_salida || null,
          costoEstimado: Number(r.costoEstimado || r.costo_estimado || 0),
          costoReal: r.costoReal != null ? Number(r.costoReal) : (r.costo_real != null ? Number(r.costo_real) : null),
          status: r.status,
          fotos: r.fotos || 0,
        }));
        setRecords(mapped);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, []);

  useEffect(() => { document.title = 'Mantenimiento | Gestiona tu Flotilla'; }, []);

  const filtered = records.filter((m) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || m.orden.toLowerCase().includes(q) || m.vehiculo.toLowerCase().includes(q) || m.descripcion.toLowerCase().includes(q) || m.taller.toLowerCase().includes(q);
    const matchesTipo   = tipoFilter === 'all' || m.tipo === tipoFilter;
    return matchesSearch && matchesTipo;
  });

  const totalPages   = Math.ceil(filtered.length / perPage);
  const paginatedData = filtered.slice((page - 1) * perPage, page * perPage);

  const enTaller   = records.filter(m => ['En reparacion', 'En diagnostico', 'Esperando refacciones'].includes(m.status)).length;
  const programados = records.filter(m => m.status === 'Programado').length;
  const urgentes    = records.filter(m => m.tipo === 'Urgente').length;
  const gastoMes    = records.filter(m => m.costoReal !== null).reduce((s, m) => s + (m.costoReal || 0), 0);

  const handleSaveOrder = async (data: Partial<MaintenanceRecord>) => {
    try {
      await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eco: data.vehiculo,
          tipo: data.tipo || 'Correctivo',
          descripcion: data.descripcion,
          taller: data.taller,
          fechaIngreso: data.fechaIngreso || new Date().toISOString().split('T')[0],
          costoEstimado: data.costoEstimado || 0,
          status: 'En diagnostico',
        }),
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      {showModal && <NuevaOrdenModal onClose={() => setShowModal(false)} onSave={handleSaveOrder} />}
      {detalle && <DetalleModal record={detalle} onClose={() => setDetalle(null)} />}

      <Header
        breadcrumbs={[{ label: '🔧 Mantenimiento' }]}
        actions={
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" />
            Nueva Orden
          </button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
          {[
            { key: 'ordenes', label: '🔧 Órdenes de Trabajo' },
            { key: 'km',      label: '📊 Alertas por Km' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as 'ordenes' | 'km')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'km' && <KmAlertsTab />}
        {activeTab === 'ordenes' && <>
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 p-5 shadow-lg relative overflow-hidden">
            <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/10" />
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/20">
                <Wrench className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-3xl font-black text-white">{enTaller}</p>
                <p className="text-xs text-orange-100">🏭 En taller</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 p-5 shadow-lg relative overflow-hidden">
            <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/10" />
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/20">
                <CalendarDays className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-3xl font-black text-white">{programados}</p>
                <p className="text-xs text-blue-100">📅 Programados</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-red-500 to-red-700 p-5 shadow-lg relative overflow-hidden">
            <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/10" />
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/20">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-3xl font-black text-white">{urgentes}</p>
                <p className="text-xs text-red-100">🔴 Urgentes</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-green-500 to-emerald-700 p-5 shadow-lg relative overflow-hidden">
            <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/10" />
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/20">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">{formatCurrency(gastoMes)}</p>
                <p className="text-xs text-green-100">💰 Gasto mes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-slate-100">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 flex-1 max-w-md focus-within:border-blue-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-500 transition-all">
              <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Buscar por orden, vehículo, descripción..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
              {[
                { key: 'all',       label: 'Todos',        emoji: '📋' },
                { key: 'Preventivo', label: 'Preventivos', emoji: '🔵' },
                { key: 'Correctivo', label: 'Correctivos', emoji: '🟠' },
                { key: 'Urgente',    label: 'Urgentes',    emoji: '🔴' },
              ].map(({ key, label, emoji }) => (
                <button
                  key={key}
                  onClick={() => { setTipoFilter(key); setPage(1); }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${tipoFilter === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {emoji} {label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {['# Orden', 'Vehículo', 'Tipo', 'Descripción', 'Taller', 'Ingreso', 'Salida', 'Estimado', 'Real', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading && (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
                    </td>
                  </tr>
                )}
                {!loading && paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-slate-400 text-sm">
                      Sin órdenes de mantenimiento registradas
                    </td>
                  </tr>
                )}
                {!loading && paginatedData.map((record) => {
                  const cfg = tipoConfig[record.tipo];
                  return (
                    <tr key={record.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-mono font-bold text-blue-600">{record.orden}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-mono font-bold text-slate-900">{record.vehiculo}</p>
                        <p className="text-xs text-slate-400">{record.modelo}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          {record.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600 max-w-[200px]">
                        <p className="truncate">{record.descripcion}</p>
                        {(record.fotos || 0) > 0 && (
                          <span className="text-[10px] text-blue-500 font-medium">📸 {record.fotos} fotos</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600 max-w-[160px] truncate">{record.taller}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-600 whitespace-nowrap">{formatDate(record.fechaIngreso)}</td>
                      <td className="px-4 py-3.5 text-sm whitespace-nowrap">
                        {record.fechaSalida ? (
                          <span className="text-slate-600">{formatDate(record.fechaSalida)}</span>
                        ) : (
                          <span className="text-amber-600 font-semibold">En proceso</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-700 font-mono">{formatCurrency(record.costoEstimado)}</td>
                      <td className="px-4 py-3.5">
                        {record.costoReal !== null ? (
                          <span className={`text-sm font-bold font-mono ${record.costoReal > record.costoEstimado ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(record.costoReal)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${statusColors[record.status] || 'bg-slate-100 text-slate-600'}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => setDetalle(record)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              {filtered.length} orden{filtered.length !== 1 ? 'es' : ''} · {records.filter(r => r.status !== 'Completado').length} activas
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost px-2 py-1.5 disabled:opacity-50">
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`h-8 w-8 rounded-xl text-sm font-semibold transition-colors ${p === page ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost px-2 py-1.5 disabled:opacity-50">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        </>}
      </div>
    </div>
  );
}
