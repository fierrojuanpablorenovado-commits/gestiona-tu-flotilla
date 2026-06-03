'use client';

import { Header } from '@/components/layout/Header';
import { FileUpload, UploadedFile } from '@/components/ui/FileUpload';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Star,
  Phone,
  Car,
  CreditCard,
  TrendingUp,
  Calendar,
  CheckCircle2,
  FileText,
  AlertCircle,
  Banknote,
  Route,
  Award,
  Shield,
  AlertTriangle,
  X,
  Loader2,
  MessageSquare,
  TrendingDown,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtWeek(start: string, end: string) {
  return `${new Date(start + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} – ${new Date(end + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}`;
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`h-4 w-4 ${s <= Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 fill-slate-200'}`} />
      ))}
      <span className="ml-1.5 text-sm font-bold text-slate-700">{rating.toFixed(1)}</span>
    </div>
  );
}

// ─── Incidence Modal ──────────────────────────────────────────────────────────

function IncidenciaModal({
  onClose,
  driverId,
  vehicleId,
  vehicleEco,
  driverName,
}: {
  onClose: () => void;
  driverId?: number;
  vehicleId?: number;
  vehicleEco?: string;
  driverName?: string;
}) {
  const [form, setForm] = useState({ tipo: 'Golpe', descripcion: '', lugar: '' });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!form.descripcion) return;
    setSaving(true);
    setError('');
    try {
      const descripcionFull = form.lugar
        ? `${form.descripcion} — Lugar: ${form.lugar}`
        : form.descripcion;

      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo:        form.tipo,
          descripcion: descripcionFull,
          fecha:       new Date().toISOString().split('T')[0],
          driverId:    driverId ?? null,
          vehicleId:   vehicleId ?? null,
          eco:         vehicleEco ?? null,
          chofer:      driverName ?? null,
          status:      'Abierta',
          prioridad:   ['Accidente', 'Robo'].includes(form.tipo) ? 'Alta' : 'Media',
        }),
      });

      if (res.ok) {
        setDone(true);
        setTimeout(onClose, 1600);
      } else {
        const d = await res.json();
        setError(d.message || 'Error al enviar');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Reportar Incidencia</h2>
              <p className="text-xs text-slate-500">Tu reporte llega al administrador</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        {done ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="font-bold text-slate-800">¡Incidencia reportada!</p>
            <p className="text-sm text-slate-500 mt-1">El equipo de operaciones fue notificado.</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
              </div>
            )}
            <div>
              <label className="label">Tipo de incidencia</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className="input">
                <option>Golpe</option><option>Multa</option><option>Accidente</option>
                <option>Falla mecánica</option><option>Robo</option><option>Otro</option>
              </select>
            </div>
            <div>
              <label className="label">Lugar del incidente</label>
              <input type="text" value={form.lugar} onChange={e => setForm(f => ({ ...f, lugar: e.target.value }))} placeholder="Ej. Av. Vallarta, GDL" className="input" />
            </div>
            <div>
              <label className="label">Descripción *</label>
              <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={3} placeholder="Describe qué pasó..." className="input resize-none" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleSend} disabled={!form.descripcion || saving} className="btn-primary flex-1">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : '🚨 Reportar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Admin: redirige al dashboard ─────────────────────────────────────────────

function AdminRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard'); }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );
}

// ─── Chofer Portal (datos reales) ─────────────────────────────────────────────

function ChoferPortal({ user }: { user: any }) {
  const [data, setData]               = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [showIncidencia, setShowIncidencia] = useState(false);
  const [docFiles, setDocFiles]       = useState<UploadedFile[]>([]);
  const [uploadOk, setUploadOk]       = useState(false);
  const [pagoConfig, setPagoConfig]   = useState<any>(null);
  const [misInfracciones, setMisInfracciones] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/drivers/me')
      .then(r => r.json())
      .then(d => {
        if (d.message && !d.id) { setError(d.message); return; }
        setData(d);
      })
      .catch(() => setError('Error al cargar tu perfil'))
      .finally(() => setLoading(false));

    fetch('/api/settings/cobros')
      .then(r => r.ok ? r.json() : null)
      .then(d => setPagoConfig(d))
      .catch(() => {});

    fetch('/api/infracciones')
      .then(r => r.json())
      .then(d => {
        setMisInfracciones((d.data || []).filter((i: any) => !i.deleted_at).slice(0, 10));
      })
      .catch(() => {});
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );

  if (error) return (
    <>
      <Header breadcrumbs={[{ label: 'Mi Portal' }]} />
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="h-20 w-20 rounded-full bg-amber-50 flex items-center justify-center mb-4">
          <AlertCircle className="h-10 w-10 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Perfil no encontrado</h2>
        <p className="text-slate-500 max-w-sm">{error}</p>
      </div>
    </>
  );

  const d = data;
  const curr = d.currentWeek;
  const prev = d.previousWeek;
  const incomeChange = curr && prev && prev.income > 0
    ? ((curr.income - prev.income) / prev.income * 100).toFixed(1)
    : null;

  const saldo = curr ? curr.income - curr.rent : 0;

  return (
    <div>
      <Header breadcrumbs={[{ label: 'Mi Portal' }]} />
      <div className="p-4 md:p-6 pb-20 space-y-5 max-w-5xl mx-auto">

        {/* ── Banner de bienvenida ──────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 shadow-lg">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-white/20 flex-shrink-0 ring-2 ring-white/30">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {user.firstName[0]}{user.lastName[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-blue-200 text-xs sm:text-sm font-medium">👋 Bienvenido de vuelta</p>
                <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5 truncate">{user.firstName} {user.lastName}</h1>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <RatingStars rating={d.rating} />
                  {d.vehicle && (
                    <span className="text-blue-200 text-xs hidden sm:inline">· {d.vehicle.brand} {d.vehicle.model} {d.vehicle.year}</span>
                  )}
                  <span className="inline-flex items-center gap-1 bg-green-500/20 border border-green-400/30 text-green-300 text-xs font-semibold px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3" /> Activo
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowIncidencia(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-300 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
            >
              <AlertTriangle className="h-3.5 w-3.5" /> Reportar incidencia
            </button>
          </div>
        </div>

        {/* ── Banner licencia por vencer/vencida ────────────────────────────── */}
        {d.licenseExpiry && (() => {
          const diff = Math.floor((new Date(d.licenseExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (diff > 30) return null;
          return (
            <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${diff < 0 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${diff < 0 ? 'text-red-500' : 'text-yellow-500'}`} />
              <p className={`text-sm font-medium ${diff < 0 ? 'text-red-700' : 'text-yellow-700'}`}>
                {diff < 0
                  ? `⚠️ Tu licencia de conducir venció el ${new Date(d.licenseExpiry).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}. Renuévala a la brevedad.`
                  : `🔔 Tu licencia de conducir vence en ${diff} día(s) (${new Date(d.licenseExpiry).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}). Planifica tu renovación.`
                }
              </p>
            </div>
          );
        })()}

        {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Ingresos semana */}
          <div className="rounded-2xl bg-gradient-to-br from-green-500 to-emerald-700 p-5 shadow-lg relative overflow-hidden">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
            <p className="text-green-100 text-xs font-medium">💰 Ingresos esta semana</p>
            <p className="text-white text-2xl font-black mt-1">{curr ? fmt(curr.income) : '$0'}</p>
            {incomeChange !== null && (
              <p className="text-green-200 text-xs mt-1.5 flex items-center gap-1">
                {Number(incomeChange) >= 0
                  ? <TrendingUp className="h-3 w-3" />
                  : <TrendingDown className="h-3 w-3" />}
                {incomeChange}% vs semana anterior
              </p>
            )}
          </div>

          {/* Viajes + desglose */}
          <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 p-5 shadow-lg relative overflow-hidden">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
            <p className="text-blue-100 text-xs font-medium">🚗 Viajes esta semana</p>
            <p className="text-white text-2xl font-black mt-1">{curr?.trips ?? 0}</p>
            <p className="text-blue-200 text-xs mt-1.5">
              {(curr?.tripsOnline ?? 0) > 0
                ? `${curr.tripsOnline} tarjeta · ${curr.tripsCash} efectivo`
                : curr?.weekStart ? fmtWeek(curr.weekStart, curr.weekEnd) : '—'}
            </p>
          </div>

          {/* Renta */}
          <div className="rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 p-5 shadow-lg relative overflow-hidden">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
            <p className="text-orange-100 text-xs font-medium">🏠 Renta semanal</p>
            <p className="text-white text-2xl font-black mt-1">{curr ? fmt(curr.rent) : fmt(d.vehicle?.weeklyRent ?? 0)}</p>
            <p className={`text-xs mt-1.5 ${curr?.status === 'paid' ? 'text-green-200' : 'text-orange-200'}`}>
              {curr?.status === 'paid' ? '✅ Pagada' : curr?.status === 'pending' ? '⏳ Pendiente' : '—'}
            </p>
          </div>

          {/* Saldo neto */}
          <div className={`rounded-2xl p-5 shadow-lg relative overflow-hidden ${saldo >= 0 ? 'bg-gradient-to-br from-purple-500 to-purple-700' : 'bg-gradient-to-br from-red-500 to-red-700'}`}>
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
            <p className="text-white/80 text-xs font-medium">💳 Neto esta semana</p>
            <p className="text-white text-2xl font-black mt-1">{fmt(Math.abs(saldo))}</p>
            <p className="text-white/70 text-xs mt-1.5">
              {saldo >= 0 ? '✅ A tu favor' : '⚠️ Pendiente de pago'}
            </p>
          </div>
        </div>

        {/* ── Grid principal ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Columna izquierda: info personal + vehículo */}
          <div className="space-y-5">
            {/* Info personal */}
            <div className="card p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" /> 🪪 Mi Información
              </h3>
              <div className="space-y-3">
                {[
                  { icon: CreditCard, label: 'Licencia',  value: d.license || '—', sub: d.licenseExpiry ? `Vence: ${fmtDate(d.licenseExpiry)}` : null },
                  { icon: Phone,      label: 'Teléfono',  value: d.phone || '—' },
                  { icon: Calendar,   label: 'Desde',     value: fmtDate(d.since) },
                ].map(({ icon: Ic, label, value, sub }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 flex-shrink-0">
                      <Ic className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{label}</p>
                      <p className="text-sm text-slate-800 font-medium truncate">{value}</p>
                      {sub && <p className="text-xs text-amber-600">{sub}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vehículo asignado */}
            {d.vehicle ? (
              <div className="card p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Car className="h-4 w-4 text-blue-500" /> 🚗 Mi Vehículo
                </h3>
                <div className="flex items-center justify-center py-4 text-7xl">🚗</div>
                <div className="space-y-2 mt-2">
                  {[
                    { label: 'Placas',    value: d.vehicle.plates,  mono: true },
                    { label: 'Modelo',    value: `${d.vehicle.brand} ${d.vehicle.model} ${d.vehicle.year}` },
                    { label: 'Color',     value: d.vehicle.color || '—' },
                    { label: 'KM actual', value: d.vehicle.km.toLocaleString('es-MX') + ' km' },
                    { label: 'Renta',     value: fmt(d.vehicle.weeklyRent) + '/semana' },
                  ].map(({ label, value, mono }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">{label}</span>
                      <span className={`text-sm font-semibold text-slate-800 ${mono ? 'font-mono text-blue-600' : ''}`}>{value}</span>
                    </div>
                  ))}
                  {(d.vehicle.platform || []).length > 0 && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-500">Plataformas</span>
                      <div className="flex gap-1.5">
                        {(d.vehicle.platform as string[]).map((pl) => (
                          <span key={pl} className={`text-xs font-bold px-2 py-0.5 rounded-full ${pl.toLowerCase().includes('uber') ? 'bg-slate-900 text-white' : 'bg-orange-500 text-white'}`}>
                            {pl}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Seguro */}
                {d.insurance && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 mb-2">🛡️ Seguro</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{d.insurance.company}</span>
                      <span className="text-slate-500">Vence: {fmtDate(d.insurance.expiry)}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="card p-6 text-center text-slate-400">
                <Car className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin vehículo asignado</p>
              </div>
            )}
          </div>

          {/* Columna central: historial semanal */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Route className="h-4 w-4 text-blue-500" /> 📅 Historial Semanal
              </h3>
              <span className="text-xs text-slate-500">Últimas 8 semanas</span>
            </div>

            {d.weeklyHistory.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin registros semanales</p>
              </div>
            ) : (
              <>
                {/* Mini chart */}
                <div className="mb-5 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-end gap-1.5 h-20">
                    {[...d.weeklyHistory].reverse().map((w: any, i: number) => {
                      const maxIncome = Math.max(...d.weeklyHistory.map((x: any) => x.income), 1);
                      const h = Math.max((w.income / maxIncome) * 100, 4);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${fmtDate(w.weekStart)}: ${fmt(w.income)}`}>
                          <div className="w-full rounded-t-sm bg-orange-400 hover:bg-orange-500 transition-colors" style={{ height: `${h}%` }} />
                          <span className="text-[9px] text-slate-400">
                            {new Date(w.weekStart + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit' })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tabla de semanas */}
                <div className="space-y-3">
                  {d.weeklyHistory.map((w: any, i: number) => {
                    const neto = w.income - w.rent - (w.deduction ?? 0)
                    const hasDidiDetail = w.didiCash > 0 || w.didiBalance > 0 || w.bonuses > 0 || w.tax > 0
                    return (
                      <div key={i} className={`rounded-xl border overflow-hidden ${i === 0 ? 'border-blue-200' : 'border-slate-100'}`}>
                        {/* Cabecera de semana */}
                        <div className={`flex items-center justify-between px-3 py-2.5 ${i === 0 ? 'bg-blue-50' : 'bg-slate-50'}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">{fmtWeek(w.weekStart, w.weekEnd)}</span>
                            <span className="text-[10px] text-slate-400">{w.trips} viajes</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${w.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {w.status === 'paid' ? '✅ Pagado' : '⏳ Pendiente'}
                            </span>
                          </div>
                        </div>
                        {/* Desglose financiero */}
                        <div className="px-3 py-2.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-500">💰 Total Didi</span>
                            <span className="font-bold text-slate-800">{fmt(w.income)}</span>
                          </div>
                          {w.tripsCash > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">💵 Efectivo (en mano)</span>
                              <span className="font-semibold text-blue-700">{fmt(w.didiCash)}</span>
                            </div>
                          )}
                          {w.didiBalance > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">🏦 Depósito Didi</span>
                              <span className="font-semibold text-slate-700">{fmt(w.didiBalance)}</span>
                            </div>
                          )}
                          {w.bonuses > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">🎁 Bonos</span>
                              <span className="font-semibold text-emerald-600">+{fmt(w.bonuses)}</span>
                            </div>
                          )}
                          {w.tax > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">📋 Comisión/ISR</span>
                              <span className="font-semibold text-red-500">-{fmt(w.tax)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-slate-500">🏠 Renta</span>
                            <span className="font-semibold text-orange-600">-{fmt(w.rent)}</span>
                          </div>
                          <div className="col-span-2 border-t border-slate-100 mt-1 pt-1 flex justify-between">
                            <span className="font-bold text-slate-700">Neto para ti</span>
                            <span className={`font-black text-sm ${neto >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(neto)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Columna derecha: documentos + subir */}
          <div className="space-y-5">
            <div className="card p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" /> 📄 Mis Documentos
              </h3>
              <div className="space-y-2">
                {/* Licencia */}
                <div className={`flex items-center gap-3 p-3 rounded-xl border ${d.license ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-200'}`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 ${d.license ? 'bg-green-100' : 'bg-red-100'}`}>
                    {d.license ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800">Licencia de Conducir</p>
                    {d.licenseExpiry
                      ? <p className="text-[11px] text-slate-500">Vence: {fmtDate(d.licenseExpiry)}</p>
                      : <p className="text-[11px] text-red-500">No registrada</p>}
                  </div>
                </div>

                {/* Seguro del vehículo */}
                {d.insurance && (
                  <div className="flex items-center gap-3 p-3 rounded-xl border bg-green-50 border-green-100">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 flex-shrink-0">
                      <Shield className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800">Seguro {d.insurance.type}</p>
                      <p className="text-[11px] text-slate-500">{d.insurance.company} · Vence: {fmtDate(d.insurance.expiry)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Cómo pagar tu renta ─────────────────────────────────────── */}
            {pagoConfig && (
              <div className="card p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-green-500" /> 💳 Cómo pagar tu renta
                </h3>
                <p className="text-xs text-slate-500 mb-4">Instrucciones para pagar tu renta semanal.</p>

                {pagoConfig.pago_modo === 'spei' && pagoConfig.pago_clabe ? (
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 space-y-2">
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Transferencia SPEI</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-slate-500">Banco</p>
                        <p className="font-semibold text-slate-800">{pagoConfig.pago_banco || '—'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Titular</p>
                        <p className="font-semibold text-slate-800">{pagoConfig.pago_nombre || '—'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-500">CLABE</p>
                        <p className="font-mono font-bold text-slate-900 text-sm tracking-widest">
                          {pagoConfig.pago_clabe.replace(/(.{4})/g, '$1 ').trim()}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                    <p className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-1">Entrega en efectivo</p>
                    <p className="text-xs text-slate-600">
                      {pagoConfig.pago_instrucciones || 'Entrega el efectivo directamente a tu administrador los días acordados.'}
                    </p>
                  </div>
                )}

                {pagoConfig.pago_instrucciones && pagoConfig.pago_modo === 'spei' && (
                  <p className="mt-3 text-xs text-slate-500 border-t border-slate-100 pt-3">
                    {pagoConfig.pago_instrucciones}
                  </p>
                )}
              </div>
            )}

            {/* Subir docs */}
            <div className="card p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Award className="h-4 w-4 text-blue-500" /> 📎 Subir Documentos
              </h3>
              <p className="text-xs text-slate-500 mb-4">Licencia, INE, comprobante u otro documento vigente.</p>

              {uploadOk && (
                <div className="mb-3 flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> ¡Documentos enviados!
                </div>
              )}

              <FileUpload label="Subir documentos" sublabel="Imágenes o PDF · Máx 5 archivos" maxFiles={5} onFilesChange={setDocFiles} />

              {docFiles.length > 0 && (
                <button
                  onClick={() => { setUploadOk(true); setDocFiles([]); setTimeout(() => setUploadOk(false), 3000); }}
                  className="mt-3 w-full btn-primary"
                >
                  <Banknote className="h-4 w-4" />
                  Enviar {docFiles.length} documento{docFiles.length !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Acciones rápidas ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <button onClick={() => setShowIncidencia(true)} className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-red-200 bg-red-50 hover:bg-red-100 transition-colors text-center">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <span className="text-sm font-semibold text-red-700">Reportar Incidencia</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors text-center">
            <MessageSquare className="h-6 w-6 text-blue-500" />
            <span className="text-sm font-semibold text-blue-700">Contactar Admin</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-center col-span-2 sm:col-span-1">
            <TrendingUp className="h-6 w-6 text-purple-500" />
            <span className="text-sm font-semibold text-slate-700">Ver historial completo</span>
          </button>
        </div>

        {/* ── Mis Infracciones ─────────────────────────────────────────────── */}
        {misInfracciones.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-purple-500" />
              Mis Infracciones
            </h3>
            <div className="space-y-3">
              {misInfracciones.map((inf: any) => (
                <div key={inf.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{inf.descripcion || `Folio ${inf.folio}`}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {inf.fecha ? new Date(inf.fecha + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      {inf.monto ? ` · $${Number(inf.monto).toLocaleString('es-MX')}` : ''}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                    inf.estado === 'pagada' ? 'bg-green-100 text-green-700' :
                    inf.estado === 'pendiente' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {inf.estado || 'pendiente'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {showIncidencia && (
        <IncidenciaModal
          onClose={() => setShowIncidencia(false)}
          driverId={d.id}
          vehicleId={d.vehicle?.id}
          vehicleEco={d.vehicle?.eco}
          driverName={`${user.firstName} ${user.lastName}`}
        />
      )}
    </div>
  );
}

// ─── Page principal ───────────────────────────────────────────────────────────

export default function ChoferPortalPage() {
  const { user } = useAuth();

  if (!user) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );

  // Admin y roles de gestión → redirigir al dashboard
  const adminRoles = ['admin_general', 'super_admin', 'administrador', 'socio'];
  if (adminRoles.includes(user.role)) {
    return <AdminRedirect />;
  }

  return <ChoferPortal user={user} />;
}
