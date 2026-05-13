'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface WeeklyReport {
  id: number;
  tenant_id: number;
  week_start: string;
  total_income: number;
  total_expenses: number;
  pending_payments: number;
  maintenance_alerts: number;
  insurance_alerts: number;
  created_at: string;
  // Campos extendidos de cuentas semanales
  viajes_pagados?: number;
  efectivo_a_entregar?: number;
  saldo_pendiente?: number;
  adicional?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMXN(value: number) {
  return `$${Number(value).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatWeek(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ReporteSemanalPage() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/reportes/semanal');
      if (!res.ok) throw new Error('Error al cargar reportes');
      const data = await res.json() as WeeklyReport[];
      setReports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const handleGenerateReport = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/cron/weekly-report', { method: 'POST' });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? 'Error generando reporte');
      await fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generando reporte');
    } finally {
      setGenerating(false);
    }
  };

  // Últimas 8 semanas para la gráfica
  const chartData = [...reports]
    .slice(0, 8)
    .reverse()
    .map((r) => ({
      semana: formatWeek(r.week_start),
      Ingresos: Number(r.total_income),
      Gastos: Number(r.total_expenses),
      Utilidad: Number(r.total_income) - Number(r.total_expenses),
    }));

  const latest = reports[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reporte Semanal</h1>
            <p className="text-sm text-slate-500">Historial de reportes automáticos de tu flotilla</p>
          </div>
        </div>
        <button
          onClick={() => void handleGenerateReport()}
          disabled={generating}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {generating ? 'Generando...' : 'Generar reporte ahora'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* KPIs del último reporte */}
      {latest && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Ingresos</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatMXN(latest.total_income)}</p>
              <p className="text-xs text-slate-400 mt-1">Semana {formatWeek(latest.week_start)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Gastos</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatMXN(latest.total_expenses)}</p>
              <p className="text-xs text-slate-400 mt-1">Semana {formatWeek(latest.week_start)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Utilidad</span>
              </div>
              <p className={`text-2xl font-bold ${(latest.total_income - latest.total_expenses) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatMXN(latest.total_income - latest.total_expenses)}
              </p>
              <p className="text-xs text-slate-400 mt-1">Neta de la semana</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Alertas</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {latest.maintenance_alerts + latest.insurance_alerts}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {latest.maintenance_alerts} mant. · {latest.insurance_alerts} seguros
              </p>
            </div>
          </div>

          {/* KPIs extendidos — cuentas semanales */}
          {(latest.viajes_pagados !== undefined || latest.efectivo_a_entregar !== undefined || latest.saldo_pendiente !== undefined || latest.adicional !== undefined) && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">Viajes Pagados</span>
                <p className="text-2xl font-bold text-slate-900">{latest.viajes_pagados ?? 0}</p>
                <p className="text-xs text-slate-400 mt-1">viajes en la semana</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">Efectivo a Entregar</span>
                <p className="text-2xl font-bold text-slate-900">{formatMXN(latest.efectivo_a_entregar ?? 0)}</p>
                <p className="text-xs text-slate-400 mt-1">pendiente de cobro</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">Saldo Pendiente</span>
                <p className={`text-2xl font-bold ${(latest.saldo_pendiente ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {formatMXN(latest.saldo_pendiente ?? 0)}
                </p>
                <p className="text-xs text-slate-400 mt-1">por liquidar</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">Adicional</span>
                <p className="text-2xl font-bold text-emerald-600">{formatMXN(latest.adicional ?? 0)}</p>
                <p className="text-xs text-slate-400 mt-1">ingresos extra</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Gráfica de barras */}
      {chartData.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Últimas 8 semanas</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="semana"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) =>
                  typeof value === 'number' ? formatMXN(value as number) : String(value)
                }
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Utilidad" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla historial */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Historial de reportes</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <FileText className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">Sin reportes aún</p>
            <p className="text-xs mt-1">Genera el primer reporte con el botón de arriba.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Semana</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ingresos</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Gastos</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Utilidad</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Viajes</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Efectivo</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Saldo Pend.</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Adicional</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pendientes</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Alertas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reports.map((report) => {
                  const utilidad = Number(report.total_income) - Number(report.total_expenses);
                  const alertas = report.maintenance_alerts + report.insurance_alerts;
                  return (
                    <tr key={report.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {formatWeek(report.week_start)}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-emerald-600">
                        {formatMXN(report.total_income)}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-red-500">
                        {formatMXN(report.total_expenses)}
                      </td>
                      <td className={`px-6 py-4 text-right font-bold ${utilidad >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {formatMXN(utilidad)}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-700 font-medium">
                        {report.viajes_pagados != null ? report.viajes_pagados : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-700 font-medium">
                        {report.efectivo_a_entregar != null ? formatMXN(report.efectivo_a_entregar) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className={`px-6 py-4 text-right font-medium ${(report.saldo_pendiente ?? 0) > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {report.saldo_pendiente != null ? formatMXN(report.saldo_pendiente) : '—'}
                      </td>
                      <td className="px-6 py-4 text-right text-emerald-600 font-medium">
                        {report.adicional != null && report.adicional > 0 ? formatMXN(report.adicional) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {report.pending_payments > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                            {report.pending_payments}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {alertas > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 border border-red-200">
                            <AlertTriangle className="h-3 w-3" />
                            {alertas}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
