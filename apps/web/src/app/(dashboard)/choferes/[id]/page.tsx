'use client';

import { Header } from '@/components/layout/Header';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Star, Phone, Mail, Car, CheckCircle2, FileText,
  AlertCircle, Banknote, Route, TrendingUp, Shield, DollarSign,
  BarChart3, Loader2, CalendarDays, Wrench,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface DriverProfile {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  licencia: string | null;
  licenseType: string | null;
  licenseExpiry: string | null;
  joinDate: string | null;
  status: string;
  rating: number | null;
  score: number | null;
  platforms: string[] | null;
  notes: string | null;
  vehicleId: string | null;
}

interface VehicleInfo {
  id: string;
  eco: string;
  model: string;
  plates: string;
  color: string | null;
  year: number | null;
  km: number | null;
}

interface WeeklyAccount {
  id: string;
  weekStart: string;
  status: string;
  rent: number;
  efectivoAEntregar: number;
  didiBalance: number;
  didiIncome: number;
  tripsCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 0 });
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d + (d.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={`h-4 w-4 ${s <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300 fill-slate-300'}`} />
      ))}
      <span className="ml-1 text-sm font-bold text-white">{Number(rating).toFixed(1)}</span>
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = {
  active:    'bg-green-500/20 border-green-400/30 text-green-300',
  inactive:  'bg-slate-400/20 border-slate-300/30 text-slate-300',
  suspended: 'bg-red-500/20 border-red-400/30 text-red-300',
};
const STATUS_LABEL: Record<string, string> = {
  active: 'Activo', inactive: 'Inactivo', suspended: 'Suspendido',
};
const ACCOUNT_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', paid: 'Pagado', partial: 'Parcial', approved: 'Aprobado',
};
const TABS = ['Resumen', 'Cuentas Semanales', 'Documentos'] as const;
type Tab = typeof TABS[number];

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ChoferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('Resumen');

  const [driver, setDriver]   = useState<DriverProfile | null>(null);
  const [vehicle, setVehicle] = useState<VehicleInfo | null>(null);
  const [accounts, setAccounts] = useState<WeeklyAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    fetch(`/api/drivers/${id}`)
      .then(r => r.json())
      .then(async (data) => {
        if (!data.data) throw new Error(data.message ?? 'No encontrado');
        const d: DriverProfile = data.data;
        setDriver(d);

        // Cargar vehículo si tiene uno asignado
        if (d.vehicleId) {
          const vRes = await fetch(`/api/vehicles/${d.vehicleId}`).catch(() => null);
          if (vRes?.ok) {
            const vData = await vRes.json();
            const v = vData.data ?? vData;
            setVehicle({
              id:     v.id,
              eco:    v.eco,
              model:  v.model ?? v.make ?? '—',
              plates: v.plates,
              color:  v.color ?? null,
              year:   v.year ?? null,
              km:     v.km_current ?? v.km ?? null,
            });
          }
        }

        // Cargar últimas cuentas semanales del vehículo del chofer
        if (d.vehicleId) {
          const aRes = await fetch(`/api/weekly-accounts?vehicleId=${d.vehicleId}&limit=12`).catch(() => null);
          if (aRes?.ok) {
            const aData = await aRes.json();
            const rows = aData.data ?? [];
            setAccounts(rows.map((a: Record<string, unknown>) => ({
              id:                a.id,
              weekStart:         a.week_start ?? a.weekStart,
              status:            a.status,
              rent:              Number(a.rent ?? 0),
              efectivoAEntregar: Number(a.efectivo_a_entregar ?? a.efectivoAEntregar ?? 0),
              didiBalance:       Number(a.didi_balance ?? a.didiBalance ?? 0),
              didiIncome:        Number(a.didi_income ?? a.didiIncome ?? 0),
              tripsCount:        Number(a.trips_count ?? a.tripsCount ?? 0),
            })));
          }
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div>
        <Header breadcrumbs={[{ label: 'Choferes', href: '/choferes' }, { label: 'Cargando…' }]} />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div>
        <Header breadcrumbs={[{ label: 'Choferes', href: '/choferes' }, { label: 'Error' }]} />
        <div className="p-6 text-center">
          <AlertCircle className="h-10 w-10 mx-auto text-red-400 mb-2" />
          <p className="text-slate-600">{error ?? 'Chofer no encontrado'}</p>
          <Link href="/choferes" className="mt-4 inline-block text-blue-600 hover:underline text-sm">← Volver a choferes</Link>
        </div>
      </div>
    );
  }

  const fullName   = `${driver.firstName} ${driver.lastName}`.trim();
  const initials   = [driver.firstName, driver.lastName].map(n => n?.[0] ?? '').join('').toUpperCase().slice(0,2);
  const rating     = Number(driver.rating ?? 4.8);
  const score      = Number(driver.score ?? 85);
  const platforms  = Array.isArray(driver.platforms) ? driver.platforms : [];

  // Stats rápidas desde cuentas semanales
  const lastAccount  = accounts[0] ?? null;
  const paidAccounts = accounts.filter(a => a.status === 'paid' || a.status === 'approved');
  const totalCobrado = paidAccounts.reduce((s, a) => s + a.efectivoAEntregar, 0);
  const totalViajes  = accounts.reduce((s, a) => s + a.tripsCount, 0);
  const totalDebt    = accounts.filter(a => a.status === 'pending').reduce((s, a) => s + a.efectivoAEntregar, 0);

  return (
    <div>
      <Header breadcrumbs={[{ label: 'Choferes', href: '/choferes' }, { label: fullName }]} />

      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto pb-16">
        <Link href="/choferes" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Volver a choferes
        </Link>

        {/* ── Header de perfil ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 shadow-lg">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 flex-shrink-0 ring-2 ring-white/30">
              <span className="text-3xl font-black text-white">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black text-white">{fullName}</h1>
                <span className={`inline-flex items-center gap-1 border text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOR[driver.status] ?? STATUS_COLOR.inactive}`}>
                  <CheckCircle2 className="h-3 w-3" /> {STATUS_LABEL[driver.status] ?? driver.status}
                </span>
              </div>
              <RatingStars rating={rating} />
              <div className="flex items-center gap-4 mt-2 flex-wrap text-sm text-blue-200">
                {driver.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{driver.phone}</span>}
                {driver.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{driver.email}</span>}
                {vehicle && <span className="flex items-center gap-1"><Car className="h-3.5 w-3.5" />{vehicle.eco} — {vehicle.model}</span>}
                {platforms.length > 0 && <span className="flex items-center gap-1 capitalize">{platforms.join(' / ')}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* ── KPIs ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Viajes registrados', value: totalViajes > 0 ? totalViajes : '—', sub: `${accounts.length} semanas`, color: 'from-blue-500 to-blue-700', icon: Route },
            { label: 'Total cobrado', value: totalCobrado > 0 ? fmt(totalCobrado) : '—', sub: `${paidAccounts.length} semanas pagadas`, color: 'from-green-500 to-emerald-600', icon: Banknote },
            { label: 'Score conductual', value: score, sub: 'Sobre 100 pts', color: 'from-purple-500 to-purple-700', icon: BarChart3 },
            { label: 'Adeudo pendiente', value: totalDebt === 0 ? 'Sin deuda' : fmt(totalDebt), sub: totalDebt === 0 ? 'Al corriente ✅' : 'Pendiente de pago', color: totalDebt === 0 ? 'from-teal-500 to-teal-700' : 'from-red-500 to-red-700', icon: DollarSign },
          ].map(({ label, value, sub, color, icon: Icon }) => (
            <div key={label} className={`rounded-2xl bg-gradient-to-br ${color} p-5 shadow-lg relative overflow-hidden`}>
              <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/10" />
              <Icon className="h-5 w-5 text-white/70 mb-2" />
              <p className="text-2xl font-black text-white">{value}</p>
              <p className="text-white/80 text-xs font-semibold mt-0.5">{label}</p>
              <p className="text-white/50 text-[11px] mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div className="flex border-b border-slate-200 gap-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* ── Tab: Resumen ─────────────────────────────────────────────────── */}
        {tab === 'Resumen' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Info personal */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" /> Información Personal
              </h3>
              {[
                { label: 'Teléfono',      value: driver.phone ?? '—' },
                { label: 'Email',         value: driver.email ?? '—' },
                { label: 'Ingreso',       value: formatDate(driver.joinDate) },
                { label: 'Licencia',      value: driver.licencia ? `${driver.licencia}${driver.licenseType ? ` (Tipo ${driver.licenseType})` : ''}` : '—' },
                { label: 'Venc. licencia', value: formatDate(driver.licenseExpiry) },
                { label: 'Plataformas',   value: platforms.length > 0 ? platforms.join(', ') : '—' },
                { label: 'Notas',         value: driver.notes ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-3">
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wide flex-shrink-0">{label}</span>
                  <span className="text-sm text-slate-800 font-medium text-right truncate">{value}</span>
                </div>
              ))}
            </div>

            {/* Semana actual */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" /> Semana Actual
              </h3>
              {lastAccount ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">Semana</span>
                    <span className="text-sm font-semibold text-slate-700">{formatDate(lastAccount.weekStart)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">A depositar</span>
                    <span className="text-sm font-bold text-slate-900">{fmt(lastAccount.efectivoAEntregar)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">Total Didi</span>
                    <span className="text-sm font-semibold text-slate-700">{fmt(lastAccount.didiIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">Viajes</span>
                    <span className="text-sm font-semibold text-slate-700">{lastAccount.tripsCount > 0 ? lastAccount.tripsCount : '—'}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-between">
                    <span className="text-xs text-slate-400">Estado</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${lastAccount.status === 'paid' || lastAccount.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {ACCOUNT_STATUS_LABEL[lastAccount.status] ?? lastAccount.status}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">Sin cuentas registradas</p>
              )}
            </div>

            {/* Vehículo asignado */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Car className="h-4 w-4 text-blue-500" /> Vehículo Asignado
              </h3>
              {vehicle ? (
                <>
                  <div className="flex justify-center py-3 text-5xl">🚗</div>
                  <div className="space-y-2.5 mt-2">
                    {[
                      ['ECO',    vehicle.eco],
                      ['Modelo', vehicle.model],
                      ['Placas', vehicle.plates],
                      ['Color',  vehicle.color ?? '—'],
                      ['Año',    vehicle.year ? String(vehicle.year) : '—'],
                      ['KM',     vehicle.km ? `${Number(vehicle.km).toLocaleString('es-MX')} km` : '—'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-xs text-slate-400">{label}</span>
                        <span className="text-sm font-semibold text-slate-800">{value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Car className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Sin vehículo asignado</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Cuentas Semanales ────────────────────────────────────────── */}
        {tab === 'Cuentas Semanales' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-blue-500" /> Historial de Cuentas
              </h3>
              <span className="text-xs text-slate-400">{accounts.length} semanas</span>
            </div>
            {accounts.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">Sin cuentas registradas</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Semana', 'Renta', 'A depositar', 'Didi total', 'Viajes', 'Estado'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {accounts.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-600">{formatDate(a.weekStart)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-700">{fmt(a.rent)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-900">{fmt(a.efectivoAEntregar)}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{fmt(a.didiIncome)}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{a.tripsCount > 0 ? a.tripsCount : '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            a.status === 'paid' || a.status === 'approved' ? 'bg-green-100 text-green-700'
                            : a.status === 'partial' ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                          }`}>
                            {ACCOUNT_STATUS_LABEL[a.status] ?? a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Documentos ──────────────────────────────────────────────── */}
        {tab === 'Documentos' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" /> Documentos del Chofer
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Licencia */}
              <div className={`rounded-xl border p-4 ${driver.licenseExpiry && new Date(driver.licenseExpiry) < new Date() ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${driver.licenseExpiry && new Date(driver.licenseExpiry) < new Date() ? 'bg-red-100' : 'bg-green-100'}`}>
                    {driver.licenseExpiry && new Date(driver.licenseExpiry) < new Date()
                      ? <AlertCircle className="h-4 w-4 text-red-600" />
                      : <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Licencia de conducir</p>
                    <p className="text-xs text-slate-500">
                      {driver.licencia ?? 'Sin número'}{driver.licenseType ? ` · Tipo ${driver.licenseType}` : ''}
                    </p>
                    {driver.licenseExpiry && (
                      <p className={`text-xs font-medium mt-0.5 ${new Date(driver.licenseExpiry) < new Date() ? 'text-red-600' : 'text-green-600'}`}>
                        {new Date(driver.licenseExpiry) < new Date() ? '⚠️ Vencida: ' : 'Vence: '}{formatDate(driver.licenseExpiry)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Vehículo / mantenimiento */}
              {vehicle && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Wrench className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Vehículo {vehicle.eco}</p>
                      <p className="text-xs text-slate-500">{vehicle.model} · {vehicle.plates}</p>
                      {vehicle.km && <p className="text-xs text-slate-400 mt-0.5">{Number(vehicle.km).toLocaleString('es-MX')} km actuales</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {!driver.licencia && !vehicle && (
              <p className="text-sm text-slate-400 text-center py-6">Sin documentos registrados. Edita el perfil del chofer para agregar datos.</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
