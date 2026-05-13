import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import crypto from 'crypto';

// ── Token cache en memoria (válido 20 min) ────────────────────────────────────
interface TokenCache {
  token: string;
  expiresAt: number;
}
let tokenCache: TokenCache | null = null;

const TRACKSOLID_BASE = 'https://us-open.tracksolidpro.com/route/rest';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSign(appKey: string, appSecret: string, timestamp: number): string {
  return crypto
    .createHash('md5')
    .update(`${appKey}${appSecret}${timestamp}`)
    .digest('hex')
    .toUpperCase();
}

async function getAccessToken(appKey: string, appSecret: string): Promise<string> {
  const now = Date.now();

  // Usar token cacheado si todavía es válido
  if (tokenCache && tokenCache.expiresAt > now) {
    return tokenCache.token;
  }

  const timestamp = Math.floor(now / 1000);
  const sign = buildSign(appKey, appSecret, timestamp);

  const params = new URLSearchParams({
    method: 'jimi.oauth.token.get',
    appKey,
    appSecret,
    timestamp: String(timestamp),
    sign,
  });

  const res = await fetch(`${TRACKSOLID_BASE}?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!res.ok) {
    throw new Error(`TrackSolid auth HTTP ${res.status}`);
  }

  const data = await res.json();
  if (data.code !== '0' && data.code !== 0) {
    throw new Error(`TrackSolid auth error: ${data.message ?? JSON.stringify(data)}`);
  }

  const token: string = data.data?.accessToken ?? data.result?.accessToken;
  if (!token) {
    throw new Error('Token no encontrado en respuesta de TrackSolid');
  }

  // Cache por 20 min
  tokenCache = {
    token,
    expiresAt: now + 20 * 60 * 1000,
  };

  return token;
}

async function getDeviceLocations(
  accessToken: string,
  imeis: string[]
): Promise<Record<string, TrackSolidLocation>> {
  const params = new URLSearchParams({
    method: 'jimi.device.location.get',
    access_token: accessToken,
    imeis: imeis.join(','),
  });

  const res = await fetch(`${TRACKSOLID_BASE}?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!res.ok) {
    throw new Error(`TrackSolid location HTTP ${res.status}`);
  }

  const data = await res.json();
  if (data.code !== '0' && data.code !== 0) {
    throw new Error(`TrackSolid location error: ${data.message ?? JSON.stringify(data)}`);
  }

  const result: Record<string, TrackSolidLocation> = {};
  const locations: TrackSolidLocation[] = data.data ?? data.result ?? [];

  for (const loc of locations) {
    if (loc.imei) {
      result[loc.imei] = loc;
    }
  }

  return result;
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface TrackSolidLocation {
  imei: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
  course?: number;
  accStatus?: number; // 1 = encendido, 0 = apagado
  gpsTime?: string;
}

interface VehicleGPS {
  id: string;
  eco: string;
  plates: string;
  driver: string | null;
  imei: string;
  lat: number;
  lng: number;
  speed: number;
  course: number;
  status: 'movimiento' | 'detenido' | 'sinsenal';
  accStatus: boolean;
  gpsTime: string;
  isDemo: boolean;
}

// ── Datos demo (Guadalajara ZMG) ──────────────────────────────────────────────

const DEMO_COORDS = [
  { lat: 20.6597, lng: -103.3496 }, // Centro GDL
  { lat: 20.6820, lng: -103.3416 }, // Zapopan
  { lat: 20.6433, lng: -103.4290 }, // Tlaquepaque
  { lat: 20.5948, lng: -103.3396 }, // Tlajomulco
  { lat: 20.7044, lng: -103.4025 }, // Zapopan Norte
  { lat: 20.6650, lng: -103.2890 }, // Tonalá
];

function buildDemoVehicles(vehicles: DbVehicle[]): VehicleGPS[] {
  return vehicles.map((v, i) => {
    const coord = DEMO_COORDS[i % DEMO_COORDS.length];
    const statuses: VehicleGPS['status'][] = ['movimiento', 'movimiento', 'detenido', 'sinsenal', 'movimiento', 'detenido'];
    return {
      id: String(v.id),
      eco: v.eco ?? v.plates,
      plates: v.plates,
      driver: v.driver_name ?? null,
      imei: v.gps_imei ?? '',
      lat: coord.lat + (Math.random() - 0.5) * 0.02,
      lng: coord.lng + (Math.random() - 0.5) * 0.02,
      speed: statuses[i % statuses.length] === 'movimiento' ? Math.floor(Math.random() * 60) + 20 : 0,
      course: Math.floor(Math.random() * 360),
      status: statuses[i % statuses.length],
      accStatus: statuses[i % statuses.length] === 'movimiento',
      gpsTime: new Date().toISOString(),
      isDemo: true,
    };
  });
}

interface DbVehicle {
  id: number;
  eco: string;
  plates: string;
  gps_imei: string | null;
  driver_name: string | null;
}

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const tenantId = session.tenantId;

    // Obtener vehículos con su IMEI desde la BD
    const rawVehicles = await sql`
      SELECT
        v.id,
        v.eco,
        v.plates,
        v.gps_imei,
        CONCAT(d.first_name, ' ', d.last_name) AS driver_name
      FROM vehicles v
      LEFT JOIN drivers d ON d.id = v.driver_id
      WHERE v.tenant_id = ${tenantId}
        AND v.status != 'inactive'
      ORDER BY v.eco
      LIMIT 100
    `;
    const vehicles = rawVehicles as DbVehicle[];

    const appKey = process.env.TRACKSOLID_APP_KEY;
    const appSecret = process.env.TRACKSOLID_APP_SECRET;

    // Sin credenciales → modo demo
    if (!appKey || !appSecret) {
      const demoData = buildDemoVehicles(vehicles);
      return NextResponse.json({
        vehicles: demoData,
        isDemo: true,
        message: 'Modo demo — configura tus credenciales GPS en Configuración',
      });
    }

    // Filtrar vehículos que tienen IMEI registrado
    const vehiclesWithImei = vehicles.filter((v) => v.gps_imei?.trim());

    if (vehiclesWithImei.length === 0) {
      const demoData = buildDemoVehicles(vehicles);
      return NextResponse.json({
        vehicles: demoData,
        isDemo: true,
        message: 'Ningún vehículo tiene IMEI GPS registrado',
      });
    }

    // Obtener token y ubicaciones reales
    const accessToken = await getAccessToken(appKey, appSecret);
    const imeis = vehiclesWithImei.map((v) => v.gps_imei!.trim());
    const locations = await getDeviceLocations(accessToken, imeis);

    const result: VehicleGPS[] = vehiclesWithImei.map((v) => {
      const loc = locations[v.gps_imei!.trim()];

      if (!loc || (!loc.latitude && !loc.longitude)) {
        return {
          id: String(v.id),
          eco: v.eco ?? v.plates,
          plates: v.plates,
          driver: v.driver_name ?? null,
          imei: v.gps_imei ?? '',
          lat: 0,
          lng: 0,
          speed: 0,
          course: 0,
          status: 'sinsenal' as const,
          accStatus: false,
          gpsTime: '',
          isDemo: false,
        };
      }

      const speed = loc.speed ?? 0;
      const accOn = loc.accStatus === 1;
      const status: VehicleGPS['status'] =
        speed > 3 ? 'movimiento' : accOn ? 'detenido' : 'sinsenal';

      return {
        id: String(v.id),
        eco: v.eco ?? v.plates,
        plates: v.plates,
        driver: v.driver_name ?? null,
        imei: v.gps_imei ?? '',
        lat: loc.latitude ?? 0,
        lng: loc.longitude ?? 0,
        speed,
        course: loc.course ?? 0,
        status,
        accStatus: accOn,
        gpsTime: loc.gpsTime ?? new Date().toISOString(),
        isDemo: false,
      };
    });

    return NextResponse.json({ vehicles: result, isDemo: false });
  } catch (err) {
    console.error('[GPS TrackSolid] Error:', err);

    // En caso de error de API, intentar con demo
    return NextResponse.json(
      {
        vehicles: [],
        isDemo: true,
        error: err instanceof Error ? err.message : 'Error desconocido',
        message: 'Error al conectar con TrackSolid Pro',
      },
      { status: 200 } // 200 para no romper el frontend
    );
  }
}
