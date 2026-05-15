'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BookOpen,
  TrendingUp,
  TrendingDown,
  Calculator,
  Receipt,
  Download,
  Upload,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
  Lock,
  Car,
  CalendarClock,
  ExternalLink,
  FileCheck,
  Banknote,
  ShieldCheck,
  ScanLine,
} from 'lucide-react';
import { ScanFactura } from '@/components/ui/ScanFactura';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AccountingSummary {
  month: number;
  year: number;
  total_ingresos:             number;
  total_gastos_deducibles:    number;
  total_gastos_no_deducibles: number;
  utilidad_neta:              number;
  isr_calculado:              number;
  iva_calculado:              number;
  isr_rate:                   number;
  iva_rate:                   number;
  categorias:                 Record<string, { total: number; count: number; is_income: boolean }>;
  records:                    AccountingRecord[];
}

interface AccountingRecord {
  id:             number;
  period_month:   number;
  period_year:    number;
  source:         string;
  category:       string;
  description:    string;
  amount:         string | number;
  is_income:      boolean;
  is_deductible:  boolean;
  invoice_number: string | null;
  created_at:     string;
}

interface FlotillaVehicle {
  vehicleId:          string;
  eco:                string;
  brand:              string;
  model:              string;
  year:               number;
  plates:             string;
  kmActual:           number;
  purchasePrice:      number;
  jpParticipacion:    number;
  weeklyRent:         number;
  driver:             string;
  semanas:            number;
  totalDidiIncome:    number;
  totalDepositoBanco: number;
  totalImpuestos:     number;
  totalBonos:         number;
  totalEfectivo:      number;
  totalRecibeJP:      number;
  utilidadSimple:     number;
  roi:                number;
}

interface FlotillaResult {
  year:   number;
  data:   FlotillaVehicle[];
  totals: {
    semanas:            number;
    totalDidiIncome:    number;
    totalDepositoBanco: number;
    totalEfectivo:      number;
    totalRecibeJP:      number;
    totalInversion:     number;
  };
}

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const CATEGORY_LABELS: Record<string, string> = {
  ingresos_didi:   'Ingresos Didi Fleet',
  combustible:     'Combustible',
  mantenimiento:   'Mantenimiento',
  seguro:          'Seguros',
  renta:           'Renta de vehículo',
  servicios:       'Servicios',
  otros:           'Otros',
};

const DEDUCTIBLE_CATEGORIES = [
  { value: 'combustible',  label: 'Combustible' },
  { value: 'mantenimiento',label: 'Mantenimiento' },
  { value: 'seguro',       label: 'Seguros' },
  { value: 'renta',        label: 'Renta de vehículo' },
  { value: 'servicios',    label: 'Servicios' },
  { value: 'otros',        label: 'Otros' },
];

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ContabilidadPage() {
  const now   = new Date();
  const [activeTab,    setActiveTab]    = useState<'resumen' | 'proyeccion' | 'flotilla' | 'deducciones' | 'cfdi'>('resumen');
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear());
  const [summary,      setSummary]      = useState<AccountingSummary | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [syncing,      setSyncing]      = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [notification, setNotification]  = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [annualData,    setAnnualData]    = useState<(AccountingSummary | null)[]>(Array(12).fill(null));
  const [annualLoading, setAnnualLoading] = useState(false);
  const [flotillaData,  setFlotillaData]  = useState<FlotillaResult | null>(null);
  const [flotillaLoading, setFlotillaLoading] = useState(false);
  const [regime, setRegime] = useState<'RESICO' | 'PLATAFORMAS' | 'PM'>('RESICO');

  // Form for adding deductible invoice
  const [invoiceForm, setInvoiceForm] = useState({
    description: '',
    amount: '',
    invoice_number: '',
    category: 'combustible',
  });
  const [addingInvoice, setAddingInvoice] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const notify = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  };

  // ── Load summary ────────────────────────────────────────────────────────────
  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/accounting?month=${selectedMonth}&year=${selectedYear}&summary=true`);
      const data = await res.json();
      if (res.ok) setSummary(data);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  // ── Load annual data ────────────────────────────────────────────────────────
  const loadAnnualData = useCallback(async () => {
    setAnnualLoading(true);
    const results: (AccountingSummary | null)[] = Array(12).fill(null);
    await Promise.all(
      Array.from({ length: 12 }, (_, i) => i + 1).map(async (m) => {
        try {
          const res  = await fetch(`/api/accounting?month=${m}&year=${selectedYear}&summary=true`);
          const data = await res.json();
          if (res.ok) results[m - 1] = data;
        } catch { /* skip */ }
      }),
    );
    setAnnualData(results);
    setAnnualLoading(false);
  }, [selectedYear]);

  useEffect(() => {
    if (activeTab === 'proyeccion') loadAnnualData();
  }, [activeTab, loadAnnualData]);

  // ── Load flotilla P&L ───────────────────────────────────────────────────────
  const loadFlotilla = useCallback(async () => {
    setFlotillaLoading(true);
    try {
      const res  = await fetch(`/api/accounting/flotilla?year=${selectedYear}`);
      const data = await res.json();
      if (res.ok) setFlotillaData(data);
    } finally {
      setFlotillaLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    if (activeTab === 'flotilla') loadFlotilla();
  }, [activeTab, loadFlotilla]);

  // ── Sync gastos ─────────────────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    try {
      // Llama import-didi sin archivo para solo sincronizar gastos
      const fd = new FormData();
      fd.append('month', String(selectedMonth));
      fd.append('year',  String(selectedYear));
      // Enviar archivo vacío solo para disparar la sincronización de gastos
      // usando el endpoint de contabilidad POST directamente
      const res = await fetch(`/api/accounting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period_month: selectedMonth,
          period_year:  selectedYear,
          source:       'sync',
          category:     'sync_trigger',
          description:  'Sincronización de gastos',
          amount:       0,
          is_income:    false,
          is_deductible: false,
        }),
      });
      if (res.ok) {
        notify('success', 'Gastos sincronizados correctamente');
        loadSummary();
      }
    } finally {
      setSyncing(false);
    }
  };

  // ── Import Excel Didi ───────────────────────────────────────────────────────
  const handleFileImport = async (file: File) => {
    setImportLoading(true);
    try {
      const fd = new FormData();
      fd.append('file',  file);
      fd.append('month', String(selectedMonth));
      fd.append('year',  String(selectedYear));

      const res  = await fetch('/api/accounting/import-didi', { method: 'POST', body: fd });
      const data = await res.json();

      if (res.ok) {
        notify('success', `Importado: ${data.didi_inserted} registros Didi + ${data.maintenance_synced} mantenimiento + ${data.treasury_synced} tesorería`);
        loadSummary();
      } else {
        notify('error', data.message || 'Error al importar');
      }
    } finally {
      setImportLoading(false);
    }
  };

  // ── Add invoice ─────────────────────────────────────────────────────────────
  const handleAddInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.description || !invoiceForm.amount) return;
    setAddingInvoice(true);
    try {
      const res = await fetch('/api/accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period_month:   selectedMonth,
          period_year:    selectedYear,
          source:         'manual',
          category:       invoiceForm.category,
          description:    invoiceForm.description,
          amount:         parseFloat(invoiceForm.amount),
          is_income:      false,
          is_deductible:  true,
          invoice_number: invoiceForm.invoice_number || null,
        }),
      });
      if (res.ok) {
        notify('success', 'Factura/deducción agregada');
        setInvoiceForm({ description: '', amount: '', invoice_number: '', category: 'combustible' });
        loadSummary();
      } else {
        const d = await res.json();
        notify('error', d.message || 'Error al agregar');
      }
    } finally {
      setAddingInvoice(false);
    }
  };

  // ── Download report — HTML para contador ────────────────────────────────────
  const handleDownloadReport = () => {
    if (!summary) return;
    const mes     = `${MONTHS[selectedMonth - 1]} ${selectedYear}`;
    const fechaLim = `17 de ${MONTHS[selectedMonth % 12]} ${selectedMonth === 12 ? selectedYear + 1 : selectedYear}`;
    const ivaAcreditable = summary.total_gastos_deducibles * 0.16;
    const ivaNetoPagar   = Math.max(0, summary.iva_calculado - ivaAcreditable);
    const rows = Object.entries(summary.categorias)
      .map(([cat, d]) => `<tr><td>${CATEGORY_LABELS[cat] ?? cat}</td><td>${d.count}</td><td style="text-align:right;color:${d.is_income?'#16a34a':'#dc2626'}">${d.is_income?'+':'-'}${fmt(d.total)}</td><td>${d.is_income?'Ingreso':'Gasto'}</td></tr>`)
      .join('');
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Contabilidad ${mes}</title>
<style>body{font-family:Arial,sans-serif;margin:40px;color:#1e293b}h1{color:#1e3a8a}table{border-collapse:collapse;width:100%}th,td{border:1px solid #e2e8f0;padding:8px 12px;text-align:left}th{background:#f1f5f9;font-weight:600}.kpi{display:inline-block;width:200px;margin:10px;padding:16px;border:1px solid #e2e8f0;border-radius:8px}.kpi span{font-size:22px;font-weight:700;display:block}.sat{background:#fef3c7;border:2px solid #f59e0b;border-radius:8px;padding:16px;margin:20px 0}
</style></head><body>
<h1>Reporte Contabilidad — ${mes}</h1>
<p>Generado: ${new Date().toLocaleDateString('es-MX',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
<div class="sat"><strong>⚠️ Fecha límite declaración SAT: ${fechaLim}</strong><br>
ISR a pagar: ${fmt(summary.isr_calculado)} | IVA neto a pagar: ${fmt(ivaNetoPagar)} | Total: ${fmt(summary.isr_calculado + ivaNetoPagar)}</div>
<h2>Resumen Financiero</h2>
<div><div class="kpi"><span style="color:#16a34a">${fmt(summary.total_ingresos)}</span>Ingresos totales</div>
<div class="kpi"><span style="color:#dc2626">${fmt(summary.total_gastos_deducibles)}</span>Gastos deducibles</div>
<div class="kpi"><span style="color:#ca8a04">${fmt(summary.isr_calculado)}</span>ISR estimado (${regime})</div>
<div class="kpi"><span style="color:#7c3aed">${fmt(summary.iva_calculado)}</span>IVA trasladado</div>
<div class="kpi"><span style="color:#0891b2">${fmt(ivaAcreditable)}</span>IVA acreditable</div>
<div class="kpi"><span style="color:#dc2626">${fmt(ivaNetoPagar)}</span>IVA neto a pagar</div>
<div class="kpi"><span>${fmt(summary.utilidad_neta)}</span>Utilidad neta</div></div>
<h2>Detalle por Categoría</h2>
<table><thead><tr><th>Categoría</th><th>Registros</th><th>Total</th><th>Tipo</th></tr></thead><tbody>${rows}</tbody></table>
<h2>Registros del Período</h2>
<table><thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>No. Factura</th><th style="text-align:right">Monto</th></tr></thead>
<tbody>${summary.records.map(r=>`<tr><td>${new Date(r.created_at).toLocaleDateString('es-MX')}</td><td>${CATEGORY_LABELS[r.category]??r.category}</td><td>${r.description||'—'}</td><td>${r.invoice_number||'—'}</td><td style="text-align:right;color:${r.is_income?'#16a34a':'#dc2626'}">${r.is_income?'+':'-'}${fmt(Number(r.amount))}</td></tr>`).join('')}
</tbody></table>
<p style="margin-top:30px;font-size:12px;color:#94a3b8">Este reporte es un estimado basado en los registros ingresados. Consulta con tu contador para declaraciones oficiales ante el SAT.</p>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `reporte_contador_${selectedYear}_${String(selectedMonth).padStart(2,'0')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Flotilla CSV download ───────────────────────────────────────────────────
  const handleDownloadFlotilla = () => {
    if (!flotillaData) return;
    const headers = ['ECO','Vehículo','Placas','Chofer','Semanas','Didi Income','Dep. Banco','Efectivo Recibido','JP Recibe','ROI %','Inversión'];
    const rows = flotillaData.data.map(v => [
      v.eco, `${v.brand} ${v.model} ${v.year}`, v.plates, v.driver,
      v.semanas, v.totalDidiIncome, v.totalDepositoBanco,
      v.totalEfectivo, v.totalRecibeJP, v.roi, v.purchasePrice,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `flotilla_pl_${flotillaData.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Annual download ─────────────────────────────────────────────────────────
  const handleDownloadAnnual = () => {
    const rows = annualData.map((d, i) => ({
      mes:         MONTHS[i],
      ingresos:    d?.total_ingresos ?? 0,
      gastos:      (d?.total_gastos_deducibles ?? 0) + (d?.total_gastos_no_deducibles ?? 0),
      isr:         d?.isr_calculado ?? 0,
      iva:         d?.iva_calculado ?? 0,
      utilidad:    d?.utilidad_neta ?? 0,
    }));
    const csv = [
      ['Mes','Ingresos','Gastos','ISR Estimado','IVA Estimado','Utilidad Neta'].join(','),
      ...rows.map(r => [r.mes, r.ingresos, r.gastos, r.isr, r.iva, r.utilidad].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `contabilidad_anual_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const deducibleRecords = summary?.records.filter(r => !r.is_income && r.is_deductible) ?? [];
  const totalDeducciones = deducibleRecords.reduce((s, r) => s + Number(r.amount), 0);

  // Proyección simple: promedio de meses con datos
  const pastMonths = annualData.filter(Boolean) as AccountingSummary[];
  const avgIngresos = pastMonths.length
    ? pastMonths.reduce((s, d) => s + d.total_ingresos, 0) / pastMonths.length
    : 0;

  const tabs = [
    { key: 'resumen',      label: 'Resumen Mensual' },
    { key: 'proyeccion',   label: 'Proyección Anual' },
    { key: 'flotilla',     label: '🚗 Por Flotilla' },
    { key: 'deducciones',  label: 'Facturas y Deducciones' },
    { key: 'cfdi',         label: 'Factura Global CFDI' },
  ] as const;

  return (
    <div className="p-4 md:p-6 pb-20 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30">
          <BookOpen className="h-6 w-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Contabilidad</h1>
          <p className="text-slate-400 text-sm">Ingresos, egresos, impuestos y reportes fiscales</p>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
          notification.type === 'success'
            ? 'bg-green-900/30 border-green-700/50 text-green-300'
            : 'bg-red-900/30 border-red-700/50 text-red-300'
        }`}>
          {notification.type === 'success'
            ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            : <AlertCircle  className="h-4 w-4 flex-shrink-0" />}
          {notification.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit flex-wrap">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === key
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ══ TAB 1: RESUMEN MENSUAL ════════════════════════════════════════════ */}
      {activeTab === 'resumen' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[2023, 2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {/* Import Excel Didi */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFileImport(f);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importLoading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              {importLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <FileSpreadsheet className="h-4 w-4" />}
              Importar Excel Didi Fleet
            </button>

            {/* Sync gastos */}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              {syncing
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <RefreshCw className="h-4 w-4" />}
              Sincronizar gastos
            </button>

            {/* Régimen fiscal */}
            <select
              value={regime}
              onChange={e => setRegime(e.target.value as typeof regime)}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Régimen fiscal"
            >
              <option value="RESICO">RESICO</option>
              <option value="PLATAFORMAS">Plataformas (Art. 113-A)</option>
              <option value="PM">Persona Moral</option>
            </select>

            {/* Download */}
            <button
              onClick={handleDownloadReport}
              disabled={!summary}
              className="flex items-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors ml-auto"
            >
              <FileCheck className="h-4 w-4" />
              Reporte para contador
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
            </div>
          ) : summary ? (
            <>
              {/* KPI Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Ingresos totales',
                    value: summary.total_ingresos,
                    icon: TrendingUp,
                    color: 'text-green-400',
                    bg: 'bg-green-500/10 border-green-500/20',
                  },
                  {
                    label: 'Gastos deducibles',
                    value: summary.total_gastos_deducibles,
                    icon: Receipt,
                    color: 'text-orange-400',
                    bg: 'bg-orange-500/10 border-orange-500/20',
                  },
                  {
                    label: 'ISR estimado',
                    value: summary.isr_calculado,
                    icon: Calculator,
                    color: 'text-yellow-400',
                    bg: 'bg-yellow-500/10 border-yellow-500/20',
                    sub: `Tasa: ${(summary.isr_rate * 100).toFixed(1)}% RESICO`,
                  },
                  {
                    label: 'IVA estimado',
                    value: summary.iva_calculado,
                    icon: TrendingDown,
                    color: 'text-purple-400',
                    bg: 'bg-purple-500/10 border-purple-500/20',
                    sub: `Tasa: ${(summary.iva_rate * 100).toFixed(0)}%`,
                  },
                ].map(({ label, value, icon: Icon, color, bg, sub }) => (
                  <div key={label} className={`rounded-2xl border p-5 ${bg}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-slate-400 text-sm">{label}</span>
                      <Icon className={`h-5 w-5 ${color}`} />
                    </div>
                    <p className={`text-2xl font-bold ${color}`}>{fmt(value)}</p>
                    {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
                  </div>
                ))}
              </div>

              {/* Utilidad neta */}
              <div className={`rounded-2xl border p-4 flex items-center justify-between ${
                summary.utilidad_neta >= 0
                  ? 'bg-blue-500/10 border-blue-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              }`}>
                <div>
                  <p className="text-slate-400 text-sm">Utilidad neta del mes</p>
                  <p className={`text-3xl font-black mt-1 ${
                    summary.utilidad_neta >= 0 ? 'text-blue-400' : 'text-red-400'
                  }`}>
                    {fmt(summary.utilidad_neta)}
                  </p>
                </div>
                <div className="text-right text-sm text-slate-400">
                  <p>Impuestos totales:</p>
                  <p className="text-white font-semibold">
                    {fmt(summary.isr_calculado + summary.iva_calculado)}
                  </p>
                </div>
              </div>

              {/* ── Declaración SAT ─────────────────────────────────────────── */}
              {(() => {
                const ivaAcreditable = summary.total_gastos_deducibles * 0.16;
                const ivaNetoPagar   = Math.max(0, summary.iva_calculado - ivaAcreditable);
                const totalSAT       = summary.isr_calculado + ivaNetoPagar;
                const nextMonthIdx   = selectedMonth % 12; // 0-indexed siguiente mes
                const nextMonthName  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][nextMonthIdx];
                const nextYear       = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
                const fechaLimite    = `17 de ${nextMonthName} ${nextYear}`;
                const isCurrentMonth = selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear();
                const isPast         = selectedYear < now.getFullYear() || (selectedYear === now.getFullYear() && selectedMonth < now.getMonth() + 1);
                return (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-500/20">
                      <CalendarClock className="h-5 w-5 text-amber-400" />
                      <h3 className="text-white font-semibold text-sm">Declaración Mensual SAT — {MONTHS[selectedMonth-1]} {selectedYear}</h3>
                      <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${
                        isPast ? 'bg-slate-700 text-slate-300' :
                        isCurrentMonth ? 'bg-amber-500/20 text-amber-300' :
                        'bg-blue-500/20 text-blue-300'
                      }`}>
                        {isPast ? 'Período cerrado' : `Fecha límite: ${fechaLimite}`}
                      </span>
                    </div>
                    <div className="p-5">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                        {[
                          { label: 'ISR a pagar', value: summary.isr_calculado, color: 'text-yellow-400', note: `${(summary.isr_rate * 100).toFixed(1)}% ${regime}` },
                          { label: 'IVA trasladado', value: summary.iva_calculado, color: 'text-purple-400', note: `16% sobre ingresos` },
                          { label: 'IVA acreditable', value: ivaAcreditable, color: 'text-green-400', note: `16% gastos deducibles` },
                          { label: 'IVA neto a pagar', value: ivaNetoPagar, color: 'text-red-400', note: `Trasladado - Acreditable` },
                        ].map(({ label, value, color, note }) => (
                          <div key={label} className="bg-slate-800/60 rounded-xl p-3">
                            <p className="text-[11px] text-slate-500 mb-1">{label}</p>
                            <p className={`text-lg font-bold ${color}`}>{fmt(value)}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{note}</p>
                          </div>
                        ))}
                      </div>

                      {/* Total a pagar SAT */}
                      <div className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3 mb-4">
                        <div className="flex items-center gap-2">
                          <Banknote className="h-4 w-4 text-amber-400" />
                          <span className="text-sm font-semibold text-slate-200">Total a pagar al SAT este mes</span>
                        </div>
                        <span className="text-xl font-black text-amber-400">{fmt(totalSAT)}</span>
                      </div>

                      {/* Checklist declaración */}
                      <div className="grid sm:grid-cols-2 gap-2 mb-4">
                        {[
                          { label: `ISR mensual ${regime}`, done: summary.isr_calculado > 0, amount: summary.isr_calculado },
                          { label: 'IVA mensual (DIOT)', done: ivaNetoPagar > 0, amount: ivaNetoPagar },
                          { label: 'Facturas timbradas (CFDI)', done: false, amount: null },
                          { label: 'Gastos deducibles comprobados', done: summary.total_gastos_deducibles > 0, amount: summary.total_gastos_deducibles },
                        ].map(({ label, done, amount }) => (
                          <div key={label} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${done ? 'bg-green-900/20 border border-green-700/30' : 'bg-slate-800/40 border border-slate-700/30'}`}>
                            {done
                              ? <ShieldCheck className="h-4 w-4 text-green-400 flex-shrink-0" />
                              : <div className="h-4 w-4 rounded border border-slate-500 flex-shrink-0" />}
                            <span className="text-xs text-slate-300 flex-1">{label}</span>
                            {amount != null && <span className="text-xs font-semibold text-slate-400">{fmt(amount)}</span>}
                          </div>
                        ))}
                      </div>

                      {/* Botones SAT */}
                      <div className="flex flex-wrap gap-2">
                        <a
                          href="https://www.sat.gob.mx/tramites/operacion/33787/presenta-tu-declaracion-mensual-de-impuestos-personas-fisicas"
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Portal SAT Declaraciones
                        </a>
                        <a
                          href="https://portalcfdi.facturaelectronica.sat.gob.mx/"
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Portal CFDI
                        </a>
                        <button
                          onClick={handleDownloadReport}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-white transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" /> Descargar para contador
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Tabla por categoría */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-700">
                  <h3 className="text-white font-semibold">Registros por categoría</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="px-5 py-3 text-left text-slate-400 font-medium">Categoría</th>
                        <th className="px-5 py-3 text-right text-slate-400 font-medium">Registros</th>
                        <th className="px-5 py-3 text-right text-slate-400 font-medium">Total</th>
                        <th className="px-5 py-3 text-center text-slate-400 font-medium">Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(summary.categorias).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                            No hay registros para este período
                          </td>
                        </tr>
                      ) : (
                        Object.entries(summary.categorias).map(([cat, data]) => (
                          <tr key={cat} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                            <td className="px-5 py-3 text-white font-medium">
                              {CATEGORY_LABELS[cat] ?? cat}
                            </td>
                            <td className="px-5 py-3 text-right text-slate-400">{data.count}</td>
                            <td className={`px-5 py-3 text-right font-semibold ${
                              data.is_income ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {data.is_income ? '+' : '-'}{fmt(data.total)}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                data.is_income
                                  ? 'bg-green-900/40 text-green-400'
                                  : 'bg-red-900/40 text-red-400'
                              }`}>
                                {data.is_income ? 'Ingreso' : 'Gasto'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-500">
              No se pudieron cargar los datos
            </div>
          )}
        </div>
      )}

      {/* ══ TAB 2: PROYECCIÓN ANUAL ═══════════════════════════════════════════ */}
      {activeTab === 'proyeccion' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="text-slate-300 text-sm font-medium">Año:</span>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[2023, 2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleDownloadAnnual}
              disabled={annualLoading}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Download className="h-4 w-4" />
              Descargar reporte para contador (CSV)
            </button>
          </div>

          {annualLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/80">
                      <th className="px-4 py-3 text-left text-slate-400 font-medium">Mes</th>
                      <th className="px-4 py-3 text-right text-slate-400 font-medium">Ingresos</th>
                      <th className="px-4 py-3 text-right text-slate-400 font-medium">Gastos</th>
                      <th className="px-4 py-3 text-right text-slate-400 font-medium">ISR est.</th>
                      <th className="px-4 py-3 text-right text-slate-400 font-medium">IVA est.</th>
                      <th className="px-4 py-3 text-right text-slate-400 font-medium">Utilidad</th>
                      <th className="px-4 py-3 text-center text-slate-400 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MONTHS.map((mes, i) => {
                      const d       = annualData[i];
                      const isPast  = (i + 1) < now.getMonth() + 1 || selectedYear < now.getFullYear();
                      const isFuture = !d || d.total_ingresos === 0;
                      const ingresos = isFuture ? avgIngresos : d?.total_ingresos ?? 0;
                      const gastos   = isFuture
                        ? 0
                        : (d?.total_gastos_deducibles ?? 0) + (d?.total_gastos_no_deducibles ?? 0);
                      const isr      = d?.isr_calculado ?? (ingresos * 0.02);
                      const iva      = d?.iva_calculado ?? (ingresos * 0.16);
                      const utilidad = d?.utilidad_neta ?? (ingresos - isr - iva);

                      return (
                        <tr
                          key={mes}
                          className={`border-b border-slate-700/50 ${
                            i + 1 === now.getMonth() + 1 && selectedYear === now.getFullYear()
                              ? 'bg-blue-900/20'
                              : 'hover:bg-slate-800/30'
                          }`}
                        >
                          <td className="px-4 py-3 text-white font-medium">{mes}</td>
                          <td className="px-4 py-3 text-right text-green-400">{fmt(ingresos)}</td>
                          <td className="px-4 py-3 text-right text-red-400">{fmt(gastos)}</td>
                          <td className="px-4 py-3 text-right text-yellow-400">{fmt(isr)}</td>
                          <td className="px-4 py-3 text-right text-purple-400">{fmt(iva)}</td>
                          <td className={`px-4 py-3 text-right font-semibold ${utilidad >= 0 ? 'text-blue-300' : 'text-red-400'}`}>
                            {fmt(utilidad)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              isFuture && !isPast
                                ? 'bg-slate-700 text-slate-400'
                                : 'bg-green-900/40 text-green-400'
                            }`}>
                              {isFuture && !isPast ? 'Proyección' : 'Real'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-600 bg-slate-800">
                      <td className="px-4 py-3 text-white font-bold">TOTAL {selectedYear}</td>
                      <td className="px-4 py-3 text-right text-green-400 font-bold">
                        {fmt(annualData.reduce((s, d) => s + (d?.total_ingresos ?? avgIngresos), 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-red-400 font-bold">
                        {fmt(annualData.reduce((s, d) => s + (d?.total_gastos_deducibles ?? 0) + (d?.total_gastos_no_deducibles ?? 0), 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-yellow-400 font-bold">
                        {fmt(annualData.reduce((s, d) => s + (d?.isr_calculado ?? 0), 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-purple-400 font-bold">
                        {fmt(annualData.reduce((s, d) => s + (d?.iva_calculado ?? 0), 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-blue-300 font-bold">
                        {fmt(annualData.reduce((s, d) => s + (d?.utilidad_neta ?? 0), 0))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB 3: POR FLOTILLA ══════════════════════════════════════════════ */}
      {activeTab === 'flotilla' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="text-slate-300 text-sm font-medium">Año:</span>
              <select
                value={selectedYear}
                onChange={e => { setSelectedYear(Number(e.target.value)); setFlotillaData(null); }}
                className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[2023, 2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                onClick={loadFlotilla}
                disabled={flotillaLoading}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-60 text-white px-3 py-2 rounded-xl text-sm transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${flotillaLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {flotillaData && (
              <button
                onClick={handleDownloadFlotilla}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                <Download className="h-4 w-4" />
                Descargar CSV
              </button>
            )}
          </div>

          {flotillaLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
            </div>
          ) : flotillaData ? (
            <>
              {/* KPI Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border p-5 bg-blue-500/10 border-blue-500/20">
                  <p className="text-slate-400 text-sm mb-2">JP Recibe ({flotillaData.year})</p>
                  <p className="text-2xl font-bold text-blue-400">{fmt(flotillaData.totals.totalRecibeJP)}</p>
                  <p className="text-xs text-slate-500 mt-1">Efectivo + Depósito banco</p>
                </div>
                <div className="rounded-2xl border p-5 bg-green-500/10 border-green-500/20">
                  <p className="text-slate-400 text-sm mb-2">Total Didi generado</p>
                  <p className="text-2xl font-bold text-green-400">{fmt(flotillaData.totals.totalDidiIncome)}</p>
                  <p className="text-xs text-slate-500 mt-1">{flotillaData.totals.semanas} semanas registradas</p>
                </div>
                <div className="rounded-2xl border p-5 bg-slate-700/30 border-slate-600/50">
                  <p className="text-slate-400 text-sm mb-2">Inversión flotilla</p>
                  <p className="text-2xl font-bold text-white">{fmt(flotillaData.totals.totalInversion)}</p>
                  <p className="text-xs text-slate-500 mt-1">{flotillaData.data.length} vehículos registrados</p>
                </div>
                <div className="rounded-2xl border p-5 bg-purple-500/10 border-purple-500/20">
                  <p className="text-slate-400 text-sm mb-2">ROI flotilla</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {flotillaData.totals.totalInversion > 0
                      ? `${((flotillaData.totals.totalRecibeJP / flotillaData.totals.totalInversion) * 100).toFixed(1)}%`
                      : '—'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Sobre inversión registrada</p>
                </div>
              </div>

              {/* Per-vehicle table */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-2">
                  <Car className="h-5 w-5 text-blue-400" />
                  <h3 className="text-white font-semibold">P&L por vehículo — {flotillaData.year}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-800/80">
                        <th className="px-4 py-3 text-left text-slate-400 font-medium">Vehículo</th>
                        <th className="px-4 py-3 text-left text-slate-400 font-medium">Chofer</th>
                        <th className="px-4 py-3 text-right text-slate-400 font-medium">Sem.</th>
                        <th className="px-4 py-3 text-right text-slate-400 font-medium">Didi Income</th>
                        <th className="px-4 py-3 text-right text-slate-400 font-medium">Dep. Banco</th>
                        <th className="px-4 py-3 text-right text-slate-400 font-medium">Efectivo</th>
                        <th className="px-4 py-3 text-right text-slate-400 font-medium">JP Recibe</th>
                        <th className="px-4 py-3 text-right text-slate-400 font-medium">ROI %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flotillaData.data.map((v) => (
                        <tr key={v.vehicleId} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-white">ECO {v.eco}</div>
                            <div className="text-xs text-slate-400">{v.brand} {v.model} {v.year} · {v.plates}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{v.driver}</td>
                          <td className="px-4 py-3 text-right text-slate-400">{v.semanas}</td>
                          <td className="px-4 py-3 text-right text-green-400">{fmt(v.totalDidiIncome)}</td>
                          <td className="px-4 py-3 text-right text-blue-400">{fmt(v.totalDepositoBanco)}</td>
                          <td className="px-4 py-3 text-right text-yellow-400">{fmt(v.totalEfectivo)}</td>
                          <td className="px-4 py-3 text-right font-bold text-white">{fmt(v.totalRecibeJP)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-semibold ${
                              v.purchasePrice <= 0 ? 'text-slate-500' :
                              v.roi >= 20 ? 'text-green-400' :
                              v.roi >= 10 ? 'text-yellow-400' :
                              v.roi >   0 ? 'text-orange-400' : 'text-red-400'
                            }`}>
                              {v.purchasePrice > 0 ? `${v.roi}%` : '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-600 bg-slate-800">
                        <td colSpan={3} className="px-4 py-3 text-white font-bold">TOTAL</td>
                        <td className="px-4 py-3 text-right text-green-400 font-bold">{fmt(flotillaData.totals.totalDidiIncome)}</td>
                        <td className="px-4 py-3 text-right text-blue-400 font-bold">{fmt(flotillaData.totals.totalDepositoBanco)}</td>
                        <td className="px-4 py-3 text-right text-yellow-400 font-bold">{fmt(flotillaData.totals.totalEfectivo)}</td>
                        <td className="px-4 py-3 text-right text-white font-bold">{fmt(flotillaData.totals.totalRecibeJP)}</td>
                        <td className="px-4 py-3 text-right text-purple-400 font-bold">
                          {flotillaData.totals.totalInversion > 0
                            ? `${((flotillaData.totals.totalRecibeJP / flotillaData.totals.totalInversion) * 100).toFixed(1)}%`
                            : '—'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl px-4 py-3 text-xs text-slate-500">
                <strong className="text-slate-400">Nota:</strong> &quot;JP Recibe&quot; = Efectivo entregado + Depósito banco (ya en cuenta JP).
                Los datos se calculan desde las cuentas semanales del año {flotillaData.year}.
                Para un ROI preciso, registra el precio de compra de cada vehículo en el módulo de Vehículos.
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-500">
              No se pudieron cargar los datos. Verifica que tienes cuentas semanales registradas.
            </div>
          )}
        </div>
      )}

      {/* ══ TAB 4: FACTURAS Y DEDUCCIONES ════════════════════════════════════ */}
      {activeTab === 'deducciones' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[2023, 2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Total deducciones */}
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total deducciones del mes</p>
              <p className="text-3xl font-black text-orange-400 mt-1">{fmt(totalDeducciones)}</p>
            </div>
            <Receipt className="h-10 w-10 text-orange-400/40" />
          </div>

          {/* Tabla deducciones */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-white font-semibold">Gastos deducibles registrados</h3>
            </div>
            {deducibleRecords.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-500">
                No hay deducciones registradas para este período
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="px-5 py-3 text-left text-slate-400 font-medium">Concepto</th>
                      <th className="px-5 py-3 text-left text-slate-400 font-medium">Categoría</th>
                      <th className="px-5 py-3 text-left text-slate-400 font-medium">No. Factura</th>
                      <th className="px-5 py-3 text-right text-slate-400 font-medium">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deducibleRecords.map((r) => (
                      <tr key={r.id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                        <td className="px-5 py-3 text-white">{r.description || '—'}</td>
                        <td className="px-5 py-3 text-slate-400">{CATEGORY_LABELS[r.category] ?? r.category}</td>
                        <td className="px-5 py-3 text-slate-400">{r.invoice_number || '—'}</td>
                        <td className="px-5 py-3 text-right text-orange-400 font-semibold">
                          {fmt(Number(r.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Escáner IA de facturas */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
              <ScanLine className="h-4 w-4 text-blue-400" />
              Escanear factura con IA
            </h3>
            <p className="text-slate-400 text-xs mb-4">Toma foto o sube imagen — Claude extrae todos los datos automáticamente</p>
            <ScanFactura onSaved={() => { loadSummary(); notify('success', 'Gasto escaneado y guardado'); }} />
          </div>

          {/* Formulario agregar factura */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-blue-400" />
              Agregar factura / deducción manualmente
            </h3>
            <form onSubmit={handleAddInvoice} className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Concepto <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={invoiceForm.description}
                  onChange={e => setInvoiceForm(f => ({ ...f, description: e.target.value }))}
                  required
                  placeholder="Ej: Gasolina vehículo ABC-123"
                  className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Monto (MXN) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={invoiceForm.amount}
                  onChange={e => setInvoiceForm(f => ({ ...f, amount: e.target.value }))}
                  required
                  placeholder="1500.00"
                  className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Número de factura
                </label>
                <input
                  type="text"
                  value={invoiceForm.invoice_number}
                  onChange={e => setInvoiceForm(f => ({ ...f, invoice_number: e.target.value }))}
                  placeholder="CFDI-2025-0001"
                  className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Categoría</label>
                <select
                  value={invoiceForm.category}
                  onChange={e => setInvoiceForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {DEDUCTIBLE_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={addingInvoice}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
                >
                  {addingInvoice
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Plus className="h-4 w-4" />}
                  Agregar deducción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ TAB 5: FACTURA GLOBAL CFDI ════════════════════════════════════════ */}
      {activeTab === 'cfdi' && (
        <div className="space-y-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center space-y-4">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-700/50 flex items-center justify-center">
                <Lock className="h-8 w-8 text-slate-400" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Factura Global CFDI</h2>
              <p className="text-slate-400 max-w-lg mx-auto">
                La factura global mensual agrupa todos tus ingresos en un solo CFDI para presentarlo ante el SAT. Requiere tu RFC de persona física o moral y tu Certificado de Sello Digital (CSD).
              </p>
            </div>
            <div className="bg-slate-700/30 border border-slate-600/50 rounded-xl p-4 max-w-sm mx-auto text-left space-y-2">
              <p className="text-slate-300 text-sm font-semibold">¿Qué necesitas?</p>
              <ul className="space-y-1 text-sm text-slate-400">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-slate-500" /> RFC (persona física o moral)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-slate-500" /> CSD (archivo .cer + .key + contraseña)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-slate-500" /> Régimen fiscal configurado</li>
              </ul>
            </div>
            <div>
              <div className="relative inline-block group">
                <button
                  disabled
                  className="flex items-center gap-2 bg-slate-700 text-slate-500 cursor-not-allowed font-semibold px-6 py-3 rounded-xl text-sm"
                >
                  <Upload className="h-4 w-4" />
                  Generar Factura Global CFDI
                </button>
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  Configura tu RFC en Ajustes para habilitar
                </div>
              </div>
              <p className="text-slate-500 text-xs mt-3">
                Próximamente — Integración con PAC certificado SAT
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
