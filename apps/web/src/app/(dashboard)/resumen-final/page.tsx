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
  ShieldOff,
  ArrowUpRight, ArrowDownRight, Zap, Banknote,
  FileText, Receipt, Wrench, MessageCircle, CheckCircle2, X,
  Pencil, AlertTriangle, Wifi, Navigation, Gauge, Clock, Camera,
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
  retiroMonto: number;
  // Extra campos para editar
  rent: number;
  adicional: number;
  saldoPendiente: number;
  diasTrabajados: number;
  montoKms: number;
  nota: string;
}

interface KmAlert {
  eco: string; plates: string;
  kmActual: number; kmUltimaRevision: number; kmDesdeRevision: number;
}

interface GpsAlert {
  tipo: string; mensaje: string; severidad: string; ref: string; createdAt: string;
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
  gpsAlerts?: GpsAlert[];
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

// Redondear hacia abajo al múltiplo de 100 más cercano
const snapTo100 = (n: number) => Math.floor(n / 100) * 100;

// ─── Modal Editar Cuenta (desde semáforo) ─────────────────────────────────────

function ModalEditarCuenta({
  row,
  onGuardar,
  onCancelar,
}: {
  row: ReciboJPRow;
  onGuardar: (newEfectivo: number) => void;
  onCancelar: () => void;
}) {
  const [rent,          setRent]          = useState(String(row.rent));
  const [contabilidad,  setContabilidad]  = useState(String(row.contabilidad));
  const [adicional,     setAdicional]     = useState(String(row.adicional));
  const [saldoPendiente,setSaldoPendiente]= useState(String(row.saldoPendiente));
  const [didiBalance,   setDidiBalance]   = useState(String(row.banco));
  const [diasTrabajados,setDiasTrabajados]= useState(String(row.diasTrabajados));
  const [nota,          setNota]          = useState(row.nota ?? '');
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');
  const [saved,         setSaved]         = useState(false);
  const [savedTotal,    setSavedTotal]    = useState(0);

  const rentN  = parseFloat(rent)          || 0;
  const contN  = parseFloat(contabilidad)  || 0;
  const adicN  = parseFloat(adicional)     || 0;
  const saldoN = parseFloat(saldoPendiente)|| 0;
  const didiN  = parseFloat(didiBalance)   || 0;
  const kmN    = row.montoKms              || 0;
  const preview = rentN + contN - didiN + kmN + adicN + saldoN;

  const handleGuardar = async () => {
    if (!row.weeklyAccountId) return;
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/weekly-accounts/${row.weeklyAccountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rent: rentN, contabilidad: contN, adicional: adicN,
          saldo_pendiente: saldoN, didi_balance: didiN,
          dias_trabajados: parseInt(diasTrabajados) || 7, nota,
        }),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(resData.message ?? 'Error');
      const newEfectivo: number = resData.efectivoAEntregar ?? preview;
      setSavedTotal(newEfectivo);
      setSaved(true);
      setTimeout(() => onGuardar(newEfectivo), 900);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancelar} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 flex-shrink-0 flex items-center justify-between">
          <div>
            <p className="text-white font-black">{row.chofer.split(' ').slice(0,2).join(' ')}</p>
            <p className="text-blue-200 text-xs">{row.eco} · Editar cuenta</p>
          </div>
          <button onClick={onCancelar} className="p-1.5 hover:bg-white/20 rounded-lg text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-3 flex-1">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Renta', val: rent, set: setRent },
              { label: 'Contabilidad', val: contabilidad, set: setContabilidad },
              { label: 'Depósito Didi', val: didiBalance, set: setDidiBalance },
              { label: 'Adicional (+ / -)', val: adicional, set: setAdicional },
              { label: 'Saldo previo', val: saldoPendiente, set: setSaldoPendiente },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{f.label}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                  <input type="number" value={f.val} onChange={e => f.set(e.target.value)}
                    className="w-full pl-6 pr-2 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Días trabajados</label>
              <input type="number" min="0" max="7" value={diasTrabajados} onChange={e => setDiasTrabajados(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nota</label>
            <input type="text" value={nota} onChange={e => setNota(e.target.value)} placeholder="Ej. parabrisas, descuento, etc."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {saved ? (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-700">¡Guardado correctamente!</p>
                <p className="text-xs text-emerald-600">JP cobra en efectivo: {fmt(savedTotal)}</p>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">JP cobra en efectivo</span>
              <span className="text-lg font-black text-blue-700">{fmt(preview)}</span>
            </div>
          )}
          {kmN > 0 && !saved && (
            <p className="text-[10px] text-slate-400 text-center">Incluye {fmt(kmN)} por km extra</p>
          )}
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        </div>
        <div className="px-5 pb-5 pt-3 flex gap-2 flex-shrink-0 border-t border-slate-100">
          <button onClick={onCancelar} disabled={saving} className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
          <button onClick={handleGuardar} disabled={saving || saved || !row.weeklyAccountId}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Vehicle Card — Semáforo ──────────────────────────────────────────────────

function VehicleCard({
  row,
  onConfirmRetiro,
  onEdit,
}: {
  row: ReciboJPRow;
  onConfirmRetiro: (row: ReciboJPRow) => void;
  onEdit: (row: ReciboJPRow) => void;
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

  const waUrl = row.waGroupLink
    ? row.waGroupLink
    : row.choferPhone
      ? `https://wa.me/52${row.choferPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${row.chofer.split(' ')[0]}, buen día`)}`
      : null;

  const total         = row.efectivo + row.banco;
  const tieneEfectivo = row.efectivo > 0;
  // Si el retiro fue parcial: mostrar cuánto recibió JP
  const retiroDisplay = row.retiroConfirmado && row.retiroMonto > 0
    ? row.retiroMonto
    : row.efectivo;
  const retiroPendiente = row.retiroConfirmado
    ? Math.max(0, row.efectivo - (row.retiroMonto || row.efectivo))
    : 0;

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
        <div className="flex items-center gap-1">
          {row.weeklyAccountId && (
            <button onClick={() => onEdit(row)}
              className="p-1 hover:bg-blue-50 rounded-md transition-colors"
              title="Editar cuenta">
              <Pencil className="h-3 w-3 text-blue-400" />
            </button>
          )}
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.tagCls}`}>
            {cfg.tag}
          </span>
        </div>
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
                <span className="h-7 w-7 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 flex-shrink-0">
                  <MessageCircle className="h-3.5 w-3.5 text-slate-300" />
                </span>
              )}
            </div>

            {/* Retiro Sin Tarjeta */}
            {tieneEfectivo && (
              row.retiroConfirmado ? (
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                      <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                      Retiro {fmt(retiroDisplay)}
                    </div>
                    <button
                      onClick={() => onConfirmRetiro(row)}
                      className="p-0.5 hover:bg-emerald-50 rounded transition-colors flex-shrink-0"
                      title="Editar retiro">
                      <Pencil className="h-2.5 w-2.5 text-emerald-400" />
                    </button>
                  </div>
                  {retiroPendiente > 0 && (
                    <p className="text-[9px] text-orange-500 pl-4">
                      Pendiente: {fmt(retiroPendiente)}
                    </p>
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

// ─── Alertas Operativas (nueva versión con info real) ─────────────────────────

function SmartAlertsPanel({
  fleet, reciboRows, kmAlerts, gpsAlerts,
}: {
  fleet: FleetVehicle[];
  reciboRows: ReciboJPRow[];
  kmAlerts: KmAlert[];
  gpsAlerts: GpsAlert[];
}) {
  type AlertItem = {
    severity: 'high' | 'medium' | 'low';
    icon: React.ReactNode;
    text: string;
    sub: string;
    href: string;
  };
  const items: AlertItem[] = [];

  // 1. RETIROS SIN CONFIRMAR (más urgente para JP — tiene efectivo sin registrar)
  reciboRows
    .filter(r => r.efectivo > 0 && !r.retiroConfirmado && r.waStatus !== 'paid')
    .forEach(r => {
      items.push({
        severity: 'high',
        icon: <Banknote className="h-3.5 w-3.5" />,
        text: `${r.eco} — retiro sin confirmar`,
        sub:  `${fmt(r.efectivo)} en efectivo · ${r.chofer.split(' ')[0]}`,
        href: '/resumen-final',
      });
    });

  // 2. GPS ALERTS críticas/altas activas
  gpsAlerts
    .filter(g => g.severidad === 'critica' || g.severidad === 'alta')
    .slice(0, 3)
    .forEach(g => {
      const iconMap: Record<string, React.ReactNode> = {
        GPS_ZMG_EXIT:    <Navigation   className="h-3.5 w-3.5" />,
        GPS_SPEED_HIGH:  <Gauge        className="h-3.5 w-3.5" />,
        GPS_IMPACT:      <AlertTriangle className="h-3.5 w-3.5" />,
        GPS_HARD_STOP:   <AlertTriangle className="h-3.5 w-3.5" />,
        GPS_NO_SIGNAL:   <Wifi         className="h-3.5 w-3.5" />,
      };
      items.push({
        severity: g.severidad === 'critica' ? 'high' : 'medium',
        icon: iconMap[g.tipo] ?? <AlertTriangle className="h-3.5 w-3.5" />,
        text: g.mensaje,
        sub:  'GPS · Toca para ver ubicación',
        href: '/ubicacion',
      });
    });

  // 3. Seguros vencidos
  fleet
    .filter(v => v.insuranceStatus === 'vencida' || v.insuranceStatus === 'sin_poliza')
    .forEach(v => {
      items.push({
        severity: 'high',
        icon: <ShieldOff className="h-3.5 w-3.5" />,
        text: `${v.eco} — seguro ${v.insuranceStatus === 'vencida' ? 'vencido' : 'sin póliza'}`,
        sub:  v.expiryDate ? `Venció ${v.expiryDate}` : 'Sin póliza registrada',
        href: '/seguros',
      });
    });

  // 4. Seguros por vencer
  fleet
    .filter(v => v.insuranceStatus === 'por_vencer')
    .forEach(v => {
      items.push({
        severity: 'medium',
        icon: <ShieldOff className="h-3.5 w-3.5" />,
        text: `${v.eco} — seguro por vencer`,
        sub:  v.expiryDate ? `Vence ${v.expiryDate}` : '',
        href: '/seguros',
      });
    });

  // 5. KM alerts
  kmAlerts.forEach(k => {
    items.push({
      severity: 'medium',
      icon: <Wrench className="h-3.5 w-3.5" />,
      text: `${k.eco} — ${fmtKm(k.kmDesdeRevision)} sin servicio`,
      sub:  `${fmtKm(k.kmActual)} actuales`,
      href: '/mantenimiento',
    });
  });

  // 6. GPS alertas medias (ralentí, inactivo, arranque tardío)
  gpsAlerts
    .filter(g => g.severidad === 'media')
    .slice(0, 2)
    .forEach(g => {
      items.push({
        severity: 'low',
        icon: <Clock className="h-3.5 w-3.5" />,
        text: g.mensaje,
        sub:  'GPS',
        href: '/ubicacion',
      });
    });

  // Ordenar: críticos primero
  items.sort((a, b) => {
    const ord = { high: 0, medium: 1, low: 2 };
    return ord[a.severity] - ord[b.severity];
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Alertas Operativas</h2>
          <p className="text-xs text-slate-500 mt-0.5">Retiros · GPS · Seguros · KM</p>
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
                item.severity === 'high'   ? 'bg-red-50 text-red-600'    :
                item.severity === 'medium' ? 'bg-amber-50 text-amber-600' :
                                             'bg-slate-50 text-slate-500'
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

  // ── Retiro modal ──────────────────────────────────────────────────────────
  const [retiroRow,       setRetiroRow]       = useState<ReciboJPRow | null>(null);
  const [retiroMonto,     setRetiroMonto]     = useState('');
  const [retiroNota,      setRetiroNota]      = useState('');
  const [retiroSaving,    setRetiroSaving]    = useState(false);
  const [retiroError,     setRetiroError]     = useState('');
  const [imagePreview,    setImagePreview]    = useState<string | null>(null);
  const [analyzing,       setAnalyzing]       = useState(false);
  const [autoDetected,    setAutoDetected]    = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Edit modal ────────────────────────────────────────────────────────────
  const [editRow, setEditRow] = useState<ReciboJPRow | null>(null);
  // Overrides locales para actualización inmediata sin esperar refetch
  const [localEfectivos, setLocalEfectivos] = useState<Record<string, number>>({});

  // Al abrir modal retiro: pre-llenar con monto existente si ya está confirmado, si no con múltiplo de 100
  const openRetiro = (row: ReciboJPRow) => {
    setRetiroRow(row);
    setRetiroMonto(
      row.retiroConfirmado && row.retiroMonto > 0
        ? String(row.retiroMonto)
        : String(snapTo100(row.efectivo))
    );
    setRetiroNota('');
    setRetiroError('');
    setImagePreview(null);
    setAnalyzing(false);
    setAutoDetected(false);
  };

  // Analizar comprobante con IA visión
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      setAnalyzing(true);
      setAutoDetected(false);
      try {
        const base64    = dataUrl.split(',')[1];
        const mediaType = file.type || 'image/jpeg';
        const res = await fetch('/api/analyze-receipt', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ imageBase64: base64, mediaType }),
        });
        const data = await res.json();
        if (data.amount > 0) {
          const snapped = snapTo100(data.amount);
          setRetiroMonto(String(snapped > 0 ? snapped : data.amount));
          setAutoDetected(true);
        }
      } catch {
        // Usuario puede ingresar manualmente
      } finally {
        setAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
    // Reset input para permitir seleccionar la misma imagen de nuevo
    e.target.value = '';
  };

  const handleConfirmRetiro = async () => {
    if (!retiroRow?.weeklyAccountId) return;
    const monto = parseInt(retiroMonto) || 0;
    if (monto <= 0) { setRetiroError('Ingresa el monto recibido'); return; }
    setRetiroSaving(true); setRetiroError('');
    try {
      const res = await fetch(`/api/weekly-accounts/${retiroRow.weeklyAccountId}/retiro`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retiro_confirmado: true,
          retiro_monto: monto,
          retiro_comprobante_url: retiroNota.trim() || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Error');
      setRetiroRow(null);
      refetch();
    } catch (e: unknown) {
      setRetiroError(e instanceof Error ? e.message : 'Error al confirmar');
    } finally { setRetiroSaving(false); }
  };

  // Deshacer un retiro ya confirmado
  const handleUndoRetiro = async () => {
    if (!retiroRow?.weeklyAccountId) return;
    setRetiroSaving(true); setRetiroError('');
    try {
      const res = await fetch(`/api/weekly-accounts/${retiroRow.weeklyAccountId}/retiro`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retiro_confirmado: false, retiro_monto: 0 }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Error');
      setRetiroRow(null);
      refetch();
    } catch (e: unknown) {
      setRetiroError(e instanceof Error ? e.message : 'Error al deshacer');
    } finally { setRetiroSaving(false); }
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
  const gpsAlerts  = data?.gpsAlerts        ?? [];
  const nombre     = user?.firstName?.split(' ')[0] || user?.company || '';

  const cobradoSemana = stats?.cobradoSemana ?? 0;
  const porCobrar     = cobros.reduce((s, c) => s + c.monto, 0);
  const utilidad      = stats?.utilidadMes  ?? 0;
  const totalVeh      = stats?.totalVehiculos ?? 0;
  const activosCount  = stats?.vehiculosActivos ?? 0;
  const inactivos     = stats?.vehiculosInactivos ?? 0;
  const insAlerts     = stats?.insuranceAlertCount
    ?? fleet.filter(v => v.insuranceStatus !== 'vigente').length;

  const pagados    = reciboJP?.rows.filter(r => r.waStatus === 'paid').length ?? 0;
  const pendientes = reciboJP?.rows.filter(r => r.waStatus !== 'paid' && (r.efectivo > 0 || r.banco > 0)).length ?? 0;

  const ingresosActual   = stats?.ingresosSemana ?? 0;
  const ingresosAnterior = stats?.ingresosSemanaAnterior ?? 0;
  const tendencia        = ingresosAnterior > 0
    ? Math.round(((ingresosActual - ingresosAnterior) / ingresosAnterior) * 100)
    : 0;

  const cobradoDisplay = cobradoSemana > 0
    ? cobradoSemana
    : (reciboJP?.totalEfectivo ?? 0);

  // Retiros sin confirmar para alertas
  const retirosSinConfirmar = (reciboJP?.rows ?? []).filter(
    r => r.efectivo > 0 && !r.retiroConfirmado && r.waStatus !== 'paid'
  ).length;

  // Total alertas urgentes en badge de header
  const totalAlertas = insAlerts + retirosSinConfirmar + gpsAlerts.filter(g => g.severidad === 'critica' || g.severidad === 'alta').length;

  // Monto redondeado al cambiar input (snap a 100)
  const handleRetiroMontoChange = (v: string) => {
    setRetiroMonto(v);
  };
  const handleRetiroMontoBlur = () => {
    const n = parseInt(retiroMonto) || 0;
    setRetiroMonto(String(snapTo100(n)));
  };

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
          <div className="flex items-center gap-2">
            {totalAlertas > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                <AlertTriangle className="h-3 w-3" />
                {totalAlertas}
              </span>
            )}
            <Link href="/cuentas-semanales/importar-didi"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm flex-shrink-0">
              <FileText className="h-3.5 w-3.5" />
              Importar Didi
            </Link>
          </div>
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
          <StatCard
            href="/cuentas-semanales"
            label="Por Cobrar"
            value={loading ? '—' : fmt(porCobrar)}
            sub={cobros.length > 0 ? `${cobros.length} pendientes` : 'Al corriente ✓'}
            icon={<DollarSign className="h-4.5 w-4.5 text-amber-600" />}
            accent="bg-amber-50"
          />
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
          <StatCard
            href="/contabilidad"
            label="Utilidad del Mes"
            value={loading ? '—' : fmt(utilidad)}
            sub={utilidad > 0 ? 'ingresos − gastos' : 'sin gastos registrados'}
            icon={<TrendingUp className="h-4.5 w-4.5 text-violet-600" />}
            accent="bg-violet-50"
          />
        </div>

        {/* ── ZONA B: Semáforo de Flotilla ── */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">

          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-white">Semáforo de Flotilla</h2>
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
                {reciboJP.rows.map(r => {
                  // Merge override local si existe (post-guardado sin esperar refetch)
                  const mergedRow = localEfectivos[r.vehicleId] !== undefined
                    ? { ...r, efectivo: localEfectivos[r.vehicleId] }
                    : r;
                  return (
                    <VehicleCard
                      key={r.vehicleId}
                      row={mergedRow}
                      onConfirmRetiro={openRetiro}
                      onEdit={setEditRow}
                    />
                  );
                })}
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
                  {retirosSinConfirmar > 0 && (
                    <span className="flex items-center gap-1 text-amber-600 font-semibold">
                      <Banknote className="h-3 w-3" />
                      {retirosSinConfirmar} sin confirmar retiro
                    </span>
                  )}
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

          <SmartAlertsPanel
            fleet={fleet}
            reciboRows={reciboJP?.rows ?? []}
            kmAlerts={kmAlerts}
            gpsAlerts={gpsAlerts}
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

    {/* ── Modal Retiro Sin Tarjeta ── */}
    {retiroRow && (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {retiroRow.retiroConfirmado ? 'Editar Retiro' : 'Confirmar Retiro'}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {retiroRow.eco} · {retiroRow.chofer.split(' ').slice(0,2).join(' ')}
              </p>
            </div>
            <button
              onClick={() => setRetiroRow(null)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Monto calculado */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-slate-500 font-medium">Cuenta calculada</p>
              <p className="text-base font-black text-slate-700">{fmt(retiroRow.efectivo)}</p>
            </div>

            {/* Subir comprobante con análisis IA */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Comprobante de transferencia
                <span className="text-xs font-normal text-slate-400 ml-1">(opcional — IA lee el monto)</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Comprobante" className="w-full max-h-36 object-contain rounded-xl border border-slate-200 bg-slate-50" />
                  {analyzing && (
                    <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center rounded-xl gap-1">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      <p className="text-xs font-semibold text-blue-600">Leyendo monto...</p>
                    </div>
                  )}
                  {autoDetected && !analyzing && (
                    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow">
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                      Monto detectado: {fmt(parseInt(retiroMonto) || 0)}
                    </div>
                  )}
                  <button
                    onClick={() => { setImagePreview(null); setAutoDetected(false); }}
                    className="absolute top-1.5 right-1.5 h-6 w-6 bg-white/90 border border-slate-200 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors">
                    <X className="h-3 w-3 text-slate-500" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                  <Camera className="h-4 w-4" />
                  Subir captura del comprobante
                </button>
              )}
            </div>

            {/* Input monto real recibido */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                ¿Cuánto recibiste?
                <span className="text-xs font-normal text-slate-400 ml-1">(múltiplo de $100)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={retiroMonto}
                  onChange={e => handleRetiroMontoChange(e.target.value)}
                  onBlur={handleRetiroMontoBlur}
                  className={`w-full pl-7 pr-3 py-2.5 border rounded-xl text-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${autoDetected ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300'}`}
                />
              </div>
              {/* Diferencia */}
              {(() => {
                const montoN = parseInt(retiroMonto) || 0;
                const diff   = retiroRow.efectivo - montoN;
                if (diff > 0 && montoN > 0) {
                  return (
                    <p className="text-xs text-orange-600 mt-1.5 font-medium">
                      ⚠️ Diferencia de {fmt(diff)} — anota el motivo abajo
                    </p>
                  );
                }
                return null;
              })()}
            </div>

            {/* Nota del motivo */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Nota <span className="text-xs font-normal text-slate-400">(ej: $800 parabrisas)</span>
              </label>
              <input
                type="text"
                value={retiroNota}
                onChange={e => setRetiroNota(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: $800 quedaron para parabrisas..."
              />
            </div>

            {retiroError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{retiroError}</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 px-6 pb-5">
            {/* Deshacer — solo visible si ya estaba confirmado */}
            {retiroRow.retiroConfirmado ? (
              <button
                onClick={handleUndoRetiro}
                disabled={retiroSaving}
                className="px-4 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-60 transition-colors flex items-center gap-1.5">
                <X className="h-3.5 w-3.5" />
                Deshacer retiro
              </button>
            ) : (
              <button
                onClick={() => setRetiroRow(null)}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
            )}
            <div className="flex items-center gap-2">
              {retiroRow.retiroConfirmado && (
                <button
                  onClick={() => setRetiroRow(null)}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
              )}
              <button
                onClick={handleConfirmRetiro}
                disabled={retiroSaving || !retiroMonto || parseInt(retiroMonto) <= 0}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors flex items-center gap-2">
                {retiroSaving
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando...</>
                  : retiroRow.retiroConfirmado
                  ? <><CheckCircle2 className="h-3.5 w-3.5" /> Guardar cambio</>
                  : <><CheckCircle2 className="h-3.5 w-3.5" /> Confirmar {fmt(parseInt(retiroMonto) || 0)}</>
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ── Modal Editar Cuenta (desde semáforo) ── */}
    {editRow && (
      <ModalEditarCuenta
        row={editRow}
        onGuardar={(newEfectivo) => {
          // Update inmediato en tarjeta sin esperar refetch
          if (editRow) {
            setLocalEfectivos(prev => ({ ...prev, [editRow.vehicleId]: newEfectivo }));
          }
          setEditRow(null);
          refetch();
        }}
        onCancelar={() => setEditRow(null)}
      />
    )}
    </>
  );
}
