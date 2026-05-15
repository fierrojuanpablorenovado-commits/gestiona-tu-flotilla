import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

interface Pt { lat: number; lng: number; speed: number; recorded_at: string; }

function aggregatePoints(pts: Pt[], costPerKm: number) {
  if (!pts.length) return { km: 0, cost: 0, prodMin: 0, idleMin: 0, maxSpeed: 0, speedViol: 0, score: 100, efficiencyPct: 0 };
  let km = 0, prodMin = 0, idleMin = 0, maxSpeed = 0, speedViol = 0, hardBrake = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (p.speed > maxSpeed) maxSpeed = p.speed;
    if (p.speed > 80) speedViol++;
    if (i > 0) {
      const prev = pts[i-1];
      if (prev.speed - p.speed > 25 && prev.speed > 30) hardBrake++;
      const d = haversine(prev.lat, prev.lng, p.lat, p.lng);
      if (d < 0.5) km += d;
      const dt = (new Date(p.recorded_at).getTime() - new Date(prev.recorded_at).getTime()) / 60000;
      if (dt > 0 && dt < 10) { p.speed > 3 ? (prodMin += dt) : (idleMin += dt); }
    }
  }
  let score = 100;
  score -= Math.min(30, speedViol * 4);
  score -= Math.min(20, hardBrake * 5);
  score -= Math.min(15, Math.round(idleMin * 0.25));
  score = Math.max(0, Math.min(100, Math.round(score)));
  const kmR = Math.round(km * 10) / 10;
  const total = prodMin + idleMin;
  return {
    km: kmR, cost: Math.round(kmR * costPerKm),
    prodMin: Math.round(prodMin), idleMin: Math.round(idleMin),
    maxSpeed, speedViol, score,
    efficiencyPct: total > 0 ? Math.round((prodMin / total) * 100) : 0,
  };
}

function periodInterval(period: string): string {
  switch (period) {
    case 'today':   return '1 day';
    case 'week':    return '7 days';
    case 'month':   return '30 days';
    default:        return '7 days';
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const period   = req.nextUrl.searchParams.get('period') ?? 'week';
    const interval = periodInterval(period);

    // Cost per km
    let costPerKm = 3.5;
    try {
      const s = await sql`SELECT value FROM tenant_settings WHERE tenant_id = ${session.tenantId}::uuid AND setting_key = 'cost_per_km'`;
      if (s.length && s[0].value) costPerKm = Number(s[0].value);
    } catch {}

    // Current period GPS points
    const rows = await sql`
      SELECT vehicle_id, lat, lng, speed, status, recorded_at
      FROM vehicle_locations
      WHERE tenant_id = ${session.tenantId}::uuid
        AND recorded_at >= NOW() - INTERVAL ${interval}
        AND lat != 0 AND lng != 0
      ORDER BY vehicle_id, recorded_at ASC
    `;

    // Previous period (same length) for comparison
    const prevRows = await sql`
      SELECT vehicle_id, lat, lng, speed, status, recorded_at
      FROM vehicle_locations
      WHERE tenant_id = ${session.tenantId}::uuid
        AND recorded_at >= NOW() - INTERVAL '2 weeks'  -- double window
        AND recorded_at <  NOW() - INTERVAL ${interval} -- only previous window
        AND lat != 0 AND lng != 0
      ORDER BY vehicle_id, recorded_at ASC
    `;

    // Vehicles metadata
    const vehicles = await sql`
      SELECT v.id, v.eco, v.plates, v.brand, v.model,
        CONCAT(d.first_name, ' ', d.last_name) AS driver_name
      FROM vehicles v
      LEFT JOIN drivers d ON d.vehicle_id = v.id AND d.status = 'active'
      WHERE v.tenant_id = ${session.tenantId}::uuid AND v.status != 'inactive'
      ORDER BY v.eco
    `;

    // Group by vehicle
    const group = (rws: typeof rows): Record<string, Pt[]> => {
      const g: Record<string, Pt[]> = {};
      for (const r of rws) {
        const k = String(r.vehicle_id);
        if (!g[k]) g[k] = [];
        g[k].push({ lat: Number(r.lat), lng: Number(r.lng), speed: Number(r.speed), recorded_at: String(r.recorded_at) });
      }
      return g;
    };

    const current  = group(rows);
    const previous = group(prevRows);

    // Per-vehicle report
    const vehicleStats = vehicles.map(v => {
      const vid  = String(v.id);
      const cur  = aggregatePoints(current[vid]  ?? [], costPerKm);
      const prev = aggregatePoints(previous[vid] ?? [], costPerKm);
      return {
        id:         vid,
        eco:        v.eco,
        plates:     v.plates,
        brand:      v.brand,
        model:      v.model,
        driver:     v.driver_name,
        current:    cur,
        previous:   prev,
        // deltas
        kmDelta:         cur.km > 0 && prev.km > 0 ? Math.round(((cur.km - prev.km) / prev.km) * 100) : null,
        costDelta:       cur.cost > 0 && prev.cost > 0 ? Math.round(((cur.cost - prev.cost) / prev.cost) * 100) : null,
        efficiencyDelta: prev.efficiencyPct > 0 ? cur.efficiencyPct - prev.efficiencyPct : null,
        scoreDelta:      prev.score > 0 ? cur.score - prev.score : null,
      };
    });

    // Fleet totals
    const totals = vehicleStats.reduce((acc, v) => ({
      km:            acc.km + v.current.km,
      cost:          acc.cost + v.current.cost,
      idleMin:       acc.idleMin + v.current.idleMin,
      prodMin:       acc.prodMin + v.current.prodMin,
      speedViol:     acc.speedViol + v.current.speedViol,
    }), { km: 0, cost: 0, idleMin: 0, prodMin: 0, speedViol: 0 });

    const prevTotals = vehicleStats.reduce((acc, v) => ({
      km:    acc.km + v.previous.km,
      cost:  acc.cost + v.previous.cost,
    }), { km: 0, cost: 0 });

    const withData = vehicleStats.filter(v => v.current.km > 0);
    const avgEff   = withData.length ? Math.round(withData.reduce((s,v) => s + v.current.efficiencyPct, 0) / withData.length) : 0;
    const avgScore = withData.length ? Math.round(withData.reduce((s,v) => s + v.current.score, 0) / withData.length) : 0;

    // GPS alert history
    const alertHistory = await sql`
      SELECT tipo, entidad_ref, severidad, mensaje, created_at, updated_at
      FROM fleet_alerts
      WHERE tenant_id = ${session.tenantId}
        AND tipo LIKE 'GPS_%'
        AND dismissed_at IS NULL
        AND created_at >= NOW() - INTERVAL ${interval}
      ORDER BY created_at DESC
      LIMIT 50
    `.catch(() => []);

    // Ranking
    const ranking = [...vehicleStats]
      .filter(v => v.current.km > 0)
      .sort((a, b) => b.current.score - a.current.score);

    return NextResponse.json({
      period,
      vehicleStats,
      totals: { ...totals, avgEff, avgScore },
      prevTotals,
      ranking,
      alertHistory,
      cost_per_km: costPerKm,
    });
  } catch (err) {
    console.error('[GPS reports]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
