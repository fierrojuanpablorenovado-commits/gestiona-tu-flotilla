'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import {
  Plus, Search, FileWarning, CheckCircle2, Clock, AlertCircle,
  DollarSign, Pencil, Trash2, X, ChevronDown, Car, RefreshCw, ExternalLink,
  Paperclip, Loader2, FileText, Archive,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Infraccion {
  id: string;
  fecha: string;
  tipo: string;
  folio?: string | null;
  descripcion?: string | null;
  monto: number;
  pagada: boolean;
  responsable: string;
  cargoChofer: boolean;
  cargoMonto: number;
  notas?: string | null;
  createdAt: string;
  vehicleId?: string | null;
  driverId?: string | null;
  fuente?: string | null;
  fotoUrl?: string | null;
  ssimId?: string | null;
  archivoUrl?: string | null;
  eco?: string | null;
  plates?: string | null;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  driverName?: string | null;
}

interface VehicleOption {
  id: string;
  eco: string;
  plates: string;
  brand?: string | null;
  model?: string | null;
}

interface Summary {
  total: number;
  pendientes: number;
  pagadas: number;
  montoTotal: number;
  montoCargoChofer: number;
}

const TIPOS = [
  'Fotomulta',
  'Alcoholímetro',
  'Infracción vial',
  'Verificación',
  'Estacionamiento',
  'Velocidad',
  'Semáforo',
  'Uso de carril',
  'Documentación',
  'Otro',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  '$' + Math.abs(n).toLocaleString('es-MX', { minimumFractionDigits: 0 });

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  // Tomar solo la parte de fecha (YYYY-MM-DD) para evitar problemas de zona horaria
  const dateOnly = String(d).substring(0, 10);
  const dt = new Date(dateOnly + 'T12:00:00');
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

const emptyForm = {
  vehicleId: '',
  driverId: '',
  fecha: new Date().toISOString().split('T')[0],
  tipo: 'Infracción vial',
  folio: '',
  descripcion: '',
  monto: '',
  responsable: 'chofer',
  cargoChofer: true,
  cargoMonto: '',
  notas: '',
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function InfraccionesPage() {
  const [infracciones, setInfracciones] = useState<Infraccion[]>([]);
  const [summary, setSummary]           = useState<Summary | null>(null);
  const [vehicles, setVehicles]         = useState<VehicleOption[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [uploadingFile, setUploadingFile]     = useState(false);
  const [formArchivoUrl, setFormArchivoUrl]   = useState<string | null>(null);
  const [uploadingRowId, setUploadingRowId]   = useState<string | null>(null);
  const [pendingUploadId, setPendingUploadId] = useState<string | null>(null);
  const rowFileInputRef = useRef<HTMLInputElement>(null);
  const [syncing, setSyncing]                 = useState(false);
  const [syncResult, setSyncResult]           = useState<{
    nuevas: number;
    consultados: number;
    detalle?: Array<{ placa: string; nuevas: number; total: number; error?: string }>;
    aviso?: string;
  } | null>(null);
  const [syncingJalisco, setSyncingJalisco]   = useState(false);
  const [syncJaliscoResult, setSyncJaliscoResult] = useState<{
    nuevas: number;
    consultados: number;
    detalle?: Array<{ placa: string; eco: string; nuevas: number; total: number; error?: string }>;
    aviso?: string;
  } | null>(null);

  // Filtros
  const [search, setSearch]       = useState('');
  const [filterPagada, setFilter] = useState<'all' | 'pendiente' | 'pagada'>('all');

  // Modal
  const [showModal, setShowModal]   = useState(false);
  const [editItem, setEditItem]     = useState<Infraccion | null>(null);
  const [form, setForm]             = useState({ ...emptyForm });

  useEffect(() => { document.title = 'Infracciones | Gestiona tu Flotilla'; }, []);

  // Cargar vehículos para el selector del form
  useEffect(() => {
    fetch('/api/vehicles')
      .then(r => r.json())
      .then(j => {
        const arr = Array.isArray(j) ? j : (j.data ?? []);
        setVehicles(arr.map((v: VehicleOption) => ({
          id: v.id, eco: v.eco, plates: v.plates, brand: v.brand, model: v.model,
        })));
      })
      .catch(() => {});
  }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterPagada !== 'all') params.set('pagada', filterPagada === 'pagada' ? 'true' : 'false');
    if (search) params.set('search', search);

    fetch(`/api/infracciones?${params}`)
      .then(r => r.json())
      .then(j => {
        setInfracciones(j.data ?? []);
        setSummary(j.summary ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filterPagada, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Abrir modal ──────────────────────────────────────────────────────────────
  function openCreate() {
    setEditItem(null);
    setForm({ ...emptyForm });
    setFormArchivoUrl(null);
    setShowModal(true);
  }

  function openEdit(item: Infraccion) {
    setFormArchivoUrl(item.archivoUrl ?? null);
    setEditItem(item);
    setForm({
      vehicleId:   item.vehicleId  ?? '',
      driverId:    item.driverId   ?? '',
      fecha:       item.fecha,
      tipo:        item.tipo,
      folio:       item.folio      ?? '',
      descripcion: item.descripcion ?? '',
      monto:       String(item.monto),
      responsable: item.responsable,
      cargoChofer: item.cargoChofer,
      cargoMonto:  String(item.cargoMonto),
      notas:       item.notas ?? '',
    });
    setShowModal(true);
  }

  // ── Guardar ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.fecha || !form.monto) { alert('Fecha y monto son requeridos'); return; }
    setSaving(true);
    try {
      const payload = {
        vehicleId:   form.vehicleId   || null,
        driverId:    form.driverId    || null,
        fecha:       form.fecha,
        tipo:        form.tipo,
        folio:       form.folio       || null,
        descripcion: form.descripcion || null,
        monto:       parseFloat(form.monto) || 0,
        responsable: form.responsable,
        cargoChofer: form.cargoChofer,
        cargoMonto:  parseFloat(form.cargoMonto as string) || 0,
        notas:       form.notas || null,
        archivoUrl:  formArchivoUrl   || null,
      };

      const url    = editItem ? `/api/infracciones/${editItem.id}` : '/api/infracciones';
      const method = editItem ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowModal(false);
        fetchData();
      } else {
        const e = await res.json().catch(() => ({}));
        alert(e.message ?? 'Error al guardar');
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Upload rápido desde tabla (sin abrir modal) ──────────────────────────────
  function triggerRowUpload(infraccionId: string) {
    setPendingUploadId(infraccionId);
    rowFileInputRef.current?.click();
  }

  async function handleRowFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !pendingUploadId) { e.target.value = ''; return; }
    const id = pendingUploadId;
    setUploadingRowId(id);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res  = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (res.ok && json.url) {
        await fetch(`/api/infracciones/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ archivoUrl: json.url }),
        });
        fetchData();
      } else {
        alert(json.message ?? 'Error al subir archivo');
      }
    } catch {
      alert('Error al subir archivo');
    } finally {
      setUploadingRowId(null);
      setPendingUploadId(null);
      e.target.value = '';
    }
  }

  // ── Upload archivo (PDF / imagen) para infracción ───────────────────────────
  async function handleUploadArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res  = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (res.ok && json.url) {
        setFormArchivoUrl(json.url);
        // Si ya hay un item guardado, actualizar de inmediato
        if (editItem) {
          await fetch(`/api/infracciones/${editItem.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ archivoUrl: json.url }),
          });
          fetchData();
        }
      } else {
        alert(json.message ?? 'Error al subir archivo');
      }
    } catch {
      alert('Error al subir archivo');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  }

  // ── Sync SSIM GDL ────────────────────────────────────────────────────────────
  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/infracciones/sync', { method: 'POST' });
      const json = await res.json();
      setSyncResult({
        nuevas:      json.totalNuevas ?? 0,
        consultados: json.vehiculosConsultados ?? 0,
        detalle:     json.detalle ?? [],
        aviso:       json.aviso,
      });
      if ((json.totalNuevas ?? 0) > 0) fetchData();
    } catch {
      setSyncResult({ nuevas: -1, consultados: 0 });
    } finally {
      setSyncing(false);
    }
  }

  // ── Sync Jalisco Estatal ─────────────────────────────────────────────────────
  async function handleSyncJalisco() {
    setSyncingJalisco(true);
    setSyncJaliscoResult(null);
    try {
      const res  = await fetch('/api/infracciones/sync-jalisco', { method: 'POST' });
      const json = await res.json();
      setSyncJaliscoResult({
        nuevas:      json.totalNuevas ?? 0,
        consultados: json.vehiculosConsultados ?? 0,
        detalle:     json.detalle ?? [],
        aviso:       json.aviso,
      });
      if ((json.totalNuevas ?? 0) > 0) fetchData();
    } catch {
      setSyncJaliscoResult({ nuevas: -1, consultados: 0 });
    } finally {
      setSyncingJalisco(false);
    }
  }

  // ── Marcar pagada / pendiente ────────────────────────────────────────────────
  async function togglePagada(item: Infraccion) {
    await fetch(`/api/infracciones/${item.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ pagada: !item.pagada }),
    });
    fetchData();
  }

  // ── Eliminar ─────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta infracción? La acción no se puede deshacer.')) return;
    setDeletingId(id);
    await fetch(`/api/infracciones/${id}`, { method: 'DELETE' });
    setDeletingId(null);
    fetchData();
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Input global oculto para upload rápido desde tabla */}
      <input
        ref={rowFileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleRowFileChange}
        className="sr-only"
      />
      <Header
        breadcrumbs={[{ label: 'Infracciones' }]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSync}
              disabled={syncing || syncingJalisco}
              className="flex items-center gap-2 px-3 py-2 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50 disabled:opacity-60 transition-colors"
              title="Consultar portal SSIM Guadalajara y registrar nuevas infracciones municipales"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Consultando…' : 'Sync SSIM GDL'}
            </button>
            <button
              onClick={handleSyncJalisco}
              disabled={syncing || syncingJalisco}
              className="flex items-center gap-2 px-3 py-2 border border-purple-300 text-purple-700 bg-purple-50 text-sm rounded-lg hover:bg-purple-100 disabled:opacity-60 transition-colors"
              title="Consultar portal de adeudos vehiculares del Estado de Jalisco"
            >
              <RefreshCw className={`h-4 w-4 ${syncingJalisco ? 'animate-spin' : ''}`} />
              {syncingJalisco ? 'Consultando Jalisco…' : 'Sync Jalisco'}
            </button>
            <button onClick={openCreate} className="btn-primary">
              <Plus className="h-4 w-4" />
              Nueva Infracción
            </button>
          </div>
        }
      />

      <div className="p-4 md:p-6 pb-20 space-y-5 max-w-7xl mx-auto">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard
            icon={<FileWarning className="h-5 w-5 text-orange-600" />}
            bg="bg-orange-50"
            value={summary?.total ?? 0}
            label="Total"
          />
          <StatCard
            icon={<Clock className="h-5 w-5 text-yellow-600" />}
            bg="bg-yellow-50"
            value={summary?.pendientes ?? 0}
            label="Pendientes"
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
            bg="bg-green-50"
            value={summary?.pagadas ?? 0}
            label="Pagadas"
          />
          <StatCard
            icon={<DollarSign className="h-5 w-5 text-red-600" />}
            bg="bg-red-50"
            value={fmt(summary?.montoTotal ?? 0)}
            label="Monto total"
          />
          <StatCard
            icon={<AlertCircle className="h-5 w-5 text-blue-600" />}
            bg="bg-blue-50"
            value={fmt(summary?.montoCargoChofer ?? 0)}
            label="Cargo choferes"
          />
        </div>

        {/* Banner resultado sync */}
        {syncResult && (
          <div className={`px-4 py-3 rounded-xl text-sm border ${
            syncResult.nuevas < 0
              ? 'bg-red-50 border-red-200 text-red-700'
              : syncResult.nuevas === 0 && syncResult.consultados === 0
              ? 'bg-orange-50 border-orange-200 text-orange-800'
              : syncResult.nuevas === 0
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-semibold">
                  {syncResult.nuevas < 0
                    ? '⚠️ Error al consultar SSIM. Verifica la conexión.'
                    : syncResult.consultados === 0
                    ? '⚠️ No se encontraron vehículos con placa registrada en BD. Ve a Vehículos y llena el campo "Placas" con la placa oficial.'
                    : syncResult.nuevas === 0
                    ? `✅ Sin infracciones nuevas — ${syncResult.consultados} vehículo(s) consultado(s) en SSIM GDL.`
                    : `🚨 ${syncResult.nuevas} infracción(es) nueva(s) — ${syncResult.consultados} vehículo(s) consultado(s).`}
                </p>
                {/* Detalle por placa */}
                {(syncResult.detalle?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {syncResult.detalle!.map((d, i) => (
                      <span key={i} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-mono ${
                        d.error ? 'bg-red-100 text-red-700' : d.total === 0 ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {d.placa}
                        {d.error ? ` ⚠️ ${d.error}` : ` · ${d.total} en SSIM${d.nuevas > 0 ? ` · ${d.nuevas} nueva(s)` : ''}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => setSyncResult(null)} className="mt-0.5 hover:opacity-70 flex-shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Banner resultado Jalisco */}
        {syncJaliscoResult && (
          <div className={`px-4 py-3 rounded-xl text-sm border ${
            syncJaliscoResult.nuevas < 0
              ? 'bg-red-50 border-red-200 text-red-700'
              : syncJaliscoResult.consultados === 0
              ? 'bg-orange-50 border-orange-200 text-orange-800'
              : syncJaliscoResult.nuevas === 0
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-purple-50 border-purple-200 text-purple-800'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-semibold">
                  {syncJaliscoResult.nuevas < 0
                    ? '⚠️ Error al consultar portal Jalisco. Verifica la conexión.'
                    : syncJaliscoResult.aviso
                    ? `⚠️ ${syncJaliscoResult.aviso}`
                    : syncJaliscoResult.nuevas === 0
                    ? `✅ Sin infracciones nuevas — ${syncJaliscoResult.consultados} vehículo(s) consultado(s) en Jalisco.`
                    : `🚨 ${syncJaliscoResult.nuevas} infracción(es) estatal(es) nueva(s) — ${syncJaliscoResult.consultados} vehículo(s).`}
                </p>
                {(syncJaliscoResult.detalle?.length ?? 0) > 0 && !syncJaliscoResult.aviso && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {syncJaliscoResult.detalle!.map((d, i) => (
                      <span key={i} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-mono ${
                        d.error ? 'bg-red-100 text-red-700' : d.total === 0 ? 'bg-slate-100 text-slate-500' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {d.eco} ({d.placa})
                        {d.error ? ` ⚠️ ${d.error}` : ` · ${d.total} en Jalisco${d.nuevas > 0 ? ` · ${d.nuevas} nueva(s)` : ''}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => setSyncJaliscoResult(null)} className="mt-0.5 hover:opacity-70 flex-shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tabla */}
        <div className="card">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-slate-100">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 flex-1 max-w-sm focus-within:border-blue-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-500 transition-all">
              <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Buscar por ECO, placa, chofer, folio..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filtro estado */}
            <div className="relative">
              <select
                value={filterPagada}
                onChange={e => setFilter(e.target.value as 'all' | 'pendiente' | 'pagada')}
                className="appearance-none input pr-8 w-auto min-w-[160px]"
              >
                <option value="all">Todas</option>
                <option value="pendiente">Pendientes</option>
                <option value="pagada">Pagadas</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Fecha', 'Vehículo', 'Chofer', 'Tipo', 'Folio', 'Monto', 'Responsable', 'Cargo chofer', 'Estado', 'Acciones']
                    .map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 text-sm">Cargando...</td>
                  </tr>
                )}
                {!loading && infracciones.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-16 text-center">
                      <FileWarning className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-400">Sin infracciones registradas</p>
                      <button onClick={openCreate} className="mt-3 text-sm text-blue-600 hover:underline">
                        + Registrar primera infracción
                      </button>
                    </td>
                  </tr>
                )}
                {infracciones.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 text-sm text-slate-600 whitespace-nowrap">
                      {fmtDate(item.fecha)}
                    </td>
                    <td className="px-4 py-3.5">
                      {item.eco ? (
                        <div>
                          <span className="text-sm font-mono font-bold text-slate-800">{item.eco}</span>
                          {item.plates && (
                            <span className="ml-1.5 text-xs text-slate-500">{item.plates}</span>
                          )}
                          {(item.brand || item.model) && (
                            <p className="text-xs text-slate-400">{[item.brand, item.model, item.year].filter(Boolean).join(' ')}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">
                      {item.driverName ?? '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <TipoBadge tipo={item.tipo} />
                    </td>
                    <td className="px-4 py-3.5 text-sm font-mono text-slate-600">
                      <div className="flex flex-col gap-1">
                        <span>{item.folio ?? <span className="text-slate-300">—</span>}</span>
                        {item.fuente === 'jalisco' && item.vehicleId && (
                          <a
                            href={`/api/infracciones/jalisco-portal?vehicleId=${item.vehicleId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-sans font-medium text-purple-600 hover:text-purple-800 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Ver infracción Jalisco →
                          </a>
                        )}
                        {item.fuente === 'jalisco' && !item.vehicleId && (
                          <a
                            href="https://gobiernoenlinea1.jalisco.gob.mx/serviciosVehiculares/adeudos"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-sans font-medium text-purple-400 hover:text-purple-600 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Portal Jalisco
                          </a>
                        )}
                        {item.fuente === 'ssim' && item.fotoUrl && (
                          <a
                            href={item.fotoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-sans font-medium text-orange-600 hover:text-orange-800 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Ver foto
                          </a>
                        )}
                        {item.fuente === 'ssim' && !item.fotoUrl && (
                          <a
                            href="https://apissim.guadalajara.gob.mx"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-sans font-medium text-blue-500 hover:text-blue-700 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Portal SSIM
                          </a>
                        )}
                        {item.archivoUrl && (
                          <a
                            href={item.archivoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-sans font-medium text-slate-600 hover:text-slate-900 hover:underline"
                          >
                            <FileText className="h-3 w-3" />
                            Ver doc
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-slate-800 font-mono whitespace-nowrap">
                      {fmt(item.monto)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        item.responsable === 'chofer'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-purple-50 text-purple-700'
                      }`}>
                        {item.responsable === 'chofer' ? 'Chofer' : 'Propietario'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {item.cargoChofer ? (
                        <span className="text-sm font-mono font-semibold text-orange-700">
                          {fmt(item.cargoMonto)}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => togglePagada(item)}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                          item.pagada
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-red-50 text-red-700 hover:bg-red-100'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${item.pagada ? 'bg-green-500' : 'bg-red-500'}`} />
                        {item.pagada ? 'Pagada' : 'Pendiente'}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        {/* Ver o subir PDF/foto */}
                        {item.archivoUrl ? (
                          <a
                            href={item.archivoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-green-500 hover:text-green-700 hover:bg-green-50 transition-colors"
                            title="Ver documento adjunto"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <button
                            onClick={() => triggerRowUpload(item.id)}
                            disabled={uploadingRowId === item.id}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                            title="Adjuntar PDF o foto de la infracción"
                          >
                            {uploadingRowId === item.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Paperclip className="h-3.5 w-3.5" />}
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm('¿Archivar esta infracción? No aparecerá en la lista pero se conservará en el historial.')) return;
                            await fetch(`/api/infracciones?id=${item.id}`, { method: 'DELETE' });
                            fetchData();
                          }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"
                          title="Archivar infracción"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              {infracciones.length} infracción{infracciones.length !== 1 ? 'es' : ''}
              {filterPagada !== 'all' && ` · Filtro: ${filterPagada}`}
            </p>
          </div>
        </div>
      </div>

      {/* ── Modal ──────────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-orange-500" />
                {editItem ? 'Editar Infracción' : 'Nueva Infracción'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Vehículo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <Car className="inline h-4 w-4 mr-1 text-slate-500" />
                  Vehículo
                </label>
                <select
                  value={form.vehicleId}
                  onChange={e => setForm(p => ({ ...p, vehicleId: e.target.value }))}
                  className="input w-full"
                >
                  <option value="">— Sin vehículo —</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.eco} · {v.plates}{v.brand ? ` · ${v.brand} ${v.model ?? ''}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha + Tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha *</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                    className="input w-full"
                  >
                    {TIPOS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Folio + Monto */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Folio / Número de infracción</label>
                  <input
                    type="text"
                    value={form.folio}
                    onChange={e => setForm(p => ({ ...p, folio: e.target.value }))}
                    placeholder="MX-2026-00123"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Monto ($) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.monto}
                    onChange={e => setForm(p => ({ ...p, monto: e.target.value }))}
                    placeholder="0.00"
                    className="input w-full"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                  rows={2}
                  placeholder="Detalle de la infracción, lugar, causa..."
                  className="input w-full resize-none"
                />
              </div>

              {/* Responsable + Cargo al chofer */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Responsable</label>
                  <select
                    value={form.responsable}
                    onChange={e => setForm(p => ({ ...p, responsable: e.target.value }))}
                    className="input w-full"
                  >
                    <option value="chofer">Chofer</option>
                    <option value="propietario">Propietario</option>
                    <option value="compartido">Compartido</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Monto a cargo del chofer ($)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.cargoChofer}
                      onChange={e => setForm(p => ({ ...p, cargoChofer: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      id="cargo-chofer"
                    />
                    <label htmlFor="cargo-chofer" className="text-sm text-slate-600">Cobrar al chofer</label>
                  </div>
                  {form.cargoChofer && (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.cargoMonto}
                      onChange={e => setForm(p => ({ ...p, cargoMonto: e.target.value }))}
                      placeholder={form.monto || '0.00'}
                      className="input w-full mt-2"
                    />
                  )}
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notas internas</label>
                <textarea
                  value={form.notas}
                  onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                  rows={2}
                  placeholder="Observaciones, seguimiento, documentos adjuntos..."
                  className="input w-full resize-none"
                />
              </div>

              {/* Adjunto: PDF o imagen de la infracción */}
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Paperclip className="inline h-4 w-4 mr-1 text-slate-400" />
                  Documento / Foto de la infracción
                </label>
                {formArchivoUrl ? (
                  <div className="flex items-center gap-3">
                    <a
                      href={formArchivoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      Ver archivo subido
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setFormArchivoUrl(null)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <label className={`flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors ${uploadingFile ? 'opacity-60 pointer-events-none' : ''}`}>
                    {uploadingFile
                      ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      : <Paperclip className="h-4 w-4 text-slate-400" />}
                    <span className="text-sm text-slate-500">
                      {uploadingFile ? 'Subiendo...' : 'Subir PDF o imagen (máx. 10 MB)'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleUploadArchivo}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? 'Guardando...' : editItem ? 'Guardar cambios' : 'Registrar infracción'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function StatCard({
  icon, bg, value, label,
}: { icon: React.ReactNode; bg: string; value: string | number; label: string }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${bg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-900 leading-none truncate">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

const TIPO_COLORS: Record<string, string> = {
  Fotomulta:       'bg-red-50 text-red-700',
  Alcoholímetro:   'bg-purple-50 text-purple-700',
  'Infracción vial': 'bg-orange-50 text-orange-700',
  Verificación:    'bg-blue-50 text-blue-700',
  Estacionamiento: 'bg-yellow-50 text-yellow-700',
  Velocidad:       'bg-rose-50 text-rose-700',
  Semáforo:        'bg-amber-50 text-amber-700',
  'Uso de carril': 'bg-slate-100 text-slate-700',
  Documentación:   'bg-teal-50 text-teal-700',
  Otro:            'bg-slate-100 text-slate-600',
};

function TipoBadge({ tipo }: { tipo: string }) {
  const cls = TIPO_COLORS[tipo] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>
      {tipo}
    </span>
  );
}
