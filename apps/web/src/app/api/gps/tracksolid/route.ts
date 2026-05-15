import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface TsDevice {
  imei: string;
  deviceName?: string;
  lat?: number;
  lng?: number;
  speed?: number | null;
  acc?: string;       // "0" = apagado, "1" = encendido
  gpsTime?: string;
  direction?: string; // heading en grados (string)
  status?: string;    // "ONLINE" | "OFFLINE" | etc.
}

interface VehicleGPS {
  id: string;
  eco: string;
  plates: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  driver: string | null;
  imei: string;
  lat: number;
  lng: number;
  speed: number;
  course: number;
  status: 'movimiento' | 'detenido' | 'sinsenal' | 'fueralinea';
  accStatus: boolean;
  gpsTime: string;
  isDemo: boolean;
}

interface DbVehicle {
  id: number;
  eco: string;
  plates: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  gps_imei: string | null;
  driver_name: string | null;
}

// ── TrackSolid Internal API ───────────────────────────────────────────────────

const TS_BASE = 'https://www.tracksolidpro.com';

async function fetchDeviceList(
  jwtToken: string,
  userId: number,
  orgId: string
): Promise<TsDevice[]> {
  const res = await fetch(`${TS_BASE}/v3/new/newEquipment/queryEquipmentList`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': jwtToken,
    },
    body: JSON.stringify({
      imei: '',
      startRow: '0',
      userType: 8,
      userId,
      orgId,
      siftType: '',
      sortType: '',
      sortRule: '',
      isNewMcType: '0',
      videoEntry: '',
      type: 'NORMAL',
      searchStatus: 'ALL',
    }),
  });

  if (!res.ok) throw new Error(`TrackSolid HTTP ${res.status}`);

  const data = await res.json();

  // Token expirado / inválido
  if (data.code === 10005 || data.code === '10005') {
    throw new Error('TOKEN_EXPIRED');
  }

  if (!data.ok && data.code !== 10000 && data.code !== 0) {
    throw new Error(`TrackSolid error ${data.code}: ${data.msg}`);
  }

  return (data.data ?? []) as TsDevice[];
}

// ── Demo mode ─────────────────────────────────────────────────────────────────

const DEMO_COORDS = [
  { lat: 20.6597, lng: -103.3496 },
  { lat: 20.6820, lng: -103.3416 },
  { lat: 20.6433, lng: -103.4290 },
  { lat: 20.5948, lng: -103.3396 },
  { lat: 20.7044, lng: -103.4025 },
  { lat: 20.6650, lng: -103.2890 },
];

function buildDemoVehicles(vehicles: DbVehicle[]): VehicleGPS[] {
  const statuses: VehicleGPS['status'][] = ['movimiento', 'movimiento', 'detenido', 'sinsenal', 'movimiento', 'detenido'];
  return vehicles.map((v, i) => {
    const coord = DEMO_COORDS[i % DEMO_COORDS.length];
    const st = statuses[i % statuses.length];
    return {
      id: String(v.id),
      eco: v.eco ?? v.plates,
      plates: v.plates,
      brand: v.brand ?? null,
      model: v.model ?? null,
      year: v.year ?? null,
      driver: v.driver_name ?? null,
      imei: v.gps_imei ?? '',
      lat: coord.lat + (Math.random() - 0.5) * 0.02,
      lng: coord.lng + (Math.random() - 0.5) * 0.02,
      speed: st === 'movimiento' ? Math.floor(Math.random() * 60) + 20 : 0,
      course: Math.floor(Math.random() * 360),
      status: st,
      accStatus: st === 'movimiento',
      gpsTime: new Date().toISOString(),
      isDemo: true,
    };
  });
}

// ── Guardar historial (fire-and-forget) ───────────────────────────────────────

async function saveHistory(tenantId: string, vehicles: VehicleGPS[]) {
  const valids = vehicles.filter(v => v.lat && v.lng && v.status !== 'sinsenal');
  if (!valids.length) return;
  for (const v of valids) {
    try {
      await sql`
        INSERT INTO vehicle_locations (tenant_id, vehicle_id, lat, lng, speed, course, status)
        VALUES (
          ${tenantId}::uuid, ${v.id},
          ${v.lat}, ${v.lng}, ${v.speed}, ${v.course}, ${v.status}
        )
      `;
    } catch { /* ignorar errores individuales */ }
  }
}

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const tenantId = session.tenantId;

    // Obtener vehículos con su IMEI
    const rawVehicles = await sql`
      SELECT
        v.id, v.eco, v.plates, v.brand, v.model, v.year, v.gps_imei,
        CONCAT(d.first_name, ' ', d.last_name) AS driver_name
      FROM vehicles v
      LEFT JOIN drivers d ON d.vehicle_id = v.id AND d.status = 'active'
      WHERE v.tenant_id = ${tenantId}
        AND v.status != 'inactive'
      ORDER BY v.eco
      LIMIT 100
    `;
    const vehicles = rawVehicles as DbVehicle[];

    // Leer credenciales TrackSolid desde tenant_settings
    let jwtToken: string | null = null;
    let userId: number | null = null;
    let orgId: string | null = null;

    try {
      const dbSettings = await sql`
        SELECT setting_key, value
        FROM tenant_settings
        WHERE tenant_id = ${tenantId}::uuid
          AND setting_key IN (
            'tracksolid_jwt_token',
            'tracksolid_user_id',
            'tracksolid_org_id'
          )
      `;
      for (const s of dbSettings) {
        if (s.setting_key === 'tracksolid_jwt_token' && s.value) jwtToken = s.value;
        if (s.setting_key === 'tracksolid_user_id'   && s.value) userId   = Number(s.value);
        if (s.setting_key === 'tracksolid_org_id'    && s.value) orgId    = s.value;
      }
    } catch {
      // tabla aún no existe
    }

    // Sin credenciales → modo demo
    if (!jwtToken || !userId || !orgId) {
      return NextResponse.json({
        vehicles: buildDemoVehicles(vehicles),
        isDemo: true,
        message: 'Modo demo — configura las credenciales GPS en Configuración',
      });
    }

    // Vehículos sin IMEI → demo
    const withImei = vehicles.filter((v) => v.gps_imei?.trim());
    if (withImei.length === 0) {
      return NextResponse.json({
        vehicles: buildDemoVehicles(vehicles),
        isDemo: true,
        message: 'Ningún vehículo tiene IMEI GPS registrado',
      });
    }

    // Obtener lista real de TrackSolid
    const tsDevices = await fetchDeviceList(jwtToken, userId, orgId);

    // Índice por IMEI
    const byImei: Record<string, TsDevice> = {};
    for (const d of tsDevices) {
      if (d.imei) byImei[d.imei.trim()] = d;
    }

    const result: VehicleGPS[] = withImei.map((v) => {
      const imei = v.gps_imei!.trim();
      const ts = byImei[imei];

      if (!ts || (ts.lat == null && ts.lng == null)) {
        return {
          id: String(v.id),
          eco: v.eco ?? v.plates,
          plates: v.plates,
          brand: v.brand ?? null,
          model: v.model ?? null,
          year: v.year ?? null,
          driver: v.driver_name ?? null,
          imei,
          lat: 0, lng: 0, speed: 0, course: 0,
          status: 'sinsenal' as const,
          accStatus: false,
          gpsTime: '',
          isDemo: false,
        };
      }

      const speed     = ts.speed ?? 0;
      const accOn     = ts.acc === '1';
      const hasCoords = (ts.lat != null && ts.lng != null) &&
                        (ts.lat !== 0   || ts.lng !== 0);
      // TrackSolid devuelve status: "ONLINE" | "OFFLINE" | "NEVER_ONLINE" | etc.
      const tsOffline = ts.status && ['OFFLINE','NEVER_ONLINE','INACTIVE'].includes(ts.status.toUpperCase());
      const status: VehicleGPS['status'] =
        tsOffline    ? 'fueralinea' :
        !hasCoords   ? 'sinsenal'   :
        speed > 3    ? 'movimiento' : 'detenido';

      return {
        id: String(v.id),
        eco: v.eco ?? v.plates,
        plates: v.plates,
        brand: v.brand ?? null,
        model: v.model ?? null,
        year: v.year ?? null,
        driver: v.driver_name ?? null,
        imei,
        lat: ts.lat ?? 0,
        lng: ts.lng ?? 0,
        speed,
        course: ts.direction ? Number(ts.direction) : 0,
        status,
        accStatus: accOn,
        gpsTime: ts.gpsTime ?? new Date().toISOString(),
        isDemo: false,
      };
    });

    // Guardar posiciones en historial (async, no bloquea respuesta)
    saveHistory(tenantId, result).catch(() => {});

    return NextResponse.json({ vehicles: result, isDemo: false });

  } catch (err) {
    console.error('[GPS TrackSolid] Error:', err);
    const msg = err instanceof Error ? err.message : 'Error desconocido';

    return NextResponse.json(
      {
        vehicles: [],
        isDemo: true,
        error: msg,
        message: msg === 'TOKEN_EXPIRED'
          ? 'Sesión GPS expirada — actualiza el token en Configuración'
          : 'Error al conectar con TrackSolid Pro',
      },
      { status: 200 }
    );
  }
}
