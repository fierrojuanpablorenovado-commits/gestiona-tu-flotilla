'use client';

import { Header } from '@/components/layout/Header';
import { KanbanBoard, KanbanColumn } from '@/components/ui/KanbanBoard';
import { useApi } from '@/hooks/useApi';
import { useEffect } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  TrendingUp,
  LayoutGrid,
  List,
  Plus,
  Phone,
  Clock,
  Filter,
  Loader2,
  Star,
  X,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Candidate {
  id: string;
  name: string;
  phone: string;
  score: number;
  source: string;
  stage: string;
  uberRating: number | null;
  didiRating: number | null;
  referredBy: string | null;
  createdAt: string;
}

interface KanbanGroup {
  stage: string;
  candidates: Candidate[];
}

interface RecruitmentResponse {
  grouped: KanbanGroup[];
  total: number;
  stages: string[];
}

interface ListResponse {
  data: Candidate[];
  total: number;
}

// ─── Candidate Card ────────────────────────────────────────────────────────────

function CandidateCard({ candidate }: { candidate: Candidate }) {
  const scoreColor =
    candidate.score >= 70
      ? 'bg-green-100 text-green-700'
      : candidate.score >= 50
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-red-100 text-red-700';

  const sourceColors: Record<string, string> = {
    Referido: 'bg-blue-100 text-blue-700',
    Facebook: 'bg-indigo-100 text-indigo-700',
    WhatsApp: 'bg-green-100 text-green-700',
    Instagram: 'bg-pink-100 text-pink-700',
    TikTok: 'bg-slate-100 text-slate-700',
  };

  const daysSince = Math.floor(
    (Date.now() - new Date(candidate.createdAt).getTime()) / (1000 * 60 * 60 * 24),
  );

  return (
    <Link href={`/reclutamiento/${candidate.id}`} className="block">
      <div className="space-y-2.5">
        <div className="flex items-start justify-between">
          <p className="text-sm font-semibold text-slate-900">{candidate.name}</p>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreColor}`}>
            {candidate.score}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Phone className="h-3 w-3" />
          {candidate.phone}
        </div>
        {(candidate.uberRating || candidate.didiRating) && (
          <div className="flex items-center gap-2">
            {candidate.uberRating && (
              <span className="flex items-center gap-1 text-[10px] bg-black text-white px-1.5 py-0.5 rounded-full">
                <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                {candidate.uberRating} Uber
              </span>
            )}
            {candidate.didiRating && (
              <span className="flex items-center gap-1 text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full">
                <Star className="h-2.5 w-2.5 fill-white text-white" />
                {candidate.didiRating} Didi
              </span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sourceColors[candidate.source] || 'bg-slate-100 text-slate-600'}`}>
            {candidate.source}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            <Clock className="h-3 w-3" />
            {daysSince}d
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<string, { color: string; label: string }> = {
  'Interesado': { color: 'bg-slate-400', label: 'Interesado' },
  'En Revisión': { color: 'bg-blue-500', label: 'En Revisión' },
  'Documentos': { color: 'bg-purple-500', label: 'Documentos' },
  'Entrevista': { color: 'bg-yellow-500', label: 'Entrevista' },
  'Aprobado': { color: 'bg-green-500', label: 'Aprobado' },
  'Rechazado': { color: 'bg-red-500', label: 'Rechazado' },
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReclutamientoPage() {
  useEffect(() => { document.title = 'Reclutamiento | Gestiona tu Flotilla'; }, []);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [showModal, setShowModal] = useState(false);
  const [localCandidates, setLocalCandidates] = useState<Candidate[]>([]);
  const [form, setForm] = useState({ nombre: '', telefono: '', plataforma: 'Uber', rating: '4.5', fuente: 'WhatsApp', notas: '' });

  const kanbanEndpoint = '/recruitment/candidates?view=kanban';
  const listEndpoint = '/recruitment/candidates?view=list';

  const {
    data: kanbanData,
    loading: kanbanLoading,
  } = useApi<RecruitmentResponse>(kanbanEndpoint);

  const {
    data: listData,
    loading: listLoading,
  } = useApi<ListResponse>(listEndpoint, { immediate: view === 'list' });

  const total = kanbanData?.total ?? 0;
  const approved = kanbanData?.grouped?.find((g) => g.stage === 'Aprobado')?.candidates.length ?? 0;
  const interesados = kanbanData?.grouped?.find((g) => g.stage === 'Interesado')?.candidates.length ?? 1;
  const conversionRate = total > 0 ? ((approved / interesados) * 100).toFixed(1) : '0';

  const handleSaveCandidate = () => {
    if (!form.nombre || !form.telefono) { alert('Nombre y teléfono son requeridos'); return; }
    const rating = parseFloat(form.rating) || 0;
    const newC: Candidate = {
      id: `local-${Date.now()}`,
      name: form.nombre,
      phone: form.telefono,
      score: Math.min(100, Math.floor(rating * 15 + 10)),
      source: form.fuente,
      stage: 'Interesado',
      uberRating: form.plataforma === 'Uber' ? rating : null,
      didiRating: form.plataforma === 'Didi' ? rating : null,
      referredBy: form.fuente === 'Referido' ? 'Referido' : null,
      createdAt: new Date().toISOString(),
    };
    setLocalCandidates(prev => [...prev, newC]);
    setForm({ nombre: '', telefono: '', plataforma: 'Uber', rating: '4.5', fuente: 'WhatsApp', notas: '' });
    setShowModal(false);
  };

  // Build KanbanBoard columns from API response
  const columns: KanbanColumn[] =
    kanbanData?.grouped
      ?.filter((g) => g.stage !== 'Rechazado')
      .map((group) => {
        const config = STAGE_CONFIG[group.stage] ?? { color: 'bg-slate-400', label: group.stage };
        return {
          id: group.stage,
          title: config.label,
          color: config.color,
          count: group.candidates.length,
          cards: [...group.candidates, ...(group.stage === 'Interesado' ? localCandidates : [])].map((c) => ({
            id: c.id,
            content: <CandidateCard candidate={c} />,
          })),
        };
      }) ?? [];

  return (
    <div>
      <Header
        breadcrumbs={[{ label: 'Reclutamiento' }, { label: 'Pipeline' }]}
        actions={
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" />
            Nuevo Candidato
          </button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {kanbanLoading ? '—' : total}
              </p>
              <p className="text-xs text-slate-500">Total candidatos</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <UserPlus className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {kanbanLoading ? '—' : approved}
              </p>
              <p className="text-xs text-slate-500">Aprobados</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {kanbanLoading ? '—' : `${conversionRate}%`}
              </p>
              <p className="text-xs text-slate-500">Tasa de conversión</p>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center justify-between">
          <button className="btn-secondary">
            <Filter className="h-4 w-4" />
            Filtros
          </button>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setView('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <List className="h-4 w-4" />
              Lista
            </button>
          </div>
        </div>

        {/* Content */}
        {view === 'kanban' ? (
          kanbanLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <KanbanBoard columns={columns} />
          )
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Teléfono</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Fuente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Etapa</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {listLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="animate-pulse bg-slate-200 rounded h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  (listData?.data ?? []).map((c) => {
                    const stageConfig = STAGE_CONFIG[c.stage] ?? { color: 'bg-slate-400', label: c.stage };
                    const scoreColor = c.score >= 70 ? 'bg-green-100 text-green-700' : c.score >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/reclutamiento/${c.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                            {c.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{c.phone}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreColor}`}>{c.score}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{c.source}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full text-white ${stageConfig.color}`}>
                            {stageConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-slate-500">
                          {c.uberRating ? `⭐ ${c.uberRating}` : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">👤 Nuevo Candidato</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre completo *</label>
                  <input value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))} placeholder="Carlos Ramírez García" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Teléfono *</label>
                  <input value={form.telefono} onChange={e=>setForm(p=>({...p,telefono:e.target.value}))} placeholder="+52 55 1234-5678" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Plataforma</label>
                  <select value={form.plataforma} onChange={e=>setForm(p=>({...p,plataforma:e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Uber</option><option>Didi</option><option>InDriver</option><option>Sin experiencia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Rating actual</label>
                  <input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={e=>setForm(p=>({...p,rating:e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Fuente de captación</label>
                  <select value={form.fuente} onChange={e=>setForm(p=>({...p,fuente:e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>WhatsApp</option><option>Facebook</option><option>Instagram</option><option>Referido</option><option>TikTok</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Notas</label>
                  <textarea value={form.notas} onChange={e=>setForm(p=>({...p,notas:e.target.value}))} rows={2} placeholder="Observaciones..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSaveCandidate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">✓ Agregar Candidato</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
