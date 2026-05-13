'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';

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

interface MapaLeafletProps {
  vehicles: VehicleGPS[];
  selectedId: string | null;
  onSelectVehicle: (id: string) => void;
}

function statusColor(status: string): string {
  switch (status) {
    case 'movimiento': return '#22c55e';
    case 'detenido':   return '#ef4444';
    default:           return '#94a3b8';
  }
}

export default function MapaLeaflet({ vehicles, selectedId, onSelectVehicle }: MapaLeafletProps) {
  const mapRef    = useRef<LeafletMap | null>(null);
  const divRef    = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, LeafletMarker>>(new Map());

  // Inicializar mapa solo una vez
  useEffect(() => {
    if (mapRef.current || !divRef.current) return;

    // Importar leaflet dinámicamente (solo en cliente)
    import('leaflet').then((L) => {
      // Fix para íconos con webpack/next
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(divRef.current!, {
        center: [20.6597, -103.3496],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Actualizar marcadores cuando cambian vehículos
  useEffect(() => {
    if (!mapRef.current) return;

    import('leaflet').then((L) => {
      const map = mapRef.current!;
      const existingIds = new Set<string>(markersRef.current.keys());

      for (const v of vehicles) {
        if (!v.lat && !v.lng) continue;

        const color = statusColor(v.status);
        const isSelected = v.id === selectedId;
        const size = isSelected ? 18 : 14;

        const svgIcon = L.divIcon({
          className: '',
          html: `
            <div style="
              width: ${size}px;
              height: ${size}px;
              background: ${color};
              border: ${isSelected ? '3px solid #2563eb' : '2px solid white'};
              border-radius: 50%;
              box-shadow: 0 2px 6px rgba(0,0,0,0.35);
              transition: all 0.2s;
              ${isSelected ? 'outline: 2px solid #93c5fd; outline-offset: 2px;' : ''}
            "></div>`,
          iconSize:   [size, size],
          iconAnchor: [size / 2, size / 2],
          popupAnchor:[0, -size / 2 - 4],
        });

        const popupContent = `
          <div style="min-width:160px; font-family:system-ui; line-height:1.4">
            <div style="font-weight:700; font-size:14px; color:#1e293b">${v.eco}</div>
            <div style="font-size:12px; color:#64748b; margin-top:2px">${v.plates}</div>
            <hr style="margin:6px 0; border-color:#e2e8f0"/>
            <div style="font-size:12px; color:#475569">
              <div>Chofer: <strong>${v.driver ?? 'Sin asignar'}</strong></div>
              <div>Estado: <strong style="color:${color}">${v.status}</strong></div>
              <div>Velocidad: <strong>${v.speed} km/h</strong></div>
              ${v.gpsTime ? `<div style="color:#94a3b8;font-size:11px;margin-top:4px">${new Date(v.gpsTime).toLocaleString('es-MX')}</div>` : ''}
            </div>
          </div>`;

        if (markersRef.current.has(v.id)) {
          const marker = markersRef.current.get(v.id)!;
          marker.setLatLng([v.lat, v.lng]);
          marker.setIcon(svgIcon);
          marker.getPopup()?.setContent(popupContent);
        } else {
          const marker = L.marker([v.lat, v.lng], { icon: svgIcon })
            .addTo(map)
            .bindPopup(popupContent, { maxWidth: 220 });

          marker.on('click', () => onSelectVehicle(v.id));
          markersRef.current.set(v.id, marker);
        }

        existingIds.delete(v.id);
      }

      // Remover marcadores de vehículos eliminados
      Array.from(existingIds).forEach((oldId) => {
        markersRef.current.get(oldId)?.remove();
        markersRef.current.delete(oldId);
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles, selectedId]);

  // Centrar mapa al seleccionar vehículo
  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const marker = markersRef.current.get(selectedId);
    if (!marker) return;

    const latlng = marker.getLatLng();
    mapRef.current.setView(latlng, 15, { animate: true });
    marker.openPopup();
  }, [selectedId]);

  return (
    <div
      ref={divRef}
      className="w-full h-full"
      style={{ minHeight: 420 }}
    />
  );
}
