'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Navigation, DollarSign, TrendingUp, TrendingDown, Activity,
  AlertTriangle, Zap, Flame, Clock, Gauge, RefreshCw,
  Star, Shield, BarChart3, ChevronUp, ChevronDown,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface PeriodStats {
  km: number; cost: number; prodMin: number; idleMin: number;
  maxSpeed: number; speedViol: number; score: number; efficiencyPct: number;
}

interface VehicleStat {
  id: string; eco: string; plates: string;
  brand: string | null; model: string | null; driver: string | null;
  current: PeriodStats; previous: PeriodStats;
  kmDelta: number | null; costDelta: number | null;
  efficiencyDelta: number | null; scoreDelta: number | null;
}

interface Totals {
  km: number; cost: number; idleMin: number; prodMin: number;
  speedViol: number; avgEff: number; avgScore: number;
}

interface AlertRow {
  tipo: string; entidad_ref: string; severidad: string;
  mensaje: string; created_at: string; updated_at: string | null;
}

interface ReportData {
  period: string;
  vehicleStats: VehicleStat[];
  totals: Totals;
  prevTotals: { km: number; cost: number };
  ranking: VehicleStat[];
  alertHistory: AlertRow[];
  cost_per_km: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtMin(m: number): string {
  if (m < 60) return `${m}m`;
  return `${Math.floor(m/60)}h ${m%60 > 0 ? `${m%60}m` : ''}`;
}

function delta(val: number | null, unit = '%') {
  if (val === null) return null;
  const color = val > 0 ? 'text-green-600' : val < 0 ? 'text-red-600' : 'text-slate-400';
  const Icon = val > 0 ? ChevronUp : val < 0 ? ChevronDown : null;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${color}`}>
      {Icon && <Icon className="w-3 h-3"/>}{Math.abs(val)}{unit}
    </span>
  );
}

function scoreStyle(n: number) {
  return n >= 85 ? 'text-green-700 bg-green-50 border-green-200'
    : n >= 70 ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
    : 'text-red-700 bg-red-50 border-red-200';
}

function alertIcon(tipo: string) {
  if (tipo.includes('ZMG'))   return <AlertTriangle className="w-4 h-4 text-orange-500"/>;
  if (tipo.includes('SPEED')) return <Zap className="w-4 h-4 text-red-500"/>;
  if (tipo.includes('IDLE'))  return <Flame className="w-4 h-4 text-amber-500"/>;
  return <Shield className="w-4 h-4 text-slate-400"/>;
}

function alertSevStyle(sev: string) {
  return sev === 'alta' ? 'bg-red-50 text-red-700 border-red-200'
    : sev === 'media' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-slate-50 text-slate-600 border-slate-200';
}

const PERIOD_LABELS: Record<string, string> = {
  today: 'Hoy', week: 'Esta semana', month: 'Este mes',
};

type SortKey = 'km' | 'cost' | 'score' | 'efficiencyPct' | 'idleMin' | 'speedViol';

// ─────────────────────────────────────────────────────────────────────────────
export default function ReportesGPSPage() {
  const [data,      setData]      = useState<ReportData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [period,    setPeriod]    = useState<'today'|'week'|'month'>('week');
  const [sortKey,   setSortKey]   = useState<SortKey>('km');
  const [sortAsc,   setSortAsc]   = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  useEffect(() => { document.title = 'Reportes GPS | Gestiona tu Flotilla'; }, []);

  const fetchData = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/gps/reports?period=${p}`);
      if (res.ok) { setData(await res.json()); setLastFetch(new Date()); }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(period); }, [period, fetchData]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortAsc(a => !a);
    else { setSortKey(k); setSortAsc(false); }
  }

  const sortedVehicles = data ? [...data.vehicleStats].sort((a, b) => {
    const av = a.current[sortKey] ?? 0;
    const bv = b.current[sortKey] ?? 0;
    return sortAsc ? av - bv : bv - av;
  }) : [];

  const SortHeader = ({ k, label }: { k: SortKey; label: string }) => (
    <th onClick={() => toggleSort(k)}
      className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-800 select-none text-right">
      <span className="flex items-center justify-end gap-1">
        {label}
        {sortKey === k && (sortAsc ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}
      </span>
    </th>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reportes GPS</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {lastFetch ? `Datos al ${lastFetch.toLocaleTimeString('es-MX')}` : 'Análisis operativo de la flota'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {(['today','week','month'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${period===p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <button onClick={() => fetchData(period)} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}/>
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-3"/>
            <p className="text-slate-500 text-sm">Calculando reporte...</p>
          </div>
        </div>
      ) : !data ? null : (
        <>
          {/* ── KPI Cards con comparativa ───────────────────────────────────── */}
          <div className="grid grid-cols-4 gap-4">
            {/* KM totales */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">KM totales</p>
                <Navigation className="w-4 h-4 text-blue-400"/>
              </div>
              <p className="text-3xl font-bold text-slate-900">{data.totals.km.toFixed(0)}</p>
              <p className="text-xs text-slate-400 mt-0.5">kilómetros · {PERIOD_LABELS[period].toLowerCase()}</p>
              {data.prevTotals.km > 0 && (
                <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                  vs. período anterior: {delta(Math.round(((data.totals.km - data.prevTotals.km) / data.prevTotals.km) * 100))}
                </div>
              )}
            </div>

            {/* Costo operativo */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Costo operativo</p>
                <DollarSign className="w-4 h-4 text-emerald-400"/>
              </div>
              <p className="text-3xl font-bold text-slate-900">${data.totals.cost.toLocaleString('es-MX')}</p>
              <p className="text-xs text-slate-400 mt-0.5">MXN · @ ${data.cost_per_km}/km</p>
              {data.prevTotals.cost > 0 && (
                <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                  vs. período anterior: {delta(Math.round(((data.totals.cost - data.prevTotals.cost) / data.prevTotals.cost) * 100))}
                </div>
              )}
            </div>

            {/* Eficiencia */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Eficiencia flota</p>
                <Activity className="w-4 h-4 text-indigo-400"/>
              </div>
              <p className="text-3xl font-bold text-slate-900">{data.totals.avgEff}%</p>
              <p className="text-xs text-slate-400 mt-0.5">tiempo productivo promedio</p>
              <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5">
                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${data.totals.avgEff}%` }}/>
              </div>
            </div>

            {/* Score conducción */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Score conducción</p>
                <Star className="w-4 h-4 text-yellow-400"/>
              </div>
              <p className="text-3xl font-bold text-slate-900">{data.totals.avgScore}</p>
              <p className="text-xs text-slate-400 mt-0.5">promedio flota · máx 100</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <span>{data.totals.speedViol} excesos vel.</span>·
                <span className={data.totals.idleMin > 60 ? 'text-amber-600 font-semibold' : ''}>{fmtMin(data.totals.idleMin)} ralentí</span>
              </div>
            </div>
          </div>

          {/* ── Tabla por vehículo ──────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-400"/>
                Rendimiento por vehículo
              </h2>
              <p className="text-xs text-slate-400">Clic en columnas para ordenar</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Vehículo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Chofer</th>
                    <SortHeader k="km" label="KM"/>
                    <SortHeader k="cost" label="Costo"/>
                    <SortHeader k="efficiencyPct" label="Efic. %"/>
                    <SortHeader k="score" label="Score"/>
                    <SortHeader k="idleMin" label="Ralentí"/>
                    <SortHeader k="speedViol" label="Excesos vel."/>
                  </tr>
                </thead>
                <tbody>
                  {sortedVehicles.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-sm">Sin datos GPS para el período seleccionado</td></tr>
                  ) : sortedVehicles.map(v => (
                    <tr key={v.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{v.eco}</p>
                        <p className="text-xs text-slate-400">{v.plates}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{v.driver ?? <span className="text-slate-400">—</span>}</td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-semibold text-slate-900">{v.current.km} km</p>
                        {v.kmDelta !== null && <div className="text-right">{delta(v.kmDelta)}</div>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-semibold text-slate-900">${v.current.cost.toLocaleString('es-MX')}</p>
                        {v.costDelta !== null && <div className="text-right">{delta(v.costDelta, '% costo')}</div>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-14 bg-slate-200 rounded-full h-1.5">
                            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${v.current.efficiencyPct}%` }}/>
                          </div>
                          <span className="text-xs font-medium text-slate-700 w-8 text-right">{v.current.efficiencyPct}%</span>
                        </div>
                        {v.efficiencyDelta !== null && <div className="text-right mt-0.5">{delta(v.efficiencyDelta, 'pts')}</div>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${scoreStyle(v.current.score)}`}>
                          {v.current.score}
                        </span>
                        {v.scoreDelta !== null && <div className="text-right mt-1">{delta(v.scoreDelta, 'pts')}</div>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs font-medium ${v.current.idleMin > 60 ? 'text-amber-600 font-semibold' : 'text-slate-600'}`}>
                          {fmtMin(v.current.idleMin)}
                        </span>
                        {v.current.idleMin > 60 && (
                          <p className="text-[10px] text-amber-500">
                            ${Math.round(v.current.idleMin / 60 * 80)} aprox. combustible
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs font-semibold ${v.current.speedViol > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                          {v.current.speedViol > 0 ? `${v.current.speedViol}x` : '—'}
                        </span>
                        {v.current.maxSpeed > 80 && (
                          <p className="text-[10px] text-red-400">máx {v.current.maxSpeed} km/h</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Ranking + Alertas (2 cols) ──────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">

            {/* Ranking conducción */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400"/>
                  Ranking de conducción
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Score combinado: velocidad · ralentí · frenadas</p>
              </div>
              {data.ranking.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">Sin datos del período</div>
              ) : (
                <div>
                  {data.ranking.map((v, i) => (
                    <div key={v.id} className={`flex items-center gap-4 px-5 py-3.5 border-b border-slate-100 last:border-0 ${i === 0 ? 'bg-green-50' : i === data.ranking.length - 1 ? 'bg-red-50' : ''}`}>
                      <span className={`text-lg font-black w-7 text-center ${i === 0 ? 'text-green-600' : i === data.ranking.length - 1 ? 'text-red-500' : 'text-slate-400'}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900 text-sm">{v.eco}</p>
                          {i === 0 && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">Mejor</span>}
                          {i === data.ranking.length - 1 && data.ranking.length > 1 && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">Revisar</span>}
                        </div>
                        <p className="text-xs text-slate-400 truncate">{v.driver ?? 'Sin chofer'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${v.current.score >= 85 ? 'bg-green-500' : v.current.score >= 70 ? 'bg-yellow-400' : 'bg-red-500'}`} style={{ width: `${v.current.score}%` }}/>
                          </div>
                          <span className={`text-xs font-bold w-8 text-right ${v.current.score >= 85 ? 'text-green-600' : v.current.score >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {v.current.score}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-slate-700">{v.current.km} km</p>
                        <p className="text-xs text-slate-400">{v.current.efficiencyPct}% efic.</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Alertas GPS */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400"/>
                  Alertas GPS del período
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{data.alertHistory.length} eventos registrados</p>
              </div>
              {data.alertHistory.length === 0 ? (
                <div className="py-8 text-center">
                  <Shield className="w-8 h-8 text-slate-200 mx-auto mb-2"/>
                  <p className="text-slate-400 text-sm">Sin alertas en el período</p>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-72">
                  {data.alertHistory.map((a, i) => (
                    <div key={i} className="flex items-start gap-3 px-5 py-3 border-b border-slate-100 last:border-0">
                      {alertIcon(a.tipo)}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 leading-tight">{a.mensaje}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(a.created_at).toLocaleDateString('es-MX', { weekday:'short', day:'numeric', month:'short' })} ·{' '}
                          {new Date(a.created_at).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' })}
                        </p>
                      </div>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${alertSevStyle(a.severidad)}`}>
                        {a.severidad}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Insight box ────────────────────────────────────────────────── */}
          {data.vehicleStats.length > 0 && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 text-white">
              <h3 className="font-bold text-sm mb-3 text-slate-300 uppercase tracking-wide">📊 Insights del período</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                {/* Mejor eficiencia */}
                {data.ranking.length > 0 && (
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Chofer más eficiente</p>
                    <p className="font-bold text-white">{data.ranking[0].driver ?? data.ranking[0].eco}</p>
                    <p className="text-green-400 text-xs">Score {data.ranking[0].current.score} · {data.ranking[0].current.efficiencyPct}%</p>
                  </div>
                )}
                {/* Mayor ralentí */}
                {(() => {
                  const worstIdle = [...data.vehicleStats].sort((a,b) => b.current.idleMin - a.current.idleMin)[0];
                  if (!worstIdle || worstIdle.current.idleMin < 10) return null;
                  return (
                    <div>
                      <p className="text-slate-400 text-xs mb-1">Mayor tiempo en ralentí</p>
                      <p className="font-bold text-white">{worstIdle.eco}</p>
                      <p className="text-amber-400 text-xs">{fmtMin(worstIdle.current.idleMin)} · ~${Math.round(worstIdle.current.idleMin / 60 * 80)} combustible</p>
                    </div>
                  );
                })()}
                {/* Costo por km */}
                <div>
                  <p className="text-slate-400 text-xs mb-1">Costo por km flota</p>
                  <p className="font-bold text-white">${data.cost_per_km} MXN/km</p>
                  <p className="text-slate-400 text-xs">Configurable en Ajustes GPS</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
