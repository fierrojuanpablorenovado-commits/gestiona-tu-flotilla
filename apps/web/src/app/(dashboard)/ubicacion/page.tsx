'use client';

import dynamic from 'next/dynamic';
import type { RoutePoint } from '@/components/maps/MapaLeaflet';
import {
  MapPin, Navigation, Clock, Gauge, AlertTriangle, RefreshCw,
  Map, Info, ChevronRight, ChevronLeft, Play, Pause, SkipBack, Zap, Route,
  Share2, List, Bell, TrendingUp, DollarSign, Activity,
  ChevronDown, ChevronUp, Check, Flame,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';

const MapaLeaflet = dynamic(() => import('@/components/maps/MapaLeaflet'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-3" />
        <p className="text-sm text-slate-500">Cargando mapa...</p>
      </div>
    </div>
  ),
});

// ── Types ─────────────────────────────────────────────────────────────────────
interface VehicleGPS {
  id: string; eco: string; plates: string;
  brand: string | null; model: string | null; year: number | null;
  driver: string | null;
  lat: number; lng: number; speed: number; course: number;
  status: 'movimiento' | 'detenido' | 'sinsenal' | 'fueralinea';
  accStatus: boolean; gpsTime: string; isDemo: boolean;
}

interface StopEvent {
  lat: number; lng: number;
  started_at: string; ended_at: string;
  duration_minutes: number;
}

interface VehicleStats {
  km_today: number;
  productive_minutes: number;
  idle_minutes: number;
  stops: StopEvent[];
  stops_count: number;
  max_speed: number;
  speed_violations: number;
  driving_score: number;
  cost_today: number;
  last_signal: string | null;
  efficiency_pct: number;
}

interface AlertEntry {
  id: string;
  type: 'zmg' | 'speed' | 'idle';
  vehicleEco: string;
  message: string;
  time: Date;
  severity: 'warning' | 'danger' | 'caution';
}

type FilterType = 'all' | 'movimiento' | 'detenido' | 'sinsenal' | 'fueralinea';
type TabType = 'mapa' | 'lista' | 'alertas';

// ── ZMG helpers ───────────────────────────────────────────────────────────────
const ZMG_POLYGON: [number, number][] = [
  [20.87,-103.60],[20.87,-103.25],[20.75,-103.08],[20.50,-103.10],
  [20.35,-103.22],[20.33,-103.48],[20.48,-103.68],[20.72,-103.68],[20.87,-103.60],
];
function pointInPolygon(lat: number, lng: number, poly: [number,number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length-1; i < poly.length; j = i++) {
    const [yi,xi]=poly[i],[yj,xj]=poly[j];
    if (((yi>lat)!==(yj>lat))&&(lng<(xj-xi)*(lat-yi)/(yj-yi)+xi)) inside=!inside;
  }
  return inside;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtMin(min: number): string {
  if (min < 1) return '< 1m';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60), m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function lastSignalLabel(gpsTime: string | null | undefined): string {
  if (!gpsTime) return 'Sin señal';
  const diff = Math.floor((Date.now() - new Date(gpsTime).getTime()) / 60000);
  if (diff < 2)  return 'Hace < 2 min';
  if (diff < 60) return `Hace ${diff} min`;
  const h = Math.floor(diff / 60), m = diff % 60;
  return `Hace ${h}h${m > 0 ? ` ${m}m` : ''}`;
}

function getStatusColor(s: string) {
  return s === 'movimiento' ? 'bg-green-500' : s === 'detenido' ? 'bg-red-500' : s === 'fueralinea' ? 'bg-gray-600' : 'bg-gray-400';
}
function getStatusLabel(s: string) {
  return s === 'movimiento' ? 'En movimiento' : s === 'detenido' ? 'Detenido' : s === 'fueralinea' ? 'Fuera de línea' : 'Sin señal';
}
function getStatusText(s: string) {
  return s === 'movimiento' ? 'text-green-600' : s === 'detenido' ? 'text-red-600' : s === 'fueralinea' ? 'text-gray-700' : 'text-gray-500';
}
function scoreStyle(n: number) {
  return n >= 85 ? 'text-green-700 bg-green-50' : n >= 70 ? 'text-yellow-700 bg-yellow-50' : 'text-red-700 bg-red-50';
}

// ─────────────────────────────────────────────────────────────────────────────
export default function UbicacionPage() {
  const [vehicles,      setVehicles]      = useState<VehicleGPS[]>([]);
  const [dayStats,      setDayStats]      = useState<Record<string, VehicleStats>>({});
  const [costPerKm,     setCostPerKm]     = useState(3.5);
  const [loading,       setLoading]       = useState(true);
  const [statsLoading,  setStatsLoading]  = useState(true);
  const [lastUpdate,    setLastUpdate]    = useState<Date | null>(null);
  const [isDemo,        setIsDemo]        = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [filter,        setFilter]        = useState<FilterType>('all');
  const [activeTab,     setActiveTab]     = useState<TabType>('mapa');
  const [resetViewKey,  setResetViewKey]  = useState(0);
  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const [expandedV,     setExpandedV]     = useState<string | null>(null);
  const [alertHistory,  setAlertHistory]  = useState<AlertEntry[]>([]);

  // Share link
  const [shareUrls,   setShareUrls]   = useState<Record<string, string>>({});
  const [shareLoading,setShareLoading]= useState<string | null>(null);
  const [copied,      setCopied]      = useState<string | null>(null);

  // Route + replay
  const [routeVehicleId, setRouteVehicleId] = useState<string | null>(null);
  const [routePoints,    setRoutePoints]    = useState<RoutePoint[]>([]);
  const [routeLoading,   setRouteLoading]   = useState(false);
  const [isReplaying,    setIsReplaying]    = useState(false);
  const [replayIndex,    setReplayIndex]    = useState(-1);
  const replayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevOutsideRef = useRef<Set<string>>(new Set());

  useEffect(() => { document.title = 'Ubicación GPS | Gestiona tu Flotilla'; }, []);

  // ── Fetch GPS ─────────────────────────────────────────────────────────────
  const fetchGPS = useCallback(async () => {
    try {
      const res = await fetch('/api/gps/tracksolid');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setVehicles(data.vehicles ?? []);
      setIsDemo(data.isDemo ?? false);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar GPS');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDayStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await fetch('/api/gps/day-stats');
      if (res.ok) {
        const data = await res.json();
        setDayStats(data.stats ?? {});
        setCostPerKm(data.cost_per_km ?? 3.5);
      }
    } catch { /* non-blocking */ } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchGPS(); fetchDayStats(); }, [fetchGPS, fetchDayStats]);
  useEffect(() => {
    const t = setInterval(() => { fetchGPS(); fetchDayStats(); }, 30_000);
    return () => clearInterval(t);
  }, [fetchGPS, fetchDayStats]);

  // ── ZMG + speed alerts ────────────────────────────────────────────────────
  useEffect(() => {
    const outside = new Set(vehicles.filter(v => v.lat && v.lng && !pointInPolygon(v.lat, v.lng, ZMG_POLYGON)).map(v => v.id));
    outside.forEach(id => {
      if (!prevOutsideRef.current.has(id)) {
        const v = vehicles.find(x => x.id === id);
        if (v) {
          fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'zmg_alert', title: `⚠️ ${v.eco} salió de la ZMG`, message: `${v.eco} (${v.plates}) salió de la Zona Metropolitana de Guadalajara.` }) }).catch(() => {});
          setAlertHistory(h => [{ id: `zmg-${id}-${Date.now()}`, type: 'zmg', vehicleEco: v.eco, message: `${v.eco} (${v.plates}) salió de la ZMG`, time: new Date(), severity: 'warning' }, ...h.slice(0,49)]);
        }
      }
    });
    vehicles.filter(v => v.speed > 80).forEach(v => {
      setAlertHistory(h => {
        const last = h.find(a => a.type === 'speed' && a.vehicleEco === v.eco);
        if (last && Date.now() - last.time.getTime() < 60000) return h;
        return [{ id: `spd-${v.id}-${Date.now()}`, type: 'speed', vehicleEco: v.eco, message: `${v.eco} a ${v.speed} km/h — límite 80`, time: new Date(), severity: 'danger' }, ...h.slice(0,49)];
      });
    });
    prevOutsideRef.current = outside;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles]);

  // ── Route ─────────────────────────────────────────────────────────────────
  async function fetchRoute(vehicleId: string) {
    if (routeVehicleId === vehicleId) { setRouteVehicleId(null); setRoutePoints([]); resetReplay(); return; }
    setRouteLoading(true); setRouteVehicleId(vehicleId); setIsReplaying(false); setReplayIndex(-1);
    try { const r = await fetch(`/api/gps/history?vehicleId=${vehicleId}&hours=12`); setRoutePoints((await r.json()).points ?? []); }
    catch { setRoutePoints([]); } finally { setRouteLoading(false); }
  }

  // ── Replay ────────────────────────────────────────────────────────────────
  function startReplay() {
    if (!routePoints.length) return;
    setReplayIndex(0); setIsReplaying(true);
    replayTimerRef.current = setInterval(() => {
      setReplayIndex(prev => {
        if (prev >= routePoints.length - 1) { clearInterval(replayTimerRef.current!); setIsReplaying(false); return prev; }
        return prev + 1;
      });
    }, 300);
  }
  function pauseReplay()  { clearInterval(replayTimerRef.current!); setIsReplaying(false); }
  function resetReplay()  { clearInterval(replayTimerRef.current!); setIsReplaying(false); setReplayIndex(-1); }
  useEffect(() => () => { clearInterval(replayTimerRef.current!); }, []);

  // ── Share link ────────────────────────────────────────────────────────────
  async function generateShare(vehicleId: string) {
    setShareLoading(vehicleId);
    try {
      const r = await fetch('/api/gps/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vehicleId, hours: 4 }) });
      const d = await r.json();
      if (d.url) setShareUrls(s => ({ ...s, [vehicleId]: d.url }));
    } catch { /* ignore */ } finally { setShareLoading(null); }
  }
  async function copyShareUrl(vehicleId: string) {
    const url = shareUrls[vehicleId]; if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(vehicleId); setTimeout(() => setCopied(null), 2000);
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  const afueraZMG    = vehicles.filter(v => v.lat && v.lng && !pointInPolygon(v.lat, v.lng, ZMG_POLYGON));
  const rapidos      = vehicles.filter(v => v.speed > 80);
  const ralenti      = vehicles.filter(v => v.status === 'detenido' && v.accStatus);
  const filteredVs   = filter === 'all' ? vehicles : vehicles.filter(v => v.status === filter);

  const totalKm      = Object.values(dayStats).reduce((s, v) => s + v.km_today, 0);
  const totalCost    = Object.values(dayStats).reduce((s, v) => s + v.cost_today, 0);
  const withData     = Object.values(dayStats).filter(v => v.km_today > 0);
  const avgEff       = withData.length ? Math.round(withData.reduce((s, v) => s + v.efficiency_pct, 0) / withData.length) : 0;
  const activeCount  = vehicles.filter(v => v.status === 'movimiento').length;
  const totalAlerts  = afueraZMG.length + rapidos.length + ralenti.length;

  const statsArr = [
    { label: 'Movimiento',    count: vehicles.filter(v => v.status==='movimiento').length,  dot:'bg-green-500', text:'text-green-700', bg:'bg-green-50',  filter:'movimiento' as FilterType },
    { label: 'Detenidos',     count: vehicles.filter(v => v.status==='detenido').length,    dot:'bg-red-500',   text:'text-red-700',   bg:'bg-red-50',    filter:'detenido'   as FilterType },
    { label: 'Sin señal',     count: vehicles.filter(v => v.status==='sinsenal').length,    dot:'bg-gray-400',  text:'text-gray-600',  bg:'bg-gray-50',   filter:'sinsenal'   as FilterType },
    { label: 'Fuera de línea',count: vehicles.filter(v => v.status==='fueralinea').length,  dot:'bg-gray-600',  text:'text-gray-700',  bg:'bg-slate-50',  filter:'fueralinea' as FilterType },
    { label: 'Total flota',   count: vehicles.length,                                        dot:'bg-blue-500',  text:'text-blue-700',  bg:'bg-blue-50',   filter:'all'        as FilterType },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 pb-20 space-y-4 max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ubicación y GPS</h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            {lastUpdate ? `Actualizado ${lastUpdate.toLocaleTimeString('es-MX')} · auto-refresh 30s` : 'Rastreo en tiempo real'}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => setResetViewKey(k => k+1)} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium">
            <Map className="w-4 h-4" /> <span className="hidden sm:inline">Ver todos</span>
          </button>
          <button onClick={() => { setLoading(true); fetchGPS(); fetchDayStats(); }} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 text-sm font-medium transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* ── KPI bar ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mb-1"><Activity className="w-3.5 h-3.5 text-green-500"/>Activos ahora</p>
          <p className="text-2xl font-bold text-slate-900">{activeCount}<span className="text-sm font-normal text-slate-400 ml-1">/ {vehicles.length}</span></p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mb-1"><Navigation className="w-3.5 h-3.5 text-blue-500"/>KM totales hoy</p>
          <p className="text-2xl font-bold text-slate-900">{statsLoading ? <span className="text-lg text-slate-300">...</span> : `${totalKm.toFixed(0)} km`}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mb-1"><DollarSign className="w-3.5 h-3.5 text-emerald-500"/>Costo estimado hoy</p>
          <p className="text-2xl font-bold text-slate-900">{statsLoading ? <span className="text-lg text-slate-300">...</span> : `$${totalCost.toLocaleString('es-MX')}`}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">@ ${costPerKm}/km · gasolina+depreciación</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mb-1"><TrendingUp className="w-3.5 h-3.5 text-indigo-500"/>Eficiencia promedio</p>
          <p className="text-2xl font-bold text-slate-900">{statsLoading ? <span className="text-lg text-slate-300">...</span> : `${avgEff}%`}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Tiempo productivo vs. total</p>
        </div>
      </div>

      {/* ── Alert banners ──────────────────────────────────────────────────── */}
      {afueraZMG.length > 0 && !loading && (
        <div className="flex items-start gap-3 px-4 py-3 bg-orange-50 border border-orange-300 rounded-xl text-sm text-orange-900">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-orange-500 mt-0.5"/>
          <div>
            <p className="font-bold">{afueraZMG.length === 1 ? '1 vehículo fuera de la ZMG' : `${afueraZMG.length} vehículos fuera de la ZMG`}</p>
            <p className="text-orange-700 mt-0.5 text-xs">{afueraZMG.map(v => `${v.eco} (${v.plates})`).join(' · ')}</p>
          </div>
        </div>
      )}
      {rapidos.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-300 rounded-xl text-sm text-red-900">
          <Zap className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5"/>
          <div>
            <p className="font-bold">Alta velocidad detectada</p>
            <p className="text-red-700 mt-0.5 text-xs">{rapidos.map(v => `${v.eco} — ${v.speed} km/h`).join(' · ')}</p>
          </div>
        </div>
      )}
      {ralenti.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-300 rounded-xl text-sm text-amber-900">
          <Flame className="w-5 h-5 flex-shrink-0 text-amber-500 mt-0.5"/>
          <div>
            <p className="font-bold">Motor encendido · sin avance (ralentí)</p>
            <p className="text-amber-700 mt-0.5 text-xs">{ralenti.map(v => v.eco).join(' · ')} — combustible activo sin movimiento</p>
          </div>
        </div>
      )}
      {isDemo && !loading && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
          <Info className="w-5 h-5 flex-shrink-0 text-blue-500"/>
          <span><strong>Datos de demostración.</strong>{' '}<a href="/configuracion" className="underline font-medium hover:text-blue-900">Configuración → GPS</a></span>
        </div>
      )}
      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {([
          { key: 'mapa',    label: 'Mapa',         Icon: Map },
          { key: 'lista',   label: 'Lista de flota', Icon: List },
          { key: 'alertas', label: totalAlerts > 0 ? `Alertas (${totalAlerts})` : 'Alertas', Icon: Bell },
        ] as const).map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            } ${key === 'alertas' && totalAlerts > 0 ? 'text-amber-600 font-semibold' : ''}`}
          >
            <Icon className="w-4 h-4"/>{label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: MAPA                                                             */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'mapa' && (
        <>
          {/* Stats filter row */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 md:gap-3">
            {statsArr.map(s => (
              <button key={s.label} onClick={() => setFilter(f => f === s.filter ? 'all' : s.filter)}
                className={`${s.bg} rounded-xl p-3 border text-left transition-all hover:shadow-sm ${filter === s.filter ? 'border-slate-400 ring-1 ring-slate-400' : 'border-slate-200'}`}>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`}/>
                  <span className={`text-xs font-medium ${s.text}`}>{s.label}</span>
                </div>
                <p className={`text-2xl font-bold mt-1 ${s.text}`}>{s.count}</p>
              </button>
            ))}
          </div>

          {/* Map + Sidebar */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Map card */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-w-0">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 flex-shrink-0">
                <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"/>Mov.</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"/>Det.</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400"/>Sin señal</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-600"/>F. línea</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"/>Ralentí</span>
                  {afueraZMG.length > 0 && (
                    <span className="flex items-center gap-1 ml-1 text-orange-600 font-semibold animate-pulse">
                      <AlertTriangle className="w-3 h-3"/>{afueraZMG.length} fuera ZMG
                    </span>
                  )}
                </div>
                <button onClick={() => setSidebarOpen(o => !o)}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 flex-shrink-0">
                  {sidebarOpen ? <ChevronRight className="w-4 h-4"/> : <ChevronLeft className="w-4 h-4"/>}
                  {sidebarOpen ? 'Ocultar' : 'Ver flota'}
                </button>
              </div>

              <div className="relative flex-1 min-h-[320px] md:min-h-[500px]">
                {loading && vehicles.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100">
                    <div className="text-center">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-3"/>
                      <p className="text-sm text-slate-500">Cargando GPS...</p>
                    </div>
                  </div>
                ) : (
                  <MapaLeaflet vehicles={filteredVs} selectedId={selectedId}
                    onSelectVehicle={id => setSelectedId(p => p === id ? null : id)}
                    resetViewKey={resetViewKey} routePoints={routePoints} replayIndex={replayIndex}/>
                )}
              </div>

              {/* Replay bar */}
              {routeVehicleId && (
                <div className="border-t border-slate-200 px-4 py-2.5 flex items-center gap-3 bg-indigo-50 flex-shrink-0">
                  <span className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                    <Route className="w-3.5 h-3.5"/> Ruta hoy — {vehicles.find(v => v.id === routeVehicleId)?.eco}
                    {routeLoading && <span className="ml-1 animate-spin">⟳</span>}
                  </span>
                  {!routeLoading && routePoints.length > 0 && (
                    <>
                      <span className="text-xs text-indigo-500">{routePoints.length} pts</span>
                      <div className="flex items-center gap-1 ml-auto">
                        <button onClick={resetReplay} className="p-1 rounded hover:bg-indigo-100 text-indigo-600"><SkipBack className="w-4 h-4"/></button>
                        {isReplaying
                          ? <button onClick={pauseReplay} className="p-1 rounded hover:bg-indigo-100 text-indigo-600"><Pause className="w-4 h-4"/></button>
                          : <button onClick={startReplay} className="p-1 rounded hover:bg-indigo-100 text-indigo-600"><Play className="w-4 h-4"/></button>}
                        {replayIndex >= 0 && <span className="text-xs text-indigo-500 ml-1">{Math.round((replayIndex/(routePoints.length-1))*100)}%</span>}
                      </div>
                    </>
                  )}
                  {!routeLoading && routePoints.length === 0 && <span className="text-xs text-indigo-400 ml-auto">Sin datos aún — se acumulan cada 30s</span>}
                  <button onClick={() => { setRouteVehicleId(null); setRoutePoints([]); resetReplay(); }} className="text-indigo-400 hover:text-indigo-700 text-xs ml-1">✕</button>
                </div>
              )}
            </div>

            {/* Sidebar */}
            {sidebarOpen && (
              <div className="w-full lg:w-80 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col lg:flex-shrink-0">
                <div className="px-4 py-3 border-b border-slate-200 flex-shrink-0">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Flotilla <span className="text-slate-400 font-normal">({filteredVs.length}{filter !== 'all' ? ` / ${vehicles.length}` : ''})</span>
                  </h3>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(['all','movimiento','detenido','sinsenal','fueralinea'] as FilterType[]).map(f => (
                      <button key={f} onClick={() => setFilter(f)}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-colors ${filter===f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        {f==='all'?'Todos':f==='movimiento'?'En ruta':f==='detenido'?'Parados':f==='sinsenal'?'Sin señal':'F. línea'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-y-auto flex-1">
                  {filteredVs.length === 0 ? (
                    <div className="py-8 text-center px-4">
                      <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2"/>
                      <p className="text-xs text-slate-500">Sin vehículos en este estado</p>
                    </div>
                  ) : filteredVs.map(v => {
                    const st         = dayStats[v.id];
                    const outside    = v.lat && v.lng && !pointInPolygon(v.lat, v.lng, ZMG_POLYGON);
                    const isSpeed    = v.speed > 80;
                    const isIdle     = v.status === 'detenido' && v.accStatus;
                    const isSel      = selectedId === v.id;
                    const isRoute    = routeVehicleId === v.id;
                    const isExpanded = expandedV === v.id;
                    const label      = [v.brand, v.model, v.year].filter(Boolean).join(' ');
                    const shareUrl   = shareUrls[v.id];

                    return (
                      <div key={v.id} className={`border-b border-slate-100 last:border-0 transition-colors ${isSel ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                        <button onClick={() => setSelectedId(p => p === v.id ? null : v.id)} className="w-full text-left px-4 py-3">
                          {/* Top row */}
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getStatusColor(v.status)} ${v.status==='movimiento'?'animate-pulse':''}`}/>
                              <span className={`font-bold text-sm ${outside?'text-orange-700':isSpeed?'text-red-700':'text-slate-900'}`}>{v.eco}</span>
                              {outside && <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold">ZMG</span>}
                              {isSpeed && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"><Zap className="w-2.5 h-2.5"/>{v.speed}</span>}
                              {isIdle && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">Ralentí</span>}
                            </div>
                            <span className={`text-[10px] font-medium ${getStatusText(v.status)}`}>{getStatusLabel(v.status)}</span>
                          </div>
                          {label && <p className="text-[11px] text-slate-500 mb-0.5">{label}</p>}
                          <p className="text-[11px] text-slate-400 truncate">{v.driver ?? 'Sin chofer'}</p>

                          {/* Stats row */}
                          <div className="flex items-center gap-2.5 mt-1.5">
                            {st ? (
                              <>
                                <span className="text-[10px] text-slate-600 flex items-center gap-0.5 font-medium"><Navigation className="w-3 h-3 text-blue-400"/>{st.km_today} km</span>
                                <span className="text-[10px] text-slate-600 flex items-center gap-0.5 font-medium"><DollarSign className="w-3 h-3 text-emerald-400"/>${st.cost_today}</span>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${scoreStyle(st.driving_score)}`}>★{st.driving_score}</span>
                              </>
                            ) : <span className="text-[10px] text-slate-400">Sin historial hoy</span>}
                          </div>

                          {/* Last signal + ACC */}
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                              <Clock className="w-3 h-3"/>{lastSignalLabel(v.gpsTime)}
                            </span>
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${v.accStatus ? isIdle ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                              {v.accStatus ? (isIdle ? '🔥 Motor ON' : '🔑 Encendido') : '⭕ Motor OFF'}
                            </span>
                          </div>
                        </button>

                        {/* Expanded detail */}
                        {isSel && (
                          <div className="px-4 pb-3 space-y-2">
                            {/* Day stats */}
                            {st && (
                              <div className="bg-slate-50 rounded-lg p-2.5 space-y-1 text-[11px]">
                                <div className="flex justify-between text-slate-600">
                                  <span>Eficiencia turno</span>
                                  <span className="font-semibold">{st.efficiency_pct}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-1.5">
                                  <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${st.efficiency_pct}%` }}/>
                                </div>
                                <div className="flex justify-between text-slate-500 pt-0.5">
                                  <span>Tiempo activo</span><span className="font-medium">{fmtMin(st.productive_minutes)}</span>
                                </div>
                                <div className="flex justify-between text-slate-500">
                                  <span>Ralentí</span><span className={`font-medium ${st.idle_minutes>20?'text-amber-600':''}`}>{fmtMin(st.idle_minutes)}</span>
                                </div>
                                <div className="flex justify-between text-slate-500">
                                  <span>Vel. máxima</span><span className={`font-medium ${st.max_speed>80?'text-red-600':''}`}>{st.max_speed} km/h</span>
                                </div>
                                {st.speed_violations > 0 && (
                                  <div className="flex justify-between text-red-600">
                                    <span>Excesos velocidad</span><span className="font-semibold">{st.speed_violations}x</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Stops accordion */}
                            {st && st.stops_count > 0 && (
                              <div>
                                <button onClick={e => { e.stopPropagation(); setExpandedV(p => p === v.id ? null : v.id); }}
                                  className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-600 px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-slate-100">
                                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{st.stops_count} parada{st.stops_count!==1?'s':''} hoy</span>
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
                                </button>
                                {isExpanded && (
                                  <div className="mt-1 space-y-0.5 max-h-36 overflow-y-auto">
                                    {st.stops.map((s, i) => (
                                      <div key={i} className="flex items-center justify-between text-[10px] text-slate-500 px-2.5 py-1.5 bg-slate-50 rounded-lg">
                                        <span>{new Date(s.started_at).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})} → {new Date(s.ended_at).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}</span>
                                        <span className={`font-semibold ${s.duration_minutes>20?'text-amber-600':''}`}>{s.duration_minutes} min</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex gap-1.5">
                              <button onClick={() => fetchRoute(v.id)}
                                className={`flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-1.5 rounded-lg transition-colors ${isRoute?'bg-indigo-600 text-white':'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>
                                <Route className="w-3.5 h-3.5"/>{isRoute?'Ocultar ruta':'Ver ruta'}
                              </button>
                              <button onClick={() => shareUrl ? copyShareUrl(v.id) : generateShare(v.id)} disabled={shareLoading===v.id}
                                className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-1.5 rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-60">
                                {copied===v.id ? <Check className="w-3.5 h-3.5 text-green-600"/> : <Share2 className="w-3.5 h-3.5"/>}
                                {copied===v.id ? 'Copiado' : shareUrl ? 'Copiar link' : shareLoading===v.id ? '...' : 'Compartir'}
                              </button>
                            </div>
                            {shareUrl && <p className="text-[9px] text-slate-400 truncate px-1">🔗 Válido 4h: {shareUrl}</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: LISTA                                                            */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'lista' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {['Vehículo','Chofer','Estado','Vel.','KM hoy','Costo','Eficiencia','Score','Última señal','Motor'].map(h => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide ${h==='Vel.'||h==='KM hoy'||h==='Costo'||h==='Score' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicles.map(v => {
                  const st   = dayStats[v.id];
                  const idle = v.status === 'detenido' && v.accStatus;
                  return (
                    <tr key={v.id} onClick={() => { setSelectedId(v.id); setActiveTab('mapa'); }}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(v.status)}`}/>
                          <div><p className="font-semibold text-slate-900">{v.eco}</p><p className="text-xs text-slate-400">{v.plates}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{v.driver ?? <span className="text-slate-400">—</span>}</td>
                      <td className="px-4 py-3"><span className={`text-xs font-medium ${getStatusText(v.status)}`}>{getStatusLabel(v.status)}</span></td>
                      <td className="px-4 py-3 text-right"><span className={`text-xs font-medium ${v.speed>80?'text-red-600 font-bold':''}`}>{v.speed} km/h</span></td>
                      <td className="px-4 py-3 text-right text-xs font-medium text-slate-700">{st ? `${st.km_today} km` : <span className="text-slate-400">—</span>}</td>
                      <td className="px-4 py-3 text-right text-xs font-medium text-slate-700">{st ? `$${st.cost_today}` : <span className="text-slate-400">—</span>}</td>
                      <td className="px-4 py-3">
                        {st ? (
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-14 bg-slate-200 rounded-full h-1.5"><div className="bg-blue-500 h-1.5 rounded-full" style={{ width:`${st.efficiency_pct}%` }}/></div>
                            <span className="text-xs text-slate-600 w-8 text-right">{st.efficiency_pct}%</span>
                          </div>
                        ) : <span className="text-slate-400 text-xs text-right block">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {st ? <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${scoreStyle(st.driving_score)}`}>{st.driving_score}</span> : <span className="text-slate-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{lastSignalLabel(v.gpsTime)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${v.accStatus ? idle?'bg-amber-100 text-amber-700':'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {v.accStatus ? (idle?'Ralentí':'ON') : 'OFF'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: ALERTAS                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'alertas' && (
        <div className="space-y-4">
          {totalAlerts === 0 && alertHistory.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 py-14 text-center">
              <Bell className="w-10 h-10 text-slate-200 mx-auto mb-3"/>
              <p className="text-slate-500 font-medium">Sin alertas activas</p>
              <p className="text-slate-400 text-sm mt-1">Toda la flota opera dentro de parámetros normales</p>
            </div>
          ) : (
            <>
              {/* Live alerts */}
              {totalAlerts > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Activas ahora</h3>
                  <div className="space-y-2">
                    {afueraZMG.map(v => (
                      <div key={v.id} className="flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0"/>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-orange-900">{v.eco} — Fuera de la ZMG</p>
                          <p className="text-xs text-orange-700">{v.plates} · {v.driver ?? 'Sin chofer'} · {v.speed} km/h</p>
                        </div>
                        <button onClick={() => { setSelectedId(v.id); setActiveTab('mapa'); }} className="text-xs text-orange-700 font-semibold underline whitespace-nowrap">Ver en mapa</button>
                      </div>
                    ))}
                    {rapidos.map(v => (
                      <div key={v.id} className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                        <Zap className="w-5 h-5 text-red-500 flex-shrink-0"/>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-red-900">{v.eco} — Alta velocidad</p>
                          <p className="text-xs text-red-700">{v.plates} · {v.driver ?? 'Sin chofer'} · <strong>{v.speed} km/h</strong></p>
                        </div>
                        <button onClick={() => { setSelectedId(v.id); setActiveTab('mapa'); }} className="text-xs text-red-700 font-semibold underline whitespace-nowrap">Ver en mapa</button>
                      </div>
                    ))}
                    {ralenti.map(v => (
                      <div key={v.id} className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <Flame className="w-5 h-5 text-amber-500 flex-shrink-0"/>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-amber-900">{v.eco} — Motor encendido parado</p>
                          <p className="text-xs text-amber-700">{v.plates} · {v.driver ?? 'Sin chofer'} · Ralentí activo · {lastSignalLabel(v.gpsTime)}</p>
                        </div>
                        <button onClick={() => { setSelectedId(v.id); setActiveTab('mapa'); }} className="text-xs text-amber-700 font-semibold underline whitespace-nowrap">Ver en mapa</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alert history */}
              {alertHistory.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Historial de la sesión</h3>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    {alertHistory.map(a => (
                      <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.severity==='danger'?'bg-red-500':a.severity==='caution'?'bg-amber-400':'bg-orange-400'}`}/>
                        <p className="flex-1 text-sm text-slate-700">{a.message}</p>
                        <span className="text-xs text-slate-400 whitespace-nowrap">{a.time.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
}
