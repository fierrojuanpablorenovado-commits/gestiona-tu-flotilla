'use client';

import { useEffect, useState } from 'react';

interface TrackData {
  vehicle: {
    id: string; eco: string; plates: string;
    brand: string | null; model: string | null; driver: string | null;
  };
  location: {
    lat: number; lng: number; speed: number;
    status: string; recorded_at: string;
  } | null;
}

const STATUS_LABEL: Record<string, string> = {
  movimiento: 'En movimiento',
  detenido:   'Detenido',
  sinsenal:   'Sin señal',
  fueralinea: 'Fuera de línea',
};

const STATUS_STYLE: Record<string, string> = {
  movimiento: 'bg-green-100 text-green-700 border-green-200',
  detenido:   'bg-red-100 text-red-700 border-red-200',
  sinsenal:   'bg-gray-100 text-gray-600 border-gray-200',
  fueralinea: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function TrackPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<TrackData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/gps/track/${params.token}`);
        if (!res.ok) {
          const err = await res.json();
          setError(err.error ?? 'Enlace inválido');
          return;
        }
        setData(await res.json());
        setLastFetch(new Date());
      } catch {
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [params.token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-3" />
          <p className="text-slate-500 text-sm">Cargando ubicación...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">📍</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Enlace no disponible</h1>
          <p className="text-slate-500 text-sm">{error}</p>
          <p className="text-slate-400 text-xs mt-3">El enlace puede haber expirado. Solicita uno nuevo.</p>
        </div>
      </div>
    );
  }

  if (!data?.location) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center">
          <div className="text-3xl mb-3">📡</div>
          <p className="text-slate-600 font-medium">{data?.vehicle.eco} — Sin señal GPS reciente</p>
          <p className="text-slate-400 text-sm mt-1">Esperando actualización...</p>
        </div>
      </div>
    );
  }

  const { vehicle, location } = data;
  const statusStyle = STATUS_STYLE[location.status] ?? STATUS_STYLE.sinsenal;
  const statusLabel = STATUS_LABEL[location.status] ?? location.status;
  const vehicleLabel = [vehicle.brand, vehicle.model].filter(Boolean).join(' ');
  const mapsUrl = `https://maps.google.com/?q=${location.lat},${location.lng}`;
  const wazeUrl = `https://waze.com/ul?ll=${location.lat},${location.lng}&navigate=yes`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-5 py-4">
        <div className="flex items-start justify-between max-w-md mx-auto">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Gestiona tu Flotilla · Ubicación en vivo</p>
            <h1 className="text-xl font-bold text-slate-900">{vehicle.eco}</h1>
            <p className="text-sm text-slate-500">{vehicle.plates}{vehicleLabel ? ` · ${vehicleLabel}` : ''}</p>
            {vehicle.driver && <p className="text-sm text-slate-400 mt-0.5">Chofer: {vehicle.driver}</p>}
          </div>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${statusStyle}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-4 px-5 py-5 max-w-md mx-auto w-full">
        {/* Speed badge */}
        {location.speed > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-center justify-between">
            <span className="text-slate-500 text-sm">Velocidad actual</span>
            <span className={`text-2xl font-bold ${location.speed > 80 ? 'text-red-600' : 'text-slate-900'}`}>
              {location.speed} <span className="text-base font-normal text-slate-400">km/h</span>
            </span>
          </div>
        )}

        {/* Last update */}
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
          <p className="text-xs text-slate-400 mb-1">Última actualización GPS</p>
          <p className="text-lg font-semibold text-slate-800">
            {new Date(location.recorded_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-sm text-slate-400">
            {new Date(location.recorded_at).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          {lastFetch && (
            <p className="text-xs text-slate-300 mt-1">Panel actualizado: {lastFetch.toLocaleTimeString('es-MX')}</p>
          )}
        </div>

        {/* Coordinates */}
        <div className="bg-slate-100 rounded-xl px-4 py-3 flex justify-between text-xs text-slate-500">
          <span>Lat: {location.lat.toFixed(6)}</span>
          <span>Lng: {location.lng.toFixed(6)}</span>
        </div>

        {/* Map buttons */}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-3.5 bg-blue-600 text-white text-center rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          📍 Abrir en Google Maps
        </a>
        <a
          href={wazeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-3.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-center rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors"
        >
          🗺 Navegar con Waze
        </a>

        <p className="text-center text-xs text-slate-400 pb-4">
          Actualización automática cada 30 segundos · Este enlace expira en 4 horas
        </p>
      </div>
    </div>
  );
}
