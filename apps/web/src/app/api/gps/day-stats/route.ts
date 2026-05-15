import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

// ── Haversine ────────────────────────────────────────────────────────────────
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Types ────────────────────────────────────────────────────────────────────
interface Pt {
  lat: number; lng: number; speed: number;
  status: string; recorded_at: string;
}

export interface StopEvent {
  lat: number; lng: number;
  started_at: string; ended_at: string;
  duration_minutes: number;
}

export interface VehicleStats {
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

// ── Analysis ─────────────────────────────────────────────────────────────────
function analyze(points: Pt[], costPerKm: number): VehicleStats {
  if (!points.length) {
    return {
      km_today: 0, productive_minutes: 0, idle_minutes: 0,
      stops: [], stops_count: 0, max_speed: 0,
      speed_violations: 0, driving_score: 100, cost_today: 0,
      last_signal: null, efficiency_pct: 0,
    };
  }

  let km = 0, prodMin = 0, idleMin = 0, maxSpd = 0, speedViol = 0, hardBrake = 0;
  const stops: StopEvent[] = [];
  let stopStart: Pt | null = null;
  let stopLast: Pt | null = null;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.speed > maxSpd) maxSpd = p.speed;
    if (p.speed > 80) speedViol++;

    if (i > 0) {
      const prev = points[i - 1];
      if (prev.speed - p.speed > 25 && prev.speed > 30) hardBrake++;

      const dist = haversine(prev.lat, prev.lng, p.lat, p.lng);
      if (dist < 0.5) km += dist; // filter GPS teleport jumps

      const dtMin = (new Date(p.recorded_at).getTime() - new Date(prev.recorded_at).getTime()) / 60000;
      if (dtMin > 0 && dtMin < 10) {
        if (p.speed > 3) prodMin += dtMin;
        else idleMin += dtMin;
      }
    }

    // Stop detection (speed ≤ 3 km/h)
    if (p.speed <= 3) {
      if (!stopStart) { stopStart = p; stopLast = p; }
      else stopLast = p;
    } else if (stopStart && stopLast) {
      const dur = (new Date(stopLast.recorded_at).getTime() - new Date(stopStart.recorded_at).getTime()) / 60000;
      if (dur >= 2) stops.push({ lat: stopStart.lat, lng: stopStart.lng, started_at: stopStart.recorded_at, ended_at: stopLast.recorded_at, duration_minutes: Math.round(dur) });
      stopStart = null; stopLast = null;
    }
  }

  // Close last ongoing stop
  if (stopStart && stopLast) {
    const dur = (new Date(stopLast.recorded_at).getTime() - new Date(stopStart.recorded_at).getTime()) / 60000;
    if (dur >= 2) stops.push({ lat: stopStart.lat, lng: stopStart.lng, started_at: stopStart.recorded_at, ended_at: stopLast.recorded_at, duration_minutes: Math.round(dur) });
  }

  // Driving score
  let score = 100;
  score -= Math.min(30, speedViol * 4);
  score -= Math.min(20, hardBrake * 5);
  score -= Math.min(15, Math.round(idleMin * 0.25));
  score = Math.max(0, Math.min(100, Math.round(score)));

  const totalActive = prodMin + idleMin;
  const efficiency_pct = totalActive > 0 ? Math.round((prodMin / totalActive) * 100) : 0;
  const kmRounded = Math.round(km * 10) / 10;

  return {
    km_today: kmRounded,
    productive_minutes: Math.round(prodMin),
    idle_minutes: Math.round(idleMin),
    stops,
    stops_count: stops.length,
    max_speed: maxSpd,
    speed_violations: speedViol,
    driving_score: score,
    cost_today: Math.round(kmRounded * costPerKm),
    last_signal: points.at(-1)?.recorded_at ?? null,
    efficiency_pct,
  };
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    // Cost per km (configurable, default $3.50 MXN)
    let costPerKm = 3.5;
    try {
      const s = await sql`
        SELECT value FROM tenant_settings
        WHERE tenant_id = ${session.tenantId}::uuid AND setting_key = 'cost_per_km'`;
      if (s.length && s[0].value) costPerKm = Number(s[0].value);
    } catch { /* table may not exist */ }

    const vehicleId = req.nextUrl.searchParams.get('vehicleId');

    // Fetch last 24h of GPS points
    const rows = await sql`
      SELECT vehicle_id, lat, lng, speed, status, recorded_at
      FROM vehicle_locations
      WHERE tenant_id = ${session.tenantId}::uuid
        ${vehicleId ? sql`AND vehicle_id = ${vehicleId}` : sql``}
        AND recorded_at >= NOW() - INTERVAL '24 hours'
        AND lat != 0 AND lng != 0
      ORDER BY vehicle_id, recorded_at ASC
    `;

    // Group by vehicle_id
    const grouped: Record<string, Pt[]> = {};
    for (const r of rows) {
      const vid = String(r.vehicle_id);
      if (!grouped[vid]) grouped[vid] = [];
      grouped[vid].push({
        lat: Number(r.lat), lng: Number(r.lng),
        speed: Number(r.speed), status: String(r.status),
        recorded_at: String(r.recorded_at),
      });
    }

    const stats: Record<string, VehicleStats> = {};
    for (const [vid, pts] of Object.entries(grouped)) {
      stats[vid] = analyze(pts, costPerKm);
    }

    return NextResponse.json({ stats, cost_per_km: costPerKm });
  } catch (err) {
    console.error('[GPS day-stats]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
