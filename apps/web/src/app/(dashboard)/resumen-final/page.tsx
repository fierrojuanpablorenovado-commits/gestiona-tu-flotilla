'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Loader2, Plus, DollarSign, Car, TrendingUp, ChevronRight,
  ShieldOff, ShieldCheck, ShieldAlert,
  ArrowUpRight, ArrowDownRight, Zap, Banknote,
  FileText, Receipt, Wrench, MessageCircle, CheckCircle2, X,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReciboJPRow {
  vehicleId: string; eco: string; brand: string; model: string;
  plates: string; chofer: string; choferPhone: string;
  vehicleStatus: string; kmActual: number; weeklyRent: number;
  weekStart: string | null;
  efectivo: number; banco: number; contabilidad: number;
  viajes: number; waStatus: string;
  waGroupLink: string | null;
  weeklyAccountId: string | null;
  retiroConfirmado: boolean;
  retiroComprobanteUrl: string | null;
}

interface KmAlert {
  eco: string; plates: string;
  kmActual: number; kmUltimaRevision: number; kmDesdeRevision: number;
}

interface FleetVehicle {
  vehicleId: string; eco: string; brand: string; model: string; year: number;
  plates: string; kmActual: number; weeklyRent: number; vehicleStatus: string;
  driver: string; driverPhone: string;
  insurer: string | null; policyNumber: string | null; expiryDate: string | null;
  insuranceStatus: 'vigente' | 'por_vencer' | 'vencida' | 'sin_poliza';
  ingresos4sem: number;
}

interface DashboardData {
  stats: {
    vehiculosActivos: number; totalVehiculos: number; vehiculosMantenimiento: number;
    choferes: number; choferesActivos: number;
    ingresosSemana: number; ingresosSemanaAnterior?: number;
    utilidadMes: number; pagosVencidos: number; tasaOcupacion: number;
    rentaCapacity: number; insuranceAlertCount: number;
    mantenimientosActivos?: number; viajesSemana?: number;
    vehiculosInactivos?: number; cobradoSemana?: number;
  };
  revenueByVehicle: Array<{ label: string; amount: number }>;
  alerts: Array<{ id: number; type: string; message: string; severity: string }>;
  cobrosPendientes: Array<{ nombre: string; telefono: string; monto: number; semana?: string }>;
  weeklyHistory: Array<{ semana: string; ingresos: number; gastos: number }>;
  fleetRoster: FleetVehicle[];
  kmAlerts?: KmAlert[];
  reciboJP?: {
    weekStart: string | null;
    rows: ReciboJPRow[];
    totalEfectivo: number; totalBanco: number;
    totalContabilidad: number; totalRetiroSinTarjeta: number; totalSemana: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt   = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
const fmtKm = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}k km` : `${n} km`;

const fmtWeek = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  try {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return '—';
    const start = new Date(y, m - 1, d);
    const end   = new Date(y, m - 1, d + 6);
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `Del ${start.toLocaleDateString('es-MX', opts)} al ${end.toLocaleDateString('es-MX', { ...opts, year: 'numeric' })}`;
  } catch { return '—'; }
};

// ─── Vehicle Card — Semáforo ──────────────────────────────────────────────────

function VehicleCard({
  row,
  onConfirmRetiro,
}: {
  row: ReciboJPRow;
  onConfirmRetiro: (row: ReciboJPRow) => void;
}) {
  const isPaid     = row.waStatus === 'paid';
  const isWorkshop = row.vehicleStatus === 'workshop' || row.vehicleStatus === 'maintenance';
  const hasData    = row.efectivo > 0 || row.banco > 0;

  type Status = 'paid' | 'pending' | 'workshop' | 'empty';
  const status: Status = isWorkshop ? 'workshop' : isPaid ? 'paid' : hasData ? 'pending' : 'empty';

  const cfgMap: Record<Status, { border: string; dot: string; tag: string; tagCls: string }> = {
    paid:     { border: 'border-emerald-300', dot: 'bg-emerald-500', tag: 'Al corriente', tagCls: 'bg-emerald-50 text-emerald-700' },
    pending:  { border: 'border-amber-300',   dot: 'bg-amber-500',   tag: 'Pendiente',    tagCls: 'bg-amber-50  text-amber-700'   },
    workshop: { border: 'border-red-300',     dot: 'bg-red-500',     tag: 'En taller',    tagCls: 'bg-red-50    text-red-700'     },
    empty:    { border: 'border-slate-200',   dot: 'bg-slate-300',   tag: 'Sin datos',    tagCls: 'bg-slate-50  text-slate-500'   },
  };
  const cfg = cfgMap[status];

  // WA group link tiene prioridad; fallback a número personal
  const waUrl = row.waGroupLink
    ? row.waGroupLink
    : row.choferPhone
      ? `https://wa.me/52${row.choferPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${row.chofer.split(' ')[0]}, buen día`)}`
      : null;

  const total          = row.efectivo + row.banco;
  const tieneEfectivo  = row.efectivo > 0;

  return (
    <div className={`bg-white rounded-xl border-2 ${cfg.border} p-3.5 shadow-sm hover:shadow-md transition-all flex flex-col gap-2`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
            <span className="text-xs font-bold text-slate-800">{row.eco}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
            {row.brand} {row.model} · {row.plates}
          </p>
        </div>
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.tagCls}`}>
          {cfg.tag}
        </span>
      </div>

      {/* Chofer */}
      <p className="text-xs text-slate-700 font-medium truncate leading-none">{row.chofer}</p>

      {/* Stats */}
      {(row.viajes > 0 || row.kmActual > 0) && (
        <div className="flex items-center gap-2.5 text-[10px] text-slate-400">
          {row.viajes  > 0 && <span className="flex items-center gap-0.5"><Zap className="h-2.5 w-2.5" />{row.viajes} viajes</span>}
          {row.kmActual > 0 && <span className="flex items-center gap-0.5"><Car className="h-2.5 w-2.5" />{fmtKm(row.kmActual)}</span>}
        </div>
      )}

      <div className="border-t border-slate-100 pt-2 mt-auto space-y-1.5">
        {isWorkshop ? (
          <p className="text-xs text-red-500 font-medium">En taller — sin cobro</p>
        ) : total > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                {row.banco > 0 && (
                  <p className="text-[10px] text-blue-500 leading-none mb-0.5">+{fmt(row.banco)} banco</p>
                )}
                <p className="text-sm font-bold text-slate-900 leading-none">{fmt(row.efectivo)}</p>
              </div>
              {waUrl ? (
                <a href={waUrl} target="_blank" rel="noopener noreferrer"
                  className="h-7 w-7 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center justify-center border border-emerald-200 transition-colors flex-shrink-0"
                  title={row.waGroupLink ? 'Abrir grupo WhatsApp' : 'WhatsApp chofer'}>
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                </a>
              ) : (
                <span className="h-7 w-7 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 flex-shrink-0 cursor-not-allowed">
                  <MessageCircle className="h-3.5 w-3.5 text-slate-300" />
                </span>
              )}
            </div>

            {/* Botón Confirmar Retiro (solo si hay efectivo sin tarjeta) */}
            {tieneEfectivo && (
              row.retiroConfirmado ? (
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                  <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                  Retiro confirmado
                  {row.retiroComprobanteUrl && (
                    <a href={row.retiroComprobanteUrl} target="_blank" rel="noopener noreferrer"
                      className="ml-auto text-blue-500 hover:underline">ver</a>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => onConfirmRetiro(row)}
                  className="w-full flex items-center justify-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg py-1 transition-colors">
                  <Banknote className="h-3 w-3 flex-shrink-0" />
                  Confirmar retiro {fmt(row.efectivo)}
                </button>
              )
            )}
          </>
        ) : (
          <p className="text-xs text-slate-400">Sin cuenta esta semana</p>
        )}
      </div>
    </div>
  );
}

// ─── Smart Alerts Panel ───────────────────────────────────────────────────────

function SmartAlertsPanel({
  fleet, cobrosPendientes, kmAlerts,
}: {
  fleet: FleetVehicle[];
  cobrosPendientes: Array<{ nombre: string; telefono: string; monto: number; semana?: string }>;
  kmAlerts: KmAlert[];
}) {
  type AlertItem = {
    severity: 'high' | 'medium';
    icon: React.ReactNode;
    text: string;
    sub: string;
    href: string;
  };
  const items: AlertItem[] = [];

  // Seguros vencidos o por vencer
  fleet
    .filter(v => v.insuranceStatus !== 'vigente')
    .forEach(v => {
      items.push({
        severity: v.insuranceStatus === 'vencida' ? 'high' : 'medium',
        icon:     <ShieldOff className="h-3.5 w-3.5" />,
        text:     `${v.eco} — seguro ${v.insuranceStatus === 'vencida' ? 'vencido' : 'por vencer'}`,
        sub:      v.expiryDate ? `Venció ${v.expiryDate}` : 'Sin póliza registrada',
        href:     '/seguros',
      });
    });

  // Cobros pendientes
  cobrosPendientes.forEach(c => {
    items.push({
      severity: 'high',
      icon:     <DollarSign className="h-3.5 w-3.5" />,
      text:     `${c.nombre} — ${fmt(c.monto)} pendiente`,
      sub:      c.semana ?? '',
      href:     '/cuentas-semanales',
    });
  });

  // Alertas de km
  kmAlerts.forEach(k => {
    items.push({
      severity: 'medium',
      icon:     <Wrench className="h-3.5 w-3.5" />,
      text:     `${k.eco} — ${fmtKm(k.kmDesdeRevision)} sin servicio`,
      sub:      `${fmtKm(k.kmActual)} actuales · revisar mantenimiento`,
      href:     '/mantenimiento',
    });
  });

  // Ordenar: críticos primero
  items.sort((a, b) => (a.severity === 'high' ? 0 : 1) - (b.severity === 'high' ? 0 : 1));

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Alertas Operativas</h2>
          <p className="text-xs text-slate-500 mt-0.5">Seguros · KM · Cobros</p>
        </div>
        {items.length > 0 && (
          <span className="text-xs font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-200">
            {items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center px-4">
          <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" />
          <p className="text-sm font-semibold text-slate-700">Todo en orden</p>
          <p className="text-xs text-slate-400 mt-0.5">Sin alertas activas</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
          {items.map((item, i) => (
            <Link key={i} href={item.href}
              className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
              <div className={`h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                item.severity === 'high' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
              }`}>
                {item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 leading-tight">{item.text}</p>
                {item.sub && <p className="text-[10px] text-slate-400 mt-0.5">{item.sub}</p>}
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300 flex-shrink-0 mt-1" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon, accent, trend, href,
}: {
  label: string; value: string; sub: string;
  icon: React.ReactNode; accent: string; trend?: number; href?: string;
}) {
  const inner = (
    <>
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
    </>
  );
  const cls = 'bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all';
  return href
    ? <Link href={href} className={cls}>{inner}</Link>
    : <div className={cls}>{inner}</div>;
}

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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResumenFinalPage() {
  const { data, loading, refetch } = useApi<DashboardData>('/dashboard');
  const { user }                   = useAuth();
  const hora   = new Date().getHours();
  const saludo = hora < 13 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  // ── Retiro modal state ─────────────────────────────────────────────────────
  const [retiroRow,       setRetiroRow]       = useState<ReciboJPRow | null>(null);
  const [retiroUrl,       setRetiroUrl]       = useState('');
  const [retiroSaving,    setRetiroSaving]    = useState(false);
  const [retiroError,     setRetiroError]     = useState('');

  const handleConfirmRetiro = async () => {
    if (!retiroRow?.weeklyAccountId) return;
    setRetiroSaving(true);
    setRetiroError('');
    try {
      const res = await fetch(`/api/weekly-accounts/${retiroRow.weeklyAccountId}/retiro`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retiro_confirmado:      true,
          retiro_comprobante_url: retiroUrl.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Error al confirmar');
      }
      setRetiroRow(null);
      setRetiroUrl('');
      refetch();
    } catch (e: unknown) {
      setRetiroError(e instanceof Error ? e.message : 'Error al confirmar retiro');
    } finally {
      setRetiroSaving(false);
    }
  };

  useEffect(() => {
    document.title = 'Resumen Final | Gestiona tu Flotilla';
  }, []);

  const stats      = data?.stats;
  const fleet      = data?.fleetRoster      ?? [];
  const cobros     = data?.cobrosPendientes ?? [];
  const reciboJP   = data?.reciboJP;
  const weeklyData = data?.weeklyHistory    ?? [];
  const kmAlerts   = data?.kmAlerts         ?? [];
  const nombre     = user?.firstName?.split(' ')[0] || user?.company || '';

  // Financiero
  const cobradoSemana = stats?.cobradoSemana ?? 0;
  const porCobrar     = cobros.reduce((s, c) => s + c.monto, 0);
  const utilidad      = stats?.utilidadMes  ?? 0;
  const totalVeh      = stats?.totalVehiculos ?? 0;
  const activosCount  = stats?.vehiculosActivos ?? 0;
  const inactivos     = stats?.vehiculosInactivos ?? 0;
  const insAlerts     = stats?.insuranceAlertCount
    ?? fleet.filter(v => v.insuranceStatus !== 'vigente').length;

  // Semáforo summary
  const pagados    = reciboJP?.rows.filter(r => r.waStatus === 'paid').length ?? 0;
  const pendientes = reciboJP?.rows.filter(r => r.waStatus !== 'paid' && (r.efectivo > 0 || r.banco > 0)).length ?? 0;

  // Tendencia ingresos
  const ingresosActual   = stats?.ingresosSemana ?? 0;
  const ingresosAnterior = stats?.ingresosSemanaAnterior ?? 0;
  const tendencia        = ingresosAnterior > 0
    ? Math.round(((ingresosActual - ingresosAnterior) / ingresosAnterior) * 100)
    : 0;

  // Cobrado real: si hay pagados usa cobradoSemana, si no usa el total importado del semáforo
  const cobradoDisplay = cobradoSemana > 0
    ? cobradoSemana
    : (reciboJP?.totalEfectivo ?? 0);

  return (
    <>
    <div className="min-h-screen bg-slate-50">
      <div className="p-5 md:p-6 pb-24 space-y-5 max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">Resumen Final</h1>
            <p className="text-slate-500 text-xs mt-0.5">
              {saludo}{nombre ? `, ${nombre}` : ''} · {user?.company ?? 'Al Volante GDL'}
              {totalVeh > 0 && <span className="ml-1.5 text-blue-600 font-medium">{totalVeh} vehículos</span>}
            </p>
          </div>
          <Link href="/cuentas-semanales/importar-didi"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm flex-shrink-0">
            <FileText className="h-3.5 w-3.5" />
            Importar Didi
          </Link>
        </div>

        {/* ── Banner seguros ── */}
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

        {/* ── ZONA A: 4 KPIs financieros ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* 1. Cobrado esta semana */}
          <StatCard
            href="/cuentas-semanales"
            label="Cobrado Esta Semana"
            value={loading ? '—' : fmt(cobradoDisplay)}
            sub={pagados > 0
              ? `${pagados} de ${totalVeh} confirmados`
              : pendientes > 0
              ? `${pendientes} con datos Didi`
              : 'importa cuentas Didi'}
            icon={<CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />}
            accent="bg-emerald-50"
            trend={tendencia || undefined}
          />

          {/* 2. Por Cobrar */}
          <StatCard
            href="/cuentas-semanales"
            label="Por Cobrar"
            value={loading ? '—' : fmt(porCobrar)}
            sub={cobros.length > 0 ? `${cobros.length} pendientes` : 'Al corriente ✓'}
            icon={<DollarSign className="h-4.5 w-4.5 text-amber-600" />}
            accent="bg-amber-50"
          />

          {/* 3. Flota Activa */}
          <StatCard
            href="/vehiculos"
            label="Flota Activa"
            value={loading ? '—' : `${activosCount} / ${totalVeh}`}
            sub={(stats?.vehiculosMantenimiento ?? 0) > 0
              ? `${stats?.vehiculosMantenimiento} en taller`
              : inactivos > 0
              ? `${inactivos} inactivo${inactivos > 1 ? 's' : ''}`
              : 'todos operativos'}
            icon={<Car className="h-4.5 w-4.5 text-blue-600" />}
            accent="bg-blue-50"
          />

          {/* 4. Utilidad del Mes */}
          <StatCard
            href="/contabilidad"
            label="Utilidad del Mes"
            value={loading ? '—' : fmt(utilidad)}
            sub={utilidad > 0 ? 'ingresos − gastos' : 'sin gastos registrados'}
            icon={<TrendingUp className="h-4.5 w-4.5 text-violet-600" />}
            accent="bg-violet-50"
          />
        </div>

        {/* ── ZONA B: Semáforo de Flota ── */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">

          {/* Header oscuro */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-white">Semáforo de Flota</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {reciboJP?.weekStart
                  ? fmtWeek(reciboJP.weekStart)
                  : 'Sin datos — importa cuentas Didi'}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              {pagados > 0 && (
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {pagados} pagados
                </span>
              )}
              {pendientes > 0 && (
                <span className="flex items-center gap-1 text-amber-400 font-medium">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  {pendientes} pendientes
                </span>
              )}
              <Link href="/cuentas-semanales"
                className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-0.5 transition-colors ml-1">
                Ver detalle <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-36 bg-slate-100 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : reciboJP && reciboJP.rows.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
                {reciboJP.rows.map(r => (
                  <VehicleCard key={r.vehicleId} row={r} onConfirmRetiro={setRetiroRow} />
                ))}
              </div>

              {/* Totales footer */}
              <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Banknote className="h-3 w-3 text-slate-400" />
                    Efectivo: <strong className="text-slate-700 ml-0.5">{fmt(reciboJP.totalEfectivo)}</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Receipt className="h-3 w-3 text-slate-400" />
                    Banco Didi: <strong className="text-slate-700 ml-0.5">{fmt(reciboJP.totalBanco)}</strong>
                  </span>
                </div>
                <p className="text-sm font-bold text-blue-700">
                  Total semana: {fmt(reciboJP.totalSemana)}
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center py-10 text-center px-4">
              <Car className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">Sin datos de semáforo</p>
              <Link href="/cuentas-semanales/importar-didi"
                className="mt-2 text-xs text-blue-600 hover:underline">
                Importar cuentas Didi →
              </Link>
            </div>
          )}
        </div>

        {/* ── ZONA C+D: Alertas + Histórico ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Alertas operativas */}
          <SmartAlertsPanel
            fleet={fleet}
            cobrosPendientes={cobros}
            kmAlerts={kmAlerts}
          />

          {/* Histórico Financiero */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Histórico Financiero</h2>
                <p className="text-xs text-slate-500 mt-0.5">Utilidad semanal — Últimas 8 semanas</p>
              </div>
              <Link href="/contabilidad"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5 transition-colors">
                Ver más <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="px-5 py-4">
              {weeklyData.some(w => w.ingresos > 0 || w.gastos > 0) ? (
                (() => {
                  const utilData = weeklyData.map(w => ({
                    semana: w.semana,
                    utilidad: w.ingresos - w.gastos,
                  }));
                  return (
                    <>
                      <div className="flex gap-4 text-xs text-slate-500 mb-3">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                          Utilidad positiva
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />
                          Pérdida
                        </span>
                      </div>
                      <div style={{ width: '100%', height: 160 }}>
                        <ResponsiveContainer>
                          <BarChart data={utilData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="semana" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <YAxis
                              tick={{ fontSize: 10, fill: '#94a3b8' }}
                              tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                              contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, color: '#0f172a', fontSize: 12 }}
                              formatter={v => [fmt(Number(v)), 'Utilidad']}
                            />
                            <Bar dataKey="utilidad" radius={[3, 3, 0, 0]}>
                              {utilData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.utilidad >= 0 ? '#22c55e' : '#ef4444'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  );
                })()
              ) : (
                <div className="space-y-2.5 py-2">
                  <p className="text-xs text-slate-500 mb-3 font-medium">Capacidad de renta por vehículo</p>
                  {fleet.map(v => (
                    <div key={v.vehicleId} className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-24 flex-shrink-0 truncate">
                        {v.brand} {v.model}
                      </span>
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="h-1.5 rounded-full bg-blue-500"
                          style={{ width: `${Math.round((v.weeklyRent / Math.max(...fleet.map(x => x.weeklyRent), 1)) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 w-16 text-right flex-shrink-0">
                        {fmt(v.weeklyRent)}
                      </span>
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

    {/* ── Modal Confirmar Retiro Sin Tarjeta ── */}
    {retiroRow && (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Confirmar Retiro</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {retiroRow.eco} · {retiroRow.chofer}
              </p>
            </div>
            <button
              onClick={() => { setRetiroRow(null); setRetiroUrl(''); setRetiroError(''); }}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Monto */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <Banknote className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-amber-600 font-medium">Efectivo sin tarjeta a confirmar</p>
                <p className="text-xl font-black text-amber-800">{fmt(retiroRow.efectivo)}</p>
              </div>
            </div>

            {retiroError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{retiroError}</p>
            )}

            {/* URL comprobante opcional */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Comprobante (opcional)
                <span className="text-xs font-normal text-slate-400 ml-1">pega URL de foto/imagen</span>
              </label>
              <input
                type="url"
                value={retiroUrl}
                onChange={e => setRetiroUrl(e.target.value)}
                placeholder="https://drive.google.com/... o https://..."
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 px-6 pb-5">
            <button
              onClick={() => { setRetiroRow(null); setRetiroUrl(''); setRetiroError(''); }}
              className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleConfirmRetiro}
              disabled={retiroSaving}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors flex items-center gap-2">
              {retiroSaving
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando...</>
                : <><CheckCircle2 className="h-3.5 w-3.5" /> Confirmar Retiro</>
              }
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
