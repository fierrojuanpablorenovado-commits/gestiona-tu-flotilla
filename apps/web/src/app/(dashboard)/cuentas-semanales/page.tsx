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
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CuentaSemanal {
  id: string;
  weekStart: string;
  weekEnd: string;
  eco: string;
  plates: string;
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
  efectivoAEntregar: number; // Lo que JP cobra en efectivo al chofer
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

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function formatWeekLabel(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
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
    ? `Saldo previo (JP debe)`
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
            <span className="text-xs font-semibold text-blue-700">JP recibe en efectivo</span>
            <span className="text-sm font-black text-blue-700">{fmt(c.efectivoAEntregar)}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 bg-emerald-50 rounded-lg px-3">
            <span className="text-xs font-semibold text-emerald-700">Didi depositó a cuenta</span>
            <span className="text-sm font-black text-emerald-700">{fmtDec(c.didiBalance)}</span>
          </div>
          {c.saldoPendiente !== 0 && (
            <div className={`flex justify-between items-center py-1.5 rounded-lg px-3 ${c.saldoPendiente > 0 ? 'bg-orange-50' : 'bg-purple-50'}`}>
              <span className={`text-xs font-semibold ${c.saldoPendiente > 0 ? 'text-orange-700' : 'text-purple-700'}`}>
                {c.saldoPendiente > 0 ? 'Chofer debe a JP' : 'JP debe al chofer'}
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
  onConfirmar: (monto: number, nota: string) => void;
  onCancelar: () => void;
}) {
  const [monto, setMonto] = useState(String(cuenta.efectivoAEntregar));
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);

  const iniciales = cuenta.driverName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const handleConfirmar = async () => {
    const n = parseFloat(monto);
    if (isNaN(n) || n <= 0) return;
    setSaving(true);
    await onConfirmar(n, nota);
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
          <div className="flex gap-2 pt-1">
            <button onClick={onCancelar} className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50">Cancelar</button>
            <button
              onClick={handleConfirmar}
              disabled={saving || !monto || parseFloat(monto) <= 0}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirmar
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
<div class="total"><span class="label">JP cobró en efectivo</span><span class="value">${fmt(c.efectivoAEntregar)}</span></div>
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
            {field('Saldo previo', saldoPendiente, setSaldoPendiente, '(+ chofer debe / - JP debe)')}
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
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">JP cobra en efectivo</span>
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CuentasSemanalesPage() {
  const [weekStart, setWeekStart] = useState<string>(() => {
    const mon = getMonday(new Date());
    return mon.toISOString().split('T')[0];
  });
  const [cuentas, setCuentas] = useState<CuentaSemanal[]>([]);
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [generando, setGenerando] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [modalCobro, setModalCobro] = useState<CuentaSemanal | null>(null);
  const [modalEditar, setModalEditar] = useState<CuentaSemanal | null>(null);
  const [registrando, setRegistrando] = useState<string | null>(null);

  const fetchCuentas = useCallback(async (week: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/weekly-accounts?week=${week}`);
      const json = await res.json();
      if (json.data) {
        setCuentas(json.data);
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

  useEffect(() => { fetchCuentas(weekStart); }, [weekStart, fetchCuentas]);

  const changeWeek = (dir: -1 | 1) => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d.toISOString().split('T')[0]);
  };

  const handleGenerarSemana = async () => {
    setGenerando(true);
    try {
      await fetch('/api/cron/generar-semana');
      await fetchCuentas(weekStart);
    } finally {
      setGenerando(false);
    }
  };

  const handleEditarGuardar = async (data: Partial<CuentaSemanal>) => {
    if (!modalEditar) return;
    const res = await fetch(`/api/weekly-accounts/${modalEditar.id}`, {
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
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message ?? 'Error');
    }
    setModalEditar(null);
    await fetchCuentas(weekStart);
  };

  const handleConfirmarPago = async (monto: number, nota: string) => {
    if (!modalCobro) return;
    setRegistrando(modalCobro.id);
    try {
      const res = await fetch(`/api/weekly-accounts/${modalCobro.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto, notas: nota || undefined }),
      });
      if (res.ok) {
        const cuenta = { ...modalCobro };
        setModalCobro(null);
        await fetchCuentas(weekStart);
        // WhatsApp — grupo primero, fallback teléfono personal
        const weekLabel = formatWeekLabel(weekStart);
        const msg = encodeURIComponent(`✅ *${cuenta.eco} — Pago confirmado*\n\nChofer: ${cuenta.driverName}\nSemana: ${weekLabel}\nMonto recibido: *$${monto.toLocaleString('es-MX')} MXN*\n\n¡Gracias! Al Volante GDL 🙏`);
        const waUrl = cuenta.waGroupLink
          ? `${cuenta.waGroupLink}`
          : cuenta.driverPhone
          ? `https://wa.me/52${cuenta.driverPhone}?text=${msg}`
          : `https://wa.me/?text=${msg}`;
        window.open(waUrl, '_blank');
      } else {
        const err = await res.json();
        alert(err.message ?? 'Error al registrar pago');
      }
    } finally {
      setRegistrando(null);
    }
  };

  const cuentasFiltradas = cuentas.filter((c) => {
    const q = busqueda.toLowerCase();
    const matchQ = !q || c.driverName.toLowerCase().includes(q) || c.eco.toLowerCase().includes(q) || c.plates.toLowerCase().includes(q);
    const matchS = filtroStatus === 'todos' || c.status === filtroStatus;
    return matchQ && matchS;
  });

  const semanaLabel = formatWeekLabel(weekStart);
  const isCurrentWeek = weekStart === getMonday(new Date()).toISOString().split('T')[0];

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
            <div className="text-center">
              <p className="text-[11px] text-slate-400 uppercase font-medium tracking-wide">Semana</p>
              <p className="text-base font-black text-slate-900">{semanaLabel}</p>
              {isCurrentWeek && <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Semana actual</span>}
            </div>
            <button onClick={() => changeWeek(1)} className="p-2 hover:bg-slate-100 rounded-lg">
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* ── KPIs semana ── */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'JP cobra efectivo',  value: fmt(summary.totalEfectivo),        icon: Banknote,   color: 'text-blue-600',    bg: 'bg-blue-50' },
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
            </div>

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
                      <th className="text-right text-xs font-semibold text-slate-500 px-3 py-2.5 bg-blue-50">JP cobra</th>
                      <th className="text-center text-xs font-semibold text-slate-500 px-3 py-2.5">Estado</th>
                      <th className="text-center text-xs font-semibold text-slate-500 px-3 py-2.5">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cuentasFiltradas.map((c) => {
                      const iniciales = c.driverName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                      const isExpanded = expandido === c.id;
                      // WA: grupo de la unidad primero, fallback teléfono personal
                      const waText = encodeURIComponent(`🚗 *${c.eco} — Cuenta Semanal*\n\n*Semana:* ${semanaLabel}\n*Chofer:* ${c.driverName}\n\n📊 *Desglose:*\nRenta (${c.diasTrabajados}/7 días): ${fmt(c.rent)}\nContabilidad: ${fmt(c.contabilidad)}\nDidi depositó a cuenta: ${fmtDec(c.didiBalance)}\n${c.adicional !== 0 ? `Adicional: ${fmt(c.adicional)}\n` : ''}${c.saldoPendiente !== 0 ? `Saldo previo: ${c.saldoPendiente > 0 ? '+' : ''}${fmt(c.saldoPendiente)}\n` : ''}\n💰 *Total a entregar en efectivo: ${fmt(c.efectivoAEntregar)}*\n\nViajes semana: ${c.viajesPagados} (${c.viajesOnline} tarjeta · ${c.viajesEfectivo} efectivo)\n\n¡Gracias! Al Volante GDL 🙏`);
                      const waUrl = c.waGroupLink
                        ? `${c.waGroupLink}`
                        : c.driverPhone
                        ? `https://wa.me/52${c.driverPhone}?text=${waText}`
                        : `https://wa.me/?text=${waText}`;

                      return (
                        <>
                          <tr
                            key={c.id}
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
                                  <p className="text-[11px] text-slate-400 font-mono">{c.eco} · {c.plates}</p>
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
                            {/* JP cobra — columna destacada */}
                            <td className="px-3 py-3 text-right bg-blue-50/60">
                              <span className="text-base font-black text-blue-600">{fmt(c.efectivoAEntregar)}</span>
                            </td>
                            {/* Estado */}
                            <td className="px-3 py-3 text-center">
                              <StatusBadge status={c.status} />
                            </td>
                            {/* Acciones */}
                            <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                {c.status === 'pending' && (
                                  <button
                                    onClick={() => setModalCobro(c)}
                                    disabled={registrando === c.id}
                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg disabled:opacity-60"
                                  >
                                    {registrando === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                    Cobrar
                                  </button>
                                )}
                                {/* Botón Editar */}
                                <button
                                  onClick={() => setModalEditar(c)}
                                  className="p-1.5 hover:bg-blue-50 rounded-lg"
                                  title="Editar cuenta"
                                >
                                  <Pencil className="h-3.5 w-3.5 text-blue-500" />
                                </button>
                                <a href={waUrl} target="_blank" rel="noopener noreferrer"
                                  className="p-1.5 hover:bg-green-50 rounded-lg" title="Enviar cuenta al grupo WhatsApp">
                                  <MessageCircle className="h-4 w-4 text-green-500" />
                                </a>
                                {c.status === 'paid' && (
                                  <button onClick={() => generarRecibo(c, semanaLabel)}
                                    className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-100 rounded-lg">
                                    <FileText className="h-3 w-3" />
                                    Recibo
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Fila expandida con detalle */}
                          {isExpanded && (
                            <tr key={`${c.id}-detail`}>
                              <td colSpan={9} className="p-0">
                                <PanelDetalle c={c} />
                              </td>
                            </tr>
                          )}
                        </>
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
                  <span>JP cobra total: <strong className="text-blue-600">{fmt(cuentas.reduce((s,c)=>s+c.efectivoAEntregar,0))}</strong></span>
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
    </div>
  );
}
