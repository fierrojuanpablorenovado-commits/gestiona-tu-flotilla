'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker, Polyline as LeafletPolyline, CircleMarker as LeafletCircleMarker } from 'leaflet';

export interface VehicleGPS {
  id: string;
  eco: string;
  plates: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  driver: string | null;
  lat: number;
  lng: number;
  speed: number;
  course: number;
  status: 'movimiento' | 'detenido' | 'sinsenal' | 'fueralinea';
  accStatus: boolean;
  gpsTime: string;
  isDemo: boolean;
}

export interface RoutePoint {
  lat: string | number;
  lng: string | number;
  speed: number;
  status: string;
  recorded_at: string;
}

interface MapaLeafletProps {
  vehicles: VehicleGPS[];
  selectedId: string | null;
  onSelectVehicle: (id: string) => void;
  resetViewKey?: number;
  routePoints?: RoutePoint[];
  replayIndex?: number;        // índice actual del replay (-1 = sin replay)
}

function statusColor(status: string): string {
  switch (status) {
    case 'movimiento': return '#22c55e';
    case 'detenido':   return '#ef4444';
    case 'fueralinea': return '#6b7280';  // gris oscuro
    default:           return '#94a3b8';
  }
}

const ZMG_POLYGON: [number, number][] = [
  [20.87, -103.60],
  [20.87, -103.25],
  [20.75, -103.08],
  [20.50, -103.10],
  [20.35, -103.22],
  [20.33, -103.48],
  [20.48, -103.68],
  [20.72, -103.68],
  [20.87, -103.60],
];

function pointInPolygon(lat: number, lng: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i];
    const [yj, xj] = poly[j];
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

export default function MapaLeaflet({
  vehicles,
  selectedId,
  onSelectVehicle,
  resetViewKey,
  routePoints = [],
  replayIndex = -1,
}: MapaLeafletProps) {
  const divRef          = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<LeafletMap | null>(null);
  const markersRef      = useRef<Map<string, LeafletMarker>>(new Map());
  const routeLayerRef   = useRef<LeafletPolyline | null>(null);
  const replayDotRef    = useRef<LeafletCircleMarker | null>(null);
  const initRef         = useRef(false);
  const geocacheRef     = useRef<Map<string, string>>(new Map());

  // ── Init mapa ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (initRef.current || !divRef.current) return;
    initRef.current = true;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id   = 'leaflet-css';
      link.rel  = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(link);
    }

    import('leaflet').then((L) => {
      if (mapRef.current || !divRef.current) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const zmgBounds = L.latLngBounds([20.33, -103.68], [20.87, -103.08]);

      const map = L.map(divRef.current!, {
        minZoom:             10,
        maxZoom:             18,
        maxBounds:           zmgBounds,
        maxBoundsViscosity:  1.0,
        zoomControl:         true,
      });

      map.fitBounds(zmgBounds, { padding: [60, 60] });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Polígono ZMG
      L.polygon(ZMG_POLYGON, {
        color: '#3b82f6', weight: 2, opacity: 0.55,
        dashArray: '10, 6', fillColor: '#3b82f6', fillOpacity: 0.04,
      }).addTo(map).bindTooltip('Zona Metropolitana de Guadalajara', {
        sticky: false, className: 'text-xs font-semibold',
      });

      mapRef.current = map;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
      initRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reset view ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (resetViewKey === undefined || !mapRef.current) return;
    import('leaflet').then((L) => {
      const map = mapRef.current;
      if (!map) return;
      const validVehicles = vehicles.filter(v => v.lat && v.lng);
      if (!validVehicles.length) {
        const zmgBounds = L.latLngBounds([20.33, -103.68], [20.87, -103.08]);
        map.fitBounds(zmgBounds, { padding: [60, 60] });
      } else if (validVehicles.length === 1) {
        map.setView([validVehicles[0].lat, validVehicles[0].lng], 14, { animate: true });
      } else {
        const bounds = L.latLngBounds(validVehicles.map(v => [v.lat, v.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14, animate: true });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetViewKey]);

  // ── Actualizar marcadores ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) {
      const retry = setTimeout(() => { if (mapRef.current) renderMarkers(); }, 500);
      return () => clearTimeout(retry);
    }
    renderMarkers();

    function renderMarkers() {
      import('leaflet').then((L) => {
        const map = mapRef.current;
        if (!map) return;

        const existingIds = new Set<string>(markersRef.current.keys());

        for (const v of vehicles) {
          if (!v.lat || !v.lng) continue;

          const color      = statusColor(v.status);
          const isSelected = v.id === selectedId;
          const circleSize = isSelected ? 22 : 16;
          const outsideZMG = !pointInPolygon(v.lat, v.lng, ZMG_POLYGON);
          const isSpeed    = v.speed > 80;

          const ringColor = isSelected ? '#2563eb' : outsideZMG ? '#f97316' : isSpeed ? '#dc2626' : 'white';
          const ringWidth = isSelected ? 3 : 2.5;
          const labelBg   = isSelected ? '#2563eb' : outsideZMG ? '#f97316' : isSpeed ? '#dc2626' : 'rgba(15,23,42,0.82)';

          const isIdle = v.accStatus && v.status === 'detenido'; // motor ON pero parado

          const warningBadge = outsideZMG
            ? `<div style="position:absolute;top:-5px;right:-5px;background:#f97316;color:white;font-size:8px;font-weight:900;border-radius:50%;width:13px;height:13px;display:flex;align-items:center;justify-content:center;border:1.5px solid white;font-family:system-ui;line-height:1;">!</div>`
            : isSpeed
            ? `<div style="position:absolute;top:-5px;right:-5px;background:#dc2626;color:white;font-size:8px;font-weight:900;border-radius:50%;width:13px;height:13px;display:flex;align-items:center;justify-content:center;border:1.5px solid white;font-family:system-ui;line-height:1;">⚡</div>`
            : isIdle
            ? `<div style="position:absolute;top:-5px;right:-5px;background:#f59e0b;color:white;font-size:8px;font-weight:900;border-radius:50%;width:13px;height:13px;display:flex;align-items:center;justify-content:center;border:1.5px solid white;font-family:system-ui;line-height:1;">🔥</div>`
            : '';

          // Ralentí: orange pulsing ring
          const idleRing = isIdle
            ? `<div style="position:absolute;inset:-4px;border-radius:50%;border:2px solid #f59e0b;opacity:0.6;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>`
            : '';
          const speedRing = isSpeed
            ? `<div style="position:absolute;inset:-5px;border-radius:50%;border:2px solid #dc2626;opacity:0.5;animation:ping 1s cubic-bezier(0,0,0.2,1) infinite;"></div>`
            : '';
          // Inner dot for ACC on (ignition)
          const accDot = v.accStatus && !isIdle
            ? `<div style="position:absolute;width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.9);top:50%;left:50%;transform:translate(-50%,-50%);"></div>`
            : '';

          const divIcon = L.divIcon({
            className: '',
            html: `
              <div style="position:relative;display:inline-flex;flex-direction:column;align-items:center;gap:3px">
                ${warningBadge}
                <div style="position:relative;width:${circleSize}px;height:${circleSize}px;">
                  ${speedRing}${idleRing}
                  <div style="width:${circleSize}px;height:${circleSize}px;border-radius:50%;background:${color};border:${ringWidth}px solid ${ringColor};box-shadow:0 2px 6px rgba(0,0,0,0.35);transition:all 0.2s;">${accDot}</div>
                </div>
                <div style="background:${labelBg};color:white;font-size:10px;font-weight:700;font-family:system-ui,sans-serif;padding:1px 5px;border-radius:4px;white-space:nowrap;letter-spacing:0.4px;box-shadow:0 1px 3px rgba(0,0,0,0.3);">${v.eco}</div>
              </div>`,
            iconSize:    [circleSize + 16, circleSize + 22],
            iconAnchor:  [(circleSize + 16) / 2, circleSize / 2 + ringWidth],
            popupAnchor: [0, -(circleSize / 2 + 10)],
          });

          const vehicleLabel = [v.brand, v.model, v.year].filter(Boolean).join(' ') || null;
          const geocacheKey  = `${v.lat.toFixed(4)},${v.lng.toFixed(4)}`;
          const cachedAddr   = geocacheRef.current.get(geocacheKey);

          const addressLine = cachedAddr
            ? `<div style="font-size:11px;color:#64748b;margin-top:3px">📍 ${cachedAddr}</div>`
            : `<div id="addr-${v.id}" style="font-size:11px;color:#94a3b8;margin-top:3px">Cargando dirección...</div>`;

          const popupContent = buildPopup(v, vehicleLabel, color, outsideZMG, addressLine);

          if (markersRef.current.has(v.id)) {
            const m = markersRef.current.get(v.id)!;
            m.setLatLng([v.lat, v.lng]);
            m.setIcon(divIcon);
            m.getPopup()?.setContent(popupContent);
          } else {
            const m = L.marker([v.lat, v.lng], { icon: divIcon })
              .addTo(map)
              .bindPopup(popupContent, { maxWidth: 240 });

            m.on('click', () => onSelectVehicle(v.id));

            // Geocoding lazy al abrir popup
            m.on('popupopen', () => {
              if (!geocacheRef.current.has(geocacheKey)) {
                fetch(`https://nominatim.openstreetmap.org/reverse?lat=${v.lat}&lon=${v.lng}&format=json&accept-language=es`)
                  .then(r => r.json())
                  .then(data => {
                    const addr = data.address;
                    const display = [
                      addr?.road,
                      addr?.suburb ?? addr?.neighbourhood,
                      addr?.city ?? addr?.town ?? addr?.village,
                    ].filter(Boolean).join(', ');
                    geocacheRef.current.set(geocacheKey, display || data.display_name?.split(',').slice(0,2).join(',') || '');
                    const el = document.getElementById(`addr-${v.id}`);
                    if (el) el.textContent = `📍 ${geocacheRef.current.get(geocacheKey)}`;
                  }).catch(() => {
                    geocacheRef.current.set(geocacheKey, '');
                  });
              }
            });

            markersRef.current.set(v.id, m);
          }

          existingIds.delete(v.id);
        }

        existingIds.forEach((oldId) => {
          markersRef.current.get(oldId)?.remove();
          markersRef.current.delete(oldId);
        });

        // Auto-fit primera carga
        const validVehicles = vehicles.filter(v => v.lat && v.lng);
        if (validVehicles.length > 0 && !map.getContainer().dataset.fitted) {
          map.getContainer().dataset.fitted = '1';
          if (validVehicles.length === 1) {
            map.setView([validVehicles[0].lat, validVehicles[0].lng], 13);
          } else {
            const bounds = L.latLngBounds(validVehicles.map(v => [v.lat, v.lng] as [number, number]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
          }
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles, selectedId]);

  // ── Centrar al seleccionar ─────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const marker = markersRef.current.get(selectedId);
    if (!marker) return;
    mapRef.current.setView(marker.getLatLng(), 14, { animate: true });
    marker.openPopup();
  }, [selectedId]);

  // ── Ruta del día (polyline) ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    import('leaflet').then((L) => {
      const map = mapRef.current;
      if (!map) return;

      // Eliminar ruta anterior
      routeLayerRef.current?.remove();
      routeLayerRef.current = null;
      replayDotRef.current?.remove();
      replayDotRef.current = null;

      if (!routePoints.length) return;

      const latlngs = routePoints.map(p => [Number(p.lat), Number(p.lng)] as [number, number]);

      routeLayerRef.current = L.polyline(latlngs, {
        color: '#6366f1', weight: 3, opacity: 0.75,
        dashArray: undefined,
      }).addTo(map);

      // Dot de inicio y fin
      if (latlngs.length > 0) {
        L.circleMarker(latlngs[0], { radius: 6, color: '#6366f1', fillColor: '#fff', fillOpacity: 1, weight: 2 })
          .addTo(map).bindTooltip('Inicio del día');
        L.circleMarker(latlngs[latlngs.length - 1], { radius: 6, color: '#6366f1', fillColor: '#6366f1', fillOpacity: 1, weight: 2 })
          .addTo(map).bindTooltip('Última posición');
      }

      map.fitBounds(routeLayerRef.current.getBounds(), { padding: [40, 40], animate: true });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routePoints]);

  // ── Replay dot ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !routePoints.length || replayIndex < 0) return;
    import('leaflet').then((L) => {
      const map = mapRef.current;
      if (!map) return;

      const pt = routePoints[replayIndex];
      if (!pt) return;
      const pos: [number, number] = [Number(pt.lat), Number(pt.lng)];

      if (!replayDotRef.current) {
        replayDotRef.current = L.circleMarker(pos, {
          radius: 9, color: '#6366f1', fillColor: '#818cf8', fillOpacity: 1, weight: 3,
        }).addTo(map);
      } else {
        replayDotRef.current.setLatLng(pos);
      }
      map.panTo(pos, { animate: true, duration: 0.3 });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayIndex]);

  return (
    <>
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
      <div ref={divRef} className="w-full h-full" style={{ minHeight: 420 }} />
    </>
  );
}

function buildPopup(
  v: VehicleGPS,
  vehicleLabel: string | null,
  color: string,
  outsideZMG: boolean,
  addressLine: string,
): string {
  return `
    <div style="min-width:200px;font-family:system-ui;line-height:1.6">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <div style="width:11px;height:11px;border-radius:50%;background:${color};flex-shrink:0;box-shadow:0 0 0 2px white,0 0 0 3.5px ${color};"></div>
        <div>
          <div style="font-weight:700;font-size:14px;color:#0f172a;line-height:1.2">${v.eco}</div>
          ${vehicleLabel ? `<div style="font-size:11px;color:#334155;font-weight:600">${vehicleLabel}</div>` : ''}
          <div style="font-size:11px;color:#94a3b8">Placas: <strong style="color:#475569">${v.plates}</strong></div>
        </div>
      </div>
      ${addressLine}
      ${outsideZMG ? `<div style="margin:5px 0;padding:4px 8px;background:#fff7ed;border:1px solid #fdba74;border-radius:6px;font-size:11px;color:#c2410c;font-weight:600">⚠️ Fuera de la ZMG</div>` : ''}
      ${v.speed > 80 ? `<div style="margin:4px 0;padding:4px 8px;background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;font-size:11px;color:#dc2626;font-weight:600">⚡ Alta velocidad: ${v.speed} km/h</div>` : ''}
      <hr style="margin:6px 0;border-color:#e2e8f0"/>
      <div style="font-size:12px;color:#475569;display:flex;flex-direction:column;gap:3px">
        <div>Chofer: <strong style="color:#1e293b">${v.driver ?? 'Sin asignar'}</strong></div>
        <div>Estado: <strong style="color:${color}">${v.status}</strong></div>
        <div>Velocidad: <strong style="color:${v.speed > 80 ? '#dc2626' : '#1e293b'}">${v.speed} km/h</strong></div>
        <div>Ignición: <strong style="color:${v.accStatus ? '#16a34a' : '#64748b'}">${v.accStatus ? '🔑 Encendida' : '⭕ Apagada'}</strong></div>
        ${v.accStatus && v.status === 'detenido' ? `<div style="padding:3px 8px;background:#fef3c7;border:1px solid #fcd34d;border-radius:5px;font-size:11px;color:#92400e;font-weight:600;margin-top:3px">🔥 Ralentí — motor encendido sin avance</div>` : ''}
        ${v.gpsTime ? `<div style="color:#94a3b8;font-size:11px;margin-top:2px">${new Date(v.gpsTime).toLocaleString('es-MX')}</div>` : ''}
      </div>
    </div>`;
}
