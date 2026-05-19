'use client';

import {
  Calculator,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  ThumbsUp,
  Filter,
  Search,
  Download,
  XCircle,
  CircleDot,
  MessageCircle,
  Loader2,
  Plus,
  RefreshCw,
  X,
  FileText,
  Car,
  TrendingUp,
  Wallet,
  CreditCard,
  Banknote,
  AlertCircle,
  Info,
  Pencil,
  Copy,
  Send,
  ImageIcon,
  Trash2,
  CalendarDays,
  BarChart3,
} from 'lucide-react';
import { Fragment, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CuentaSemanal {
  id: string;
  weekStart: string;
  weekEnd: string;
  eco: string;
  plates: string;
  brand?: string;
  model?: string;
  year?: number | null;
  driverName: string;
  driverPhone?: string;
  waGroupLink?: string | null;
  status: 'pending' | 'paid' | 'partial' | 'disputed' | 'approved';
  nota: string;
  // Renta
  rent: number;
  contabilidad: number;
  diasTrabajados: number;
  // Didi ingresos
  didiIncome: number;
  didiIncomeCash: number;
  didiIncomeCard: number;
  didiBalance: number;   // Lo que Didi depositó a la cuenta bancaria
  didiBonus: number;
  didiTax: number;
  // Viajes
  viajesPagados: number;
  viajesOnline: number;
  viajesEfectivo: number;
  // Cargos extra
  montoKms: number;
  adicional: number;
  // Cobro
  saldoPendiente: number;   // + = chofer debe a JP | - = JP debe al chofer
  efectivoAEntregar: number; // Total a depositar (efectivo que el chofer entrega al dueño)
  // Otras plataformas
  uberIncome: number;
  indriverIncome: number;
  totalIncome: number;
}

interface WeekSummary {
  totalCuentas: number;
  totalPagadas: number;
  totalPendientes: number;
  totalEfectivo: number;
  totalDidi: number;
  totalViajesSemana: number;
  totalDepositos: number;
  totalRenta: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Formatea fecha con hora LOCAL para evitar el desfase UTC en timezone -6
function fmtLocal(d: Date): string {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function formatWeekLabel(isoDate: string): string {
  // Normalizar: tomar solo los primeros 10 chars (YYYY-MM-DD) por si viene con timestamp
  const dateOnly = (isoDate ?? '').slice(0, 10);
  const d = new Date(dateOnly + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  const end = new Date(d);
  end.setDate(d.getDate() + 6);
  return `${d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function fmt(n: number) {
  return '$' + Math.abs(n).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDec(n: number) {
  return '$' + Math.abs(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Convierte cualquier formato de contacto WA a un wa.me URL con texto opcional.
 * Maneja: JID @s.whatsapp.net, JID @g.us (grupo), URL https://, teléfono crudo.
 */
function resolveWaLink(
  waGroupLink: string | null | undefined,
  driverPhone: string | undefined,
  text?: string,
): string | null {
  let phone = '';
  if (waGroupLink) {
    if (waGroupLink.includes('@s.whatsapp.net')) {
      phone = waGroupLink.split('@')[0];
    } else if (waGroupLink.includes('@g.us')) {
      return null;
    } else if (waGroupLink.startsWith('https://')) {
      return waGroupLink;
    }
  }
  if (!phone && driverPhone) {
    const digits = driverPhone.replace(/\D/g, '').replace(/^52/, '');
    if (digits) phone = `52${digits}`;
  }
  if (!phone) return null;
  return text
    ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${phone}`;
}

/** Construye el mensaje de cuenta semanal para WhatsApp */
function buildWaMsg(c: CuentaSemanal, semanaLabel: string): string {
  return [
    `🚗 *${c.eco} — Cuenta Semanal*`,
    '',
    `*Semana:* ${semanaLabel}`,
    `*Chofer:* ${c.driverName}`,
    '',
    `📊 *Desglose:*`,
    `Renta (${c.diasTrabajados ?? 7}/7 días): ${fmtDec(c.rent)}`,
    c.contabilidad > 0 ? `Contabilidad: ${fmtDec(c.contabilidad)}` : '',
    `Didi depositó a cuenta: ${fmtDec(c.didiBalance)}`,
    c.adicional !== 0 ? `Adicional: ${c.adicional > 0 ? '+' : '-'}${fmtDec(Math.abs(c.adicional))}` : '',
    c.saldoPendiente !== 0 ? `Saldo previo: ${c.saldoPendiente > 0 ? '+' : '-'}${fmtDec(Math.abs(c.saldoPendiente))}` : '',
    c.montoKms > 0 ? `Kms adicionales: ${fmtDec(c.montoKms)}` : '',
    '',
    `💰 *Total a entregar en efectivo: ${fmtDec(c.efectivoAEntregar)}*`,
    '',
    '¡Gracias! Al Volante GDL 🙏',
  ].filter(l => l !== undefined && l !== null && !(l === '' && false)).join('\n')
   .replace(/\n{3,}/g, '\n\n'); // colapsar líneas vacías extra
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:  { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    paid:     { label: 'Pagada',    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    partial:  { label: 'Parcial',   cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    disputed: { label: 'Disputada', cls: 'bg-red-100 text-red-700 border-red-200' },
    approved: { label: 'Aprobada',  cls: 'bg-green-100 text-green-700 border-green-200' },
  };
  const cfg = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─── Panel de detalle expandido ────────────────────────────────────────────────

function PanelDetalle({ c }: { c: CuentaSemanal }) {
  // Fórmula visual del cálculo
  const saldoLabel = c.saldoPendiente > 0
    ? `Saldo previo (chofer debe)`
    : c.saldoPendiente < 0
    ? `Saldo previo (empresa debe)`
    : null;

  return (
    <div className="px-4 pb-4 pt-2 bg-slate-50 border-t border-slate-100">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Col 1 — Didi desglose */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1.5">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">Ingresos Didi</p>
          <Row label="Total bruto Didi"       value={fmtDec(c.didiIncome)} color="text-slate-700" />
          <Row label="  · Efectivo cobrado"   value={fmtDec(c.didiIncomeCash)} color="text-orange-600" />
          <Row label="  · Tarjeta"            value={fmtDec(c.didiIncomeCard)} color="text-blue-600" />
          <div className="border-t border-slate-100 pt-1.5 mt-1">
            <Row label="Depósito Didi → cuenta" value={fmtDec(c.didiBalance)} color={c.didiBalance >= 0 ? 'text-emerald-600' : 'text-red-500'} />
          </div>
          {c.didiBonus > 0 && <Row label="Bonos / recompensas" value={`+${fmtDec(c.didiBonus)}`} color="text-emerald-600" />}
          {c.didiTax !== 0 && <Row label="Impuesto retenido"   value={fmtDec(Math.abs(c.didiTax))} color="text-red-500" />}
          <div className="border-t border-slate-100 pt-1.5 mt-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Viajes semana</p>
            <Row label="Total viajes"     value={String(c.viajesPagados)} color="text-slate-700" />
            <Row label="  · Tarjeta"      value={String(c.viajesOnline)} color="text-blue-600" />
            <Row label="  · Efectivo"     value={String(c.viajesEfectivo)} color="text-orange-600" />
          </div>
        </div>

        {/* Col 2 — Cálculo de cobro */}
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">Cálculo de cobro</p>
          <div className="space-y-1">
            <CalcRow label={`Renta (${c.diasTrabajados}/7 días)`} value={`+ ${fmt(c.rent)}`} cls="text-slate-700" />
            <CalcRow label="Contabilidad"                         value={`+ ${fmt(c.contabilidad)}`} cls="text-slate-700" />
            <CalcRow label="Depósito Didi a cuenta"               value={`− ${fmtDec(c.didiBalance)}`} cls="text-emerald-600" />
            {c.montoKms > 0 &&
              <CalcRow label="Kms adicionales"                    value={`+ ${fmt(c.montoKms)}`} cls="text-orange-600" />}
            {c.adicional !== 0 &&
              <CalcRow label="Adicional"                          value={`${c.adicional > 0 ? '+' : '−'} ${fmt(Math.abs(c.adicional))}`} cls={c.adicional > 0 ? 'text-orange-600' : 'text-emerald-600'} />}
            {c.saldoPendiente !== 0 && saldoLabel &&
              <CalcRow label={saldoLabel}                         value={`${c.saldoPendiente > 0 ? '+' : '−'} ${fmt(Math.abs(c.saldoPendiente))}`} cls={c.saldoPendiente > 0 ? 'text-orange-600' : 'text-emerald-600'} />}
          </div>
          <div className="mt-3 pt-2 border-t-2 border-slate-200 flex justify-between items-center">
            <span className="text-xs font-black text-slate-700">TOTAL A COBRAR</span>
            <span className="text-base font-black text-blue-600">{fmt(c.efectivoAEntregar)}</span>
          </div>
        </div>

        {/* Col 3 — Info adicional */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">Resumen</p>
          <div className="flex justify-between items-center py-1.5 bg-blue-50 rounded-lg px-3">
            <span className="text-xs font-semibold text-blue-700">Total a Depositar</span>
            <span className="text-sm font-black text-blue-700">{fmt(c.efectivoAEntregar)}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 bg-emerald-50 rounded-lg px-3">
            <span className="text-xs font-semibold text-emerald-700">Didi depositó a cuenta</span>
            <span className="text-sm font-black text-emerald-700">{fmtDec(c.didiBalance)}</span>
          </div>
          {c.saldoPendiente !== 0 && (
            <div className={`flex justify-between items-center py-1.5 rounded-lg px-3 ${c.saldoPendiente > 0 ? 'bg-orange-50' : 'bg-purple-50'}`}>
              <span className={`text-xs font-semibold ${c.saldoPendiente > 0 ? 'text-orange-700' : 'text-purple-700'}`}>
                {c.saldoPendiente > 0 ? 'Chofer debe' : 'Empresa debe al chofer'}
              </span>
              <span className={`text-sm font-black ${c.saldoPendiente > 0 ? 'text-orange-700' : 'text-purple-700'}`}>
                {fmt(Math.abs(c.saldoPendiente))}
              </span>
            </div>
          )}
          {c.nota && (
            <div className="flex items-start gap-2 pt-1 border-t border-slate-100 mt-1">
              <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500">{c.nota}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className={`text-xs font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function CalcRow({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs font-bold font-mono ${cls}`}>{value}</span>
    </div>
  );
}

// ─── Modal Cobro ──────────────────────────────────────────────────────────────

function ModalCobro({
  cuenta,
  weekLabel,
  onConfirmar,
  onCancelar,
}: {
  cuenta: CuentaSemanal;
  weekLabel: string;
  onConfirmar: (monto: number, nota: string) => Promise<string | null>;
  onCancelar: () => void;
}) {
  const [monto, setMonto] = useState(String(cuenta.efectivoAEntregar));
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const iniciales = cuenta.driverName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const handleConfirmar = async () => {
    const n = parseFloat(monto);
    if (isNaN(n) || n <= 0) return;
    setErrorMsg('');
    setSaving(true);
    const err = await onConfirmar(n, nota);
    if (err) setErrorMsg(err);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancelar} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
                {iniciales}
              </div>
              <div>
                <p className="text-white font-black leading-tight">{cuenta.driverName}</p>
                <p className="text-emerald-100 text-xs">{cuenta.eco} · {weekLabel}</p>
              </div>
            </div>
            <button onClick={onCancelar} className="p-1.5 hover:bg-white/20 rounded-lg text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Resumen de cobro */}
        <div className="px-5 pt-4 space-y-1.5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Desglose del cobro</p>
          <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-slate-500">Renta ({cuenta.diasTrabajados}/7 días)</span><span className="font-semibold">{fmt(cuenta.rent)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Contabilidad</span><span className="font-semibold">{fmt(cuenta.contabilidad)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Depósito Didi</span><span className="font-semibold text-emerald-600">− {fmtDec(cuenta.didiBalance)}</span></div>
            {cuenta.adicional !== 0 && (
              <div className="flex justify-between"><span className="text-slate-500">Adicional</span><span className={`font-semibold ${cuenta.adicional > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>{cuenta.adicional > 0 ? '+' : '−'} {fmt(Math.abs(cuenta.adicional))}</span></div>
            )}
            {cuenta.saldoPendiente !== 0 && (
              <div className="flex justify-between"><span className="text-slate-500">Saldo pendiente</span><span className={`font-semibold ${cuenta.saldoPendiente > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>{cuenta.saldoPendiente > 0 ? '+' : '−'} {fmt(Math.abs(cuenta.saldoPendiente))}</span></div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1">
              <span className="font-black text-slate-700">Total a cobrar</span>
              <span className="font-black text-blue-600 text-sm">{fmt(cuenta.efectivoAEntregar)}</span>
            </div>
          </div>
        </div>

        {/* Inputs */}
        <div className="px-5 pt-3 pb-5 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Monto recibido</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">$</span>
              <input
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nota <span className="font-normal text-slate-400">(opcional)</span></label>
            <input
              type="text"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Efectivo, transferencia, parcial..."
            />
          </div>
          {errorMsg && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              ⚠️ {errorMsg}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={onCancelar} className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50">Cancelar</button>
            <button
              onClick={handleConfirmar}
              disabled={saving || !monto || parseFloat(monto) <= 0}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirmar cobro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Generador de recibo PDF ──────────────────────────────────────────────────

function generarRecibo(c: CuentaSemanal, weekLabel: string) {
  const rows = [
    ['Días trabajados',       `${c.diasTrabajados}/7`],
    ['Renta',                  fmtDec(c.rent)],
    ['Contabilidad',           fmtDec(c.contabilidad)],
    ['─────────────',         ''],
    ['Total Didi',             fmtDec(c.didiIncome)],
    ['  · Efectivo Didi',     fmtDec(c.didiIncomeCash)],
    ['  · Tarjeta Didi',      fmtDec(c.didiIncomeCard)],
    ['Depósito a cuenta',     fmtDec(c.didiBalance)],
    ['Bonos',                  fmtDec(c.didiBonus)],
    ['─────────────',         ''],
    ['Viajes semana',         `${c.viajesPagados} (${c.viajesOnline} tarj + ${c.viajesEfectivo} efect)`],
    ...(c.adicional !== 0 ? [['Adicional', fmtDec(c.adicional)]] : []),
    ...(c.saldoPendiente !== 0 ? [['Saldo pendiente', `${c.saldoPendiente > 0 ? '+' : ''}${fmtDec(c.saldoPendiente)}`]] : []),
  ];

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<style>body{font-family:Arial,sans-serif;margin:0;padding:32px;color:#1e293b}
.header{text-align:center;border-bottom:2px solid #2563eb;padding-bottom:16px;margin-bottom:20px}
.logo{font-size:20px;font-weight:900;color:#2563eb}.sub{font-size:12px;color:#64748b}
.titulo{font-size:17px;font-weight:bold;margin:12px 0 2px}.semana{font-size:13px;color:#64748b}
.row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f1f5f9;font-size:13px}
.label{color:#64748b}.value{font-weight:600}
.total{background:#eff6ff;border-radius:8px;padding:10px 14px;margin-top:12px;display:flex;justify-content:space-between}
.total .label{font-weight:bold;color:#1d4ed8}.total .value{font-weight:900;color:#1d4ed8;font-size:17px}
.footer{margin-top:24px;text-align:center;font-size:11px;color:#94a3b8}
.badge{display:inline-block;background:#dcfce7;color:#15803d;border-radius:20px;padding:3px 10px;font-size:12px;font-weight:bold}
</style></head><body>
<div class="header"><div class="logo">🚗 Gestiona tu Flotilla</div><div class="sub">Recibo de cuenta semanal</div></div>
<div class="titulo">${c.driverName}</div>
<div class="semana">Semana: ${weekLabel} · ${c.eco} (${c.plates})</div>
<span class="badge">✅ PAGADO</span><br/><br/>
${rows.filter(([l]) => !l.startsWith('─')).map(([l, v]) => `<div class="row"><span class="label">${l}</span><span class="value">${v}</span></div>`).join('')}
<div class="total"><span class="label">Total a Depositar</span><span class="value">${fmt(c.efectivoAEntregar)}</span></div>
<div class="footer">Generado el ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })} · gestionatuflotilla.com</div>
</body></html>`;

  const w = window.open('', '_blank', 'width=640,height=780');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

// ─── Resumen "Recibe JP" ──────────────────────────────────────────────────────

function RecibeJPSummary({ cuentas, weekStart }: { cuentas: CuentaSemanal[]; weekStart: string }) {
  const [open, setOpen] = useState(true);

  // Cálculos
  const totalEfectivo     = cuentas.reduce((s, c) => s + c.efectivoAEntregar, 0);
  const totalContabilidad = cuentas.reduce((s, c) => s + c.contabilidad, 0);
  const totalDepositos    = cuentas.reduce((s, c) => s + c.didiBalance, 0);
  const totalBonos        = cuentas.reduce((s, c) => s + c.didiBonus, 0);
  const totalRecibe       = totalEfectivo + totalDepositos;

  // Fecha label formato Excel: "04 de may al 10 de may 2026"
  const inicio = new Date(weekStart + 'T00:00:00');
  const fin    = new Date(inicio);
  fin.setDate(inicio.getDate() + 6);
  const opts1: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const opts2: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  const labelSemana = `${inicio.toLocaleDateString('es-MX', opts1)} al ${fin.toLocaleDateString('es-MX', opts2)}`;

  const handlePrint = () => {
    const rows = cuentas.map(c => `
      <tr>
        <td>${c.eco}</td>
        <td class="sub">${c.driverName}</td>
        <td class="r">${fmt(c.efectivoAEntregar)}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<style>
  body { font-family: Arial, sans-serif; padding: 32px; color: #1e293b; font-size: 13px; }
  h2 { font-size: 16px; font-weight: 900; margin: 0 0 4px; color: #1e3a5f; }
  p.sub { font-size: 12px; color: #64748b; margin: 0 0 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f1f5f9; text-align: left; padding: 7px 10px; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
  td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; }
  td.sub { font-size: 11px; color: #94a3b8; }
  td.r, th.r { text-align: right; }
  tr.sep td { border-top: 2px solid #e2e8f0; border-bottom: none; padding-top: 10px; color: #64748b; font-size: 12px; }
  tr.total td { font-weight: 700; font-size: 13px; background: #eff6ff; }
  tr.grand td { font-weight: 900; font-size: 15px; background: #1e40af; color: white; }
  .footer { margin-top: 20px; font-size: 11px; color: #94a3b8; text-align: center; }
</style></head><body>
<h2>Recibe JP — Del ${labelSemana}</h2>
<p class="sub">Resumen semanal de cobro — Al Volante GDL</p>
<table>
  <thead><tr><th>Vehículo</th><th>Chofer</th><th class="r">Efectivo a entregar</th></tr></thead>
  <tbody>
    ${rows}
    <tr class="sep"><td colspan="2">Total Choferes (efectivo)</td><td class="r">${fmt(totalEfectivo)}</td></tr>
    <tr class="sep"><td colspan="2">Contabilidad (incluida en cobro)</td><td class="r">${fmt(totalContabilidad)}</td></tr>
    <tr class="sep"><td colspan="2">Depósito Didi → Cuenta bancaria</td><td class="r">${fmt(totalDepositos)}</td></tr>
    ${totalBonos > 0 ? `<tr class="sep"><td colspan="2">Otros / Recompensas</td><td class="r">${fmt(totalBonos)}</td></tr>` : ''}
    <tr class="sep"><td colspan="3">&nbsp;</td></tr>
    <tr class="total"><td colspan="2">Recibo en Retiro Sin Tarjeta (efectivo)</td><td class="r">${fmt(totalEfectivo)}</td></tr>
    <tr class="total"><td colspan="2">Recibo en Cuenta Bancaria (Didi)</td><td class="r">${fmt(totalDepositos)}</td></tr>
    <tr class="grand"><td colspan="2">RECIBE ESTA SEMANA</td><td class="r">${fmt(totalRecibe)}</td></tr>
  </tbody>
</table>
<div class="footer">Generado el ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })} · gestionatuflotilla.com</div>
</body></html>`;
    const w = window.open('', '_blank', 'width=640,height=780');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header colapsable */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <Wallet className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-black text-slate-900">Recibe JP</p>
            <p className="text-[11px] text-slate-400">Del {labelSemana}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-base font-black text-blue-600">{fmt(totalRecibe)}</span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <>
          {/* Tabla por vehículo */}
          <div className="border-t border-slate-100 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-2.5">Vehículo</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-3 py-2.5">Chofer</th>
                  <th className="text-right text-xs font-semibold text-slate-500 px-5 py-2.5">Efectivo a entregar</th>
                </tr>
              </thead>
              <tbody>
                {cuentas.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-5 py-2.5">
                      <span className="text-sm font-bold text-slate-800 font-mono">{c.eco}</span>
                      <span className="text-xs text-slate-400 ml-2">{c.plates}</span>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-slate-600">{c.driverName.split(' ').slice(0, 2).join(' ')}</td>
                    <td className="px-5 py-2.5 text-right">
                      <span className="text-sm font-black text-slate-900">{fmt(c.efectivoAEntregar)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bloque de totales */}
          <div className="border-t-2 border-slate-200 mx-4 mt-1" />
          <div className="px-5 py-3 space-y-1">
            <SumRow label="Total Choferes (efectivo)"         value={fmt(totalEfectivo)}      cls="text-slate-700" />
            <SumRow label="Contabilidad (incluida en cobro)"  value={fmt(totalContabilidad)}  cls="text-slate-500" small />
            <SumRow label="Depósito Didi → Cuenta bancaria"   value={fmt(totalDepositos)}     cls="text-emerald-600" />
            {totalBonos > 0 && (
              <SumRow label="Otros / Recompensas"             value={`+${fmt(totalBonos)}`}   cls="text-violet-600" small />
            )}
          </div>

          {/* Separador */}
          <div className="border-t border-dashed border-slate-200 mx-4" />
          <div className="px-5 py-3 space-y-1">
            <SumRow label="Recibo en Retiro Sin Tarjeta" value={fmt(totalEfectivo)}   cls="text-slate-700" />
            <SumRow label="Recibo en Cuenta Bancaria"    value={fmt(totalDepositos)}  cls="text-emerald-600" />
          </div>

          {/* Total grande */}
          <div className="mx-4 mb-4 mt-1 bg-blue-600 rounded-xl px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-black text-white uppercase tracking-wide">Recibe esta semana</span>
            <span className="text-xl font-black text-white">{fmt(totalRecibe)}</span>
          </div>

          {/* Botón imprimir */}
          <div className="px-5 pb-4 flex justify-end">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Imprimir / Exportar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SumRow({ label, value, cls, small }: { label: string; value: string; cls: string; small?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={`${small ? 'text-[11px] text-slate-400' : 'text-xs text-slate-600'}`}>{label}</span>
      <span className={`text-sm font-bold ${cls}`}>{value}</span>
    </div>
  );
}

// ─── Modal Editar cuenta ──────────────────────────────────────────────────────

function ModalEditar({
  cuenta,
  onGuardar,
  onCancelar,
}: {
  cuenta: CuentaSemanal;
  onGuardar: (data: Partial<CuentaSemanal>) => Promise<void>;
  onCancelar: () => void;
}) {
  const [rent,          setRent]          = useState(String(cuenta.rent));
  const [contabilidad,  setContabilidad]  = useState(String(cuenta.contabilidad));
  const [adicional,     setAdicional]     = useState(String(cuenta.adicional));
  const [saldoPendiente,setSaldoPendiente]= useState(String(cuenta.saldoPendiente));
  const [didiBalance,   setDidiBalance]   = useState(String(cuenta.didiBalance));
  const [diasTrabajados,setDiasTrabajados]= useState(String(cuenta.diasTrabajados));
  const [nota,          setNota]          = useState(cuenta.nota ?? '');
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');

  // Preview del nuevo total
  const rentN   = parseFloat(rent)          || 0;
  const contN   = parseFloat(contabilidad)  || 0;
  const adicN   = parseFloat(adicional)     || 0;
  const saldoN  = parseFloat(saldoPendiente)|| 0;
  const didiN   = parseFloat(didiBalance)   || 0;
  const kmN     = cuenta.montoKms           || 0;
  const preview = rentN + contN - didiN + kmN + adicN + saldoN;

  const handleGuardar = async () => {
    setSaving(true);
    setError('');
    try {
      await onGuardar({
        rent:          rentN,
        contabilidad:  contN,
        adicional:     adicN,
        saldoPendiente: saldoN,
        didiBalance:   didiN,
        diasTrabajados: parseInt(diasTrabajados) || 7,
        nota,
      });
    } catch {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, value: string, onChange: (v: string) => void, hint?: string) => (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        {label}{hint && <span className="font-normal text-slate-400 ml-1">{hint}</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">$</span>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancelar} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-black leading-tight">{cuenta.driverName.split(' ').slice(0,2).join(' ')}</p>
              <p className="text-blue-200 text-xs">{cuenta.eco} · Editar cuenta semanal</p>
            </div>
            <button onClick={onCancelar} className="p-1.5 hover:bg-white/20 rounded-lg text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Campos */}
        <div className="overflow-y-auto px-5 py-4 space-y-3 flex-1">
          <div className="grid grid-cols-2 gap-3">
            {field('Renta', rent, setRent)}
            {field('Contabilidad', contabilidad, setContabilidad)}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field('Depósito Didi', didiBalance, setDidiBalance, '(a cuenta)')}
            {field('Adicional', adicional, setAdicional, '(+ / -)')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field('Saldo previo', saldoPendiente, setSaldoPendiente, '(+ chofer debe / − empresa debe)')}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Días trabajados</label>
              <input
                type="number" min="0" max="7"
                value={diasTrabajados}
                onChange={(e) => setDiasTrabajados(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nota <span className="font-normal text-slate-400">(opcional)</span></label>
            <input
              type="text"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Observación, descuento especial..."
            />
          </div>

          {/* Preview total */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Total a Depositar</span>
              <span className="text-lg font-black text-blue-700">${preview.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>
            </div>
            <p className="text-[10px] text-blue-400 mt-0.5">= Renta + Contab − Didi + Kms + Adicional ± Saldo</p>
          </div>

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        </div>

        {/* Botones */}
        <div className="px-5 pb-5 pt-3 flex gap-2 flex-shrink-0 border-t border-slate-100">
          <button onClick={onCancelar} className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Canvas: imagen cuenta semanal ────────────────────────────────────────────

async function generateCuentaImage(c: CuentaSemanal, weekLabel: string): Promise<string> {
  const W   = 680;
  const PAD = 32;
  const R   = W - PAD; // right margin

  // ── Helpers canvas ──────────────────────────────────────────────────────
  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  };

  // ── Filas del desglose ─────────────────────────────────────────────────
  type TRow = { label: string; value: string; neg?: boolean; highlight?: boolean; divider?: boolean };
  const rows: TRow[] = [];
  rows.push({ label: `Renta (${c.diasTrabajados}/7 días)`, value: fmtDec(c.rent) });
  if (c.contabilidad > 0) rows.push({ label: 'Contabilidad', value: fmtDec(c.contabilidad) });
  if (c.didiBalance > 0)  rows.push({ label: 'Didi depositó a tu cuenta', value: `− ${fmtDec(c.didiBalance)}`, neg: true });
  if (c.adicional !== 0)  rows.push({ label: c.adicional > 0 ? 'Adicional' : 'Descuento', value: (c.adicional > 0 ? '+ ' : '− ') + fmtDec(Math.abs(c.adicional)) });
  if (c.montoKms > 0)     rows.push({ label: 'Km adicionales', value: fmtDec(c.montoKms) });
  if (c.saldoPendiente !== 0) rows.push({
    label: c.saldoPendiente > 0 ? 'Saldo semana anterior' : 'Saldo a tu favor',
    value: (c.saldoPendiente > 0 ? '+ ' : '− ') + fmtDec(Math.abs(c.saldoPendiente)),
    neg: c.saldoPendiente < 0,
  });

  const ROW_H   = 44;
  const HDR_H   = 84;   // header empresa (más alto para logo grande)
  const VEH_H   = 64;   // banda vehículo (extra espacio para marca/modelo)
  const NAME_H  = 54;   // nombre chofer
  const ROWS_H  = rows.length * ROW_H;
  const TOTAL_H = 64;
  const STATS_H = 50;
  const FOOT_H  = 32;
  const H = HDR_H + VEH_H + NAME_H + ROWS_H + 20 + TOTAL_H + STATS_H + FOOT_H;

  const canvas = document.createElement('canvas');
  canvas.width  = W * 2;
  canvas.height = H * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FONDO general
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, W, H);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BANDA 1 — HEADER EMPRESA (azul oscuro)
  const hGrad = ctx.createLinearGradient(0, 0, W, HDR_H);
  hGrad.addColorStop(0, '#020617');
  hGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, 0, W, HDR_H);

  // ── LOGO: cargar fleet-icon.png ──────────────────────────────
  const iSize = 52;                           // tamaño del ícono
  const lx    = PAD + iSize / 2;             // centro X (referencia)
  const ly    = HDR_H / 2;                   // centro Y
  const logoImg = await new Promise<HTMLImageElement | null>(resolve => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = '/fleet-icon.png';
  });
  if (logoImg) {
    // Recorte circular con clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(lx, ly, iSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImg, lx - iSize / 2, ly - iSize / 2, iSize, iSize);
    ctx.restore();
    // Borde sutil
    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(lx, ly, iSize / 2, 0, Math.PI * 2); ctx.stroke();
  } else {
    // Fallback: círculo con inicial
    ctx.fillStyle = '#2563eb';
    ctx.beginPath(); ctx.arc(lx, ly, iSize / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Arial,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('G', lx, ly);
    ctx.textBaseline = 'alphabetic';
  }

  // Nombre empresa (a la derecha del logo)
  const txX = PAD + iSize + 14;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Arial,sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Gestiona tu Flotilla', txX, ly - 4);
  ctx.font = '12px Arial,sans-serif';
  ctx.fillStyle = '#60a5fa';
  ctx.fillText('gestionatuflotilla.com', txX, ly + 15);

  // Fecha (derecha del header)
  ctx.fillStyle = '#bfdbfe';
  ctx.font = 'bold 12px Arial,sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(weekLabel, R, ly - 4);
  ctx.fillStyle = '#475569';
  ctx.font = '10px Arial,sans-serif';
  if (c.diasTrabajados < 7) ctx.fillText(`${c.diasTrabajados}/7 días trabajados`, R, ly + 13);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BANDA 2 — VEHÍCULO (blanco)
  const vY = HDR_H;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, vY, W, VEH_H);
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, vY + VEH_H - 1); ctx.lineTo(W, vY + VEH_H - 1); ctx.stroke();

  // ECO grande (izquierda)
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px Arial,sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(c.eco, PAD, vY + 26);

  // Marca + año + modelo (debajo del eco)
  const carDesc = [c.brand, c.year, c.model].filter(Boolean).join(' ');
  if (carDesc) {
    ctx.fillStyle = '#64748b';
    ctx.font = '12px Arial,sans-serif';
    ctx.fillText(carDesc, PAD, vY + 45);
  }

  // Badge placa (a la derecha del eco)
  if (c.plates) {
    const ecoW = ctx.measureText(c.eco).width;
    ctx.font = 'bold 12px Arial,sans-serif';
    const bW = ctx.measureText(c.plates).width + 20;
    const bX = PAD + ecoW + 14;
    const bY = vY + 10;
    roundRect(ctx, bX, bY, bW, 22, 11);
    ctx.fillStyle = '#eff6ff'; ctx.fill();
    ctx.strokeStyle = '#bfdbfe'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#1d4ed8';
    ctx.textAlign = 'left';
    ctx.fillText(c.plates, bX + 10, bY + 15);
  }

  // Tipo (derecha)
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px Arial,sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Didi / Ridesharing', R, vY + 34);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BANDA 3 — NOMBRE CHOFER (gradiente índigo)
  const nY = vY + VEH_H;
  const nGrad = ctx.createLinearGradient(0, nY, W, nY + NAME_H);
  nGrad.addColorStop(0, '#1e40af');
  nGrad.addColorStop(1, '#4f46e5');
  ctx.fillStyle = nGrad;
  ctx.fillRect(0, nY, W, NAME_H);

  ctx.fillStyle = '#e0e7ff';
  ctx.font = '11px Arial,sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('CHOFER', PAD, nY + 18);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 21px Arial,sans-serif';
  ctx.fillText(c.driverName.toUpperCase(), PAD, nY + 40);

  // Pequeño chevron / indicador de estado
  ctx.fillStyle = '#a5b4fc';
  ctx.font = '11px Arial,sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('📋 Desglose de cuenta ↓', R, nY + 40);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FILAS DE DESGLOSE
  let y = nY + NAME_H;
  rows.forEach((r, i) => {
    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f8fafc';
    ctx.fillRect(0, y, W, ROW_H);

    // Línea divisora sutil
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, y + ROW_H); ctx.lineTo(W, y + ROW_H); ctx.stroke();

    const cy = y + ROW_H / 2 + 6;

    // Indicador de color izquierdo
    ctx.fillStyle = r.neg ? '#10b981' : '#3b82f6';
    ctx.fillRect(0, y + 8, 4, ROW_H - 16);

    // Label
    ctx.fillStyle = '#475569';
    ctx.font = '14px Arial,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(r.label, PAD + 4, cy);

    // Valor
    ctx.fillStyle = r.neg ? '#059669' : '#0f172a';
    ctx.font = 'bold 15px Arial,sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(r.value, R, cy);

    y += ROW_H;
  });

  // Separador antes del total
  y += 10;
  ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(R, y); ctx.stroke();
  y += 10;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TOTAL — banner verde
  const tGrad = ctx.createLinearGradient(0, y, W, y + TOTAL_H);
  tGrad.addColorStop(0, '#14532d');
  tGrad.addColorStop(1, '#15803d');
  ctx.fillStyle = tGrad;
  ctx.fillRect(0, y, W, TOTAL_H);

  // Sombra sutil arriba del total
  ctx.shadowColor = 'rgba(0,0,0,0.15)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = -2;
  ctx.fillStyle = tGrad;
  ctx.fillRect(0, y, W, 2);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  ctx.fillStyle = '#bbf7d0';
  ctx.font = '13px Arial,sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('💰 TOTAL A DEPOSITAR', PAD, y + 22);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Arial,sans-serif';
  ctx.fillText(fmtDec(c.efectivoAEntregar), PAD, y + 52);

  // Checkmark derecha
  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 32px Arial,sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('✓', R, y + 50);

  y += TOTAL_H;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STATS — viajes e ingresos
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, y, W, STATS_H);

  if (c.viajesPagados > 0) {
    const stats = [
      { label: 'Total viajes', val: String(c.viajesPagados), icon: '🚗' },
      { label: 'Con tarjeta',  val: String(c.viajesOnline),  icon: '💳' },
      { label: 'En efectivo',  val: String(c.viajesEfectivo),icon: '💵' },
      { label: 'Ingresos brutos', val: fmtDec(c.didiIncome), icon: '📊' },
    ].filter(s => s.val !== '0' && s.val !== '$0.00');

    const colW = W / stats.length;
    stats.forEach((s, i) => {
      const cx = colW * i + colW / 2;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Arial,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${s.icon} ${s.label}`, cx, y + 18);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 13px Arial,sans-serif';
      ctx.fillText(s.val, cx, y + 36);
    });
  } else {
    ctx.fillStyle = '#64748b';
    ctx.font = '13px Arial,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sin actividad Didi esta semana', W / 2, y + 30);
  }

  y += STATS_H;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FOOTER
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, y, W, FOOT_H);
  ctx.fillStyle = '#475569';
  ctx.font = '10px Arial,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Gestiona tu Flotilla · gestionatuflotilla.com', W / 2, y + 20);

  return canvas.toDataURL('image/png', 0.92);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CuentasSemanalesPage() {
  // Inicializar con lunes de semana anterior (Didi reporta con 1 sem desfase)
  // En el useEffect de mount se sincroniza con la semana más reciente en BD
  const [weekStart, setWeekStart] = useState<string>(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon - 7); // semana anterior
    return fmtLocal(monday); // fmtLocal evita el desfase UTC de toISOString
  });
  const [cuentas, setCuentas] = useState<CuentaSemanal[]>([]);
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [generando, setGenerando] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  // Resumen mensual
  const [verMes, setVerMes]           = useState(false);
  const [mesCuentas, setMesCuentas]   = useState<CuentaSemanal[]>([]);
  const [mesCargando, setMesCargando] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [modalCobro, setModalCobro] = useState<CuentaSemanal | null>(null);
  const [modalEditar, setModalEditar] = useState<CuentaSemanal | null>(null);
  const [registrando, setRegistrando] = useState<string | null>(null);
  const [imgModal,     setImgModal]     = useState<{ c: CuentaSemanal; url: string; tipo?: 'cuenta' | 'pago' } | null>(null);
  const [imgLoading,   setImgLoading]   = useState<string | null>(null);
  const [imgCopied,    setImgCopied]    = useState(false);
  const [waCopied,     setWaCopied]     = useState(false);
  const [sendAllOpen,  setSendAllOpen]  = useState(false);
  const [allImgs,      setAllImgs]      = useState<Record<string, string>>({});
  const [generatingAll,setGeneratingAll]= useState(false);
  const [revirtiendo,  setRevirtiendo]  = useState<string | null>(null);

  // WhatsApp config (se carga una vez al montar) — cubre meta, webhook y whapi
  const [waAutoConfigured, setWaAutoConfigured] = useState(false);
  const [waSending,    setWaSending]    = useState<string | null>(null);  // id de cuenta enviando
  const [waSendError,  setWaSendError]  = useState<string | null>(null);
  const [waSentOk,     setWaSentOk]     = useState<string | null>(null);
  // Enviar todas — progreso en modo auto
  const [sendAllProgress, setSendAllProgress] = useState<Record<string, 'pending' | 'sending' | 'ok' | 'error'>>({});
  const [sendAllRunning,  setSendAllRunning]   = useState(false);

  useEffect(() => {
    fetch('/api/settings/whatsapp')
      .then((r) => r.json())
      .then((d) => {
        // Configurado si CUALQUIER modo tiene credenciales
        const any = !!(d.waConfigured || d.metaConfigured || d.webhookConfigured || d.whapiConfigured);
        setWaAutoConfigured(any);
      })
      .catch(() => {});
  }, []);

  const fetchCuentas = useCallback(async (week: string) => {
    // Normalizar a YYYY-MM-DD por si llega timestamp
    const weekNorm = String(week).slice(0, 10);
    setLoading(true);
    try {
      const res = await fetch(`/api/weekly-accounts?week=${weekNorm}`);
      const json = await res.json();
      if (json.data) {
        // Normalizar weekStart en cada cuenta para consistencia
        setCuentas(json.data.map((c: any) => ({ ...c, weekStart: String(c.weekStart ?? '').slice(0, 10) })));
        setSummary(json.summary ?? null);
      } else {
        setCuentas([]);
        setSummary(null);
      }
    } catch {
      setCuentas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Al montar: sincronizar con la semana más reciente en BD (sin disparar doble fetch)
  // Solo ajusta weekStart si la BD tiene una semana distinta al default
  useEffect(() => {
    fetch('/api/weekly-accounts')         // sin ?week= → API devuelve MAX(week_start)
      .then((r) => r.json())
      .then((d) => {
        const maxWeek = d.data?.[0]?.weekStart;
        // Normalizar a YYYY-MM-DD (la BD puede devolver timestamp completo)
        if (maxWeek) setWeekStart(String(maxWeek).slice(0, 10));
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchCuentas(weekStart); }, [weekStart, fetchCuentas]);

  const changeWeek = (dir: -1 | 1) => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(fmtLocal(d));
  };

  // Ir a la semana que contiene la fecha seleccionada en el calendar picker
  const handlePickDate = (isoDate: string) => {
    if (!isoDate) return;
    const d = new Date(isoDate + 'T00:00:00');
    setWeekStart(fmtLocal(getMonday(d)));
  };

  // Cargar todas las semanas del mes actual para el resumen mensual
  const fetchMes = useCallback(async (refWeek: string) => {
    setMesCargando(true);
    try {
      const d = new Date(refWeek + 'T00:00:00');
      const since = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const res = await fetch(`/api/weekly-accounts?since=${since}&limit=6`);
      const json = await res.json();
      setMesCuentas(Array.isArray(json.data) ? json.data : []);
    } catch {
      setMesCuentas([]);
    } finally {
      setMesCargando(false);
    }
  }, []);

  useEffect(() => {
    if (verMes && weekStart) fetchMes(weekStart);
  }, [verMes, weekStart, fetchMes]);

  const handleGenerarSemana = async () => {
    setGenerando(true);
    try {
      await fetch('/api/cron/generar-semana');
      await fetchCuentas(weekStart);
    } finally {
      setGenerando(false);
    }
  };

  // Recalcula efectivo_a_entregar de cuentas con $0 (generadas por cron sin importar Didi)
  const handleRecalcular = async () => {
    setRecalculando(true);
    try {
      const res = await fetch('/api/weekly-accounts/recalcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart }),
      });
      const data = await res.json().catch(() => ({}));
      await fetchCuentas(weekStart);
      if (data.actualizadas > 0) {
        alert(`✅ ${data.mensaje}`);
      }
    } finally {
      setRecalculando(false);
    }
  };

  // Elimina todas las cuentas PENDIENTES de la semana visible (para reimportar limpio)
  const handleEliminarSemana = async () => {
    const confirmar = window.confirm(
      `¿Eliminar todas las cuentas PENDIENTES de la semana ${weekStart}?\n\nLas cuentas ya pagadas o confirmadas NO se eliminan.\n\nEsta acción no se puede deshacer.`
    );
    if (!confirmar) return;
    setEliminando(true);
    try {
      const res = await fetch(`/api/weekly-accounts?weekStart=${weekStart}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      await fetchCuentas(weekStart);
      alert(`🗑️ ${data.deleted ?? 0} cuenta(s) eliminada(s). La semana quedó limpia para reimportar.`);
    } finally {
      setEliminando(false);
    }
  };

  const handleEditarGuardar = async (data: Partial<CuentaSemanal>) => {
    if (!modalEditar) return;
    const editedId = modalEditar.id;
    const res = await fetch(`/api/weekly-accounts/${editedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rent:           data.rent,
        contabilidad:   data.contabilidad,
        adicional:      data.adicional,
        saldo_pendiente: data.saldoPendiente,
        dias_trabajados: data.diasTrabajados,
        didi_balance:   data.didiBalance,
        nota:           data.nota,
      }),
    });
    const resData = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(resData.message ?? 'Error al guardar');
    }
    const newEfectivo: number = resData.efectivoAEntregar;
    // Optimistic update: actualizar fila inmediatamente sin esperar refetch
    setCuentas(prev => prev.map(c =>
      c.id === editedId
        ? {
            ...c,
            rent:              data.rent             ?? c.rent,
            contabilidad:      data.contabilidad      ?? c.contabilidad,
            adicional:         data.adicional         ?? c.adicional,
            saldoPendiente:    data.saldoPendiente    ?? c.saldoPendiente,
            diasTrabajados:    data.diasTrabajados    ?? c.diasTrabajados,
            didiBalance:       data.didiBalance       ?? c.didiBalance,
            nota:              data.nota              ?? c.nota,
            efectivoAEntregar: newEfectivo            ?? c.efectivoAEntregar,
          }
        : c
    ));
    setModalEditar(null);
    fetchCuentas(weekStart); // refetch en segundo plano para sincronizar
  };

  const handleConfirmarPago = async (monto: number, nota: string): Promise<string | null> => {
    if (!modalCobro) return null;
    const cuentaSnapshot = { ...modalCobro };
    setRegistrando(modalCobro.id);
    try {
      const res = await fetch(`/api/weekly-accounts/${modalCobro.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto, notas: nota || undefined }),
      });
      if (res.ok) {
        setModalCobro(null);
        await fetchCuentas(weekStart);
        // Abrir modal de envío de confirmación de pago
        setImgLoading(cuentaSnapshot.id);
        generateCuentaImage(cuentaSnapshot, semanaLabel)
          .then(url => { setImgModal({ c: cuentaSnapshot, url, tipo: 'pago' }); setImgCopied(false); setWaCopied(false); })
          .catch(() => {})
          .finally(() => setImgLoading(null));
        return null;
      } else {
        const err = await res.json().catch(() => ({}));
        return err.message ?? 'Error al registrar pago';
      }
    } catch {
      return 'Error de conexión — intenta de nuevo';
    } finally {
      setRegistrando(null);
    }
  };

  // Revertir pago — regresa a pendiente y borra cash_collected
  const handleRevertirPago = async (c: CuentaSemanal) => {
    if (!confirm(`¿Revertir el pago de ${c.driverName.split(' ')[0]}? La cuenta regresará a Pendiente.`)) return;
    setRevirtiendo(c.id);
    try {
      const res = await fetch(`/api/weekly-accounts/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending', cash_collected: 0 }),
      });
      if (res.ok) await fetchCuentas(weekStart);
    } catch { /* silencioso */ } finally {
      setRevirtiendo(null);
    }
  };

  const handleOpenSendAll = async () => {
    setSendAllOpen(true);
    if (waAutoConfigured) {
      // Modo automático: enviar secuencialmente via API
      setSendAllRunning(true);
      const progress: Record<string, 'pending' | 'sending' | 'ok' | 'error'> = {};
      cuentasFiltradas.forEach(c => { progress[c.id] = 'pending'; });
      setSendAllProgress({ ...progress });
      for (const c of cuentasFiltradas) {
        setSendAllProgress(prev => ({ ...prev, [c.id]: 'sending' }));
        try {
          const imgDataUrl = await generateCuentaImage(c, semanaLabel).catch(() => null);
          const res = await fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: c.id, imageBase64: imgDataUrl ?? undefined, tipo: 'cuenta' }),
          });
          setSendAllProgress(prev => ({ ...prev, [c.id]: res.ok ? 'ok' : 'error' }));
        } catch {
          setSendAllProgress(prev => ({ ...prev, [c.id]: 'error' }));
        }
      }
      setSendAllRunning(false);
    } else {
      // Modo manual: generar imágenes para copiar/pegar
      setGeneratingAll(true);
      try {
        const imgs: Record<string, string> = {};
        await Promise.all(
          cuentasFiltradas.map(async c => {
            try { imgs[c.id] = await generateCuentaImage(c, semanaLabel); } catch { /* skip */ }
          })
        );
        setAllImgs(imgs);
      } finally { setGeneratingAll(false); }
    }
  };

  // Envío automático vía webhook (cuando está configurado)
  const handleEnviarAutomatic = async (c: CuentaSemanal) => {
    setWaSendError(null);
    setWaSentOk(null);
    setWaSending(c.id);
    try {
      // Generar imagen primero
      const imgDataUrl = await generateCuentaImage(c, semanaLabel).catch(() => null);
      const imageBase64 = imgDataUrl ?? undefined;

      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId:   c.id,
          imageBase64,
          tipo: 'cuenta',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? `Error ${res.status}`);
      setWaSentOk(c.id);
      setTimeout(() => setWaSentOk(null), 4000);
    } catch (err: unknown) {
      setWaSendError(err instanceof Error ? err.message : 'Error al enviar');
    } finally {
      setWaSending(null);
    }
  };

  const cuentasFiltradas = cuentas.filter((c) => {
    const q = busqueda.toLowerCase();
    const matchQ = !q || c.driverName.toLowerCase().includes(q) || c.eco.toLowerCase().includes(q) || c.plates.toLowerCase().includes(q);
    const matchS = filtroStatus === 'todos' || c.status === filtroStatus;
    return matchQ && matchS;
  });

  const semanaLabel = formatWeekLabel(weekStart);
  const isCurrentWeek = weekStart === fmtLocal(getMonday(new Date()));

  return (
    <div className="pb-16">
      <Header breadcrumbs={[{ label: 'Cuentas Semanales' }]} />
      <div className="px-4 md:px-6 pt-5 space-y-4">

        {/* ── Encabezado ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-900">Cuentas Semanales</h1>
            <p className="text-sm text-slate-400">Cobros, rentas y actividad Didi por chofer</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEliminarSemana}
              disabled={eliminando}
              title="Elimina las cuentas pendientes de esta semana para reimportar desde cero"
              className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 bg-red-50 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-60"
            >
              {eliminando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Eliminar semana
            </button>
            <button
              onClick={handleRecalcular}
              disabled={recalculando}
              title="Recalcula efectivo_a_entregar de cuentas con $0 (choferes sin importar Didi)"
              className="flex items-center gap-1.5 px-3 py-2 border border-amber-200 text-amber-700 bg-amber-50 text-sm font-medium rounded-lg hover:bg-amber-100 disabled:opacity-60"
            >
              {recalculando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
              Recalcular
            </button>
            <Link
              href="/cuentas-semanales/importar-didi"
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Importar Didi
            </Link>
            <button
              onClick={handleGenerarSemana}
              disabled={generando}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {generando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Generar semana
            </button>
          </div>
        </div>

        {/* ── Selector de semana ── */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => changeWeek(-1)} className="p-2 hover:bg-slate-100 rounded-lg">
              <ChevronLeft className="w-5 h-5 text-slate-500" />
            </button>
            <div className="text-center flex-1">
              <p className="text-[11px] text-slate-400 uppercase font-medium tracking-wide">Semana</p>
              {/* Label clicable que abre el date picker oculto */}
              <label className="relative cursor-pointer group inline-flex items-center gap-1.5">
                <p className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors">{semanaLabel}</p>
                <CalendarDays className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500" />
                <input
                  type="date"
                  value={weekStart}
                  onChange={(e) => handlePickDate(e.target.value)}
                  className="absolute inset-0 opacity-0 w-full cursor-pointer"
                  title="Seleccionar semana"
                />
              </label>
              {isCurrentWeek && <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Semana actual</span>}
            </div>
            <button onClick={() => changeWeek(1)} className="p-2 hover:bg-slate-100 rounded-lg">
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          {/* Botón resumen mensual */}
          <div className="border-t border-slate-50 px-4 py-2 flex justify-center">
            <button
              onClick={() => setVerMes(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg transition-colors ${
                verMes ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              {verMes ? 'Ocultar resumen del mes' : 'Ver resumen del mes completo'}
            </button>
          </div>
        </div>

        {/* ── Resumen mensual ── */}
        {verMes && (
          <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-indigo-50 bg-indigo-50">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <p className="text-sm font-bold text-indigo-800">
                Resumen del mes — {new Date(weekStart + 'T00:00:00').toLocaleString('es-MX', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            {mesCargando ? (
              <div className="py-6 text-center text-sm text-slate-400">Cargando semanas del mes…</div>
            ) : mesCuentas.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400">Sin cuentas en este mes</div>
            ) : (() => {
              // Agrupar por semana
              const semanas = mesCuentas.reduce<Record<string, CuentaSemanal[]>>((acc, c) => {
                const key = String(c.weekStart).slice(0, 10);
                if (!acc[key]) acc[key] = [];
                acc[key].push(c);
                return acc;
              }, {});

              // Totales globales del mes
              const totalEfectivo = mesCuentas.reduce((s, c) => s + (c.efectivoAEntregar ?? 0), 0);
              const totalRenta    = mesCuentas.reduce((s, c) => s + (c.rent ?? 0), 0);
              const totalDidi     = mesCuentas.reduce((s, c) => s + (c.didiIncome ?? 0), 0);
              const totalViajes   = mesCuentas.reduce((s, c) => s + (c.viajesPagados ?? 0), 0);
              const fmt = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });

              return (
                <div>
                  {/* Semanas del mes */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left px-4 py-2 text-slate-500 font-semibold">Semana</th>
                          <th className="text-right px-3 py-2 text-slate-500 font-semibold">Cuentas</th>
                          <th className="text-right px-3 py-2 text-slate-500 font-semibold">Viajes</th>
                          <th className="text-right px-3 py-2 text-slate-500 font-semibold">Total Didi</th>
                          <th className="text-right px-3 py-2 text-slate-500 font-semibold">Renta total</th>
                          <th className="text-right px-3 py-2 text-indigo-600 font-bold">A Depositar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(semanas).sort(([a], [b]) => a.localeCompare(b)).map(([ws, rows]) => {
                          const ef   = rows.reduce((s, c) => s + (c.efectivoAEntregar ?? 0), 0);
                          const rd   = rows.reduce((s, c) => s + (c.rent ?? 0), 0);
                          const dd   = rows.reduce((s, c) => s + (c.didiIncome ?? 0), 0);
                          const vj   = rows.reduce((s, c) => s + (c.viajesPagados ?? 0), 0);
                          const endD = new Date(ws + 'T00:00:00'); endD.setDate(endD.getDate() + 6);
                          const lbl  = `${new Date(ws + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} – ${endD.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`;
                          return (
                            <tr key={ws} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => { setWeekStart(ws); setVerMes(false); }}>
                              <td className="px-4 py-2 text-slate-700 font-medium">{lbl}</td>
                              <td className="px-3 py-2 text-right text-slate-600">{rows.length}</td>
                              <td className="px-3 py-2 text-right text-slate-600">{vj}</td>
                              <td className="px-3 py-2 text-right text-slate-600">{fmt(dd)}</td>
                              <td className="px-3 py-2 text-right text-slate-600">{fmt(rd)}</td>
                              <td className="px-3 py-2 text-right font-bold text-indigo-700">{fmt(ef)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-indigo-50 font-bold">
                          <td className="px-4 py-2.5 text-indigo-800">Total del mes</td>
                          <td className="px-3 py-2.5 text-right text-indigo-700">{mesCuentas.length}</td>
                          <td className="px-3 py-2.5 text-right text-indigo-700">{totalViajes}</td>
                          <td className="px-3 py-2.5 text-right text-indigo-700">{fmt(totalDidi)}</td>
                          <td className="px-3 py-2.5 text-right text-indigo-700">{fmt(totalRenta)}</td>
                          <td className="px-3 py-2.5 text-right text-indigo-800 text-sm">{fmt(totalEfectivo)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <p className="text-[10px] text-slate-400 px-4 py-2">Click en una semana para verla en detalle</p>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── KPIs semana ── */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'A cobrar efectivo',  value: fmt(summary.totalEfectivo),        icon: Banknote,   color: 'text-blue-600',    bg: 'bg-blue-50' },
              { label: 'Didi depositó',       value: fmt(summary.totalDepositos),       icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Viajes flotilla',     value: String(summary.totalViajesSemana), icon: TrendingUp, color: 'text-violet-600',  bg: 'bg-violet-50' },
              { label: 'Pendientes / Total',  value: `${summary.totalPendientes} / ${summary.totalCuentas}`, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-slate-500 font-medium">{s.label}</span>
                  <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center`}>
                    <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                  </div>
                </div>
                <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Sin datos ── */}
        {!loading && cuentas.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-6 py-12 text-center">
            <FileSpreadsheet className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-semibold">Sin cuentas para esta semana</p>
            <p className="text-slate-400 text-sm mt-1">Genera la semana o importa reportes de Didi.</p>
            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={handleGenerarSemana}
                disabled={generando}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
              >
                {generando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Generar semana
              </button>
              <Link href="/cuentas-semanales/importar-didi" className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50">
                <FileSpreadsheet className="w-4 h-4" />
                Importar Didi
              </Link>
            </div>
          </div>
        )}

        {/* ── Lista de cuentas ── */}
        {(loading || cuentas.length > 0) && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Filtros */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar chofer, vehículo..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                {(['todos', 'pending', 'paid'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiltroStatus(f)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filtroStatus === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {f === 'todos' ? 'Todos' : f === 'pending' ? 'Pendientes' : 'Pagadas'}
                  </button>
                ))}
              </div>
              <button
                onClick={handleOpenSendAll}
                disabled={cuentasFiltradas.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap ml-auto"
              >
                <Send className="w-3.5 h-3.5" />
                Enviar todas
              </button>
            </div>

            {/* Error WA */}
            {waSendError && (
              <div className="mx-1 mb-2 flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{waSendError}</span>
                <button onClick={() => setWaSendError(null)} className="ml-auto text-red-400 hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
              </div>
            )}

            {/* Tabla */}
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-left">
                      <th className="text-xs font-semibold text-slate-500 px-4 py-2.5">Chofer / Vehículo</th>
                      <th className="text-center text-xs font-semibold text-slate-500 px-3 py-2.5">Días</th>
                      <th className="text-center text-xs font-semibold text-slate-500 px-3 py-2.5">Viajes</th>
                      <th className="text-right text-xs font-semibold text-slate-500 px-3 py-2.5">Total Didi</th>
                      <th className="text-right text-xs font-semibold text-slate-500 px-3 py-2.5">Depósito cuenta</th>
                      <th className="text-right text-xs font-semibold text-slate-500 px-3 py-2.5">Saldo</th>
                      <th className="text-right text-xs font-semibold text-slate-500 px-3 py-2.5 bg-blue-50">A Depositar</th>
                      <th className="text-center text-xs font-semibold text-slate-500 px-3 py-2.5">Estado</th>
                      <th className="text-center text-xs font-semibold text-slate-500 px-2 py-2.5">Editar</th>
                      <th className="text-center text-xs font-semibold text-slate-500 px-3 py-2.5">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cuentasFiltradas.map((c) => {
                      const iniciales = c.driverName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                      const isExpanded = expandido === c.id;

                      return (
                        <Fragment key={c.id}>
                          <tr
                            className={`border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/40' : ''}`}
                            onClick={() => setExpandido(isExpanded ? null : c.id)}
                          >
                            {/* Chofer */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                  {iniciales}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-900 leading-tight">{c.driverName.split(' ').slice(0,2).join(' ')}</p>
                                  <p className="text-[11px] text-slate-400 font-mono">
                                    {c.eco && c.eco !== c.plates ? `${c.eco} · ${c.plates}` : c.plates}
                                  </p>
                                </div>
                                <ChevronDown className={`w-3.5 h-3.5 text-slate-300 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </td>
                            {/* Días */}
                            <td className="px-3 py-3 text-center">
                              <span className={`text-xs font-bold ${c.diasTrabajados < 7 ? 'text-orange-500' : 'text-slate-600'}`}>
                                {c.diasTrabajados}/7
                              </span>
                            </td>
                            {/* Viajes */}
                            <td className="px-3 py-3 text-center">
                              {c.viajesPagados > 0 ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="text-sm font-bold text-slate-700">{c.viajesPagados}</span>
                                  <span className="text-[10px] text-slate-400">{c.viajesOnline} tarj · {c.viajesEfectivo} efect</span>
                                </div>
                              ) : (
                                <span className="text-slate-300 text-sm">—</span>
                              )}
                            </td>
                            {/* Total Didi */}
                            <td className="px-3 py-3 text-right">
                              <span className="text-sm font-semibold text-slate-700">
                                {c.didiIncome > 0 ? fmtDec(c.didiIncome) : '—'}
                              </span>
                            </td>
                            {/* Depósito a cuenta */}
                            <td className="px-3 py-3 text-right">
                              <span className={`text-sm font-semibold ${c.didiBalance > 0 ? 'text-emerald-600' : c.didiBalance < 0 ? 'text-red-500' : 'text-slate-300'}`}>
                                {c.didiBalance !== 0 ? fmtDec(c.didiBalance) : '—'}
                              </span>
                            </td>
                            {/* Saldo pendiente */}
                            <td className="px-3 py-3 text-right">
                              {c.saldoPendiente !== 0 ? (
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.saldoPendiente > 0 ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>
                                  {c.saldoPendiente > 0 ? '+' : '−'}{fmt(Math.abs(c.saldoPendiente))}
                                </span>
                              ) : (
                                <span className="text-slate-300 text-sm">—</span>
                              )}
                            </td>
                            {/* A depositar */}
                            <td className="px-3 py-3 text-right bg-blue-50/60">
                              <span className="text-base font-black text-blue-600">{fmt(c.efectivoAEntregar)}</span>
                            </td>
                            {/* Estado */}
                            <td className="px-3 py-3 text-center">
                              <StatusBadge status={c.status} />
                            </td>
                            {/* Editar — columna independiente */}
                            <td className="px-2 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setModalEditar(c)}
                                className="flex items-center gap-0.5 px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 rounded-md border border-blue-200 transition-colors mx-auto"
                              >
                                <Pencil className="h-2.5 w-2.5" /> Editar
                              </button>
                            </td>
                            {/* Acciones — uniforme para todas las filas */}
                            <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1 flex-nowrap">
                                {c.status === 'pending' && (
                                  <button
                                    onClick={() => setModalCobro(c)}
                                    disabled={registrando === c.id}
                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg disabled:opacity-60 whitespace-nowrap"
                                  >
                                    {registrando === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                    Confirmar pago
                                  </button>
                                )}
                                {/* Enviar cuenta — intenta API auto; si no configurada, abre WA directo */}
                                <button
                                  onClick={async () => {
                                    setWaSending(c.id);
                                    setWaSendError(null);
                                    setWaSentOk(null);
                                    try {
                                      const imgDataUrl = await generateCuentaImage(c, semanaLabel).catch(() => null);
                                      const res = await fetch('/api/whatsapp/send', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          accountId:   c.id,
                                          imageBase64: imgDataUrl ?? undefined,
                                          tipo:        'cuenta',
                                        }),
                                      });
                                      if (res.ok) {
                                        setWaSentOk(c.id);
                                        setTimeout(() => setWaSentOk(null), 4000);
                                        return;
                                      }
                                      // 422 = no configurado → fallback wa.me directo
                                      const texto = buildWaMsg(c, semanaLabel);
                                      const waUrl = resolveWaLink(c.waGroupLink, c.driverPhone, texto);
                                      if (imgDataUrl) {
                                        try {
                                          const blob = await fetch(imgDataUrl).then(r => r.blob());
                                          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                                        } catch { /* sin soporte clipboard */ }
                                      }
                                      if (waUrl) window.open(waUrl, '_blank');
                                      else if (imgDataUrl) setImgModal({ c, url: imgDataUrl });
                                    } catch (err: unknown) {
                                      setWaSendError(err instanceof Error ? err.message : 'Error al enviar');
                                    } finally {
                                      setWaSending(null);
                                    }
                                  }}
                                  disabled={waSending === c.id}
                                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg disabled:opacity-60 transition-colors whitespace-nowrap ${
                                    waSentOk === c.id ? 'bg-emerald-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
                                  }`}
                                  title="Enviar cuenta por WhatsApp"
                                >
                                  {waSending === c.id
                                    ? <><Loader2 className="h-3 w-3 animate-spin" /> Enviando…</>
                                    : waSentOk === c.id
                                    ? <><CheckCircle2 className="h-3 w-3" /> ¡Enviado!</>
                                    : <><MessageCircle className="h-3 w-3" /> Enviar cuenta</>}
                                </button>
                                {/* Recibo + Cancelar — visible para pagadas, parciales, aprobadas */}
                                {(c.status === 'paid' || c.status === 'partial' || c.status === 'approved') && (
                                  <>
                                    <button
                                      onClick={() => generarRecibo(c, semanaLabel)}
                                      className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-100 rounded-lg whitespace-nowrap"
                                    >
                                      <FileText className="h-3 w-3" /> Recibo
                                    </button>
                                    <button
                                      onClick={() => handleRevertirPago(c)}
                                      disabled={revirtiendo === c.id}
                                      className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-red-500 border border-red-200 hover:bg-red-50 rounded-lg whitespace-nowrap disabled:opacity-50"
                                      title="Deshacer pago — regresa a Pendiente"
                                    >
                                      {revirtiendo === c.id
                                        ? <Loader2 className="h-3 w-3 animate-spin" />
                                        : <XCircle className="h-3 w-3" />}
                                      Deshacer
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Fila expandida con detalle */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={10} className="p-0">
                                <PanelDetalle c={c} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer totales */}
            {!loading && cuentas.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 flex-wrap gap-2">
                <span>{cuentasFiltradas.length} de {cuentas.length} cuentas</span>
                <div className="flex items-center gap-3 flex-wrap">
                  <span>Renta: <strong className="text-slate-700">{fmt(cuentas.reduce((s,c)=>s+c.rent,0))}</strong></span>
                  <span className="text-slate-300">|</span>
                  <span>Didi total: <strong className="text-slate-700">{fmt(cuentas.reduce((s,c)=>s+c.didiIncome,0))}</strong></span>
                  <span className="text-slate-300">|</span>
                  <span>Depósitos: <strong className="text-emerald-600">{fmt(cuentas.reduce((s,c)=>s+c.didiBalance,0))}</strong></span>
                  <span className="text-slate-300">|</span>
                  <span>Total a cobrar: <strong className="text-blue-600">{fmt(cuentas.reduce((s,c)=>s+c.efectivoAEntregar,0))}</strong></span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Resumen "Recibe JP" — formato Excel ── */}
        {!loading && cuentas.length > 0 && (
          <RecibeJPSummary cuentas={cuentas} weekStart={weekStart} />
        )}

        {/* ── Nota informativa ── */}
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <strong>¿Cómo funciona el cálculo?</strong> Renta + Contabilidad − Depósito Didi ± Saldo pendiente ± Adicional = Efectivo que cobra JP.
            Da clic en cualquier fila para ver el desglose completo.
          </div>
        </div>

      </div>

      {/* ── Modal de cobro ── */}
      {modalCobro && (
        <ModalCobro
          cuenta={modalCobro}
          weekLabel={semanaLabel}
          onConfirmar={handleConfirmarPago}
          onCancelar={() => setModalCobro(null)}
        />
      )}

      {/* ── Modal de edición ── */}
      {modalEditar && (
        <ModalEditar
          cuenta={modalEditar}
          onGuardar={handleEditarGuardar}
          onCancelar={() => setModalEditar(null)}
        />
      )}

      {/* ── Modal imagen WA ── */}
      {imgModal && (() => {
        const { c, url, tipo } = imgModal;
        const esPago = tipo === 'pago';
        const waMsg = esPago
          ? `✅ *Pago confirmado — ${c.eco}*\n\n*Semana:* ${semanaLabel}\n*Chofer:* ${c.driverName}\n\n📊 *Desglose:*\nRenta (${c.diasTrabajados}/7 días): ${fmtDec(c.rent)}\n${c.contabilidad > 0 ? `Contabilidad: ${fmtDec(c.contabilidad)}\n` : ''}Didi depositó a cuenta: ${fmtDec(c.didiBalance)}${c.adicional !== 0 ? `\nAdicional: ${c.adicional > 0 ? '+' : '-'}${fmtDec(Math.abs(c.adicional))}` : ''}${c.saldoPendiente !== 0 ? `\nSaldo previo: ${c.saldoPendiente > 0 ? '+' : '-'}${fmtDec(Math.abs(c.saldoPendiente))}` : ''}\n\n💰 *Recibido en efectivo: ${fmtDec(c.efectivoAEntregar)}*\n\n¡Gracias! Al Volante GDL 🙏`
          : `🚗 *${c.eco} — Cuenta Semanal*\n\n*Semana:* ${semanaLabel}\n*Chofer:* ${c.driverName}\n\n📊 *Desglose:*\nRenta (${c.diasTrabajados}/7 días): ${fmtDec(c.rent)}\n${c.contabilidad > 0 ? `Contabilidad: ${fmtDec(c.contabilidad)}\n` : ''}Didi depositó a cuenta: ${fmtDec(c.didiBalance)}${c.adicional !== 0 ? `\nAdicional: ${c.adicional > 0 ? '+' : '-'}${fmtDec(Math.abs(c.adicional))}` : ''}${c.saldoPendiente !== 0 ? `\nSaldo previo: ${c.saldoPendiente > 0 ? '+' : '-'}${fmtDec(Math.abs(c.saldoPendiente))}` : ''}\n\n💰 *Total a entregar en efectivo: ${fmtDec(c.efectivoAEntregar)}*\n\n¡Gracias! Al Volante GDL 🙏`;
        const waLink = resolveWaLink(c.waGroupLink, c.driverPhone, waMsg);
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setImgModal(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className={`flex items-center justify-between px-5 py-4 border-b border-slate-100 ${esPago ? 'bg-emerald-50' : ''}`}>
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${esPago ? 'bg-emerald-500' : 'bg-green-100'}`}>
                    {esPago
                      ? <CheckCircle2 className="h-4 w-4 text-white" />
                      : <Send className="h-4 w-4 text-green-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {esPago ? '¡Pago registrado!' : 'Enviar cuenta semanal'}
                    </p>
                    <p className="text-xs text-slate-400">{c.driverName.split(' ').slice(0,2).join(' ')} · {c.eco} · {fmt(c.efectivoAEntregar)}</p>
                  </div>
                </div>
                <button onClick={() => setImgModal(null)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>
              {/* Imagen */}
              <div className="flex-1 overflow-y-auto">
                <div className="bg-slate-50 p-3 border-b border-slate-100">
                  <img src={url} alt="Resumen" className="w-full rounded-lg border border-slate-200 shadow-sm" />
                </div>
                {/* Instrucciones */}
                <div className="mx-4 mt-3 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-xs font-bold text-blue-700 mb-1">📋 Pasos para enviar:</p>
                  <ol className="text-xs text-blue-600 space-y-0.5 list-decimal list-inside">
                    <li>Copia la imagen → abre WhatsApp → pega (Ctrl+V)</li>
                    <li>Copia el texto y agrégalo al mensaje</li>
                    <li>Abre el chat del chofer y envía</li>
                  </ol>
                </div>
              </div>
              {/* Botones */}
              <div className="px-4 pb-4 pt-3 border-t border-slate-100 flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      const blob = await fetch(url).then(r => r.blob());
                      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                      setImgCopied(true); setTimeout(() => setImgCopied(false), 3000);
                    } catch {
                      const a = document.createElement('a');
                      a.href = url; a.download = `cuenta-${c.eco}.png`; a.click();
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors">
                  {imgCopied ? <><CheckCircle2 className="h-4 w-4" /> ¡Copiada!</> : <><Copy className="h-4 w-4" /> Copiar imagen</>}
                </button>
                {waLink && (
                  <button
                    onClick={() => window.open(waLink, '_blank')}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold">
                    <MessageCircle className="h-4 w-4" /> Abrir WA
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal Enviar Todas ── */}
      {sendAllOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSendAllOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 bg-green-100 rounded-full flex items-center justify-center">
                  <Send className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Enviar cuentas semanales</p>
                  <p className="text-xs text-slate-400">{cuentasFiltradas.length} choferes · {semanaLabel}</p>
                </div>
              </div>
              <button onClick={() => setSendAllOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            {/* Instrucción rápida */}
            <div className={`px-5 py-2.5 border-b flex items-start gap-2 ${waAutoConfigured ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'}`}>
              {waAutoConfigured
                ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /><p className="text-xs text-emerald-700">WhatsApp configurado — se enviará automáticamente la cuenta + imagen a cada grupo.</p></>
                : <><Info className="h-3.5 w-3.5 text-blue-500 flex-shrink-0 mt-0.5" /><p className="text-xs text-blue-600">Copia la imagen de cada chofer → abre WhatsApp → pega (Ctrl+V o mantén pulsado en móvil).</p></>}
            </div>

            {/* Lista de choferes */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {/* MODO AUTO (whapi/meta/webhook configurado) */}
              {waAutoConfigured ? (
                cuentasFiltradas.map(c => {
                  const st = sendAllProgress[c.id];
                  return (
                    <div key={c.id} className={`rounded-xl border p-3 flex items-center gap-3 transition-colors ${
                      st === 'ok'      ? 'bg-emerald-50 border-emerald-200'
                      : st === 'error' ? 'bg-red-50 border-red-200'
                      : st === 'sending' ? 'bg-blue-50 border-blue-200'
                      : 'bg-slate-50 border-slate-100'
                    }`}>
                      <span className="inline-flex items-center justify-center w-10 h-7 bg-slate-900 text-white text-xs font-bold rounded shrink-0">{c.eco}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 leading-tight truncate">{c.driverName.split(' ').slice(0,2).join(' ')}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{fmt(c.efectivoAEntregar)}</p>
                      </div>
                      <div className="shrink-0">
                        {st === 'sending' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                        {st === 'ok'      && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                        {st === 'error'   && <AlertCircle className="h-4 w-4 text-red-500" />}
                        {(!st || st === 'pending') && <span className="text-xs text-slate-400">En espera…</span>}
                      </div>
                    </div>
                  );
                })
              ) : (
                /* MODO MANUAL (sin WA configurado) */
                generatingAll ? (
                  <div className="flex flex-col items-center py-10 gap-3">
                    <Loader2 className="h-7 w-7 animate-spin text-green-500" />
                    <p className="text-sm text-slate-500 font-medium">Generando imágenes…</p>
                  </div>
                ) : (
                  cuentasFiltradas.map(c => {
                    const imgUrl = allImgs[c.id];
                    const waLink = resolveWaLink(c.waGroupLink, c.driverPhone);
                    return (
                      <div key={c.id} className="bg-slate-50 rounded-xl border border-slate-100 p-3 flex items-center gap-3">
                        {imgUrl ? (
                          <img src={imgUrl} alt={c.eco} className="h-20 w-28 object-cover rounded-lg border border-slate-200 flex-shrink-0 shadow-sm" />
                        ) : (
                          <div className="h-20 w-28 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 leading-tight">{c.driverName.split(' ').slice(0,2).join(' ')}</p>
                          <p className="text-[11px] text-slate-400 font-mono mb-2">{c.eco} · {fmt(c.efectivoAEntregar)}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                if (!imgUrl) return;
                                try {
                                  const blob = await fetch(imgUrl).then(r => r.blob());
                                  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                                } catch { /* fallback: skip */ }
                              }}
                              disabled={!imgUrl}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg disabled:opacity-40 transition-colors"
                            >
                              <Copy className="h-3 w-3" /> Copiar imagen
                            </button>
                            {waLink && (
                              <button
                                onClick={() => window.open(waLink, '_blank')}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-colors"
                              >
                                <MessageCircle className="h-3 w-3" /> Abrir WA
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
              {waAutoConfigured && !sendAllRunning && Object.keys(sendAllProgress).length > 0 && (
                <p className="text-xs text-slate-400">
                  {Object.values(sendAllProgress).filter(s => s === 'ok').length}/{cuentasFiltradas.length} enviados
                  {Object.values(sendAllProgress).some(s => s === 'error') && ' · Algunos fallaron — verifica el grupo configurado'}
                </p>
              )}
              <div className="ml-auto flex gap-2">
                {sendAllRunning && (
                  <span className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando…
                  </span>
                )}
                <button onClick={() => { setSendAllOpen(false); setSendAllProgress({}); setSendAllRunning(false); }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
