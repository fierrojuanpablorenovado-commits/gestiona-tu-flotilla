'use client';

import dynamic from 'next/dynamic';
import {
  MapPin,
  Navigation,
  Battery,
  WifiOff,
  Circle,
  Clock,
  Gauge,
  Shield,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Map,
  Info,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

// Leaflet requiere dynamic import con ssr: false en Next.js
const MapaLeaflet = dynamic(() => import('@/components/maps/MapaLeaflet'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[420px] flex items-center justify-center bg-slate-100">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-3" />
        <p className="text-sm text-slate-500">Cargando mapa...</p>
      </div>
    </div>
  ),
});

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface VehicleGPS {
  id: string;
  eco: string;
  plates: string;
  driver: string | null;
  lat: number;
  lng: number;
  speed: number;
  course: number;
  status: 'movimiento' | 'detenido' | 'sinsenal';
  accStatus: boolean;
  gpsTime: string;
  isDemo: boolean;
}

interface GPSResponse {
  vehicles: VehicleGPS[];
  isDemo: boolean;
  message?: string;
  error?: string;
}

// ── Zonas geofence (estáticas por ahora) ─────────────────────────────────────

const zonasGeofence = [
  { nombre: 'Zona Centro GDL',  tipo: 'Operativa',       radio: '15 km', color: 'bg-green-100 text-green-700' },
  { nombre: 'Zona Norte GDL',   tipo: 'Operativa',       radio: '20 km', color: 'bg-green-100 text-green-700' },
  { nombre: 'Aeropuerto GDL',   tipo: 'Restringida',     radio: '5 km',  color: 'bg-red-100 text-red-700' },
  { nombre: 'Base Operativa',   tipo: 'Estacionamiento', radio: '1 km',  color: 'bg-blue-100 text-blue-700' },
];

// ── Helpers de estado ─────────────────────────────────────────────────────────

function getStatusColor(status: string): string {
  switch (status) {
    case 'movimiento': return 'bg-green-500';
    case 'detenido':   return 'bg-red-500';
    case 'sinsenal':   return 'bg-gray-400';
    case 'bateriabaja':return 'bg-yellow-500';
    default:           return 'bg-gray-400';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'movimiento': return 'En movimiento';
    case 'detenido':   return 'Detenido';
    case 'sinsenal':   return 'Sin señal';
    case 'bateriabaja':return 'Batería baja';
    default:           return status;
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'movimiento': return <Navigation className="w-4 h-4 text-green-600" />;
    case 'detenido':   return <Clock className="w-4 h-4 text-red-600" />;
    case 'sinsenal':   return <WifiOff className="w-4 h-4 text-gray-500" />;
    case 'bateriabaja':return <Battery className="w-4 h-4 text-yellow-600" />;
    default:           return <Circle className="w-4 h-4" />;
  }
}

function formatGpsTime(iso: string): string {
  if (!iso) return 'Sin señal';
  try {
    return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function UbicacionPage() {
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [vehiculos, setVehiculos]     = useState<VehicleGPS[]>([]);
  const [loading, setLoading]         = useState(true);
  const [lastUpdate, setLastUpdate]   = useState<Date | null>(null);
  const [isDemo, setIsDemo]           = useState(false);
  const [demoMessage, setDemoMessage] = useState('');
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => { document.title = 'Ubicación GPS | Gestiona tu Flotilla'; }, []);

  // ── Fetch GPS ───────────────────────────────────────────────────────────────
  const fetchGPS = useCallback(async () => {
    try {
      const res = await fetch('/api/gps/tracksolid');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: GPSResponse = await res.json();

      setVehiculos(data.vehicles ?? []);
      setIsDemo(data.isDemo ?? false);
      setDemoMessage(data.message ?? '');
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar GPS');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    fetchGPS();
  }, [fetchGPS]);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    const timer = setInterval(fetchGPS, 30_000);
    return () => clearInterval(timer);
  }, [fetchGPS]);

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = [
    { label: 'En movimiento', count: vehiculos.filter(v => v.status === 'movimiento').length, color: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-500' },
    { label: 'Detenidos',     count: vehiculos.filter(v => v.status === 'detenido').length,   color: 'text-red-600',   bg: 'bg-red-50',   dot: 'bg-red-500' },
    { label: 'Sin señal',     count: vehiculos.filter(v => v.status === 'sinsenal').length,   color: 'text-gray-600',  bg: 'bg-gray-50',  dot: 'bg-gray-400' },
    { label: 'Total flota',   count: vehiculos.length,                                         color: 'text-blue-600',  bg: 'bg-blue-50',  dot: 'bg-blue-500' },
  ];

  const selectedVehicle = vehiculos.find(v => v.id === selectedId) ?? null;

  return (
    <div className="space-y-6">

      {/* Banner demo */}
      {isDemo && !loading && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
          <Info className="w-5 h-5 flex-shrink-0 text-blue-500" />
          <span>
            <strong>Datos de demostración.</strong>{' '}
            {demoMessage || 'Conecta tu dispositivo GPS en'}{' '}
            <a href="/configuracion" className="underline font-medium hover:text-blue-900">
              Configuración → GPS y Rastreo
            </a>
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ubicación y GPS</h1>
          <p className="text-slate-500 mt-1">
            {lastUpdate
              ? `Última actualización: ${lastUpdate.toLocaleTimeString('es-MX')} — auto-refresh 30s`
              : 'Rastreo en tiempo real de tu flotilla'}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchGPS(); }}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-4 border border-slate-200`}>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${stat.dot}`} />
              <span className={`text-sm font-medium ${stat.color}`}>{stat.label}</span>
            </div>
            <p className={`text-3xl font-bold mt-2 ${stat.color}`}>{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Mapa + Lista */}
      <div className="grid grid-cols-3 gap-6">

        {/* Mapa Leaflet */}
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Map className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-900">Mapa en vivo</h2>
              {isDemo && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  Demo
                </span>
              )}
            </div>
            {selectedVehicle && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(selectedVehicle.status)}`} />
                <span className="font-semibold">{selectedVehicle.eco}</span>
                <span className="text-slate-400">{selectedVehicle.speed} km/h</span>
              </div>
            )}
          </div>

          {/* Mapa */}
          <div className="relative h-[420px] overflow-hidden">
            {loading && vehiculos.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center bg-slate-100">
                <div className="text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-3" />
                  <p className="text-sm text-slate-500">Cargando datos GPS...</p>
                </div>
              </div>
            ) : (
              <MapaLeaflet
                vehicles={vehiculos}
                selectedId={selectedId}
                onSelectVehicle={(id) => setSelectedId(prev => prev === id ? null : id)}
              />
            )}
          </div>

          {/* Leyenda */}
          <div className="flex items-center gap-6 p-4 border-t border-slate-200 bg-slate-50">
            <span className="text-xs font-medium text-slate-500">Leyenda:</span>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500" /><span className="text-xs text-slate-600">En movimiento ({vehiculos.filter(v => v.status === 'movimiento').length})</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500" /><span className="text-xs text-slate-600">Detenido ({vehiculos.filter(v => v.status === 'detenido').length})</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-400" /><span className="text-xs text-slate-600">Sin señal ({vehiculos.filter(v => v.status === 'sinsenal').length})</span></div>
          </div>
        </div>

        {/* Lista de vehículos */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Vehículos</h2>
            <p className="text-xs text-slate-400 mt-0.5">{vehiculos.length} unidades rastreadas</p>
          </div>
          <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
            {loading && vehiculos.length === 0 ? (
              <div className="py-12 text-center">
                <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              </div>
            ) : vehiculos.length === 0 ? (
              <div className="py-12 text-center px-4">
                <MapPin className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">Sin vehículos registrados</p>
                <p className="text-xs text-slate-400 mt-1">Los vehículos aparecerán aquí una vez registrados.</p>
              </div>
            ) : (
              vehiculos.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedId(prev => prev === v.id ? null : v.id)}
                  className={`w-full text-left p-3 hover:bg-slate-50 transition-colors ${
                    selectedId === v.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(v.status)} ${v.status === 'movimiento' ? 'animate-pulse' : ''}`} />
                      <span className="font-semibold text-sm text-slate-900">{v.eco}</span>
                    </div>
                    {getStatusIcon(v.status)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 ml-[18px]">{v.driver ?? 'Sin chofer'}</p>
                  <div className="flex items-center gap-3 mt-1.5 ml-[18px]">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatGpsTime(v.gpsTime)}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Gauge className="w-3 h-3" />{v.speed} km/h
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      v.status === 'movimiento' ? 'bg-green-100 text-green-700' :
                      v.status === 'detenido'   ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {getStatusLabel(v.status)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Zonas Geofence */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Zonas Geofence</h2>
          </div>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">+ Nueva zona</button>
        </div>
        <div className="grid grid-cols-4 gap-4 p-4">
          {zonasGeofence.map((zona) => (
            <div key={zona.nombre} className="border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between">
                <MapPin className="w-5 h-5 text-blue-600" />
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${zona.color}`}>{zona.tipo}</span>
              </div>
              <h3 className="font-semibold text-slate-900 mt-2">{zona.nombre}</h3>
              <p className="text-sm text-slate-500 mt-1">Radio: {zona.radio}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                <AlertTriangle className="w-3 h-3" />
                <span>Alertas activas</span>
                <ChevronRight className="w-3 h-3 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
