'use client';

import { Header } from '@/components/layout/Header';
import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Pencil,
  CalendarDays,
  Clock,
  UserX,
  List,
  Calendar,
  MapPin,
  Video,
  Phone,
  Star,
} from 'lucide-react';

interface Interview {
  id: string;
  candidato: string;
  fecha: string;
  hora: string;
  tipo: 'Presencial' | 'Videollamada' | 'Telefonica';
  ubicacion: string;
  entrevistador: string;
  status: 'Programada' | 'Confirmada' | 'Completada' | 'No-show' | 'Cancelada';
  rating: number | null;
}

// ─── Mock data removed — data is fetched from API ─────────────────────────────

const statusColors: Record<string, string> = {
  Programada: 'bg-blue-50 text-blue-700',
  Confirmada: 'bg-green-50 text-green-700',
  Completada: 'bg-slate-100 text-slate-600',
  'No-show': 'bg-red-50 text-red-700',
  Cancelada: 'bg-orange-50 text-orange-700',
};

const statusDot: Record<string, string> = {
  Programada: 'bg-blue-500',
  Confirmada: 'bg-green-500',
  Completada: 'bg-slate-400',
  'No-show': 'bg-red-500',
  Cancelada: 'bg-orange-500',
};

function TipoIcon({ tipo }: { tipo: string }) {
  switch (tipo) {
    case 'Presencial':
      return <MapPin className="h-4 w-4 text-blue-500" />;
    case 'Videollamada':
      return <Video className="h-4 w-4 text-purple-500" />;
    case 'Telefonica':
      return <Phone className="h-4 w-4 text-green-500" />;
    default:
      return null;
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  };
  return d.toLocaleDateString('es-MX', options);
}

// Simple week calendar data
const weekDays = [
  { label: 'Lun 23', date: '2026-03-23' },
  { label: 'Mar 24', date: '2026-03-24' },
  { label: 'Mie 25', date: '2026-03-25' },
  { label: 'Jue 26', date: '2026-03-26' },
  { label: 'Vie 27', date: '2026-03-27' },
];
const calendarHours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

const calendarStatusColors: Record<string, string> = {
  Programada: 'bg-blue-100 border-blue-300 text-blue-800',
  Confirmada: 'bg-green-100 border-green-300 text-green-800',
  Completada: 'bg-slate-100 border-slate-300 text-slate-600',
  'No-show': 'bg-red-100 border-red-300 text-red-800',
  Cancelada: 'bg-orange-100 border-orange-300 text-orange-800',
};

export default function EntrevistasPage() {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/recruitment/candidates?stage=entrevista')
      .then(r => r.json())
      .then(json => {
        const data = json.data || [];
        setInterviews(data.map((c: any) => ({
          id: c.id,
          candidato: c.name || `${c.firstName} ${c.lastName}`,
          fecha: c.interviewDate?.split('T')[0] || new Date().toISOString().split('T')[0],
          hora: '09:00',
          tipo: 'Presencial' as const,
          ubicacion: '—',
          entrevistador: '—',
          status: 'Programada' as const,
          rating: null,
        })));
      })
      .catch(() => setInterviews([]))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const weekStart = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().split('T')[0]; })();
  const weekEnd = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 5); return d.toISOString().split('T')[0]; })();

  const filtered = interviews.filter((e) => {
    const matchesSearch =
      searchQuery === '' ||
      e.candidato.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.entrevistador.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const hoy = interviews.filter((e) => e.fecha === today).length;
  const estaSemana = interviews.filter((e) => e.fecha >= weekStart && e.fecha <= weekEnd).length;
  const noShowRate = interviews.length > 0
    ? Math.round((interviews.filter(e => e.status === 'No-show').length / interviews.length) * 100)
    : 0;

  return (
    <div>
      <Header
        breadcrumbs={[
          { label: 'Reclutamiento', href: '/reclutamiento' },
          { label: 'Entrevistas' },
        ]}
        actions={
          <button className="btn-primary">
            <Plus className="h-4 w-4" />
            Agendar Entrevista
          </button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <CalendarDays className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{hoy}</p>
              <p className="text-xs text-slate-500">Hoy</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Clock className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{estaSemana}</p>
              <p className="text-xs text-slate-500">Esta semana</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <UserX className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{noShowRate}%</p>
              <p className="text-xs text-slate-500">No-show rate</p>
            </div>
          </div>
        </div>

        {/* View Toggle + Filters */}
        <div className="card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-slate-100">
            {/* View Toggle */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === 'list'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <List className="h-4 w-4" />
                Lista
              </button>
              <button
                onClick={() => setView('calendar')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === 'calendar'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Calendar className="h-4 w-4" />
                Calendario
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 flex-1 max-w-md focus-within:border-blue-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-500 transition-all">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar candidato o entrevistador..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto min-w-[160px]"
            >
              <option value="all">Todos los status</option>
              <option value="Programada">Programada</option>
              <option value="Confirmada">Confirmada</option>
              <option value="Completada">Completada</option>
              <option value="No-show">No-show</option>
              <option value="Cancelada">Cancelada</option>
            </select>

            <button className="btn-secondary">
              <Filter className="h-4 w-4" />
              Filtros
            </button>
          </div>

          {/* List View */}
          {view === 'list' && (
            <div className="overflow-x-auto">
              {loading ? (
                <div className="py-16 text-center">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <CalendarDays className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="font-semibold text-slate-600">Sin entrevistas programadas</p>
                  <p className="text-sm text-slate-400 mt-1">Las entrevistas agendadas aparecerán aquí.</p>
                </div>
              ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Candidato
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Fecha y hora
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Ubicacion
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Entrevistador
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Rating
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((interview) => (
                    <tr
                      key={interview.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-medium text-slate-900">
                          {interview.candidato}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {formatDate(interview.fecha)}
                          </p>
                          <p className="text-xs text-slate-500">{interview.hora} hrs</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <TipoIcon tipo={interview.tipo} />
                          <span className="text-sm text-slate-600">{interview.tipo}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600 max-w-[200px] truncate">
                        {interview.ubicacion}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">
                        {interview.entrevistador}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                            statusColors[interview.status]
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${statusDot[interview.status]}`}
                          />
                          {interview.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-0.5">
                          {interview.rating !== null ? (
                            Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${
                                  i < interview.rating!
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-slate-200'
                                }`}
                              />
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
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
              )}
            </div>
          )}

          {/* Calendar View */}
          {view === 'calendar' && (
            <div className="p-4">
              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                  {/* Calendar Header */}
                  <div className="grid grid-cols-[80px_repeat(5,1fr)] border-b border-slate-200">
                    <div className="py-3 px-2" />
                    {weekDays.map((day) => (
                      <div
                        key={day.date}
                        className={`py-3 px-2 text-center text-sm font-semibold ${
                          day.date === '2026-03-24'
                            ? 'text-blue-600 bg-blue-50/50'
                            : 'text-slate-600'
                        }`}
                      >
                        {day.label}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  {calendarHours.map((hour) => (
                    <div
                      key={hour}
                      className="grid grid-cols-[80px_repeat(5,1fr)] border-b border-slate-100 min-h-[60px]"
                    >
                      <div className="py-2 px-2 text-xs text-slate-400 text-right pr-3">
                        {hour}
                      </div>
                      {weekDays.map((day) => {
                        const hourInterviews = interviews.filter(
                          (e) => e.fecha === day.date && e.hora === hour.replace(':00', ':00')
                        );
                        // Also check for :30 times
                        const halfHourInterviews = interviews.filter(
                          (e) => e.fecha === day.date && e.hora === hour.replace(':00', ':30')
                        );
                        const allInterviews = [...hourInterviews, ...halfHourInterviews];

                        return (
                          <div
                            key={day.date}
                            className={`py-1 px-1 border-l border-slate-100 ${
                              day.date === '2026-03-24' ? 'bg-blue-50/20' : ''
                            }`}
                          >
                            {allInterviews.map((ev) => (
                              <div
                                key={ev.id}
                                className={`rounded-md border px-2 py-1 mb-1 text-xs cursor-pointer hover:opacity-80 transition-opacity ${
                                  calendarStatusColors[ev.status]
                                }`}
                              >
                                <p className="font-medium truncate">{ev.candidato}</p>
                                <p className="opacity-70">{ev.hora}</p>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              {filtered.length} entrevistas encontradas
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
