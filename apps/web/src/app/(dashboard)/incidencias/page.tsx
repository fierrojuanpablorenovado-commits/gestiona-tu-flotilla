'use client';

import { Header } from '@/components/layout/Header';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Pencil,
  AlertCircle,
  SearchCheck,
  AlertTriangle,
  DollarSign,
  X,
} from 'lucide-react';


interface Incident {
  id: string;
  folio?: string | null;
  tipo: string;
  eco?: string | null;
  vehiculo?: string | null;
  chofer?: string | null;
  fecha: string;
  descripcion?: string | null;
  costo: number;
  status: string;
  prioridad: string;
}


const tipoColors: Record<string, string> = {
  Siniestro: 'bg-red-50 text-red-700',
  Multa: 'bg-orange-50 text-orange-700',
  Golpe: 'bg-yellow-50 text-yellow-700',
  Robo: 'bg-red-100 text-red-800',
  'Falla mecanica': 'bg-blue-50 text-blue-700',
};

const tipoDot: Record<string, string> = {
  Siniestro: 'bg-red-500',
  Multa: 'bg-orange-500',
  Golpe: 'bg-yellow-500',
  Robo: 'bg-red-600',
  'Falla mecanica': 'bg-blue-500',
};

const statusColors: Record<string, string> = {
  Abierta: 'bg-blue-50 text-blue-700',
  'En investigacion': 'bg-purple-50 text-purple-700',
  Resuelta: 'bg-green-50 text-green-700',
  Cerrada: 'bg-slate-100 text-slate-600',
};

const statusDot: Record<string, string> = {
  Abierta: 'bg-blue-500',
  'En investigacion': 'bg-purple-500',
  Resuelta: 'bg-green-500',
  Cerrada: 'bg-slate-400',
};

const prioridadColors: Record<string, string> = {
  Alta: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  Media: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200',
  Baja: 'bg-green-50 text-green-700 ring-1 ring-green-200',
};

function formatCurrency(amount: number) {
  if (amount === 0) return '-';
  return '$' + amount.toLocaleString('es-MX');
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function IncidenciasPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ vehiculo: '', chofer: '', tipo: 'Siniestro', descripcion: '', prioridad: 'Media', costo: '' });

  function fetchData() {
    setLoading(true);
    fetch('/api/incidents')
      .then(r => r.json())
      .then(json => setIncidents(json.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, []);

  useEffect(() => { document.title = 'Incidencias | Gestiona tu Flotilla'; }, []);

  const handleSave = async () => {
    if (!form.vehiculo || !form.descripcion) { alert('Vehículo y descripción son requeridos'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eco: form.vehiculo.toUpperCase(),
          chofer: form.chofer,
          tipo: form.tipo,
          descripcion: form.descripcion,
          costo: parseFloat(form.costo) || 0,
          status: 'Abierta',
          prioridad: form.prioridad,
          fecha: new Date().toISOString().split('T')[0],
        }),
      });
      if (res.ok) {
        fetchData();
        setForm({ vehiculo: '', chofer: '', tipo: 'Siniestro', descripcion: '', prioridad: 'Media', costo: '' });
        setShowModal(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const filtered = incidents.filter((i) => {
    const q = searchQuery.toLowerCase();
    const vehiculoStr = (i.eco || i.vehiculo || '').toLowerCase();
    const choferStr = (i.chofer || '').toLowerCase();
    const descStr = (i.descripcion || '').toLowerCase();
    const folioStr = (i.folio || '').toLowerCase();
    const matchesSearch =
      q === '' ||
      folioStr.includes(q) ||
      vehiculoStr.includes(q) ||
      choferStr.includes(q) ||
      descStr.includes(q);
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const abiertas = incidents.filter((i) => i.status === 'Abierta').length;
  const enInvestigacion = incidents.filter((i) => i.status === 'En investigacion').length;
  const urgentes = incidents.filter((i) => i.prioridad === 'Alta' && i.status !== 'Cerrada' && i.status !== 'Resuelta').length;
  const costoAcumulado = incidents
    .filter((i) => i.status !== 'Cerrada')
    .reduce((sum, i) => sum + i.costo, 0);

  return (
    <div>
      <Header
        breadcrumbs={[{ label: 'Incidencias' }]}
        actions={
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            Reportar Incidencia
          </button>
        }
      />

      <div className="p-4 md:p-6 pb-20 space-y-5 max-w-7xl mx-auto">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}

        {!loading && (
        <>
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <AlertCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{abiertas}</p>
              <p className="text-xs text-slate-500">Abiertas</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <SearchCheck className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{enInvestigacion}</p>
              <p className="text-xs text-slate-500">En investigacion</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{urgentes}</p>
              <p className="text-xs text-slate-500">Urgentes</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <DollarSign className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">${costoAcumulado.toLocaleString()}</p>
              <p className="text-xs text-slate-500">Costo acumulado</p>
            </div>
          </div>
        </div>

        {/* Filters & Table */}
        <div className="card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-slate-100">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 flex-1 max-w-md focus-within:border-blue-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-500 transition-all">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por folio, vehiculo, chofer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto min-w-[180px]"
            >
              <option value="all">Todos los status</option>
              <option value="Abierta">Abierta</option>
              <option value="En investigacion">En investigacion</option>
              <option value="Resuelta">Resuelta</option>
              <option value="Cerrada">Cerrada</option>
            </select>

            <button className="btn-secondary">
              <Filter className="h-4 w-4" />
              Filtros
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    # Folio
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Vehiculo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Chofer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Descripcion
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Costo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Prioridad
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-400 text-sm">
                      Sin incidencias registradas
                    </td>
                  </tr>
                )}
                {filtered.map((incident) => (
                  <tr
                    key={incident.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-mono font-bold text-blue-600">
                        {incident.folio || incident.id.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                          tipoColors[incident.tipo] || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            tipoDot[incident.tipo] || 'bg-slate-400'
                          }`}
                        />
                        {incident.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-mono font-bold text-slate-700">
                        {incident.eco || incident.vehiculo || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">
                      {incident.chofer || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600 whitespace-nowrap">
                      {formatDate(incident.fecha)}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600 max-w-[260px] truncate">
                      {incident.descripcion || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {incident.costo > 0 ? (
                        <span className="text-sm font-semibold text-slate-900 font-mono">
                          {formatCurrency(incident.costo)}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                          statusColors[incident.status] || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            statusDot[incident.status] || 'bg-slate-400'
                          }`}
                        />
                        {incident.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                            prioridadColors[incident.prioridad] || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {incident.prioridad}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Mostrando {filtered.length} de {incidents.length} incidencias
            </p>
          </div>
        </div>
        </>
        )}
      </div>

      {/* Modal Reportar Incidencia */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">⚠️ Reportar Incidencia</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Vehículo (ECO) *</label>
                  <input value={form.vehiculo} onChange={e=>setForm(p=>({...p,vehiculo:e.target.value}))} placeholder="ECO-012" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Chofer</label>
                  <input value={form.chofer} onChange={e=>setForm(p=>({...p,chofer:e.target.value}))} placeholder="Nombre del chofer" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo de incidencia</label>
                  <select value={form.tipo} onChange={e=>setForm(p=>({...p,tipo:e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Siniestro</option><option>Multa</option><option>Golpe</option><option>Robo</option><option>Falla mecanica</option><option>Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Prioridad</label>
                  <select value={form.prioridad} onChange={e=>setForm(p=>({...p,prioridad:e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Alta</option><option>Media</option><option>Baja</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Descripción *</label>
                  <textarea value={form.descripcion} onChange={e=>setForm(p=>({...p,descripcion:e.target.value}))} rows={3} placeholder="Describe qué ocurrió, dónde, cómo..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Costo estimado ($)</label>
                  <input type="number" value={form.costo} onChange={e=>setForm(p=>({...p,costo:e.target.value}))} placeholder="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60">{saving ? 'Guardando...' : '⚠️ Reportar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
