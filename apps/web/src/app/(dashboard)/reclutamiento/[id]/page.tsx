'use client';

import { Header } from '@/components/layout/Header';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ScoreCircle } from '@/components/ui/ScoreCircle';
import { Timeline, TimelineEvent } from '@/components/ui/Timeline';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Star,
  CheckCircle2,
  Clock,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  CalendarPlus,
  ArrowRight,
  FileText,
  Car,
  Shield,
} from 'lucide-react';

// Hardcoded candidate data
const candidate = {
  id: 'c14',
  name: 'Roberto Flores',
  phone: '55 2020 3030',
  email: 'roberto.flores@gmail.com',
  address: 'Col. Roma Norte, CDMX',
  age: 32,
  dob: '15 Jul 1993',
  stage: 'entrevista',
  score: 85,
  source: 'Referido',
  referredBy: 'Carlos Martinez (ECO-012)',
  appliedDate: '18 Mar 2026',
  daysInPipeline: 6,
  platforms: [
    { name: 'Uber', rating: 4.89, trips: 3420, active: true },
    { name: 'Didi', rating: 4.76, trips: 1890, active: true },
  ],
  scoreBreakdown: {
    experiencia: 28,
    rating: 22,
    documentacion: 18,
    entrevista: 17,
  },
  documents: [
    { name: 'INE (Identificacion)', status: 'approved', icon: FileText },
    { name: 'Licencia de conducir', status: 'approved', icon: Car },
    { name: 'Comprobante de domicilio', status: 'pending', icon: MapPin },
    { name: 'Carta de antecedentes no penales', status: 'rejected', icon: Shield },
    { name: 'CURP', status: 'approved', icon: FileText },
    { name: 'Comprobante de cuenta bancaria', status: 'pending', icon: FileText },
  ],
  interview: {
    scheduled: true,
    date: '26 Mar 2026',
    time: '10:00 AM',
    type: 'Presencial',
    location: 'Oficina Central - Sala 2',
    interviewer: 'Ana Garcia',
  },
};

const timelineEvents: TimelineEvent[] = [
  {
    id: '1',
    date: '24 Mar 2026 - 14:30',
    title: 'Documentos parcialmente verificados',
    description: 'INE y licencia aprobados. Pendiente: domicilio y antecedentes.',
    type: 'info',
  },
  {
    id: '2',
    date: '23 Mar 2026 - 11:00',
    title: 'Entrevista agendada',
    description: 'Entrevista presencial - 26 Mar 2026 a las 10:00 AM',
    type: 'info',
  },
  {
    id: '3',
    date: '22 Mar 2026 - 09:15',
    title: 'Movido a etapa: Entrevista',
    description: 'Score de 85 puntos. Candidato calificado.',
    type: 'success',
  },
  {
    id: '4',
    date: '20 Mar 2026 - 16:45',
    title: 'Contacto telefonico realizado',
    description: 'Se confirmo interes del candidato. Disponibilidad inmediata.',
    type: 'neutral',
  },
  {
    id: '5',
    date: '18 Mar 2026 - 10:00',
    title: 'Candidato registrado',
    description: 'Referido por Carlos Martinez (ECO-012). Fuente: Programa de referidos.',
    type: 'neutral',
  },
];

const stageHistory = [
  { stage: 'Nuevo', date: '18 Mar 2026', duration: '2 dias' },
  { stage: 'Contactado', date: '20 Mar 2026', duration: '2 dias' },
  { stage: 'Entrevista', date: '22 Mar 2026', duration: '2 dias (actual)' },
];

const docStatusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  approved: { icon: CheckCircle2, color: 'text-green-500', label: 'Aprobado' },
  pending: { icon: Clock, color: 'text-yellow-500', label: 'Pendiente' },
  rejected: { icon: XCircle, color: 'text-red-500', label: 'Rechazado' },
};

export default function CandidateDetailPage() {
  return (
    <div>
      <Header
        breadcrumbs={[
          { label: 'Reclutamiento', href: '/reclutamiento' },
          { label: candidate.name },
        ]}
      />

      <div className="p-6">
        <Link
          href="/reclutamiento"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al pipeline
        </Link>

        {/* Header Card */}
        <div className="card p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
              <User className="h-7 w-7 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{candidate.name}</h1>
                <StatusBadge status="in_progress" label="Entrevista" />
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {candidate.source}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 flex-wrap text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {candidate.phone}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {candidate.email}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {candidate.address}
                </span>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors">
                <ThumbsDown className="h-4 w-4" />
                Rechazar
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-100 transition-colors">
                <CalendarPlus className="h-4 w-4" />
                Agendar
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors">
                <ArrowRight className="h-4 w-4" />
                Mover Etapa
              </button>
              <button className="btn-primary">
                <ThumbsUp className="h-4 w-4" />
                Aprobar
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Personal Info + Platforms */}
          <div className="space-y-6">
            {/* Personal Info */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Informacion Personal</h3>
              <dl className="space-y-2.5">
                {[
                  ['Edad', `${candidate.age} anos`],
                  ['Fecha de nacimiento', candidate.dob],
                  ['Fecha de aplicacion', candidate.appliedDate],
                  ['Dias en pipeline', `${candidate.daysInPipeline} dias`],
                  ['Referido por', candidate.referredBy],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between text-sm">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-medium text-slate-900">{value}</span>
                  </div>
                ))}
              </dl>
            </div>

            {/* Platform Accounts */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Cuentas de Plataforma</h3>
              <div className="space-y-3">
                {candidate.platforms.map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        p.name === 'Uber' ? 'bg-black' : 'bg-orange-500'
                      }`}>
                        <span className="text-xs font-bold text-white">
                          {p.name === 'Uber' ? 'U' : 'D'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.trips.toLocaleString()} viajes</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-bold text-slate-900">{p.rating}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Score: {candidate.score}/100</h3>
                <ScoreCircle score={candidate.score} size="sm" />
              </div>
              <div className="space-y-2.5">
                {Object.entries(candidate.scoreBreakdown).map(([key, value]) => {
                  const labels: Record<string, string> = {
                    experiencia: 'Experiencia',
                    rating: 'Rating plataformas',
                    documentacion: 'Documentacion',
                    entrevista: 'Entrevista',
                  };
                  const maxScores: Record<string, number> = {
                    experiencia: 30,
                    rating: 25,
                    documentacion: 25,
                    entrevista: 20,
                  };
                  return (
                    <div key={key}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-slate-500">{labels[key]}</span>
                        <span className="text-xs font-medium text-slate-700">
                          {value}/{maxScores[key]}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(value / maxScores[key]) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Center Column - Timeline + Stage History */}
          <div className="space-y-6">
            {/* Interview Card */}
            {candidate.interview.scheduled && (
              <div className="card p-5 border-l-4 border-l-blue-500">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Entrevista Programada</h3>
                </div>
                <dl className="space-y-2">
                  {[
                    ['Fecha', candidate.interview.date],
                    ['Hora', candidate.interview.time],
                    ['Tipo', candidate.interview.type],
                    ['Lugar', candidate.interview.location],
                    ['Entrevistador', candidate.interview.interviewer],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex justify-between text-sm">
                      <span className="text-slate-500">{label}</span>
                      <span className="font-medium text-slate-700">{value}</span>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Timeline */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Historial de Actividad</h3>
              <Timeline events={timelineEvents} />
            </div>

            {/* Stage History */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Historial de Etapas</h3>
              <div className="space-y-2">
                {stageHistory.map((s, i) => (
                  <div
                    key={s.stage}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${
                        i === stageHistory.length - 1 ? 'bg-blue-500' : 'bg-green-500'
                      }`} />
                      <span className="text-sm font-medium text-slate-700">{s.stage}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">{s.date}</p>
                      <p className="text-xs text-slate-400">{s.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Documents */}
          <div className="space-y-6">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Checklist de Documentos</h3>
              <div className="space-y-2">
                {candidate.documents.map((doc) => {
                  const config = docStatusConfig[doc.status];
                  const StatusIcon = config.icon;
                  const DocIcon = doc.icon;
                  return (
                    <div
                      key={doc.name}
                      className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                        <DocIcon className="h-4 w-4 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 truncate">{doc.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <StatusIcon className={`h-3.5 w-3.5 ${config.color}`} />
                          <span className={`text-xs ${config.color}`}>{config.label}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs text-slate-500">Progreso</span>
                  <span className="text-xs font-medium text-slate-700">
                    {candidate.documents.filter((d) => d.status === 'approved').length}/
                    {candidate.documents.length}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{
                      width: `${
                        (candidate.documents.filter((d) => d.status === 'approved').length /
                          candidate.documents.length) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Acciones Rapidas</h3>
              <div className="space-y-2">
                <button className="w-full btn-secondary justify-start text-sm">
                  <Phone className="h-4 w-4" />
                  Llamar al candidato
                </button>
                <button className="w-full btn-secondary justify-start text-sm">
                  <Mail className="h-4 w-4" />
                  Enviar correo
                </button>
                <button className="w-full btn-secondary justify-start text-sm">
                  <FileText className="h-4 w-4" />
                  Solicitar documentos
                </button>
                <button className="w-full btn-secondary justify-start text-sm">
                  <Calendar className="h-4 w-4" />
                  Reagendar entrevista
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
