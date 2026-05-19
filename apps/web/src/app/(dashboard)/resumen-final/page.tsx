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
  Send, Copy, Download, ImageIcon,
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
  retiroGastoMonto: number;
  retiroNota: string | null;
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

// Generar mensaje WhatsApp para un chofer
function buildWAMessage(row: ReciboJPRow): string {
  const semana = fmtWeek(row.weekStart);
  const lines: string[] = [];

  lines.push(`🚗 *${row.eco} — Cuenta Semanal*`);
  lines.push('');
  lines.push(`*Semana:* ${semana}`);
  lines.push(`*Chofer:* ${row.chofer}`);
  lines.push('');
  lines.push(`📊 *Desglose:*`);
  lines.push(`Renta (${row.diasTrabajados}/7 días): ${fmt(row.rent)}`);
  if (row.contabilidad > 0) lines.push(`Contabilidad: ${fmt(row.contabilidad)}`);
  lines.push(`Didi depositó a cuenta: ${fmt(row.banco)}`);
  if (row.adicional !== 0) lines.push(`Adicional: ${row.adicional > 0 ? '+' : ''}${fmt(Math.abs(row.adicional))}`);
  if (row.montoKms > 0)    lines.push(`Monto km adicionales: ${fmt(row.montoKms)}`);
  if (row.saldoPendiente !== 0)
    lines.push(`Saldo previo: ${row.saldoPendiente > 0 ? '+' : ''}${fmt(Math.abs(row.saldoPendiente))}`);
  lines.push('');
  lines.push(`💰 *Total a entregar en efectivo: ${fmt(row.efectivo)}*`);
  if (row.viajes > 0) {
    lines.push('');
    lines.push(`Viajes semana: ${row.viajes}`);
  }
  lines.push('');
  lines.push(`¡Gracias! Al Volante GDL 🙏`);

  return lines.join('\n');
}

// ─── Canvas: generar imagen estilo tabla Excel de JP ─────────────────────────

async function generateReceiptImageDataUrl(row: ReciboJPRow): Promise<string> {
  const W = 520;
  const FONT = '-apple-system,system-ui,Arial,sans-serif';
  const PAD  = 24;
  const COL1 = PAD;
  const COL2 = W - PAD;   // right-align amounts

  // Filas de la tabla
  type TableRow = { label: string; value: string; bg?: string; bold?: boolean; color?: string; labelColor?: string };
  const tableRows: TableRow[] = [];

  tableRows.push({ label: 'Renta',                    value: fmt(row.rent) });
  tableRows.push({ label: 'Contabilidad',             value: row.contabilidad > 0 ? fmt(row.contabilidad) : '$  -' });
  tableRows.push({ label: 'Depósitos a la Cuenta',    value: row.banco > 0 ? fmt(row.banco) : '$  -' });
  tableRows.push({ label: 'Saldo a Favor / En contra',value: row.adicional !== 0 ? fmt(Math.abs(row.adicional)) : '$  -' });
  tableRows.push({ label: 'Monto por Kms Adicionales',value: row.montoKms > 0 ? fmt(row.montoKms) : '$  -' });
  if (row.retiroConfirmado && row.retiroGastoMonto > 0) {
    const nota = row.retiroNota ? ` (${row.retiroNota})` : '';
    tableRows.push({ label: `Gasto deducible${nota}`, value: fmt(row.retiroGastoMonto) });
  }
  // Fila amarilla Adicional (si aplica)
  const hasAdicional = row.adicional > 0;

  // Total
  tableRows.push({ label: '*Total a Depositar*', value: fmt(row.efectivo), bg: '#1a7a3a', bold: true, color: '#ffffff', labelColor: '#ffffff' });

  // Retiro (si confirmado)
  if (row.retiroConfirmado) {
    tableRows.push({ label: `✓ Retiro recibido`, value: fmt(row.retiroMonto), bg: '#e8f5e9', bold: true, color: '#1a7a3a', labelColor: '#1a7a3a' });
    if (row.saldoPendiente > 0) {
      tableRows.push({ label: '⏭ Pendiente próxima semana', value: fmt(row.saldoPendiente), bg: '#fff3e0', bold: true, color: '#e65100', labelColor: '#e65100' });
    }
  }

  const ROW_H   = 32;
  const HEADER1 = 56;   // top info
  const HEADER2 = 90;   // blue band
  const BODY_Y  = HEADER1 + HEADER2;
  const H = BODY_Y + tableRows.length * ROW_H + (hasAdicional ? ROW_H : 0) + 60; // +6 spacer + 18 footer + buffer

  const canvas = document.createElement('canvas');
  canvas.width  = W * 2;
  canvas.height = H * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);

  // ── Fondo blanco
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // ── TOP INFO: logo + eco + dias
  try {
    const logo = new window.Image();
    await new Promise<void>((res, rej) => { logo.onload = () => res(); logo.onerror = rej; logo.src = '/fleet-icon.png'; });
    ctx.drawImage(logo, PAD, 10, 28, 28);
  } catch { /* skip */ }

  ctx.fillStyle = '#1e293b';
  ctx.font = `bold 13px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`${row.brand} ${row.model} — ${row.eco}`, PAD + 34, 22);

  ctx.fillStyle = '#64748b';
  ctx.font = `11px ${FONT}`;
  ctx.fillText(`${row.plates}`, PAD + 34, 38);

  // Días trabajados (right)
  ctx.fillStyle = '#475569';
  ctx.font = `11px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('Días trabajados', COL2 - 32, 22);
  ctx.fillStyle = '#0f172a';
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText(String(row.diasTrabajados || 7), COL2, 36);
  ctx.textAlign = 'left';

  // ── ENCABEZADO AZUL
  const BLY = HEADER1;
  ctx.fillStyle = '#1e3a6e';
  ctx.fillRect(0, BLY, W, HEADER2);

  // Semana
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 14px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(fmtWeek(row.weekStart) ?? '—', W / 2, BLY + 30);

  // Nombre chofer
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillText(row.chofer.toUpperCase(), W / 2, BLY + 62);
  ctx.textAlign = 'left';

  // ── TABLA
  let y = BODY_Y;
  let altBg = false;

  const drawRow = (r: TableRow) => {
    const bg = r.bg ?? (altBg ? '#f1f5f9' : '#ffffff');
    ctx.fillStyle = bg;
    ctx.fillRect(0, y, W, ROW_H);

    // Línea divisora
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, y + ROW_H); ctx.lineTo(W, y + ROW_H); ctx.stroke();

    const cy = y + ROW_H / 2 + 5;

    ctx.fillStyle = r.labelColor ?? '#334155';
    ctx.font = `${r.bold ? 'bold ' : ''}13px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(r.label, COL1, cy);

    ctx.fillStyle = r.color ?? '#0f172a';
    ctx.font = `${r.bold ? 'bold ' : ''}13px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(r.value, COL2, cy);
    ctx.textAlign = 'left';

    y += ROW_H;
    altBg = !altBg;
  };

  // Filas normales (todas menos la última que es total)
  const normalRows = tableRows.filter(r => !r.bg?.startsWith('#1a7'));
  const totalRow   = tableRows.find(r => r.bg?.startsWith('#1a7'));
  const extraRows  = tableRows.filter(r => r.bg?.startsWith('#e8') || r.bg?.startsWith('#fff3'));

  normalRows.forEach(drawRow);

  // Fila amarilla Adicional (si aplica)
  if (hasAdicional) {
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(0, y, W, ROW_H);
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, y + ROW_H); ctx.lineTo(W, y + ROW_H); ctx.stroke();
    ctx.fillStyle = '#92400e';
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('Adicional', COL1, y + ROW_H / 2 + 5);
    ctx.textAlign = 'right';
    ctx.fillText(fmt(row.adicional), COL2, y + ROW_H / 2 + 5);
    ctx.textAlign = 'left';
    y += ROW_H;
  }

  // Espaciado antes del total
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, y, W, 6);
  y += 6;

  // Fila total (verde)
  if (totalRow) drawRow(totalRow);

  // Filas retiro/pendiente
  extraRows.forEach(drawRow);

  // ── Footer
  y += 8;
  ctx.fillStyle = '#94a3b8';
  ctx.font = `9px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('Gestiona tu Flotilla · gestionatuflotilla.com', W / 2, y + 10);
  ctx.textAlign = 'left';

  return canvas.toDataURL('image/png');
}

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
                <p className="text-xs text-emerald-600">Total a Depositar: {fmt(savedTotal)}</p>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Total a Depositar</span>
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
  onUndoRetiro,
  undoing,
}: {
  row: ReciboJPRow;
  onConfirmRetiro: (row: ReciboJPRow) => void;
  onEdit: (row: ReciboJPRow) => void;
  onUndoRetiro: (wid: string) => void;
  undoing: boolean;
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
  // Usar saldoPendiente del servidor (ya descuenta gastos deducibles)
  const retiroPendiente = row.retiroConfirmado && row.saldoPendiente > 0
    ? row.saldoPendiente
    : row.retiroConfirmado && row.retiroMonto > 0
      ? Math.max(0, row.efectivo - row.retiroMonto)
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
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onConfirmRetiro(row)}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors"
                        title="Editar retiro">
                        <Pencil className="h-2.5 w-2.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => row.weeklyAccountId && onUndoRetiro(row.weeklyAccountId)}
                        disabled={undoing || !row.weeklyAccountId}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded transition-colors disabled:opacity-40"
                        title="Deshacer retiro">
                        {undoing ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <X className="h-2.5 w-2.5" />}
                        Deshacer
                      </button>
                    </div>
                  </div>
                  {/* Gasto deducible + nota */}
                  {row.retiroGastoMonto > 0 && (
                    <p className="text-[9px] text-slate-500 pl-4 leading-tight">
                      Gasto: {fmt(row.retiroGastoMonto)}
                      {row.retiroNota ? <span className="text-slate-400"> · {row.retiroNota}</span> : null}
                    </p>
                  )}
                  {/* Saldo pendiente próxima semana */}
                  {retiroPendiente > 0 && (
                    <p className="text-[9px] text-orange-500 font-semibold pl-4">
                      ⏭ Pendiente: {fmt(retiroPendiente)}
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
        sub:  'GPS · Confirma en Tracksolid antes de actuar',
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
        sub:  'GPS · Confirma en Tracksolid',
        href: '/ubicacion',
      });
    });

  const hasGpsAlerts = gpsAlerts.length > 0;

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
        <div className="flex items-center gap-2">
          {hasGpsAlerts && (
            <a
              href="https://tracksolidpro.com/resource/dev/index.html#/monitorObject"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full hover:bg-blue-100 transition-colors flex items-center gap-1">
              <Navigation className="h-2.5 w-2.5" />
              Ver en vivo
            </a>
          )}
          {items.length > 0 && (
            <span className="text-xs font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-200">
              {items.length}
            </span>
          )}
        </div>
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

  // ── Optimistic retiro state: id → { confirmado, monto, gasto, saldo } ────
  const [localRetiros, setLocalRetiros] = useState<Record<string, {
    confirmado: boolean; monto: number; gasto: number; saldo: number;
  }>>({});

  // ── Retiro modal ──────────────────────────────────────────────────────────
  const [retiroRow,       setRetiroRow]       = useState<ReciboJPRow | null>(null);
  const [retiroMonto,     setRetiroMonto]     = useState('');
  const [retiroNota,      setRetiroNota]      = useState('');
  const [retiroGasto,     setRetiroGasto]     = useState('');   // monto deducible (depósito, compra, etc.)
  const [retiroSaving,    setRetiroSaving]    = useState(false);
  const [retiroError,     setRetiroError]     = useState('');
  const [imagePreview,    setImagePreview]    = useState<string | null>(null);
  const [analyzing,       setAnalyzing]       = useState(false);
  const [autoDetected,    setAutoDetected]    = useState(false);
  const [aiNoDetect,      setAiNoDetect]      = useState(false);
  const [aiDebugMsg,      setAiDebugMsg]      = useState('');
  const [isDragging,      setIsDragging]      = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Send WA modal ─────────────────────────────────────────────────────────
  const [sendWARow,        setSendWARow]        = useState<ReciboJPRow | null>(null);
  const [waCopied,         setWACopied]         = useState(false);
  const [waImgCopied,      setWaImgCopied]      = useState(false);
  const [waGeneratedImage, setWaGeneratedImage] = useState<string | null>(null);
  const [waGeneratingImg,  setWaGeneratingImg]  = useState(false);
  // ── Send-all modal ────────────────────────────────────────────────────────
  const [sendAllOpen,   setSendAllOpen]   = useState(false);
  const [allImages,     setAllImages]     = useState<Record<string, string>>({});
  const [generatingAll, setGeneratingAll] = useState(false);

  const openSendWA = (row: ReciboJPRow) => {
    setSendWARow(row);
    setWACopied(false);
    setWaGeneratedImage(null);
    setWaGeneratingImg(true);
    // Auto-generar imagen al abrir el modal
    generateReceiptImageDataUrl(row)
      .then(url => { setWaGeneratedImage(url); setWaGeneratingImg(false); })
      .catch(() => setWaGeneratingImg(false));
  };

  const handleGenerateImage = async (row: ReciboJPRow) => {
    setWaGeneratingImg(true);
    try {
      const dataUrl = await generateReceiptImageDataUrl(row);
      setWaGeneratedImage(dataUrl);
    } catch (e) {
      console.error('[generateReceiptImage]', e);
    } finally {
      setWaGeneratingImg(false);
    }
  };

  // Compartir imagen + texto: en móvil usa Web Share API, en desktop abre wa.me directo
  const handleShareWA = async (row: ReciboJPRow, imageDataUrl: string | null) => {
    const msg   = buildWAMessage(row);
    const phone = row.choferPhone?.replace(/\D/g, '');
    const waLink = row.waGroupLink ?? (phone ? `https://wa.me/52${phone}?text=${encodeURIComponent(msg)}` : null);

    // Solo usar Web Share en móvil real (iOS/Android) — en desktop va directo a WA
    const isMobile = typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile && imageDataUrl && typeof navigator !== 'undefined' && navigator.canShare) {
      try {
        const res  = await fetch(imageDataUrl);
        const blob = await res.blob();
        const file = new File([blob], `resumen-${row.eco}-${row.weekStart ?? 'semana'}.png`, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text: msg, title: `Resumen ${row.chofer.split(' ')[0]}` });
          return;
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        console.warn('[handleShareWA] Web Share falló, abriendo WA', e);
      }
    }

    // Desktop o fallback: abrir WhatsApp directo con el texto
    if (waLink) window.open(waLink, '_blank');
  };

  const handleOpenSendAll = async () => {
    setSendAllOpen(true);
    setGeneratingAll(true);
    const imgs: Record<string, string> = {};
    const rows = reciboJP?.rows ?? [];
    for (const r of rows) {
      try {
        // Merge optimistic state
        const local = r.weeklyAccountId ? localRetiros[r.weeklyAccountId] : undefined;
        const merged: ReciboJPRow = {
          ...r,
          efectivo:         localEfectivos[r.vehicleId] ?? r.efectivo,
          retiroConfirmado: local !== undefined ? local.confirmado : r.retiroConfirmado,
          retiroMonto:      local !== undefined ? local.monto      : r.retiroMonto,
          retiroGastoMonto: local !== undefined ? local.gasto      : r.retiroGastoMonto,
          saldoPendiente:   local !== undefined ? local.saldo      : r.saldoPendiente,
        };
        imgs[r.vehicleId] = await generateReceiptImageDataUrl(merged);
      } catch { /* skip */ }
    }
    setAllImages(imgs);
    setGeneratingAll(false);
  };

  // Copiar imagen al portapapeles (desktop: Ctrl+V directo en WhatsApp)
  const handleCopyImage = async (imageDataUrl: string, eco: string, weekStart: string | null) => {
    try {
      const res  = await fetch(imageDataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setWaImgCopied(true);
      setTimeout(() => setWaImgCopied(false), 3000);
    } catch {
      // Fallback: descarga automática
      const a = document.createElement('a');
      a.href = imageDataUrl;
      a.download = `resumen-${eco}-${weekStart ?? 'semana'}.png`;
      a.click();
    }
  };

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
    // Pre-rellenar nota y gasto si ya estaba confirmado
    setRetiroNota(row.retiroConfirmado && row.retiroNota ? row.retiroNota : '');
    setRetiroGasto(row.retiroConfirmado && row.retiroGastoMonto > 0 ? String(row.retiroGastoMonto) : '');
    setRetiroError('');
    setImagePreview(null);
    setAnalyzing(false);
    setAutoDetected(false);
    setAiNoDetect(false);
    setAiDebugMsg('');
    setIsDragging(false);
  };

  // Redimensiona a JPEG 97% max 1024px — balance calidad/tamaño
  const resizeForAI = (dataUrl: string): Promise<string> =>
    new Promise(resolve => {
      const img = new window.Image();
      img.onload = () => {
        const MAX = 1024;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height / width) * MAX); width = MAX; }
          else { width = Math.round((width / height) * MAX); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.97));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });

  // Analizar comprobante con IA visión — función compartida por click y drag&drop
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const rawDataUrl = ev.target?.result as string;
      setImagePreview(rawDataUrl);
      setAnalyzing(true);
      setAutoDetected(false);
      setAiNoDetect(false);
      setAiDebugMsg('');
      try {
        const resized = await resizeForAI(rawDataUrl);
        const base64  = resized.split(',')[1];
        const res = await fetch('/api/analyze-receipt', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body:    JSON.stringify({ imageBase64: base64, mediaType: 'image/jpeg' }),
        });
        const json = await res.json().catch(() => ({})) as { amount?: number; raw?: string; message?: string };
        if (!res.ok) {
          // Error HTTP (401, 500...) — mostrar mensaje
          setAiDebugMsg(`Error ${res.status}: ${json.message ?? 'sin respuesta'}`);
          setAiNoDetect(true);
        } else if ((json.amount ?? 0) > 0) {
          setRetiroMonto(String(json.amount));
          setAutoDetected(true);
        } else {
          // Devolvió 0 — mostrar lo que la IA respondió exactamente
          setAiDebugMsg(json.raw ? `IA dijo: "${json.raw}"` : 'IA respondió: 0');
          setAiNoDetect(true);
        }
      } catch (e) {
        setAiDebugMsg(`Excepción: ${e instanceof Error ? e.message : String(e)}`);
        setAiNoDetect(true);
      } finally {
        setAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleConfirmRetiro = async () => {
    if (!retiroRow?.weeklyAccountId) {
      setRetiroError('Esta cuenta no tiene ID asignado. Recarga la página e intenta de nuevo.');
      return;
    }
    const monto = parseInt(retiroMonto) || 0;
    if (monto <= 0) { setRetiroError('Ingresa el monto recibido'); return; }
    const gastoN  = parseInt(retiroGasto) || 0;
    const efectivo = retiroRow.efectivo;
    const saldo   = Math.max(0, efectivo - monto - gastoN);
    const wid     = retiroRow.weeklyAccountId;

    setRetiroSaving(true); setRetiroError('');
    try {
      const res = await fetch(`/api/weekly-accounts/${wid}/retiro`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          retiro_confirmado:  true,
          retiro_monto:       monto,
          retiro_nota:        retiroNota.trim() || null,
          retiro_gasto_monto: gastoN,
        }),
      });
      const json = await res.json().catch(() => ({})) as { ok?: boolean; message?: string; saldoPendiente?: number };
      if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);

      // ── Optimistic update: reflejar en UI de inmediato ──────────────────
      setLocalRetiros(prev => ({
        ...prev,
        [wid]: { confirmado: true, monto, gasto: gastoN, saldo },
      }));
      setRetiroRow(null);
      // Refetch en background para sincronizar con servidor
      setTimeout(() => refetch(), 800);
    } catch (e: unknown) {
      setRetiroError(e instanceof Error ? e.message : 'Error al confirmar');
    } finally { setRetiroSaving(false); }
  };

  // Deshacer un retiro ya confirmado (desde modal)
  const handleUndoRetiro = async () => {
    if (!retiroRow?.weeklyAccountId) return;
    await handleUndoRetiroDirect(retiroRow.weeklyAccountId);
    setRetiroRow(null);
  };

  // Deshacer retiro directamente desde la tarjeta (sin abrir modal)
  const [undoingRetiro, setUndoingRetiro] = useState<string | null>(null);
  const handleUndoRetiroDirect = async (wid: string) => {
    setUndoingRetiro(wid);
    setRetiroError('');
    try {
      const res = await fetch(`/api/weekly-accounts/${wid}/retiro`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ retiro_confirmado: false, retiro_monto: 0 }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Error');
      setLocalRetiros(prev => {
        const next = { ...prev };
        delete next[wid];
        return next;
      });
      setTimeout(() => refetch(), 800);
    } catch (e: unknown) {
      setRetiroError(e instanceof Error ? e.message : 'Error al deshacer');
    } finally { setUndoingRetiro(null); }
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
            {insAlerts > 0 && (
              <span
                title={`${insAlerts} seguro${insAlerts > 1 ? 's' : ''} vencido${insAlerts > 1 ? 's' : ''} o por vencer`}
                className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full cursor-default">
                <AlertTriangle className="h-3 w-3" />
                {insAlerts} seguro{insAlerts > 1 ? 's' : ''}
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
              {reciboJP && reciboJP.rows.length > 0 && (
                <button
                  onClick={handleOpenSendAll}
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                  <Send className="h-3 w-3" />
                  Mandar cuentas
                </button>
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
                  // Merge overrides locales (efectivo editado + retiro confirmado)
                  const local = r.weeklyAccountId ? localRetiros[r.weeklyAccountId] : undefined;
                  const mergedRow: ReciboJPRow = {
                    ...r,
                    efectivo:         localEfectivos[r.vehicleId] !== undefined ? localEfectivos[r.vehicleId] : r.efectivo,
                    retiroConfirmado: local !== undefined ? local.confirmado    : r.retiroConfirmado,
                    retiroMonto:      local !== undefined ? local.monto         : r.retiroMonto,
                    retiroGastoMonto: local !== undefined ? local.gasto         : r.retiroGastoMonto,
                    retiroNota:       r.retiroNota,
                    saldoPendiente:   local !== undefined ? local.saldo         : r.saldoPendiente,
                  };
                  return (
                    <VehicleCard
                      key={r.vehicleId}
                      row={mergedRow}
                      onConfirmRetiro={openRetiro}
                      onEdit={setEditRow}
                      onUndoRetiro={handleUndoRetiroDirect}
                      undoing={undoingRetiro === r.weeklyAccountId}
                    />
                  );
                })}
              </div>

              {/* Totales footer */}
              <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500">
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
                      {retirosSinConfirmar} sin confirmar
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
                <span className="text-xs font-normal text-slate-400 ml-1">(arrastra o sube — IA lee el monto)</span>
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
                  {aiNoDetect && !analyzing && (
                    <div className="absolute bottom-2 left-2 right-2 bg-amber-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow leading-snug">
                      ⚠️ No detectó monto — ingresa manualmente
                    </div>
                  )}
                  <button
                    onClick={() => { setImagePreview(null); setAutoDetected(false); setAiNoDetect(false); setAiDebugMsg(''); }}
                    className="absolute top-1.5 right-1.5 h-6 w-6 bg-white/90 border border-slate-200 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors">
                    <X className="h-3 w-3 text-slate-500" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`w-full flex flex-col items-center justify-center gap-1.5 py-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors select-none ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50'
                  }`}>
                  <Camera className="h-5 w-5" />
                  <p className="text-sm font-medium">
                    {isDragging ? 'Suelta aquí la imagen' : 'Arrastra el comprobante o haz clic'}
                  </p>
                  <p className="text-xs text-slate-400">JPG, PNG, WEBP · La IA lee el monto automáticamente</p>
                </div>
              )}

              {/* Debug IA — visible para diagnóstico */}
              {aiDebugMsg !== '' && !analyzing && (
                <div className="mt-2 px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs font-mono text-slate-700 break-all">
                  🔍 Debug IA: {aiDebugMsg}
                </div>
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

            {/* Gasto deducible — monto que se fue a compra/gasto justificado */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Gasto deducible
                <span className="text-xs font-normal text-slate-400 ml-1">(si se usó parte del dinero)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={retiroGasto}
                  onChange={e => setRetiroGasto(e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 border border-slate-300 rounded-xl text-base font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Nota del motivo */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Nota <span className="text-xs font-normal text-slate-400">(describe el gasto o el motivo)</span>
              </label>
              <input
                type="text"
                value={retiroNota}
                onChange={e => setRetiroNota(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: $800 para depósito de agua, $26 pendiente próxima semana"
              />
            </div>

            {/* Desglose saldo pendiente */}
            {(() => {
              const montoN = parseInt(retiroMonto) || 0;
              const gastoN = parseInt(retiroGasto) || 0;
              const efectivo = retiroRow.efectivo;
              const pendiente = Math.max(0, efectivo - montoN - gastoN);
              if (montoN > 0 && pendiente > 0) {
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs space-y-1">
                    <p className="font-semibold text-amber-800 mb-1.5">📋 Desglose del cobro</p>
                    <div className="flex justify-between text-slate-600"><span>Cuenta total</span><span className="font-medium">{fmt(efectivo)}</span></div>
                    <div className="flex justify-between text-slate-600"><span>Recibiste</span><span className="font-medium text-emerald-700">−{fmt(montoN)}</span></div>
                    {gastoN > 0 && <div className="flex justify-between text-slate-600"><span>Gasto deducible</span><span className="font-medium text-orange-600">−{fmt(gastoN)}</span></div>}
                    <div className="flex justify-between font-bold text-amber-800 border-t border-amber-200 pt-1 mt-1">
                      <span>⏭️ Pendiente próxima semana</span>
                      <span>{fmt(pendiente)}</span>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

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
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => setRetiroRow(null)}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <p className="text-[10px] text-slate-400 text-center leading-tight">
                  Al confirmar aparece &quot;Deshacer retiro&quot;
                </p>
              </div>
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

    {/* ── Modal Enviar Resumen WhatsApp ── */}
    {sendWARow && (() => {
      const row = sendWARow;
      const msg = buildWAMessage(row);
      const waUrl = row.waGroupLink
        ? row.waGroupLink
        : row.choferPhone
          ? `https://wa.me/52${row.choferPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
          : null;
      const nombre = row.chofer.split(' ')[0];
      return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSendWARow(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Send className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Enviar resumen</p>
                  <p className="text-xs text-slate-400">{nombre} · {row.eco} {row.plates}</p>
                </div>
              </div>
              <button onClick={() => setSendWARow(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            {/* Imagen + acciones */}
            <div className="flex-1 overflow-y-auto">

              {/* Imagen generada */}
              <div className="bg-slate-50 flex items-center justify-center min-h-[160px] border-b border-slate-200 relative p-3">
                {waGeneratingImg ? (
                  <div className="flex flex-col items-center gap-2 py-8">
                    <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
                    <p className="text-xs text-slate-500">Generando imagen...</p>
                  </div>
                ) : waGeneratedImage ? (
                  <img
                    src={waGeneratedImage}
                    alt="Resumen semanal"
                    className="w-full max-w-sm shadow-md rounded-lg border border-slate-200"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <ImageIcon className="h-10 w-10 text-slate-300" />
                    <button
                      onClick={() => handleGenerateImage(row)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
                      <ImageIcon className="h-4 w-4" /> Generar imagen
                    </button>
                  </div>
                )}
              </div>

              {/* Instrucciones desktop */}
              {waGeneratedImage && (
                <div className="mx-4 mt-3 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-xs font-bold text-blue-700 mb-1">📋 Pasos para enviar:</p>
                  <ol className="text-xs text-blue-600 space-y-0.5 list-decimal list-inside">
                    <li>Toca <strong>"Copiar imagen"</strong> ↓</li>
                    <li>Toca <strong>"Abrir WhatsApp"</strong> ↓</li>
                    <li>En el chat, pega con <strong>Ctrl+V</strong> y envía</li>
                  </ol>
                </div>
              )}

              {/* Mensaje texto */}
              <div className="p-4">
                <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" /> Texto del mensaje
                </label>
                <textarea
                  id="wa-msg-preview"
                  defaultValue={msg}
                  rows={7}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-700 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>

            {/* Botones */}
            <div className="px-4 pb-4 pt-3 border-t border-slate-100 space-y-2">
              {/* Paso 1: Copiar imagen */}
              {waGeneratedImage && (
                <button
                  onClick={() => handleCopyImage(waGeneratedImage, row.eco, row.weekStart)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors">
                  {waImgCopied
                    ? <><CheckCircle2 className="h-4 w-4" /> ¡Imagen copiada! Abre WhatsApp y pega</>
                    : <><Copy className="h-4 w-4" /> 1. Copiar imagen al portapapeles</>}
                </button>
              )}
              {/* Paso 2: Copiar texto + Abrir WA */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const ta = document.getElementById('wa-msg-preview') as HTMLTextAreaElement;
                    navigator.clipboard.writeText(ta?.value ?? msg);
                    setWACopied(true);
                    setTimeout(() => setWACopied(false), 2500);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                  {waCopied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  {waCopied ? '¡Texto copiado!' : '2. Copiar texto'}
                </button>
                {(row.choferPhone || row.waGroupLink) && (
                  <button
                    onClick={() => {
                      const phone = row.choferPhone?.replace(/\D/g, '');
                      const link  = row.waGroupLink ?? (phone ? `https://wa.me/52${phone}` : null);
                      if (link) window.open(link, '_blank');
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-colors">
                    <MessageCircle className="h-4 w-4" />
                    3. Abrir WhatsApp
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    })()}

    {/* ── Modal Enviar a Todos ── */}
    {sendAllOpen && (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSendAllOpen(false)}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 bg-emerald-100 rounded-full flex items-center justify-center">
                <Send className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Enviar a toda la flotilla</p>
                <p className="text-xs text-slate-400">
                  {reciboJP?.rows.length ?? 0} choferes · {fmtWeek(reciboJP?.weekStart ?? null)}
                </p>
              </div>
            </div>
            <button onClick={() => setSendAllOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="h-4 w-4 text-slate-500" />
            </button>
          </div>

          {/* Grid de imágenes */}
          <div className="flex-1 overflow-y-auto p-4">
            {generatingAll ? (
              <div className="flex flex-col items-center py-16 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm font-semibold text-slate-600">Generando imágenes...</p>
                <p className="text-xs text-slate-400">Esto toma unos segundos</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(reciboJP?.rows ?? []).map(r => {
                  const local = r.weeklyAccountId ? localRetiros[r.weeklyAccountId] : undefined;
                  const mergedR: ReciboJPRow = {
                    ...r,
                    efectivo:         localEfectivos[r.vehicleId] ?? r.efectivo,
                    retiroConfirmado: local !== undefined ? local.confirmado : r.retiroConfirmado,
                    retiroMonto:      local !== undefined ? local.monto      : r.retiroMonto,
                    retiroGastoMonto: local !== undefined ? local.gasto      : r.retiroGastoMonto,
                    saldoPendiente:   local !== undefined ? local.saldo      : r.saldoPendiente,
                  };
                  const img = allImages[r.vehicleId];
                  const msg = buildWAMessage(mergedR);
                  const phone = r.choferPhone?.replace(/\D/g, '');
                  const waUrl = phone
                    ? `https://wa.me/52${phone}?text=${encodeURIComponent(msg)}`
                    : null;
                  return (
                    <div key={r.vehicleId} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      {/* Imagen inline */}
                      {img ? (
                        <img
                          src={img}
                          alt={r.chofer}
                          className="w-full"
                          style={{ imageRendering: 'crisp-edges' }}
                        />
                      ) : (
                        <div className="bg-slate-800 h-28 flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                        </div>
                      )}
                      {/* Acciones */}
                      <div className="px-3 py-2.5 flex items-center gap-2 bg-white">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {r.chofer.split(' ').slice(0, 2).join(' ')}
                          </p>
                          <p className="text-[10px] text-slate-400">{r.eco} · {fmt(mergedR.efectivo)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {img && (
                            <a
                              href={img}
                              download={`resumen-${r.eco}-${r.weekStart ?? 'semana'}.png`}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                              title="Descargar imagen">
                              <Download className="h-3.5 w-3.5 text-slate-600" />
                            </a>
                          )}
                          {(r.choferPhone || r.waGroupLink) ? (
                            <button
                              onClick={() => handleShareWA(mergedR, img ?? null).catch(console.error)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors">
                              <Send className="h-3.5 w-3.5" />
                              Enviar
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 px-1">Sin número</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer tip */}
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-400 text-center">
              💡 Mantén presionada cada imagen para guardarla y adjuntarla manualmente en WhatsApp
            </p>
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
