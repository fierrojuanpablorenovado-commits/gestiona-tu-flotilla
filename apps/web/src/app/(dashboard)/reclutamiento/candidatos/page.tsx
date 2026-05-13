'use client';

import { Header } from '@/components/layout/Header';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Users,
  CalendarDays,
  TrendingUp,
  DollarSign,
} from 'lucide-react';

type Candidate = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  platform: string[] | null;
  stage: string;
  score: number | null;
  source: string | null;
  interviewDate: string | null;
  notes: string | null;
  createdAt: string;
};

type Summary = {
  total: number;
  aplicacion: number;
  entrevista: number;
  documentos: number;
  contratado: number;
};

const fuenteColors: Record<string, string> = {
  Facebook: 'bg-blue-100 text-blue-700',
  Referido: 'bg-purple-100 text-purple-700',
  WhatsApp: 'bg-green-100 text-green-700',
  Volanteo: 'bg-amber-100 text-amber-700',
};

const etapaColors: Record<string, string> = {
  aplicacion: 'bg-slate-100 text-slate-600',
  pre_screening: 'bg-sky-100 text-sky-700',
  entrevista: 'bg-indigo-100 text-indigo-700',
  evaluacion: 'bg-violet-100 text-violet-700',
  documentos: 'bg-amber-100 text-amber-700',
  oferta: 'bg-orange-100 text-orange-700',
  contratado: 'bg-green-100 text-green-700',
  rechazado: 'bg-red-100 text-red-700',
};

const etapaLabels: Record<string, string> = {
  aplicacion: 'Aplicación',
  pre_screening: 'Pre-screening',
  entrevista: 'Entrevista',
  evaluacion: 'Evaluación',
  documentos: 'Documentos',
  oferta: 'Oferta',
  contratado: 'Contratado',
  rechazado: 'Rechazado',
};

function getScoreBadgeColor(score: number) {
  if (score >= 80) return 'bg-green-50 text-green-700';
  if (score >= 60) return 'bg-yellow-50 text-yellow-700';
  if (score >= 40) return 'bg-orange-50 text-orange-700';
  return 'bg-red-50 text-red-700';
}

export default function CandidatosPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, aplicacion: 0, entrevista: 0, documentos: 0, contratado: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [etapaFilter, setEtapaFilter] = useState('all');
  const [fuenteFilter, setFuenteFilter] = useState('all');
  const [page, setPage] = useState(1);
  const perPage = 10;

  function fetchData() {
    setLoading(true);
    fetch('/api/recruitment/candidates')
      .then(r => r.json())
      .then(json => {
        setCandidates(json.data || []);
        setSummary(json.summary || { total: 0, aplicacion: 0, entrevista: 0, documentos: 0, contratado: 0 });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, []);

  const filtered = candidates.filter((c) => {
    const matchesSearch =
      searchQuery === '' ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone || '').includes(searchQuery) ||
      (c.source || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEtapa = etapaFilter === 'all' || c.stage === etapaFilter;
    const matchesFuente = fuenteFilter === 'all' || c.source === fuenteFilter;
    return matchesSearch && matchesEtapa && matchesFuente;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginatedData = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div>
      <Header
        breadcrumbs={[
          { label: 'Reclutamiento', href: '/reclutamiento' },
          { label: 'Candidatos' },
        ]}
        actions={
          <button className="btn-primary">
            <Plus className="h-4 w-4" />
            Nuevo Candidato
          </button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{summary.total}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <CalendarDays className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{summary.entrevista}</p>
              <p className="text-xs text-slate-500">En entrevista</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{summary.contratado}</p>
              <p className="text-xs text-slate-500">Contratados</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <DollarSign className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{summary.documentos}</p>
              <p className="text-xs text-slate-500">En documentos</p>
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
                placeholder="Buscar por nombre, telefono, fuente..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>

            <select
              value={etapaFilter}
              onChange={(e) => {
                setEtapaFilter(e.target.value);
                setPage(1);
              }}
              className="input w-auto min-w-[160px]"
            >
              <option value="all">Todas las etapas</option>
              <option value="aplicacion">Aplicación</option>
              <option value="pre_screening">Pre-screening</option>
              <option value="entrevista">Entrevista</option>
              <option value="evaluacion">Evaluación</option>
              <option value="documentos">Documentos</option>
              <option value="oferta">Oferta</option>
              <option value="contratado">Contratado</option>
              <option value="rechazado">Rechazado</option>
            </select>

            <select
              value={fuenteFilter}
              onChange={(e) => {
                setFuenteFilter(e.target.value);
                setPage(1);
              }}
              className="input w-auto min-w-[140px]"
            >
              <option value="all">Todas las fuentes</option>
              <option value="Facebook">Facebook</option>
              <option value="Referido">Referido</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Volanteo">Volanteo</option>
            </select>

            <button className="btn-secondary">
              <Filter className="h-4 w-4" />
              Filtros
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <p className="text-sm text-slate-500 text-center py-8">Cargando...</p>
            ) : paginatedData.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No hay candidatos registrados aún</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Telefono</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Fuente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Plataformas</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Score</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Etapa</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedData.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/reclutamiento/${candidate.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          {candidate.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">{candidate.phone || '—'}</td>
                      <td className="px-4 py-3.5">
                        {candidate.source ? (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${fuenteColors[candidate.source] || 'bg-slate-100 text-slate-600'}`}>
                            {candidate.source}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {(candidate.platform || []).map((p) => (
                            <span
                              key={p}
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${p === 'Uber' ? 'bg-slate-900 text-white' : 'bg-orange-500 text-white'}`}
                            >
                              {p}
                            </span>
                          ))}
                          {(!candidate.platform || candidate.platform.length === 0) && <span className="text-xs text-slate-400">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-center">
                          {candidate.score != null ? (
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${getScoreBadgeColor(candidate.score)}`}>
                              {candidate.score}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${etapaColors[candidate.stage] || 'bg-slate-100 text-slate-600'}`}>
                          {etapaLabels[candidate.stage] || candidate.stage}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/reclutamiento/${candidate.id}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
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
            )}
          </div>

          {/* Pagination */}
          {!loading && filtered.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <p className="text-sm text-slate-500">
                Mostrando {(page - 1) * perPage + 1} a {Math.min(page * perPage, filtered.length)} de {filtered.length} candidatos
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="btn-ghost px-2 py-1.5 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="btn-ghost px-2 py-1.5 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
