import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendPushToTenant } from '@/lib/webpush';

/**
 * Cron GPS Monitor — corre cada 15-30 min vía Make.com / cron-job.org
 *
 * Alertas implementadas:
 *   🔴 GPS_ZMG_EXIT       — Vehículo fuera de la ZMG
 *   🔴 GPS_SPEED_HIGH     — Velocidad > 100 km/h
 *   🔴 GPS_IMPACT         — Impacto real (sensor G hardware TrackSolid)
 *   🔴 GPS_HARD_STOP      — Frenada brusca severa (fallback software GPS)
 *   🟡 GPS_NO_SIGNAL      — Sin señal > 60 min en horario operativo
 *   🟡 GPS_IDLE_LONG      — Motor encendido parado > 30 min
 *   🟡 GPS_DRIVER_INACTIVE — Vehículo sin movimiento > 3h en horario activo
 *   🟡 GPS_LATE_START     — Vehículo no arrancó antes de las 11am
 *   📊 GPS_DAILY_SUMMARY  — Resumen diario a las 10pm
 */

// ── ZMG polygon ───────────────────────────────────────────────────────────────
const ZMG: [number, number][] = [
  [20.87,-103.60],[20.87,-103.25],[20.75,-103.08],[20.50,-103.10],
  [20.35,-103.22],[20.33,-103.48],[20.48,-103.68],[20.72,-103.68],[20.87,-103.60],
];
function inZMG(lat: number, lng: number): boolean {
  let inside = false;
  for (let i = 0, j = ZMG.length-1; i < ZMG.length; j = i++) {
    const [yi,xi]=ZMG[i],[yj,xj]=ZMG[j];
    if (((yi>lat)!==(yj>lat))&&(lng<(xj-xi)*(lat-yi)/(yj-yi)+xi)) inside=!inside;
  }
  return inside;
}

// ── TrackSolid fetch ──────────────────────────────────────────────────────────
interface TsDevice {
  imei: string; deviceName?: string;
  lat?: number; lng?: number; speed?: number | null;
  acc?: string; gpsTime?: string; status?: string; direction?: string;
}

interface TsAlarm {
  imei?: string; deviceName?: string;
  alarmType?: number | string; alarmTypeName?: string;
  alarmTime?: string; lat?: number; lng?: number; speed?: number; address?: string;
}

async function fetchTrackSolid(jwt: string, userId: number, orgId: string): Promise<TsDevice[]> {
  const res = await fetch('https://www.tracksolidpro.com/v3/new/newEquipment/queryEquipmentList', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': jwt },
    body: JSON.stringify({ imei:'', startRow:'0', userType:8, userId, orgId, siftType:'', sortType:'', sortRule:'', isNewMcType:'0', videoEntry:'', type:'NORMAL', searchStatus:'ALL' }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`TrackSolid HTTP ${res.status}`);
  const d = await res.json();
  if (d.code === 10005 || d.code === '10005') throw new Error('TOKEN_EXPIRED');
  return (d.data ?? []) as TsDevice[];
}

// Palabras clave que identifican alarma de impacto/vibración en TrackSolid
const IMPACT_KEYWORDS = ['vibr', 'impact', 'collis', 'crash', 'choque', 'golpe', 'accid'];
// Tipos numéricos conocidos: 9=vibración, 38=frenada brusca, 37=aceleración brusca
const IMPACT_ALARM_TYPES = new Set([9, 37, 38, 39]);

function isImpactAlarm(a: TsAlarm): boolean {
  if (a.alarmType !== undefined) {
    const n = Number(a.alarmType);
    if (IMPACT_ALARM_TYPES.has(n)) return true;
  }
  const name = (a.alarmTypeName ?? '').toLowerCase();
  return IMPACT_KEYWORDS.some(k => name.includes(k));
}

async function fetchTrackSolidAlarms(
  jwt: string, userId: number, orgId: string, minutesBack = 35
): Promise<TsAlarm[]> {
  try {
    const now  = new Date();
    const from = new Date(now.getTime() - minutesBack * 60000);
    const fmt  = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 19);

    // Probamos el endpoint interno más probable
    const res = await fetch('https://www.tracksolidpro.com/v3/new/newAlarm/queryAlarmList', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': jwt },
      body: JSON.stringify({
        imei: '', startTime: fmt(from), endTime: fmt(now),
        userId, orgId, alarmType: '', startRow: '0', pageSize: 200,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const d = await res.json();
    if (d.code === 10005 || d.code === '10005') return []; // token expirado
    // La respuesta puede traer .data, .list o .data.list
    const list = d.data?.list ?? d.data ?? d.list ?? [];
    return Array.isArray(list) ? (list as TsAlarm[]) : [];
  } catch { return []; }
}

// ── Cooldowns por tipo (minutos) ──────────────────────────────────────────────
const COOLDOWN: Record<string, number> = {
  GPS_ZMG_EXIT:        60,
  GPS_SPEED_HIGH:      20,
  GPS_IMPACT:          10,  // sensor G hardware — avisar rápido
  GPS_HARD_STOP:       60,  // fallback por software
  GPS_NO_SIGNAL:      120,
  GPS_IDLE_LONG:       60,
  GPS_DRIVER_INACTIVE: 180,
  GPS_LATE_START:     480,  // 1 vez por día
  GPS_DAILY_SUMMARY:  600,  // 1 vez por día
};

// ── Bark push (iOS nativo, instantáneo) ──────────────────────────────────────
const BARK_KEY = process.env.BARK_KEY || 'nWqzgg2rmFMkY8SvVVWNwA';
const APP_URL  = process.env.NEXT_PUBLIC_APP_URL || 'https://gestionatuflotilla.com';

async function pushAlert(
  title: string,
  body: string,
  level: 'critical' | 'timeSensitive' | 'active' = 'active',
  sound = '',
  tenantId?: string
) {
  // Bark — JP personal (respaldo siempre activo)
  try {
    const t = encodeURIComponent(title);
    const b = encodeURIComponent(body);
    const u = encodeURIComponent(`${APP_URL}/ubicacion`);
    const s = sound ? `&sound=${sound}` : '';
    const url = `https://api.day.app/${BARK_KEY}/${t}/${b}?level=${level}&isArchive=1&url=${u}&group=flotilla${s}`;
    await fetch(url, { signal: AbortSignal.timeout(8000) });
  } catch { /* non-blocking */ }

  // Web Push — todos los usuarios del tenant con notificaciones activas
  if (tenantId) {
    sendPushToTenant(tenantId, {
      title,
      body,
      url: `${APP_URL}/ubicacion`,
      tag:    `gtf-${Date.now()}`,
      urgent: level === 'critical',
    }).catch(() => {});
  }
}

// ── fleet_alerts upsert ───────────────────────────────────────────────────────
async function upsertAlert(tenantId: string, tipo: string, ref: string, sev: string, msg: string) {
  try {
    await sql`
      INSERT INTO fleet_alerts (tenant_id, tipo, entidad_ref, severidad, mensaje, created_at)
      VALUES (${tenantId}, ${tipo}, ${ref}, ${sev}, ${msg}, NOW())
      ON CONFLICT (tenant_id, tipo, entidad_ref)
      DO UPDATE SET mensaje = EXCLUDED.mensaje, severidad = EXCLUDED.severidad,
                   updated_at = NOW(), dismissed_at = NULL
    `;
  } catch { /* table may not exist yet */ }
}

// ── Notification cooldown helpers ─────────────────────────────────────────────
async function shouldNotify(tenantId: string, key: string, cooldownMin: number): Promise<boolean> {
  try {
    const rows = await sql`
      SELECT value FROM tenant_settings
      WHERE tenant_id = ${tenantId}::uuid AND setting_key = 'gps_alert_notified'
    `;
    if (!rows.length || !rows[0].value) return true;
    const state = JSON.parse(rows[0].value) as Record<string, string>;
    const last = state[key];
    if (!last) return true;
    const minutesSince = (Date.now() - new Date(last).getTime()) / 60000;
    return minutesSince >= cooldownMin;
  } catch { return true; }
}

async function markNotified(tenantId: string, key: string) {
  try {
    const rows = await sql`
      SELECT value FROM tenant_settings
      WHERE tenant_id = ${tenantId}::uuid AND setting_key = 'gps_alert_notified'
    `;
    const current = rows.length && rows[0].value ? JSON.parse(rows[0].value) : {};
    current[key] = new Date().toISOString();
    const newVal = JSON.stringify(current);
    await sql`
      INSERT INTO tenant_settings (tenant_id, setting_key, value)
      VALUES (${tenantId}::uuid, 'gps_alert_notified', ${newVal})
      ON CONFLICT (tenant_id, setting_key)
      DO UPDATE SET value = ${newVal}
    `;
  } catch { /* non-blocking */ }
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const hourUTC = new Date().getUTCHours();
  const hourMX  = (hourUTC - 6 + 24) % 24;
  const minUTC  = new Date().getUTCMinutes();

  if (hourMX < 5 || hourMX > 23) {
    return NextResponse.json({ ok: true, skipped: 'outside_hours', hourMX });
  }

  const results: Record<string, unknown> = {};

  try {
    const tenants = await sql`SELECT id AS tenant_id FROM tenants`;

    for (const { tenant_id: tid } of tenants) {
      const tenantAlerts: string[] = [];

      // Limpiar alertas GPS_DRIVER_INACTIVE con valor "999" (dato inválido de versiones anteriores)
      await sql`
        DELETE FROM fleet_alerts
        WHERE tenant_id = ${tid}
          AND tipo = 'GPS_DRIVER_INACTIVE'
          AND mensaje LIKE '%999 min%'
      `.catch(() => {});

      const vehicles = await sql`
        SELECT v.id, v.eco, v.plates, v.gps_imei,
          CONCAT(d.first_name, ' ', d.last_name) AS driver_name
        FROM vehicles v
        LEFT JOIN drivers d ON d.vehicle_id = v.id AND d.status = 'active'
        WHERE v.tenant_id = ${tid} AND v.status != 'inactive' AND v.gps_imei IS NOT NULL
      `.catch(() => []);

      if (!vehicles.length) continue;

      let jwt: string|null = null, userId: number|null = null, orgId: string|null = null;
      try {
        const creds = await sql`
          SELECT setting_key, value FROM tenant_settings
          WHERE tenant_id = ${tid}::uuid
            AND setting_key IN ('tracksolid_jwt_token','tracksolid_user_id','tracksolid_org_id')
        `;
        for (const c of creds) {
          if (c.setting_key === 'tracksolid_jwt_token') jwt = c.value;
          if (c.setting_key === 'tracksolid_user_id')   userId = Number(c.value);
          if (c.setting_key === 'tracksolid_org_id')    orgId = c.value;
        }
      } catch { continue; }

      if (!jwt || !userId || !orgId) continue;

      let devices: TsDevice[] = [];
      try { devices = await fetchTrackSolid(jwt, userId, orgId); }
      catch { continue; }

      const byImei: Record<string, TsDevice> = {};
      for (const d of devices) { if (d.imei) byImei[d.imei.trim()] = d; }

      // Alarmas de hardware (sensor G) de los últimos 35 min
      const tsAlarms = await fetchTrackSolidAlarms(jwt, userId, orgId, 35);
      const impactByImei: Record<string, TsAlarm> = {};
      for (const a of tsAlarms) {
        if (a.imei && isImpactAlarm(a)) {
          // Guardar la más reciente por IMEI
          const prev = impactByImei[a.imei.trim()];
          if (!prev || (a.alarmTime ?? '') > (prev.alarmTime ?? '')) {
            impactByImei[a.imei.trim()] = a;
          }
        }
      }

      // ── Stats para resumen diario ────────────────────────────────────────
      let totalKmHoy = 0;
      let vehiculosActivos = 0;
      const alertasHoy: string[] = [];

      for (const v of vehicles) {
        const imei = (v.gps_imei as string).trim();
        const ts   = byImei[imei];
        if (!ts) continue;

        const lat       = ts.lat ?? 0;
        const lng       = ts.lng ?? 0;
        const speed     = ts.speed ?? 0;
        const hasCoords = lat !== 0 || lng !== 0;
        const eco       = String(v.eco);
        const drv       = String(v.driver_name || 'Sin chofer');
        const vid       = String(v.id);

        // 🔴 ZMG EXIT
        if (hasCoords && !inZMG(lat, lng)) {
          await upsertAlert(tid, 'GPS_ZMG_EXIT', `vehicle:${vid}`, 'alta',
            `${eco} fuera de la ZMG — ${speed} km/h · ${drv}`);
          const key = `GPS_ZMG_EXIT:${vid}`;
          if (await shouldNotify(tid, key, COOLDOWN.GPS_ZMG_EXIT)) {
            await pushAlert(
              `🚨 ${eco} salió de la ZMG`,
              `Fuera de Zona Metropolitana GDL. Chofer: ${drv} · ${speed} km/h`,
              'critical', 'alarm', tid
            );
            await markNotified(tid, key);
            tenantAlerts.push(`ZMG:${eco}`);
            alertasHoy.push(`ZMG:${eco}`);
          }
        }

        // 🔴 ALTA VELOCIDAD (> 100 km/h)
        if (speed > 100) {
          await upsertAlert(tid, 'GPS_SPEED_HIGH', `vehicle:${vid}`, 'alta',
            `${eco} a ${speed} km/h — límite 80 km/h · ${drv}`);
          const key = `GPS_SPEED_HIGH:${vid}`;
          if (await shouldNotify(tid, key, COOLDOWN.GPS_SPEED_HIGH)) {
            await pushAlert(
              `⚡ Alta velocidad — ${eco}`,
              `${eco} registró ${speed} km/h. Chofer: ${drv}. Actúa de inmediato.`,
              'critical', 'alarm', tid
            );
            await markNotified(tid, key);
            tenantAlerts.push(`SPEED:${eco}:${speed}km/h`);
            alertasHoy.push(`SPEED:${eco}`);
          }
        }

        // 🔴 IMPACTO REAL — sensor G hardware de TrackSolid
        const hwImpact = impactByImei[(v.gps_imei as string).trim()];
        if (hwImpact) {
          const tipoNombre = hwImpact.alarmTypeName ?? `Tipo ${hwImpact.alarmType}`;
          const velImpacto = hwImpact.speed != null ? `${hwImpact.speed} km/h` : '';
          await upsertAlert(tid, 'GPS_IMPACT', `vehicle:${vid}`, 'critica',
            `${eco} · ${tipoNombre} · ${velImpacto} · ${drv}`);
          const key = `GPS_IMPACT:${vid}`;
          if (await shouldNotify(tid, key, COOLDOWN.GPS_IMPACT)) {
            await pushAlert(
              `🆘 IMPACTO DETECTADO — ${eco}`,
              `Sensor G activado (${tipoNombre}). ${velImpacto ? `Velocidad: ${velImpacto}.` : ''} Chofer: ${drv}. Verifica de inmediato.`,
              'critical', 'alarm', tid
            );
            await markNotified(tid, key);
            tenantAlerts.push(`IMPACT:${eco}:${tipoNombre}`);
            alertasHoy.push(`IMPACT:${eco}`);
          }
        } else {
          // Fallback software — frenada brusca severa por GPS (sin sensor G)
          try {
            const hardStop = await sql`
              SELECT a.speed as speed_before, b.speed as speed_after,
                b.recorded_at, a.lat, a.lng
              FROM vehicle_locations a
              JOIN vehicle_locations b
                ON b.vehicle_id = a.vehicle_id
                AND b.recorded_at > a.recorded_at
                AND b.recorded_at <= a.recorded_at + INTERVAL '90 seconds'
              WHERE a.tenant_id = ${tid}::uuid
                AND a.vehicle_id = ${vid}
                AND a.speed > 50
                AND b.speed < 10
                AND (a.speed - b.speed) > 40
                AND a.recorded_at >= NOW() - INTERVAL '20 minutes'
              ORDER BY a.recorded_at DESC
              LIMIT 1
            `;
            if (hardStop.length) {
              const hs = hardStop[0];
              await upsertAlert(tid, 'GPS_HARD_STOP', `vehicle:${vid}`, 'alta',
                `${eco} frenada severa: ${hs.speed_before}→${hs.speed_after} km/h · ${drv}`);
              const key = `GPS_HARD_STOP:${vid}`;
              if (await shouldNotify(tid, key, COOLDOWN.GPS_HARD_STOP)) {
                await pushAlert(
                  `⚠️ Frenada brusca — ${eco}`,
                  `${hs.speed_before}→${hs.speed_after} km/h en segundos (estimado por GPS). Chofer: ${drv}.`,
                  'critical', 'alarm', tid
                );
                await markNotified(tid, key);
                tenantAlerts.push(`HARD_STOP:${eco}`);
                alertasHoy.push(`HARD_STOP:${eco}`);
              }
            }
          } catch { /* ok */ }
        }

        // 🟡 SIN SEÑAL > 60 MIN
        if (ts.gpsTime) {
          const minSinSenal = (Date.now() - new Date(ts.gpsTime).getTime()) / 60000;
          if (minSinSenal > 60) {
            await upsertAlert(tid, 'GPS_NO_SIGNAL', `vehicle:${vid}`, 'media',
              `${eco} sin señal GPS hace ${Math.round(minSinSenal)} min · ${drv}`);
            const key = `GPS_NO_SIGNAL:${vid}`;
            if (await shouldNotify(tid, key, COOLDOWN.GPS_NO_SIGNAL)) {
              await pushAlert(
                `📡 Sin señal — ${eco}`,
                `${eco} lleva ${Math.round(minSinSenal)} min sin GPS. Chofer: ${drv}. Revisa dispositivo.`,
                'timeSensitive', '', tid
              );
              await markNotified(tid, key);
              tenantAlerts.push(`NO_SIGNAL:${eco}:${Math.round(minSinSenal)}min`);
            }
          }
        }

        // 🟡 RALENTÍ > 30 MIN
        if (ts.acc === '1' && speed <= 3 && hasCoords) {
          try {
            const idleCheck = await sql`
              SELECT MIN(recorded_at) as idle_since
              FROM vehicle_locations
              WHERE tenant_id = ${tid}::uuid
                AND vehicle_id = ${vid}
                AND speed = 0
                AND recorded_at >= NOW() - INTERVAL '2 hours'
              HAVING COUNT(*) >= 3
                AND MAX(recorded_at) >= NOW() - INTERVAL '6 minutes'
            `;
            if (idleCheck.length && idleCheck[0].idle_since) {
              const idleMin = (Date.now() - new Date(idleCheck[0].idle_since).getTime()) / 60000;
              if (idleMin >= 30) {
                await upsertAlert(tid, 'GPS_IDLE_LONG', `vehicle:${vid}`, 'media',
                  `${eco} en ralentí ${Math.round(idleMin)} min · ${drv}`);
                const key = `GPS_IDLE_LONG:${vid}`;
                if (await shouldNotify(tid, key, COOLDOWN.GPS_IDLE_LONG)) {
                  await pushAlert(
                    `🔥 Ralentí — ${eco}`,
                    `Motor encendido sin moverse ${Math.round(idleMin)} min. Chofer: ${drv}. Combustible desperdiciado.`,
                    'timeSensitive', '', tid
                  );
                  await markNotified(tid, key);
                  tenantAlerts.push(`IDLE:${eco}:${Math.round(idleMin)}min`);
                }
              }
            }
          } catch { /* ok */ }
        }

        // 🟡 CHOFER INACTIVO > 3h en horario laboral (8am–10pm)
        if (hourMX >= 8 && hourMX <= 22) {
          try {
            const inactivo = await sql`
              SELECT MAX(recorded_at) as last_move
              FROM vehicle_locations
              WHERE tenant_id = ${tid}::uuid
                AND vehicle_id = ${vid}
                AND speed > 5
                AND recorded_at >= NOW() - INTERVAL '4 hours'
            `;
            const lastMove = inactivo.length && inactivo[0].last_move
              ? new Date(inactivo[0].last_move).getTime()
              : null;

            // Si no hay historial en vehicle_locations, usar gpsTime del dispositivo
            // como referencia. Si tampoco hay gpsTime, omitir la alerta (sin datos suficientes).
            let inactiveMin: number | null = null;
            if (lastMove) {
              inactiveMin = (Date.now() - lastMove) / 60000;
            } else if (ts.gpsTime) {
              // gpsTime = última señal del GPS (no necesariamente con movimiento)
              // Solo usarlo si el speed actual también es 0 (confirmamos que está parado)
              const minSinSenal = (Date.now() - new Date(ts.gpsTime).getTime()) / 60000;
              if (speed === 0 && minSinSenal >= 180) {
                inactiveMin = minSinSenal;
              }
            }

            if (inactiveMin !== null && inactiveMin >= 180) {
              await upsertAlert(tid, 'GPS_DRIVER_INACTIVE', `vehicle:${vid}`, 'media',
                `${eco} sin movimiento ${Math.round(inactiveMin)} min en horario laboral · ${drv}`);
              const key = `GPS_DRIVER_INACTIVE:${vid}`;
              if (await shouldNotify(tid, key, COOLDOWN.GPS_DRIVER_INACTIVE)) {
                await pushAlert(
                  `😴 Sin actividad — ${eco}`,
                  `${eco} lleva ${Math.round(inactiveMin / 60)}h sin moverse en horario laboral. Chofer: ${drv}. ¿Está trabajando?`,
                  'timeSensitive', '', tid
                );
                await markNotified(tid, key);
                tenantAlerts.push(`INACTIVE:${eco}:${Math.round(inactiveMin)}min`);
              }
            } else if (inactiveMin === null || inactiveMin < 180) {
              vehiculosActivos++;
            }
          } catch { /* ok */ }
        }

        // 🟡 ARRANQUE TARDÍO — no hay actividad hoy antes de las 11am
        if (hourMX >= 11 && hourMX <= 13) {
          try {
            const activoHoy = await sql`
              SELECT COUNT(*) as cnt
              FROM vehicle_locations
              WHERE tenant_id = ${tid}::uuid
                AND vehicle_id = ${vid}
                AND speed > 5
                AND recorded_at >= CURRENT_DATE
            `;
            const cnt = Number(activoHoy[0]?.cnt ?? 0);
            if (cnt === 0) {
              await upsertAlert(tid, 'GPS_LATE_START', `vehicle:${vid}`, 'baja',
                `${eco} no ha arrancado hoy · ${drv}`);
              const key = `GPS_LATE_START:${vid}`;
              if (await shouldNotify(tid, key, COOLDOWN.GPS_LATE_START)) {
                await pushAlert(
                  `🌅 No ha arrancado — ${eco}`,
                  `${eco} no registra movimiento hoy. Chofer: ${drv}. ¿Salió a trabajar?`,
                  'active', '', tid
                );
                await markNotified(tid, key);
                tenantAlerts.push(`LATE_START:${eco}`);
              }
            }
          } catch { /* ok */ }
        }

        // Acumula km para resumen diario
        try {
          const kmHoy = await sql`
            SELECT COALESCE(SUM(
              6371 * 2 * ASIN(SQRT(
                POWER(SIN((RADIANS(b.lat) - RADIANS(a.lat))/2), 2) +
                COS(RADIANS(a.lat)) * COS(RADIANS(b.lat)) *
                POWER(SIN((RADIANS(b.lng) - RADIANS(a.lng))/2), 2)
              ))
            ), 0) as km
            FROM vehicle_locations a
            JOIN vehicle_locations b
              ON b.vehicle_id = a.vehicle_id
              AND b.recorded_at = (
                SELECT MIN(recorded_at) FROM vehicle_locations
                WHERE vehicle_id = a.vehicle_id
                  AND recorded_at > a.recorded_at
                  AND recorded_at <= a.recorded_at + INTERVAL '2 minutes'
              )
            WHERE a.tenant_id = ${tid}::uuid
              AND a.vehicle_id = ${vid}
              AND a.recorded_at >= CURRENT_DATE
              AND a.lat != 0 AND a.lng != 0
          `;
          totalKmHoy += Number(kmHoy[0]?.km ?? 0);
        } catch { /* ok */ }
      }

      // 📊 RESUMEN DIARIO — se manda entre 10pm y 10:30pm
      if (hourMX === 22 && minUTC < 30) {
        const key = `GPS_DAILY_SUMMARY:${new Date().toISOString().slice(0,10)}`;
        if (await shouldNotify(tid, key, COOLDOWN.GPS_DAILY_SUMMARY)) {
          const kmR    = Math.round(totalKmHoy * 10) / 10;
          const costo  = Math.round(kmR * 3.5);
          const nAlertas = alertasHoy.length;
          await pushAlert(
            `📊 Resumen del día — Flotilla`,
            `${vehiculosActivos}/${vehicles.length} vehículos activos · ${kmR} km totales · $${costo} costo estimado · ${nAlertas} alertas hoy`,
            'active', '', tid
          );
          await markNotified(tid, key);
          tenantAlerts.push(`SUMMARY:${kmR}km`);
        }
      }

      results[tid] = tenantAlerts;
    }

    return NextResponse.json({ ok: true, timestamp: new Date().toISOString(), results });

  } catch (err) {
    console.error('[cron/gps-monitor]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
