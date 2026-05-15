'use client';

import { Header } from '@/components/layout/Header';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ScoreCircle } from '@/components/ui/ScoreCircle';
import { SkeletonTable } from '@/components/ui/SkeletonLoader';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Pencil,
  Truck,
  Wrench,
  CheckCircle2,
  PauseCircle,
  Loader2,
  RefreshCw,
  X,
  Download,
  Trash2,
} from 'lucide-react';
import { exportToCsv } from '@/lib/exportCsv';

interface Vehicle {
  id: string;
  eco: string;
  brand: string;
  model: string;
  year: number;
  plates: string;
  driver: string | null;
  status: string;
  km: number;
  weeklyIncome: number;
  weeklyRent: number;
  healthScore: number;
}

interface VehiclesResponse {
  data: Vehicle[];
  total: number;
  page: number;
  pages: number;
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  maintenance: 'En taller',
  available: 'Disponible',
  inactive: 'Inactivo',
  suspended: 'Suspendido',
};

export default function VehiclesPage() {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [localVehicles, setLocalVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState({ eco: '', brand: '', model: '', year: String(new Date().getFullYear()), plates: '', color: '', vin: '', platform: 'Uber', notes: '', gpsImei: '', weeklyRent: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Vehicle | null>(null);
  const [editingRent, setEditingRent] = useState<{ id: string; value: string } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editForm, setEditForm] = useState({ status: '', brand: '', model: '', year: '', plates: '', color: '', km: '', weeklyRent: '', notes: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    document.title = 'Vehículos | Gestiona tu Flotilla';
  }, []);

  const handleDeleteConfirmed = () => {
    if (!confirmDelete) return;
    setLocalVehicles(prev => prev.filter(v => v.id !== confirmDelete.id));
    setConfirmDelete(null);
    addToast('Vehículo eliminado correctamente');
  };

  const handleOpenEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    setEditForm({
      status:     v.status ?? '',
      brand:      v.brand ?? '',
      model:      v.model ?? '',
      year:       String(v.year ?? ''),
      plates:     v.plates ?? '',
      color:      '',
      km:         String(v.km ?? 0),
      weeklyRent: String(v.weeklyRent ?? 0),
      notes:      '',
    });
    setEditError('');
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editingVehicle) return;
    setEditSaving(true);
    setEditError('');
    try {
      const res = await fetch(`/api/vehicles/${editingVehicle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status:     editForm.status     || undefined,
          brand:      editForm.brand      || undefined,
          model:      editForm.model      || undefined,
          plates:     editForm.plates     || undefined,
          color:      editForm.color      || undefined,
          km:         editForm.km !== '' ? parseInt(editForm.km) : undefined,
          weeklyRent: editForm.weeklyRent !== '' ? parseFloat(editForm.weeklyRent) : undefined,
          notes:      editForm.notes      || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Error al guardar');
      }
      setShowEditModal(false);
      refetch();
      addToast('✅ Vehículo actualizado');
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setEditSaving(false);
    }
  };

  const handleSaveRent = async (id: string, value: string) => {
    try {
      await fetch(`/api/vehicles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeklyRent: parseFloat(value) || 0 }),
      });
      setEditingRent(null);
      refetch();
      addToast('✅ Renta actualizada');
    } catch {
      addToast('❌ Error al actualizar renta');
    }
  };

  const queryParams = new URLSearchParams();
  if (debouncedSearch) queryParams.set('search', debouncedSearch);
  if (statusFilter) queryParams.set('status', statusFilter);

  const endpoint = `/vehicles?${queryParams.toString()}`;
  const { data, loading, error, refetch } = useApi<VehiclesResponse>(endpoint);

  const vehicles = [...(data?.data ?? []), ...localVehicles];
  const total = data?.total ?? 0;

  const stats = {
    activos: vehicles.filter((v) => v.status === 'active').length,
    mantenimiento: vehicles.filter((v) => v.status === 'maintenance').length,
    disponibles: vehicles.filter((v) => v.status === 'available').length,
    ingresos: vehicles.reduce((s, v) => s + v.weeklyIncome, 0),
  };

  const handleSave = async () => {
    if (!form.eco.trim() || !form.brand.trim() || !form.model.trim() || !form.year) {
      setFormError('ECO, marca, modelo y año son requeridos');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eco:        form.eco.trim().toUpperCase(),
          brand:      form.brand.trim(),
          model:      form.model.trim(),
          year:       parseInt(form.year),
          plates:     form.plates.trim().toUpperCase() || null,
          color:      form.color.trim()  || null,
          vin:        form.vin.trim()    || null,
          platform:   [form.platform],
          notes:      form.notes.trim()  || null,
          weeklyRent: form.weeklyRent   || '0',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al guardar');
      }

      setShowModal(false);
      setForm({ eco: '', brand: '', model: '', year: String(new Date().getFullYear()), plates: '', color: '', vin: '', platform: 'Uber', notes: '', gpsImei: '', weeklyRent: '' });
      refetch();
      addToast('✅ Vehículo agregado correctamente');
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Error al guardar el vehículo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Header breadcrumbs={[{ label: 'Vehículos' }]} />

      <div className="p-4 md:p-6 pb-20 space-y-5 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">Vehículos</h1>
            <p className="text-slate-500 mt-0.5 text-sm">
              {loading ? 'Cargando...' : `${total} vehículos en flota`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refetch}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Actualizar"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => exportToCsv('vehiculos', (vehicles ?? []).map(v => ({
                ECO: v.eco || v.id,
                Marca: v.brand || '',
                Modelo: v.model || '',
                Año: v.year || '',
                Placas: v.plates || '',
                Status: v.status || '',
                Chofer: v.driver || '',
                Plataforma: '',
                'Score Salud': v.healthScore || '',
              })))}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar
            </button>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              Nuevo Vehículo
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Activos</span>
              <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">{loading ? '—' : stats.activos}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">En taller</span>
              <div className="w-9 h-9 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-yellow-600 mt-2">{loading ? '—' : stats.mantenimiento}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Disponibles</span>
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-2">{loading ? '—' : stats.disponibles}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Ingresos semana</span>
              <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                <PauseCircle className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-purple-600 mt-2">
              {loading ? '—' : `$${stats.ingresos.toLocaleString()}`}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          {/* Toolbar */}
          <div className="flex items-center gap-3 p-4 border-b border-slate-200">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por eco, marca, placas, chofer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="maintenance">En taller</option>
                <option value="available">Disponibles</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 text-sm text-red-600 bg-red-50 border-b border-red-100">
              {error} —{' '}
              <button onClick={refetch} className="underline">
                Reintentar
              </button>
            </div>
          )}

          {/* Table content */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-4">
                <SkeletonTable rows={8} cols={8} />
              </div>
            ) : vehicles.length === 0 ? (
              <EmptyState
                icon={<Truck className="w-8 h-8" />}
                title="No se encontraron vehículos"
                description="Agrega tu primer vehículo para comenzar a gestionar tu flotilla."
                action={{ label: '+ Nuevo Vehículo', onClick: () => setShowModal(true) }}
              />
            ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Vehículo</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Placas</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Chofer</th>
                  <th className="text-center text-xs font-medium text-slate-500 px-4 py-3">Estado</th>
                  <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Km</th>
                  <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Renta/sem</th>
                  <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Ingreso/sem</th>
                  <th className="text-center text-xs font-medium text-slate-500 px-4 py-3">Health</th>
                  <th className="text-center text-xs font-medium text-slate-500 px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(
                  vehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Truck className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-blue-600 font-mono">{v.eco}</p>
                            <p className="text-xs text-slate-500">
                              {v.brand} {v.model} {v.year}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-600">{v.plates}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {v.driver ?? (
                          <span className="text-slate-400 italic text-xs">Sin chofer</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={v.status} label={STATUS_LABELS[v.status] ?? v.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 text-right font-mono">
                        {v.km.toLocaleString()}
                      </td>
                      {/* Renta semanal — edición inline al hacer clic */}
                      <td className="px-4 py-3 text-sm text-right">
                        {editingRent?.id === v.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              autoFocus
                              value={editingRent.value}
                              onChange={e => setEditingRent({ id: v.id, value: e.target.value })}
                              onBlur={() => handleSaveRent(v.id, editingRent.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveRent(v.id, editingRent.value);
                                if (e.key === 'Escape') setEditingRent(null);
                              }}
                              className="w-24 text-right text-xs px-2 py-1 border border-blue-400 rounded-lg focus:outline-none"
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingRent({ id: v.id, value: String(v.weeklyRent ?? 0) })}
                            className="text-slate-700 font-semibold hover:text-blue-600 hover:underline transition-colors"
                            title="Clic para editar renta"
                          >
                            {(v.weeklyRent ?? 0) > 0 ? `$${Number(v.weeklyRent).toLocaleString()}` : <span className="text-slate-300 italic text-xs">Sin renta</span>}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-right">
                        {v.weeklyIncome > 0 ? (
                          <span className="text-green-600">${v.weeklyIncome.toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ScoreCircle score={v.healthScore} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/vehiculos/${v.id}`}
                            className="p-1.5 hover:bg-blue-50 rounded-lg"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4 text-blue-600" />
                          </Link>
                          <button className="p-1.5 hover:bg-slate-100 rounded-lg" title="Editar" onClick={() => handleOpenEdit(v)}>
                            <Pencil className="w-4 h-4 text-slate-500" />
                          </button>
                          <button
                            className="p-1.5 hover:bg-red-50 rounded-lg"
                            title="Eliminar"
                            onClick={() => setConfirmDelete(v)}
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            )}
          </div>

          {/* Footer */}
          {!loading && total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
              <span>Mostrando {vehicles.length} de {total} vehículos</span>
              <div className="flex items-center gap-2">
                <Loader2 className="w-3 h-3 opacity-0" />
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!confirmDelete}
        title="Eliminar vehículo"
        description={`¿Estás seguro de que quieres eliminar el vehículo ${confirmDelete?.eco ?? ''}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* ── Modal Editar Vehículo ── */}
      {showEditModal && editingVehicle && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Editar Vehículo</h2>
                <p className="text-sm text-slate-500 mt-0.5 font-mono">{editingVehicle.eco} · {editingVehicle.brand} {editingVehicle.model}</p>
              </div>
              <button onClick={() => { setShowEditModal(false); setEditError(''); }} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {editError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{editError}</div>}
              <div className="grid grid-cols-2 gap-4">
                {/* Estado */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Estado</label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Activo</option>
                    <option value="available">Disponible (sin chofer)</option>
                    <option value="maintenance">En taller</option>
                    <option value="inactive">Inactivo</option>
                    <option value="suspended">Suspendido</option>
                  </select>
                </div>
                {/* Marca */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Marca</label>
                  <input value={editForm.brand} onChange={e => setEditForm(p => ({ ...p, brand: e.target.value }))} placeholder="Nissan, Toyota..." className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {/* Modelo */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Modelo</label>
                  <input value={editForm.model} onChange={e => setEditForm(p => ({ ...p, model: e.target.value }))} placeholder="March, Aveo..." className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {/* Placas */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Placas</label>
                  <input value={editForm.plates} onChange={e => setEditForm(p => ({ ...p, plates: e.target.value.toUpperCase() }))} placeholder="ABC-1234" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Color</label>
                  <input value={editForm.color} onChange={e => setEditForm(p => ({ ...p, color: e.target.value }))} placeholder="Blanco, Plata..." className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {/* KM actual */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Kilometraje actual</label>
                  <input type="number" value={editForm.km} onChange={e => setEditForm(p => ({ ...p, km: e.target.value }))} placeholder="125000" min="0" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {/* Renta semanal */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Renta Semanal (MXN)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">$</span>
                    <input type="number" value={editForm.weeklyRent} onChange={e => setEditForm(p => ({ ...p, weeklyRent: e.target.value }))} placeholder="1500" min="0" className="w-full pl-7 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notas</label>
                <textarea value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Observaciones, estado de la unidad..." className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
              <button onClick={() => { setShowEditModal(false); setEditError(''); }} className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleEditSave} disabled={editSaving} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
                {editSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">🚛 Nuevo Vehículo</h2>
                <p className="text-sm text-slate-500 mt-0.5">Registra una nueva unidad en tu flotilla</p>
              </div>
              <button onClick={() => { setShowModal(false); setFormError(''); }} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {formError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{formError}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Número ECO *</label>
                  <input value={form.eco} onChange={e => setForm(p => ({...p, eco: e.target.value}))} placeholder="ECO-001" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Placas *</label>
                  <input value={form.plates} onChange={e => setForm(p => ({...p, plates: e.target.value}))} placeholder="ABC-1234" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Marca</label>
                  <input value={form.brand} onChange={e => setForm(p => ({...p, brand: e.target.value}))} placeholder="Nissan, Toyota..." className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Modelo</label>
                  <input value={form.model} onChange={e => setForm(p => ({...p, model: e.target.value}))} placeholder="Versa, Aveo..." className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Año</label>
                  <input type="number" value={form.year} onChange={e => setForm(p => ({...p, year: e.target.value}))} min="2000" max="2030" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Color</label>
                  <input value={form.color} onChange={e => setForm(p => ({...p, color: e.target.value}))} placeholder="Blanco, Plata..." className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Número VIN</label>
                  <input value={form.vin} onChange={e => setForm(p => ({...p, vin: e.target.value}))} placeholder="1HGBH41JXMN109186" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Plataforma</label>
                  <select value={form.platform} onChange={e => setForm(p => ({...p, platform: e.target.value}))} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="Uber">Uber</option>
                    <option value="Didi">Didi</option>
                    <option value="InDriver">InDriver</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Renta Semanal (MXN) *
                    <span className="text-xs font-normal text-slate-400 ml-1">lo que cobra la flotilla</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">$</span>
                    <input
                      type="number"
                      value={form.weeklyRent}
                      onChange={e => setForm(p => ({...p, weeklyRent: e.target.value}))}
                      placeholder="1500"
                      min="0"
                      className="w-full pl-7 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  IMEI GPS
                  <span className="text-xs font-normal text-slate-400 ml-1">(opcional — Track Solid Pro / Baanool)</span>
                </label>
                <input
                  value={form.gpsImei ?? ''}
                  onChange={e => setForm(p => ({...p, gpsImei: e.target.value}))}
                  placeholder="860123456789012"
                  maxLength={20}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notas adicionales</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} rows={2} placeholder="Observaciones, estado de la unidad..." className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
              <button onClick={() => { setShowModal(false); setFormError(''); }} className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
                {saving ? 'Guardando...' : 'Guardar Vehículo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
