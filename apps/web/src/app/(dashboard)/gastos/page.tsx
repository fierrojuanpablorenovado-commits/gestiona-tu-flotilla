'use client';

import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import {
  TrendingDown, Plus, X, Loader2, Receipt, Car, Fuel,
  Wrench, Shield, AlertTriangle, HelpCircle, Pencil, Trash2,
  Sparkles, Upload, CheckCircle2, Download,
} from 'lucide-react';
import { exportToCsv } from '@/lib/exportCsv';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Gasto {
  id: string;
  vehicleId: string | null;
  eco: string | null;
  plates: string | null;
  brand: string | null;
  model: string | null;
  categoria: string;
  descripcion: string | null;
  monto: number;
  fecha: string;
  reciboUrl: string | null;
  notas: string | null;
}

interface Resumen {
  total_mes: number;
  combustible: number;
  mantenimiento: number;
  seguro: number;
  refaccion: number;
  multa: number;
  otro: number;
}

interface Vehicle {
  id: string;
  eco: string;
  plates: string;
  brand: string;
  model: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

function fmtDate(d: string) {
  try {
    const [y, m, day] = d.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return d; }
}

const CATEGORIAS = [
  { id: 'combustible',   label: 'Combustible',   icon: Fuel,          color: 'text-amber-600  bg-amber-50  border-amber-200' },
  { id: 'mantenimiento', label: 'Mantenimiento',  icon: Wrench,        color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { id: 'seguro',        label: 'Seguro',         icon: Shield,        color: 'text-blue-600   bg-blue-50   border-blue-200' },
  { id: 'refaccion',     label: 'Refacción',      icon: Car,           color: 'text-red-600    bg-red-50    border-red-200' },
  { id: 'multa',         label: 'Multa',          icon: AlertTriangle, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { id: 'otro',          label: 'Otro',           icon: HelpCircle,    color: 'text-slate-600  bg-slate-50  border-slate-200' },
];

function getCat(id: string) {
  return CATEGORIAS.find(c => c.id === id) ?? CATEGORIAS[CATEGORIAS.length - 1];
}

// ── Form defaults ──────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  vehicleId: '',
  categoria: 'combustible',
  descripcion: '',
  monto: '',
  fecha: today(),
  notas: '',
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function GastosPage() {
  const [gastos, setGastos]         = useState<Gasto[]>([]);
  const [resumen, setResumen]       = useState<Resumen | null>(null);
  const [vehicles, setVehicles]     = useState<Vehicle[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [saving, setSaving]         = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractMsg, setExtractMsg] = useState('');
  const [filterCat, setFilterCat]   = useState('');
  const [filterVeh, setFilterVeh]   = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Load
  useEffect(() => {
    loadData();
    loadVehicles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCat) params.set('categoria', filterCat);
      if (filterVeh) params.set('vehicleId', filterVeh);
      const res = await fetch(`/api/gastos?${params}`);
      const data = await res.json();
      setGastos(Array.isArray(data.rows) ? data.rows : []);
      setResumen(data.resumen ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function loadVehicles() {
    try {
      const res = await fetch('/api/vehicles');
      const data = await res.json();
      setVehicles(Array.isArray(data) ? data : []);
    } catch { /* silencioso */ }
  }

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCat, filterVeh]);

  function openNew() {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setExtractMsg('');
    setShowForm(true);
  }

  function openEdit(g: Gasto) {
    setEditId(g.id);
    setForm({
      vehicleId:   g.vehicleId ?? '',
      categoria:   g.categoria,
      descripcion: g.descripcion ?? '',
      monto:       String(g.monto),
      fecha:       g.fecha.slice(0, 10),
      notas:       g.notas ?? '',
    });
    setExtractMsg('');
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.monto || !form.fecha) return;
    setSaving(true);
    try {
      const payload = {
        vehicleId:   form.vehicleId || null,
        categoria:   form.categoria,
        descripcion: form.descripcion || null,
        monto:       parseFloat(form.monto),
        fecha:       form.fecha,
        notas:       form.notas || null,
      };

      const url = editId ? `/api/gastos?id=${editId}` : '/api/gastos';
      const method = editId ? 'PATCH' : 'POST';
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setShowForm(false);
      setEditId(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este gasto?')) return;
    await fetch(`/api/gastos?id=${id}`, { method: 'DELETE' });
    await loadData();
  }

  // AI receipt extraction
  async function handleRecibo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    setExtractMsg('Analizando recibo con IA...');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/analyze-receipt', { method: 'POST', body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json();
      // Rellena campos si AI extrajo datos
      if (data.monto)      setForm(f => ({ ...f, monto: String(data.monto) }));
      if (data.fecha)      setForm(f => ({ ...f, fecha: data.fecha }));
      if (data.categoria)  setForm(f => ({ ...f, categoria: data.categoria }));
      if (data.descripcion) setForm(f => ({ ...f, descripcion: data.descripcion }));
      setExtractMsg('✅ Recibo analizado — revisa los datos');
    } catch {
      setExtractMsg('No se pudo extraer datos del recibo');
    } finally {
      setExtracting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <Header
        breadcrumbs={[{ label: 'Gastos y Egresos' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportToCsv(`gastos-${new Date().toISOString().slice(0,10)}`, gastos.map(g => ({
                Fecha: g.fecha,
                Vehiculo: g.eco ?? 'General',
                Categoria: g.categoria,
                Descripcion: g.descripcion ?? '',
                Monto: g.monto,
                Notas: g.notas ?? '',
              })))}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button
              onClick={openNew}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nuevo Gasto
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-4 space-y-4">

        {/* ── KPI Cards ─────────────────────────────────────────────────── */}
        {resumen && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {CATEGORIAS.map(cat => {
              const val = (resumen as unknown as Record<string, number>)[cat.id] ?? 0;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setFilterCat(filterCat === cat.id ? '' : cat.id)}
                  className={`rounded-xl border p-3 text-left transition-all hover:shadow-sm ${
                    filterCat === cat.id
                      ? 'ring-2 ring-blue-500 bg-white shadow'
                      : 'bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border mb-2 ${cat.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-[11px] font-medium text-slate-500">{cat.label}</p>
                  <p className="text-sm font-bold text-slate-800">{fmt(val)}</p>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Total + filtros ────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Total gastos mostrados</p>
              <p className="text-lg font-bold text-slate-800">{fmt(totalGastos)}</p>
            </div>
          </div>

          {/* Filtro vehículo */}
          <select
            value={filterVeh}
            onChange={e => setFilterVeh(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Todos los vehículos</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>ECO {v.eco} — {v.brand} {v.model}</option>
            ))}
          </select>

          {/* Reset filtros */}
          {(filterCat || filterVeh) && (
            <button
              onClick={() => { setFilterCat(''); setFilterVeh(''); }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Quitar filtros
            </button>
          )}
        </div>

        {/* ── Tabla de gastos ────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Registro de gastos</h2>
            <span className="text-xs text-slate-400">{gastos.length} registros</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
            </div>
          ) : gastos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Receipt className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-500">Sin gastos registrados</p>
              <p className="text-xs text-slate-400 mt-1">Agrega tu primer gasto para empezar a ver tu rentabilidad real</p>
              <button onClick={openNew} className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium">
                + Registrar gasto
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-2">Fecha</th>
                    <th className="px-4 py-2">Categoría</th>
                    <th className="px-4 py-2">Vehículo</th>
                    <th className="px-4 py-2">Descripción</th>
                    <th className="px-4 py-2 text-right">Monto</th>
                    <th className="px-4 py-2 w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gastos.map(g => {
                    const cat = getCat(g.categoria);
                    const Icon = cat.icon;
                    return (
                      <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{fmtDate(g.fecha)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${cat.color}`}>
                            <Icon className="h-3 w-3" />
                            {cat.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                          {g.eco ? `ECO ${g.eco}` : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 max-w-[200px] truncate">
                          {g.descripcion || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-red-600 whitespace-nowrap">
                          {fmt(g.monto)}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => openEdit(g)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(g.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal nuevo/editar gasto ──────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">
                {editId ? 'Editar gasto' : 'Nuevo gasto'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">

              {/* AI Receipt scanner */}
              <div className="rounded-xl bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-600" />
                    <span className="text-sm font-medium text-violet-800">Escanear recibo con IA</span>
                  </div>
                  {extracting && <Loader2 className="h-4 w-4 text-violet-600 animate-spin" />}
                  {!extracting && extractMsg && (
                    extractMsg.startsWith('✅')
                      ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                      : null
                  )}
                </div>
                {extractMsg && !extracting && (
                  <p className="text-xs text-violet-700 mb-2">{extractMsg}</p>
                )}
                <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={handleRecibo} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={extracting}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border-2 border-dashed border-violet-300 text-sm text-violet-600 hover:border-violet-400 hover:bg-violet-50 transition-colors disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" />
                  {extracting ? 'Analizando...' : 'Subir foto / PDF del recibo'}
                </button>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Categoría</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIAS.map(cat => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, categoria: cat.id }))}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                          form.categoria === cat.id
                            ? `${cat.color} ring-2 ring-offset-1 ring-blue-400`
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Monto */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Monto (MXN)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.monto}
                    onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                {/* Fecha */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              {/* Vehículo */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Vehículo (opcional)</label>
                <select
                  value={form.vehicleId}
                  onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">Sin vehículo específico</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>ECO {v.eco} — {v.brand} {v.model} ({v.plates})</option>
                  ))}
                </select>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
                <input
                  type="text"
                  placeholder="Ej: Carga de gasolina, aceite 5W30, etc."
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notas (opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Notas adicionales..."
                  value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.monto || !form.fecha}
                className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editId ? 'Guardar cambios' : 'Registrar gasto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
