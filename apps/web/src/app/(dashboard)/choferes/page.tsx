'use client';
import Link from 'next/link';

import { Header } from '@/components/layout/Header';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SkeletonTable } from '@/components/ui/SkeletonLoader';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Pencil,
  Users,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Star,
  DollarSign,
  X,
  Download,
  Trash2,
} from 'lucide-react';
import { exportToCsv } from '@/lib/exportCsv';

interface Driver {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicle: string;
  vehicleId: string;
  platform: string;
  platformRating: number;
  status: string;
  weeklyBalance: number;
  totalDebt: number;
  tripsWeek: number;
  hoursWeek: number;
  scoreChofer: number;
  joinDate: string;
}

interface DriversResponse {
  data: Driver[];
  summary: {
    total: number;
    activos: number;
    suspendidos: number;
    inactivos: number;
    totalDebt: number;
  };
}

const STATUS_MAP: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  suspended: 'Suspendido',
};

export default function ChoferesPage() {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [localDrivers, setLocalDrivers] = useState<Driver[]>([]);
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '', vehiculo: '', plataforma: 'Uber', notas: '', whatsappGroup: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Driver | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    document.title = 'Choferes | Gestiona tu Flotilla';
  }, []);

  const handleDeleteConfirmed = () => {
    if (!confirmDelete) return;
    setLocalDrivers(prev => prev.filter(d => d.id !== confirmDelete.id));
    setConfirmDelete(null);
    addToast('Chofer eliminado correctamente');
  };

  const params = new URLSearchParams();
  if (debouncedSearch) params.set('search', debouncedSearch);
  if (statusFilter) params.set('status', statusFilter);
  if (platformFilter) params.set('platform', platformFilter);

  const { data, loading, error, refetch } = useApi<DriversResponse>(`/drivers?${params.toString()}`);

  const drivers = [...(data?.data ?? []), ...localDrivers];
  const summary = data?.summary;

  const handleSave = async () => {
    const nombreTrimmed = form.nombre.trim();
    if (!nombreTrimmed || !form.telefono.trim()) {
      setFormError('El nombre y el teléfono son requeridos');
      return;
    }

    // Separar nombre completo en firstName / lastName
    const partes = nombreTrimmed.split(' ');
    const firstName = partes[0];
    const lastName  = partes.slice(1).join(' ') || '—';

    setSaving(true);
    setFormError('');
    try {
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          phone:          form.telefono.trim()     || null,
          email:          form.email.trim()        || null,
          platforms:      [form.plataforma],
          notes:          form.notas.trim()        || null,
          whatsappGroup:  form.whatsappGroup.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al guardar');
      }

      setShowModal(false);
      setForm({ nombre: '', telefono: '', email: '', vehiculo: '', plataforma: 'Uber', notas: '', whatsappGroup: '' });
      refetch();
      addToast('✅ Chofer agregado correctamente');
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Error al guardar el chofer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Header breadcrumbs={[{ label: 'Choferes' }]} />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Choferes</h1>
            <p className="text-slate-500 mt-1">
              {loading ? 'Cargando...' : `${summary?.total ?? 0} choferes registrados`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refetch}
              className="p-2 hover:bg-slate-100 rounded-lg"
              title="Actualizar"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => exportToCsv('choferes', (drivers ?? []).map(d => ({
                Nombre: d.name || '',
                Teléfono: d.phone || '',
                Email: d.email || '',
                Vehículo: d.vehicle || '',
                Plataforma: d.platform || '',
                Status: d.status || '',
                'Rating Plataforma': d.platformRating || '',
                'Balance Semanal': d.weeklyBalance || '',
                'Deuda Total': d.totalDebt || '',
                Viajes: d.tripsWeek || '',
                Score: d.scoreChofer || '',
              })))}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar
            </button>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              Nuevo Chofer
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Activos</span>
              <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {loading ? '—' : summary?.activos ?? 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Suspendidos</span>
              <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">
              {loading ? '—' : summary?.suspendidos ?? 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Inactivos</span>
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-slate-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-600 mt-2">
              {loading ? '—' : summary?.inactivos ?? 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Cartera vencida</span>
              <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-orange-600 mt-2">
              {loading ? '—' : `$${(summary?.totalDebt ?? 0).toLocaleString()}`}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          {/* Toolbar */}
          <div className="flex items-center gap-3 p-4 border-b border-slate-200 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, vehículo, teléfono..."
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
                <option value="suspended">Suspendidos</option>
                <option value="inactive">Inactivos</option>
              </select>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las plataformas</option>
                <option value="Uber">Uber</option>
                <option value="Didi">Didi</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="p-4 text-sm text-red-600 bg-red-50 border-b border-red-100">
              {error} — <button onClick={refetch} className="underline">Reintentar</button>
            </div>
          )}

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-4">
                <SkeletonTable rows={8} cols={10} />
              </div>
            ) : drivers.length === 0 ? (
              <EmptyState
                icon={<Users className="w-8 h-8" />}
                title="No se encontraron choferes"
                description="Registra tu primer conductor para comenzar a gestionar tu flotilla."
                action={{ label: '+ Nuevo Chofer', onClick: () => setShowModal(true) }}
              />
            ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Chofer</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Contacto</th>
                  <th className="text-center text-xs font-medium text-slate-500 px-4 py-3">Vehículo</th>
                  <th className="text-center text-xs font-medium text-slate-500 px-4 py-3">Plataforma</th>
                  <th className="text-center text-xs font-medium text-slate-500 px-4 py-3">Rating</th>
                  <th className="text-center text-xs font-medium text-slate-500 px-4 py-3">Viajes/sem</th>
                  <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Balance</th>
                  <th className="text-center text-xs font-medium text-slate-500 px-4 py-3">Score</th>
                  <th className="text-center text-xs font-medium text-slate-500 px-4 py-3">Estado</th>
                  <th className="text-center text-xs font-medium text-slate-500 px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(
                  drivers.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-bold text-blue-700">
                              {d.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-slate-900">{d.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-slate-600">{d.phone}</p>
                        <p className="text-xs text-slate-400">{d.email}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-mono font-bold text-blue-600">{d.vehicle}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${d.platform === 'Uber' ? 'bg-black text-white' : 'bg-orange-100 text-orange-700'}`}>
                          {d.platform}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm font-black text-slate-900">{Number(d.platformRating).toFixed(1)}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">Didi / 5.0</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-700">
                        {d.tripsWeek > 0 ? d.tripsWeek : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {d.totalDebt > 0 ? (
                          <span className="text-sm font-bold text-red-600">-${d.totalDebt.toLocaleString()}</span>
                        ) : d.weeklyBalance > 0 ? (
                          <span className="text-sm font-bold text-green-600">+${d.weeklyBalance.toLocaleString()}</span>
                        ) : (
                          <span className="text-sm text-slate-400">$0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`text-sm font-black ${d.scoreChofer >= 80 ? 'text-green-600' : d.scoreChofer >= 60 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {d.scoreChofer}<span className="text-xs font-normal text-slate-400">/100</span>
                          </span>
                          <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${d.scoreChofer >= 80 ? 'bg-green-500' : d.scoreChofer >= 60 ? 'bg-blue-500' : 'bg-orange-500'}`}
                              style={{ width: `${d.scoreChofer}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={d.status} label={STATUS_MAP[d.status] ?? d.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Link href={`/choferes/${d.id}`} className="p-1.5 hover:bg-blue-50 rounded-lg inline-flex" title="Ver perfil completo">
                            <Eye className="w-4 h-4 text-blue-600" />
                          </Link>
                          <button className="p-1.5 hover:bg-slate-100 rounded-lg" title="Editar">
                            <Pencil className="w-4 h-4 text-slate-500" />
                          </button>
                          <button
                            className="p-1.5 hover:bg-red-50 rounded-lg"
                            title="Eliminar"
                            onClick={() => setConfirmDelete(d)}
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

          {!loading && drivers.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
              Mostrando {drivers.length} choferes
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!confirmDelete}
        title="Eliminar chofer"
        description={`¿Estás seguro de que quieres eliminar a ${confirmDelete?.name ?? ''}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDelete(null)}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Nuevo Chofer</h2>
                <p className="text-sm text-slate-500 mt-0.5">Registra un nuevo conductor en tu flotilla</p>
              </div>
              <button onClick={() => { setShowModal(false); setFormError(''); }} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {formError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{formError}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre completo *</label>
                  <input value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))} placeholder="Juan Pérez García" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Teléfono *</label>
                  <input value={form.telefono} onChange={e => setForm(p => ({...p, telefono: e.target.value}))} placeholder="55 1234 5678" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="juan@email.com" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Vehículo asignado</label>
                  <input value={form.vehiculo} onChange={e => setForm(p => ({...p, vehiculo: e.target.value}))} placeholder="ECO-001" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Plataforma</label>
                  <select value={form.plataforma} onChange={e => setForm(p => ({...p, plataforma: e.target.value}))} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="Uber">Uber</option>
                    <option value="Didi">Didi</option>
                    <option value="InDriver">InDriver</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  👥 Grupo WhatsApp
                  <span className="ml-2 text-xs text-slate-400 font-normal">Pega el link de invitación del grupo</span>
                </label>
                <input
                  value={form.whatsappGroup}
                  onChange={e => setForm(p => ({...p, whatsappGroup: e.target.value}))}
                  placeholder="https://chat.whatsapp.com/XXXXXXX"
                  className="w-full px-3 py-2.5 border border-green-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-green-50"
                />
                <p className="text-xs text-slate-400 mt-1">WhatsApp → Grupo → Agregar → Compartir link de invitación</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notas</label>
                <textarea value={form.notas} onChange={e => setForm(p => ({...p, notas: e.target.value}))} rows={2} placeholder="Observaciones sobre el chofer..." className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
              <button onClick={() => { setShowModal(false); setFormError(''); }} className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
                {saving ? 'Guardando...' : 'Guardar Chofer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
