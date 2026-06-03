'use client';

import { Header } from '@/components/layout/Header';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ScoreCircle } from '@/components/ui/ScoreCircle';
import { Timeline, TimelineEvent } from '@/components/ui/Timeline';
import { useApi } from '@/hooks/useApi';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Truck,
  User,
  DollarSign,
  Wrench,
  Shield,
  Fuel,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Download,
  Car,
  X,
} from 'lucide-react';

const tabs = ['General', 'Financiero', 'Mantenimiento', 'Incidencias', 'Documentos', 'Gastos'];

function fmt(n: number) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function insuranceStatus(expiry: string | null | undefined): 'valid' | 'warning' | 'expired' {
  if (!expiry) return 'expired';
  const diff = (new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diff < 0)  return 'expired';
  if (diff < 30) return 'warning';
  return 'valid';
}

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('General');
  const { data: vehicle, loading, error } = useApi<any>(`/vehicles/${id}`);
  const [vehicleIncidents, setVehicleIncidents] = useState<Array<{
    id: string; tipo: string; fecha: string; descripcion: string | null;
    costo: number; status: string; prioridad: string;
  }>>([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);

  // ── Edit modal state ──────────────────────────────────────────────────────────
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ status: '', plates: '', km: '', weeklyRent: '', notes: '', waGroupLink: '', verificacionExpiry: '' });
  const [editSaving, setEditSaving] = useState(false);

  // ── Gastos tab state ──────────────────────────────────────────────────────────
  const [vehicleGastos, setVehicleGastos] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'Incidencias' && id) {
      setLoadingIncidents(true);
      fetch('/api/incidents')
        .then(r => r.json())
        .then(d => {
          const all = d.data || [];
          setVehicleIncidents(all.filter((i: any) =>
            i.eco === vehicle?.eco || i.vehiculo === vehicle?.eco
          ));
        })
        .catch(() => setVehicleIncidents([]))
        .finally(() => setLoadingIncidents(false));
    }
  }, [activeTab, id, vehicle?.eco]);

  useEffect(() => {
    if (activeTab === 'Gastos' && id) {
      fetch(`/api/gastos?vehicleId=${id}`)
        .then(r => r.json())
        .then(d => setVehicleGastos(d.rows || []))
        .catch(() => {});
    }
  }, [activeTab, id]);

  function openEdit() {
    setEditForm({
      status: vehicle?.status ?? '',
      plates: vehicle?.plates ?? '',
      km: String(vehicle?.km ?? ''),
      weeklyRent: String(vehicle?.weeklyRent ?? ''),
      notes: vehicle?.notes ?? '',
      waGroupLink: vehicle?.waGroupLink ?? '',
      verificacionExpiry: vehicle?.verificacionExpiry ? String(vehicle.verificacionExpiry).slice(0, 10) : '',
    });
    setShowEdit(true);
  }

  async function saveEdit() {
    setEditSaving(true);
    try {
      await fetch(`/api/vehicles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editForm.status,
          plates: editForm.plates,
          km: editForm.km,
          weeklyRent: editForm.weeklyRent,
          notes: editForm.notes,
          wa_group_link: editForm.waGroupLink,
          verificacion_expiry: editForm.verificacionExpiry || undefined,
        }),
      });
      setShowEdit(false);
      window.location.reload();
    } finally {
      setEditSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <Header breadcrumbs={[{ label: 'Vehículos', href: '/vehiculos' }, { label: 'Cargando…' }]} />
        <div className="flex items-center justify-center h-64 gap-3 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Cargando vehículo…</span>
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div>
        <Header breadcrumbs={[{ label: 'Vehículos', href: '/vehiculos' }, { label: 'Error' }]} />
        <div className="p-6">
          <Link href="/vehiculos" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6">
            <ArrowLeft className="h-4 w-4" /> Volver a vehículos
          </Link>
          <div className="card p-8 text-center">
            <AlertTriangle className="h-10 w-10 text-yellow-400 mx-auto mb-3" />
            <p className="text-slate-600">{error || 'Vehículo no encontrado'}</p>
          </div>
        </div>
      </div>
    );
  }

  const insStatus = insuranceStatus(vehicle.insurance?.expiry);
  const healthScore = vehicle.insurance && insStatus !== 'expired'
    ? vehicle.km < 50000 ? 88 : 72
    : 55;

  const platformList: string[] = Array.isArray(vehicle.platform)
    ? vehicle.platform
    : typeof vehicle.platform === 'string'
      ? [vehicle.platform]
      : [];

  const totalMaintCost = (vehicle.maintenanceHistory ?? [])
    .filter((m: any) => m.status === 'Completado')
    .reduce((a: number, b: any) => a + b.cost, 0);

  return (
    <div>
      <Header
        breadcrumbs={[
          { label: 'Vehículos', href: '/vehiculos' },
          { label: `${vehicle.eco} - ${vehicle.brand} ${vehicle.model}` },
        ]}
      />

      <div className="p-6">
        <Link
          href="/vehiculos"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a vehículos
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* ── Columna principal (3 cols) ──────────────────────────────── */}
          <div className="lg:col-span-3 space-y-6">

            {/* Header del vehículo */}
            <div className="card p-6">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50">
                  <Car className="h-8 w-8 text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-xl font-bold text-slate-900">
                      {vehicle.eco} — {vehicle.brand} {vehicle.model} {vehicle.year}
                    </h1>
                    <StatusBadge status={vehicle.status} />
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    Placas: <strong>{vehicle.plates || '—'}</strong>
                    {vehicle.vin && <> &middot; VIN: {vehicle.vin}</>}
                    {vehicle.color && <> &middot; {vehicle.color}</>}
                  </p>
                  {platformList.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {platformList.map((p: string) => (
                        <span key={p} className="badge badge-blue text-xs capitalize">{p}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={openEdit} className="btn-secondary text-sm">Editar</button>
              </div>
            </div>

            {/* Tabs */}
            <div className="card">
              <div className="flex border-b border-slate-200 px-4 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="p-6">

                {/* ── General ── */}
                {activeTab === 'General' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div className="space-y-4">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Datos del vehículo
                      </h3>
                      <dl className="space-y-3">
                        {[
                          ['Marca',   vehicle.brand  || '—'],
                          ['Modelo',  vehicle.model  || '—'],
                          ['Año',     vehicle.year   || '—'],
                          ['Color',   vehicle.color  || '—'],
                          ['Placas',  vehicle.plates || '—'],
                          ['VIN',     vehicle.vin    || '—'],
                        ].map(([label, value]) => (
                          <div key={String(label)} className="flex justify-between">
                            <dt className="text-sm text-slate-500">{label}</dt>
                            <dd className="text-sm font-medium text-slate-900 text-right max-w-[55%] break-all">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Operación y seguro
                      </h3>
                      <dl className="space-y-3">
                        {[
                          ['Kilometraje',  `${fmt(vehicle.km)} km`],
                          ['Renta semanal', vehicle.weeklyRent ? `$${fmt(vehicle.weeklyRent)}` : '—'],
                          ['Aseguradora',  vehicle.insurance?.company || 'Sin seguro'],
                          ['Póliza',       vehicle.insurance?.policy  || '—'],
                          ['Vence seguro', fmtDate(vehicle.insurance?.expiry)],
                        ].map(([label, value]) => (
                          <div key={String(label)} className="flex justify-between">
                            <dt className="text-sm text-slate-500">{label}</dt>
                            <dd className="text-sm font-medium text-slate-900 text-right">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                    {vehicle.notes && (
                      <div className="md:col-span-2 rounded-lg bg-slate-50 border border-slate-200 p-4">
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Notas</p>
                        <p className="text-sm text-slate-700">{vehicle.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Financiero ── */}
                {activeTab === 'Financiero' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                        <p className="text-sm text-green-600 font-medium">Ingreso última semana</p>
                        <p className="text-2xl font-bold text-green-700 mt-1">
                          ${fmt(vehicle.weeklyIncome ?? 0)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
                        <p className="text-sm text-blue-600 font-medium">Ingreso este mes</p>
                        <p className="text-2xl font-bold text-blue-700 mt-1">
                          ${fmt(vehicle.monthlyIncome ?? 0)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                        <p className="text-sm text-slate-600 font-medium">Total acumulado</p>
                        <p className="text-2xl font-bold text-slate-700 mt-1">
                          ${fmt(vehicle.totalIncome ?? 0)}
                        </p>
                      </div>
                    </div>

                    {vehicle.weeklyHistory?.length > 0 ? (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-3">
                          Historial semanal (últimas semanas)
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-slate-200">
                                <th className="pb-3 text-left text-xs font-semibold text-slate-500 uppercase">Semana</th>
                                <th className="pb-3 text-right text-xs font-semibold text-slate-500 uppercase">Ingresos</th>
                                <th className="pb-3 text-right text-xs font-semibold text-slate-500 uppercase">Renta</th>
                                <th className="pb-3 text-right text-xs font-semibold text-slate-500 uppercase">Viajes</th>
                                <th className="pb-3 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {vehicle.weeklyHistory.map((w: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50">
                                  <td className="py-3 text-sm text-slate-600">{fmtDate(w.week)}</td>
                                  <td className="py-3 text-sm font-semibold text-green-700 text-right">${fmt(w.income)}</td>
                                  <td className="py-3 text-sm text-slate-700 text-right">${fmt(w.rent)}</td>
                                  <td className="py-3 text-sm text-slate-600 text-right">{w.trips || '—'}</td>
                                  <td className="py-3 text-center">
                                    <StatusBadge status={w.status} size="sm" />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Sin registros financieros aún</p>
                      </div>
                    )}

                    {/* Historial de margen mensual */}
                    {vehicle.margenHistory?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-3">Margen mensual (últimos 6 meses)</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-slate-200">
                                <th className="pb-2 text-left text-xs font-semibold text-slate-500 uppercase">Mes</th>
                                <th className="pb-2 text-right text-xs font-semibold text-slate-500 uppercase">Renta</th>
                                <th className="pb-2 text-right text-xs font-semibold text-slate-500 uppercase">Gastos</th>
                                <th className="pb-2 text-right text-xs font-semibold text-slate-500 uppercase">Margen</th>
                                <th className="pb-2 text-center text-xs font-semibold text-slate-500 uppercase">%</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {vehicle.margenHistory.map((m: any) => {
                                const pct = m.renta > 0 ? Math.round((m.margen / m.renta) * 100) : 0;
                                const color = m.margen < 0 ? 'text-red-600' : pct < 30 ? 'text-yellow-600' : 'text-green-600';
                                const emoji = m.margen < 0 ? '🔴' : pct < 30 ? '🟡' : '🟢';
                                return (
                                  <tr key={m.label} className="hover:bg-slate-50">
                                    <td className="py-2 text-sm text-slate-600">{m.label}</td>
                                    <td className="py-2 text-sm text-slate-700 text-right">${fmt(m.renta)}</td>
                                    <td className="py-2 text-sm text-slate-600 text-right">${fmt(m.gastos)}</td>
                                    <td className={`py-2 text-sm font-semibold text-right ${color}`}>${fmt(m.margen)}</td>
                                    <td className="py-2 text-center text-xs">{emoji} {pct}%</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Mantenimiento ── */}
                {activeTab === 'Mantenimiento' && (
                  <div>
                    {vehicle.maintenanceHistory?.length > 0 ? (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-slate-200">
                                <th className="pb-3 text-left text-xs font-semibold text-slate-500 uppercase">Fecha</th>
                                <th className="pb-3 text-left text-xs font-semibold text-slate-500 uppercase">Tipo</th>
                                <th className="pb-3 text-left text-xs font-semibold text-slate-500 uppercase">Taller</th>
                                <th className="pb-3 text-right text-xs font-semibold text-slate-500 uppercase">Km</th>
                                <th className="pb-3 text-right text-xs font-semibold text-slate-500 uppercase">Costo</th>
                                <th className="pb-3 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {vehicle.maintenanceHistory.map((m: any) => (
                                <tr key={m.id} className="hover:bg-slate-50">
                                  <td className="py-3 text-sm text-slate-600">{fmtDate(m.date)}</td>
                                  <td className="py-3 text-sm font-medium text-slate-900">
                                    {m.type}
                                    {m.desc && <p className="text-xs text-slate-400 font-normal">{m.desc}</p>}
                                  </td>
                                  <td className="py-3 text-sm text-slate-600">{m.workshop || '—'}</td>
                                  <td className="py-3 text-sm text-slate-600 text-right font-mono">{m.km ? fmt(m.km) : '—'}</td>
                                  <td className="py-3 text-sm font-semibold text-slate-900 text-right">
                                    {m.cost > 0 ? `$${fmt(m.cost)}` : '—'}
                                  </td>
                                  <td className="py-3 text-center">
                                    <StatusBadge status={m.status} size="sm" />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-sm text-slate-500">Total gastado en mantenimiento</span>
                          <span className="text-base font-bold text-slate-900">${fmt(totalMaintCost)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        <Wrench className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Sin registros de mantenimiento</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Incidencias ── */}
                {activeTab === 'Incidencias' && (
                  <div>
                    {loadingIncidents ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                      </div>
                    ) : vehicleIncidents.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Sin incidencias registradas para este vehículo</p>
                        <a href="/incidencias" className="mt-3 inline-block text-xs text-blue-600 hover:underline font-semibold">
                          Registrar incidencia →
                        </a>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {vehicleIncidents.map((inc) => {
                          const prioColor = inc.prioridad === 'Alta' ? 'bg-red-50 border-red-200 text-red-700' : inc.prioridad === 'Media' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-green-50 border-green-200 text-green-700';
                          const statusColor = inc.status === 'Resuelta' || inc.status === 'Cerrada' ? 'text-green-600' : 'text-amber-600';
                          return (
                            <div key={inc.id} className="flex items-start justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-slate-900">{inc.tipo}</span>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${prioColor}`}>{inc.prioridad}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">{inc.descripcion || '—'}</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {new Date(inc.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                              <div className="text-right ml-3 flex-shrink-0">
                                {inc.costo > 0 && <p className="text-sm font-bold text-slate-900">${inc.costo.toLocaleString('es-MX')}</p>}
                                <p className={`text-xs font-semibold ${statusColor}`}>{inc.status}</p>
                              </div>
                            </div>
                          );
                        })}
                        <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-xs text-slate-500">{vehicleIncidents.length} incidencia{vehicleIncidents.length !== 1 ? 's' : ''}</span>
                          <span className="text-xs font-bold text-slate-900">
                            Costo total: ${vehicleIncidents.reduce((s, i) => s + i.costo, 0).toLocaleString('es-MX')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Gastos ── */}
                {activeTab === 'Gastos' && (
                  <div>
                    {vehicleGastos.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="pb-3 text-left text-xs font-semibold text-slate-500 uppercase">Fecha</th>
                              <th className="pb-3 text-left text-xs font-semibold text-slate-500 uppercase">Categoría</th>
                              <th className="pb-3 text-left text-xs font-semibold text-slate-500 uppercase">Descripción</th>
                              <th className="pb-3 text-right text-xs font-semibold text-slate-500 uppercase">Monto</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {vehicleGastos.map((g: any) => (
                              <tr key={g.id} className="hover:bg-slate-50">
                                <td className="py-3 text-sm text-slate-600">{fmtDate(g.fecha)}</td>
                                <td className="py-3 text-sm capitalize text-slate-700">{g.categoria}</td>
                                <td className="py-3 text-sm text-slate-500">{g.descripcion || '—'}</td>
                                <td className="py-3 text-sm font-semibold text-slate-900 text-right">${fmt(Number(g.monto))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        <p className="text-sm">Sin gastos registrados para este vehículo</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Documentos ── */}
                {activeTab === 'Documentos' && (
                  <div className="space-y-4">
                    {/* Seguro */}
                    {vehicle.insurance ? (
                      <div className={`rounded-xl border p-4 ${
                        insStatus === 'expired' ? 'border-red-200 bg-red-50/50' :
                        insStatus === 'warning' ? 'border-yellow-200 bg-yellow-50/50' :
                        'border-slate-200 bg-white'
                      }`}>
                        <div className="flex items-start gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${
                            insStatus === 'expired' ? 'bg-red-100' :
                            insStatus === 'warning' ? 'bg-yellow-100' : 'bg-slate-100'
                          }`}>
                            <Shield className={`h-5 w-5 ${
                              insStatus === 'expired' ? 'text-red-500' :
                              insStatus === 'warning' ? 'text-yellow-600' : 'text-slate-500'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-slate-900">Póliza de seguro</h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {vehicle.insurance.company} — {vehicle.insurance.policy}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              {insStatus === 'valid' ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                              )}
                              <span className={`text-xs ${
                                insStatus === 'expired' ? 'text-red-600' :
                                insStatus === 'warning' ? 'text-yellow-600' : 'text-green-600'
                              }`}>
                                Vence: {fmtDate(vehicle.insurance.expiry)}
                                {insStatus === 'expired' && ' — VENCIDA'}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs text-slate-500 bg-slate-100 rounded px-2 py-1">
                            {vehicle.insurance.type}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                          <p className="text-sm text-red-700 font-medium">Sin seguro registrado</p>
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs text-slate-500 text-center">
                        Sube documentos adicionales desde el módulo de <strong>Configuración</strong>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Sidebar derecho ──────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Health Score */}
            <div className="card p-6 flex flex-col items-center">
              <ScoreCircle score={healthScore} size="lg" showLabel label="Health Score" />
              <p className="text-xs text-slate-500 mt-2">Basado en seguro y km</p>
            </div>

            {/* Chofer actual */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Chofer Actual</h3>
              {vehicle.driver ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 flex-shrink-0">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{vehicle.driver.name}</p>
                      <p className="text-xs text-slate-500">{vehicle.driver.phone || 'Sin teléfono'}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Estado</span>
                      <StatusBadge status={vehicle.driver.status} size="sm" />
                    </div>
                    {vehicle.driver.rating && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Rating</span>
                        <span className="font-medium text-slate-700">{vehicle.driver.rating} / 5.0</span>
                      </div>
                    )}
                    {vehicle.driver.license && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Licencia</span>
                        <span className="font-medium text-slate-700 text-right text-xs">{vehicle.driver.license}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-slate-400">
                  <User className="h-5 w-5" />
                  <span className="text-sm">Sin chofer asignado</span>
                </div>
              )}
            </div>

            {/* Info rápida */}
            <div className="card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Información Rápida</h3>
              <div className="flex items-center gap-3 text-sm">
                <Wrench className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-slate-500">Próx. mantenimiento</p>
                  <p className="font-medium text-slate-900">
                    {vehicle.nextMaintenance
                      ? `${vehicle.nextMaintenance.type} — ${fmtDate(vehicle.nextMaintenance.date)}`
                      : 'No programado'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Shield className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-slate-500">Vencimiento seguro</p>
                  <p className={`font-medium ${insStatus === 'expired' ? 'text-red-600' : insStatus === 'warning' ? 'text-yellow-600' : 'text-slate-900'}`}>
                    {fmtDate(vehicle.insurance?.expiry)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <DollarSign className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-slate-500">Ingreso última semana</p>
                  <p className="font-medium text-green-600">${fmt(vehicle.weeklyIncome ?? 0)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Fuel className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-slate-500">Kilometraje</p>
                  <p className="font-medium text-slate-900">{fmt(vehicle.km)} km</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal de edición ───────────────────────────────────────────────── */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Editar vehículo</h3>
              <button onClick={() => setShowEdit(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
              <select value={editForm.status} onChange={e => setEditForm(p => ({...p, status: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="active">Activo</option>
                <option value="maintenance">En taller</option>
                <option value="available">Disponible</option>
                <option value="inactive">Inactivo</option>
                <option value="suspended">Suspendido</option>
              </select>
            </div>
            {/* Placas */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Placas</label>
              <input value={editForm.plates} onChange={e => setEditForm(p => ({...p, plates: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            {/* KM */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Kilometraje actual</label>
              <input type="number" value={editForm.km} onChange={e => setEditForm(p => ({...p, km: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            {/* Renta semanal */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Renta semanal ($)</label>
              <input type="number" value={editForm.weeklyRent} onChange={e => setEditForm(p => ({...p, weeklyRent: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            {/* Verificación */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Verificación vehicular — Vencimiento</label>
              <input type="date" value={editForm.verificacionExpiry} onChange={e => setEditForm(p => ({...p, verificacionExpiry: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            {/* Notas */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notas</label>
              <textarea value={editForm.notes} onChange={e => setEditForm(p => ({...p, notes: e.target.value}))} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowEdit(false)} className="flex-1 btn-secondary text-sm">Cancelar</button>
              <button onClick={saveEdit} disabled={editSaving} className="flex-1 btn-primary text-sm">
                {editSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
