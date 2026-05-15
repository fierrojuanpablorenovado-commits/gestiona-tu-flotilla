'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  AlertTriangle, Loader2, X, Plus, DollarSign, Car,
  TrendingUp, ChevronRight, Shield, Wrench,
  Receipt, Users, FileText, ShieldOff, ShieldAlert, ShieldCheck,
  ArrowUpRight, ArrowDownRight, Zap, Banknote, MessageCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FleetVehicle {
  vehicleId: string; eco: string; brand: string; model: string; year: number;
  plates: string; kmActual: number; weeklyRent: number; vehicleStatus: string;
  driver: string; driverPhone: string;
  insurer: string | null; policyNumber: string | null; expiryDate: string | null;
  insuranceStatus: 'vigente' | 'por_vencer' | 'vencida' | 'sin_poliza';
  ingresos4sem: number;
}

interface ReciboJPRow {
  vehicleId: string; eco: string; brand: string; model: string;
  plates: string; chofer: string; weekStart: string | null;
  efectivo: number; banco: number; contabilidad: number;
}

interface DashboardData {
  stats: {
    vehiculosActivos: number; totalVehiculos: number; vehiculosMantenimiento: number;
    choferes: number; choferesActivos: number;
    ingresosSemana: number; ingresosSemanaAnterior?: number;
    utilidadMes: number; pagosVencidos: number; tasaOcupacion: number;
    rentaCapacity: number; insuranceAlertCount: number;
    mantenimientosActivos?: number; viajesSemana?: number; didiIngresosSemana?: number;
  };
  revenueByVehicle: Array<{ label: string; amount: number }>;
  alerts: Array<{ id: number; type: string; message: string; severity: string }>;
  cobrosPendientes: Array<{ nombre: string; telefono: string; monto: number; semana?: string }>;
  weeklyHistory: Array<{ semana: string; ingresos: number; gastos: number }>;
  fleetRoster: FleetVehicle[];
  reciboJP?: {
    weekStart: string | null;
    rows: ReciboJPRow[];
    totalEfectivo: number;
    totalBanco: number;
    totalContabilidad: number;
    totalRetiroSinTarjeta: number;
    totalSemana: number;
  };
}

interface FleetAlert {
  id: number; tipo: string; entidadRef: string;
  severidad: 'alta' | 'media' | 'baja'; mensaje: string; createdAt: string;
}

const fmt    = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
const fmtKm  = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}k km` : `${n} km`;
const fmtWeek = (iso: string | null | undefined) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso + 'T12:00:00');
    const end = new Date(d); end.setDate(d.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${d.toLocaleDateString('es-MX', opts)} al ${end.toLocaleDateString('es-MX', { ...opts, year: 'numeric' })}`;
  } catch { return iso; }
};

const INS_CFG = {
  vigente:    { label: 'Vigente',    icon: ShieldCheck, cls: 'text-emerald-600 bg-emerald-50  border-emerald-200' },
  por_vencer: { label: 'Por vencer', icon: ShieldAlert, cls: 'text-amber-600  bg-amber-50   border-amber-200'  },
  vencida:    { label: 'Vencida',    icon: ShieldOff,   cls: 'text-red-600    bg-red-50     border-red-200'    },
  sin_poliza: { label: 'Sin póliza', icon: ShieldOff,   cls: 'text-red-600    bg-red-50     border-red-200'    },
};

// ─── Floating Actions ─────────────────────────────────────────────────────────

function FloatingActions() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const actions = [
    { label: 'Importar Cuentas Didi',   icon: <FileText className="h-4 w-4" />, href: '/cuentas-semanales/importar-didi' },
    { label: 'Nueva Cuenta Semanal',    icon: <Receipt  className="h-4 w-4" />, href: '/cuentas-semanales' },
    { label: 'Registrar Mantenimiento', icon: <Wrench   className="h-4 w-4" />, href: '/mantenimiento' },
  ];

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="flex flex-col gap-1.5 mb-1">
          {actions.map(a => (
            <Link key={a.label} href={a.href} onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap">
              <span className="text-blue-600">{a.icon}</span>{a.label}
            </Link>
          ))}
        </div>
      )}
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg font-semibold text-sm transition-all hover:scale-105 active:scale-95">
        <Plus className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-45' : ''}`} />
        Acción Rápida
      </button>
    </div>
  );
}

// ─── Fleet Table Row ──────────────────────────────────────────────────────────

function FleetRow({ v }: { v: FleetVehicle }) {
  const ins     = INS_CFG[v.insuranceStatus];
  const InsIcon = ins.icon;
  const initials = v.driver.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const waUrl    = v.driverPhone
    ? `https://wa.me/52${v.driverPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${v.driver.split(' ')[0]}, buen día`)}`
    : null;

  return (
    <tr className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
      {/* Eco + Placas */}
      <td className="px-4 py-2.5">
        <p className="text-xs font-bold text-slate-800">{v.eco}</p>
        <p className="text-[10px] text-slate-400">{v.plates}</p>
      </td>

      {/* Vehículo */}
      <td className="px-4 py-2.5">
        <p className="text-xs font-medium text-slate-700">{v.brand} {v.model}</p>
        <p className="text-[10px] text-slate-400">{v.year} · {fmtKm(v.kmActual)}</p>
      </td>

      {/* Chofer */}
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0">
            {initials}
          </div>
          <span className="text-xs text-slate-700 truncate max-w-[110px]">{v.driver}</span>
        </div>
      </td>

      {/* Renta/sem */}
      <td className="px-4 py-2.5 text-right">
        <p className="text-xs font-bold text-blue-600">{fmt(v.weeklyRent)}</p>
      </td>

      {/* Seguro */}
      <td className="px-4 py-2.5">
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${ins.cls}`}>
          <InsIcon className="h-2.5 w-2.5" />
          {ins.label}
        </span>
      </td>

      {/* WA */}
      <td className="px-4 py-2.5">
        {waUrl ? (
          <a href={waUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-6 w-6 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors border border-emerald-200">
            <MessageCircle className="h-3 w-3 text-emerald-600" />
          </a>
        ) : (
          <span className="inline-block h-6 w-6" />
        )}
      </td>
    </tr>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon, accent, trend,
}: {
  label: string; value: string; sub: string;
  icon: React.ReactNode; accent: string; trend?: number;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${accent}`}>
          {icon}
        </div>
        {trend !== undefined && trend !== 0 && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
            trend > 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'
          }`}>
            {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-slate-900 leading-none mb-1">{value}</p>
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResumenFinalPage() {
  const { data, loading }  = useApi<DashboardData>('/dashboard');
  const { user }           = useAuth();
  const [fleetAlerts, setFleetAlerts]     = useState<FleetAlert[]>([]);
  const [dismissingId, setDismissingId]   = useState<number | null>(null);

  const hora   = new Date().getHours();
  const saludo = hora < 13 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  useEffect(() => {
    document.title = 'Resumen Final | Gestiona tu Flotilla';
    fetch('/api/alerts')
      .then(r => r.json())
      .then(d => setFleetAlerts(d.data ?? []))
      .catch(() => {});
  }, []);

  const handleDismiss = async (id: number) => {
    setDismissingId(id);
    await fetch('/api/alerts', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setFleetAlerts(p => p.filter(a => a.id !== id));
    setDismissingId(null);
  };

  const stats            = data?.stats;
  const cobros           = data?.cobrosPendientes ?? [];
  const fleet            = data?.fleetRoster      ?? [];
  const reciboJP         = data?.reciboJP;
  const totalPorCobrar   = cobros.reduce((s, c) => s + c.monto, 0);
  const rentaCapacity    = stats?.rentaCapacity ?? fleet.reduce((s, v) => s + v.weeklyRent, 0);
  const insAlerts        = stats?.insuranceAlertCount ?? fleet.filter(v => v.insuranceStatus !== 'vigente').length;
  const viajesSemana     = stats?.viajesSemana ?? 0;
  const ingresosActual   = stats?.ingresosSemana ?? 0;
  const ingresosAnterior = stats?.ingresosSemanaAnterior ?? 0;
  const tendencia        = ingresosAnterior > 0
    ? Math.round(((ingresosActual - ingresosAnterior) / ingresosAnterior) * 100)
    : 0;
  const weeklyData = data?.weeklyHistory ?? [];
  const nombre     = user?.firstName?.split(' ')[0] || user?.company || 'JP';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-5 md:p-6 pb-20 space-y-5 max-w-7xl mx-auto">

        {/* ── Header compacto ── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Resumen Final</h1>
              <p className="text-slate-500 text-xs mt-0.5">
                {saludo}, {nombre} · {user?.company ?? 'Al Volante GDL'}
                {fleet.length > 0 && <span className="ml-1.5 text-blue-600 font-medium">{fleet.length} vehículos</span>}
              </p>
            </div>
          </div>
          <Link href="/cuentas-semanales/importar-didi"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm flex-shrink-0">
            <FileText className="h-3.5 w-3.5" />
            Importar Didi
          </Link>
        </div>

        {/* ── Alertas seguros ── */}
        {insAlerts > 0 && (
          <Link href="/seguros"
            className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3 gap-3 hover:bg-red-100 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                <ShieldOff className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-red-700 font-semibold text-sm">
                  {insAlerts} {insAlerts === 1 ? 'póliza requiere' : 'pólizas requieren'} atención
                </p>
                <p className="text-red-500 text-xs">Seguros vencidos o sin registrar</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-red-400 flex-shrink-0" />
          </Link>
        )}

        {/* ── Alertas del sistema ── */}
        {fleetAlerts.length > 0 && (
          <div className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-100 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-amber-700 text-sm font-semibold">
                Alertas del sistema ({fleetAlerts.length})
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {fleetAlerts.slice(0, 4).map(a => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                    a.severidad === 'alta' ? 'bg-red-500' :
                    a.severidad === 'media' ? 'bg-amber-400' : 'bg-blue-400'
                  }`} />
                  <p className="text-sm text-slate-700 flex-1">{a.mensaje}</p>
                  <button onClick={() => handleDismiss(a.id)} disabled={dismissingId === a.id}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── KPI Strip — 4 tarjetas ── */}
        {(() => {
          const choferesPagados   = Math.max(0, (fleet.length || stats?.choferesActivos || 0) - cobros.length);
          const totalChoferes     = fleet.length || stats?.choferesActivos || 0;
          const vehiculosActivos  = (stats?.totalVehiculos ?? fleet.length) - (stats?.vehiculosMantenimiento ?? 0);
          const totalVehiculos    = stats?.totalVehiculos ?? fleet.length;
          return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Por Cobrar — accionable principal */}
              <StatCard
                label="Por Cobrar"
                value={loading ? '—' : fmt(totalPorCobrar)}
                sub={cobros.length > 0 ? `${cobros.length} choferes pendientes` : 'Todo cobrado ✓'}
                icon={<DollarSign className="h-4.5 w-4.5 text-amber-600" />}
                accent="bg-amber-50"
              />
              {/* 2. Capacidad semanal — benchmark de lo posible */}
              <StatCard
                label="Capacidad Semanal"
                value={loading ? '—' : fmt(rentaCapacity)}
                sub={totalPorCobrar > 0
                  ? `${Math.round(((rentaCapacity - totalPorCobrar) / rentaCapacity) * 100)}% cobrado`
                  : `${fleet.length} vehículos`}
                icon={<TrendingUp className="h-4.5 w-4.5 text-emerald-600" />}
                accent="bg-emerald-50"
                trend={tendencia}
              />
              {/* 3. Flota activa — operacional */}
              <StatCard
                label="Flota Activa"
                value={loading ? '—' : `${vehiculosActivos} / ${totalVehiculos}`}
                sub={(stats?.vehiculosMantenimiento ?? 0) > 0
                  ? `${stats?.vehiculosMantenimiento} en taller`
                  : 'todos en ruta'}
                icon={<Car className="h-4.5 w-4.5 text-blue-600" />}
                accent="bg-blue-50"
              />
              {/* 4. Viajes semana — actividad real */}
              <StatCard
                label="Viajes Esta Semana"
                value={loading ? '—' : viajesSemana > 0 ? String(viajesSemana) : '—'}
                sub={viajesSemana > 0 ? 'viajes completados' : 'sin datos Didi aún'}
                icon={<Zap className="h-4.5 w-4.5 text-violet-600" />}
                accent="bg-violet-50"
              />
            </div>
          );
        })()}

        {/* ── KPIs Operativos ── */}
        {(() => {
          const choferesPagados  = Math.max(0, (fleet.length || stats?.choferesActivos || 0) - cobros.length);
          const totalChoferes    = fleet.length || stats?.choferesActivos || 0;
          const alertasTotal     = insAlerts + (stats?.mantenimientosActivos ?? 0);
          const cobroPct         = rentaCapacity > 0
            ? Math.round(((rentaCapacity - totalPorCobrar) / rentaCapacity) * 100)
            : 0;
          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* A. Choferes al corriente */}
              <Link href="/cuentas-semanales"
                className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition-all">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center mb-3 ${
                  choferesPagados === totalChoferes ? 'bg-emerald-50' : cobros.length > 0 ? 'bg-amber-50' : 'bg-slate-50'
                }`}>
                  <Users className={`h-4 w-4 ${
                    choferesPagados === totalChoferes ? 'text-emerald-600' : 'text-amber-600'
                  }`} />
                </div>
                <p className="text-xl font-bold text-slate-900">
                  {loading ? '—' : `${choferesPagados} / ${totalChoferes}`}
                </p>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">Choferes al corriente</p>
                <p className="text-xs text-slate-400">
                  {cobros.length > 0 ? `${cobros.length} deben esta semana` : 'todos pagaron ✓'}
                </p>
              </Link>

              {/* B. En taller */}
              <Link href="/mantenimiento"
                className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition-all">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center mb-3 ${
                  (stats?.vehiculosMantenimiento ?? 0) > 0 ? 'bg-orange-50' : 'bg-slate-50'
                }`}>
                  <Wrench className={`h-4 w-4 ${
                    (stats?.vehiculosMantenimiento ?? 0) > 0 ? 'text-orange-600' : 'text-slate-400'
                  }`} />
                </div>
                <p className="text-xl font-bold text-slate-900">
                  {loading ? '—' : String(stats?.vehiculosMantenimiento ?? 0)}
                </p>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">En Taller</p>
                <p className="text-xs text-slate-400">
                  {(stats?.vehiculosMantenimiento ?? 0) > 0 ? 'vehículos en mantenimiento' : 'flota operativa'}
                </p>
              </Link>

              {/* C. Alertas (seguros + mantenimiento) */}
              <Link href={insAlerts > 0 ? '/seguros' : '/mantenimiento'}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition-all">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center mb-3 ${
                  alertasTotal > 0 ? 'bg-red-50' : 'bg-emerald-50'
                }`}>
                  <Shield className={`h-4 w-4 ${alertasTotal > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
                </div>
                <p className={`text-xl font-bold ${alertasTotal > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                  {loading ? '—' : alertasTotal > 0 ? String(alertasTotal) : '✓'}
                </p>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">Alertas Activas</p>
                <p className="text-xs text-slate-400">
                  {alertasTotal > 0
                    ? `${insAlerts} seguros · ${stats?.mantenimientosActivos ?? 0} mant.`
                    : 'seguros y mant. OK'}
                </p>
              </Link>

              {/* D. Ingresos Brutos Didi — dato distinto a Por Cobrar */}
              <Link href="/cuentas-semanales"
                className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition-all">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center mb-3 bg-violet-50">
                  <Banknote className="h-4 w-4 text-violet-600" />
                </div>
                <p className="text-xl font-bold text-slate-900">
                  {loading ? '—' : (stats?.didiIngresosSemana ?? 0) > 0 ? fmt(stats?.didiIngresosSemana ?? 0) : '—'}
                </p>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">Ingresos Brutos Didi</p>
                <p className="text-xs text-slate-400">total facturado por choferes</p>
              </Link>
            </div>
          );
        })()}

        {/* ── Cobro Semanal + Gráfica ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Cobro Semanal */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-800">
              <div>
                <h2 className="text-sm font-semibold text-white">Cobro Semanal</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {reciboJP?.weekStart ? fmtWeek(reciboJP.weekStart) : 'Sin datos aún — importa cuentas Didi'}
                </p>
              </div>
              <Link href="/cuentas-semanales"
                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-0.5 transition-colors">
                Ver detalle <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {loading ? (
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 bg-slate-50 animate-pulse mx-4 my-2 rounded-lg" />
                ))}
              </div>
            ) : reciboJP && reciboJP.rows.some(r => r.efectivo > 0 || r.banco > 0) ? (
              <>
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {reciboJP.rows.map(r => (
                    <div key={r.vehicleId} className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 truncate">{r.brand} {r.model} <span className="font-normal text-slate-400">{r.plates}</span></p>
                        <p className="text-[10px] text-slate-400 truncate">{r.chofer}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        {r.banco > 0 && (
                          <span className="text-[10px] text-blue-500 font-medium">+{fmt(r.banco)} banco</span>
                        )}
                        <span className="text-sm font-bold text-slate-900">{fmt(r.efectivo)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Totales */}
                <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Banknote className="h-3 w-3 text-slate-400" />
                      Retiro Sin Tarjeta
                    </span>
                    <span className="font-semibold text-slate-700">{fmt(reciboJP.totalRetiroSinTarjeta)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Receipt className="h-3 w-3 text-slate-400" />
                      Cuenta Bancaria (Didi)
                    </span>
                    <span className="font-semibold text-slate-700">{fmt(reciboJP.totalBanco)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold border-t border-slate-200 pt-2 mt-1">
                    <span className="text-slate-800">Total Esta Semana</span>
                    <span className="text-blue-700 text-base">{fmt(reciboJP.totalSemana)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center py-10 text-center px-4">
                <DollarSign className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-600">Sin datos de cobro</p>
                <Link href="/cuentas-semanales/importar-didi"
                  className="mt-2 text-xs text-blue-600 hover:underline">
                  Importar cuentas Didi →
                </Link>
              </div>
            )}
          </div>

          {/* Histórico Financiero */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Histórico Financiero</h2>
                <p className="text-xs text-slate-500 mt-0.5">Ingresos vs Gastos — Últimas 8 semanas</p>
              </div>
              <Link href="/contabilidad"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5 transition-colors">
                Ver más <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="px-5 py-4">
              {weeklyData.some(w => w.ingresos > 0 || w.gastos > 0) ? (
                <>
                  <div className="flex gap-4 text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />Ingresos
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />Gastos
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 160 }}>
                    <ResponsiveContainer>
                      <BarChart data={weeklyData} barGap={3}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="semana" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, color: '#0f172a', fontSize: 12 }}
                          formatter={v => [fmt(Number(v)), '']}
                        />
                        <Bar dataKey="ingresos" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="gastos"   fill="#f87171" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <div className="space-y-2.5 py-2">
                  <p className="text-xs text-slate-500 mb-3 font-medium">Capacidad de renta por vehículo</p>
                  {fleet.map(v => (
                    <div key={v.vehicleId} className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-24 flex-shrink-0 truncate">{v.brand} {v.model}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="h-1.5 rounded-full bg-blue-500"
                          style={{ width: `${Math.round((v.weeklyRent / Math.max(...fleet.map(x => x.weeklyRent), 1)) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 w-16 text-right flex-shrink-0">{fmt(v.weeklyRent)}</span>
                    </div>
                  ))}
                  <p className="text-xs text-slate-400 text-center pt-3 border-t border-slate-100 mt-3">
                    El histórico aparece al importar cuentas semanales
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          </div>
        )}

        <FloatingActions />
      </div>
    </div>
  );
}
