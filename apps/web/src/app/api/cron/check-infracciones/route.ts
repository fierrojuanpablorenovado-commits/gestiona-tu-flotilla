import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/cron/check-infracciones
 * Cron: diario a las 8:00 AM
 *
 * Consulta DOS fuentes de infracciones automáticamente para todos los tenants:
 *
 * 1. SSIM Guadalajara (municipal):
 *    POST https://apissim.guadalajara.gob.mx/obtener-infracciones
 *    Body: { placa }  — solo requiere la placa.
 *
 * 2. Portal Jalisco Estatal:
 *    POST https://gobiernoenlinea1.jalisco.gob.mx/serviciosVehiculares/adeudos
 *    Requiere: placa, numeroSerie (últimos 5 del VIN), nombrePropietario, numeroMotor.
 *    Solo se consulta si el vehículo tiene vin + numero_motor + jalisco_propietario.
 */

const SSIM_API    = 'https://apissim.guadalajara.gob.mx/obtener-infracciones';
const JALISCO_API = 'https://gobiernoenlinea1.jalisco.gob.mx/serviciosVehiculares/adeudos';

// ─── Jalisco helpers ──────────────────────────────────────────────────────────

interface JaliscoConcepto {
  folio?:       string;
  descripcion?: string;
  importe?:     number;
  baseLegal?:   string;
  periodo?:     number;
}
interface JaliscoAdeudo {
  idAdeudo?:  string;
  total?:     number;
  conceptos?: JaliscoConcepto[];
}

function decodeHtmlEntities(s: string) {
  return s
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function parseJaliscoHtml(html: string): JaliscoAdeudo[] {
  // 1) JSON directo
  try { const d = JSON.parse(html) as JaliscoAdeudo[]; if (Array.isArray(d)) return d; } catch {}
  // 2) <input value ="[{&quot;placa&quot;:...}]"> — portal Jalisco inyecta entidades HTML
  const mVal = html.match(/value\s*=\s*"(\[(?:[^"]|&quot;)*\])"/s);
  if (mVal?.[1]) {
    try { const d = JSON.parse(decodeHtmlEntities(mVal[1])) as JaliscoAdeudo[]; if (Array.isArray(d)) return d; } catch {}
  }
  // 3) Array JSON inline (fallback)
  const mi = html.match(/\[\s*\{[^<]*"placa"[\s\S]*?\}\s*\]/);
  if (mi) {
    try { const d = JSON.parse(decodeHtmlEntities(mi[0])) as JaliscoAdeudo[]; if (Array.isArray(d)) return d; } catch {}
  }
  return [];
}

// ─── Fecha helpers ─────────────────────────────────────────────────────────────

function parseFecha(raw: unknown): string {
  if (!raw) return new Date().toISOString().split('T')[0];
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.split('T')[0];
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const m2 = s.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`;
  return new Date().toISOString().split('T')[0];
}

// ─── WhatsApp helpers (inline para el cron — sin HTTP circular) ──────────────

interface WaInfraccion {
  tenantId:    string;
  vehicleEco:  string;
  driverPhone: string | null;
  waGroupLink: string | null;
  tipo:        string;
  folio:       string;
  monto:       number;
  fecha:       string;
  descripcion: string;
  fuente:      'ssim' | 'jalisco';
}

function buildInfraccionMsg(inf: WaInfraccion): string {
  const fmt = (n: number) =>
    '$' + Math.abs(n).toLocaleString('es-MX', { minimumFractionDigits: 0 });
  const fuente = inf.fuente === 'jalisco' ? '🏛️ Jalisco Estatal' : '🏙️ SSIM GDL';
  return [
    `🚨 *Nueva infracción detectada — ${inf.vehicleEco}*`,
    `${fuente}`,
    ``,
    `📅 Fecha: ${inf.fecha}`,
    `📄 Folio: ${inf.folio}`,
    inf.descripcion ? `📍 Detalle: ${inf.descripcion}` : '',
    `💰 Monto: *${fmt(inf.monto)}*`,
    ``,
    `⚠️ Comunícate con administración para aclarar esta infracción.`,
  ].filter(s => s !== undefined).join('\n');
}

async function sendWaInfraccion(
  inf: WaInfraccion,
  cfg: Record<string, string>,
): Promise<void> {
  const mode = cfg['wa_mode'] ?? 'webhook';
  const hasWhapi   = !!cfg['wa_whapi_token'];
  const hasMeta    = !!(cfg['wa_phone_number_id'] && cfg['wa_access_token']);
  const hasWebhook = !!cfg['wa_webhook_url'];
  const resolvedMode =
    (mode === 'whapi' && hasWhapi) ? 'whapi'
    : (mode === 'meta' && hasMeta) ? 'meta'
    : (mode === 'webhook' && hasWebhook) ? 'webhook'
    : hasWhapi ? 'whapi' : hasMeta ? 'meta' : hasWebhook ? 'webhook' : null;

  if (!resolvedMode) return;
  const msgText = buildInfraccionMsg(inf);

  if (resolvedMode === 'whapi') {
    const token    = cfg['wa_whapi_token'];
    const channel  = cfg['wa_whapi_channel']?.trim();
    const baseUrl  = channel ? `https://${channel}.whapi.cloud` : 'https://gate.whapi.cloud';
    const groupLink = inf.waGroupLink?.trim() ?? '';
    const isGroupJid = groupLink.endsWith('@g.us');
    const isPhoneJid = groupLink.endsWith('@s.whatsapp.net');
    let recipientJid = '';
    if (isGroupJid || isPhoneJid) {
      recipientJid = groupLink;
    } else if (groupLink && !groupLink.includes('chat.whatsapp.com')) {
      const c = groupLink.replace(/\D/g, '');
      recipientJid = `${c.startsWith('52') ? c : `52${c}`}@s.whatsapp.net`;
    } else if (inf.driverPhone) {
      const c = inf.driverPhone.replace(/\D/g, '');
      recipientJid = `${c.startsWith('52') ? c : `52${c}`}@s.whatsapp.net`;
    }
    if (!recipientJid) return;
    await fetch(`${baseUrl}/messages/text`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: recipientJid, body: msgText }),
      signal: AbortSignal.timeout(15_000),
    }).catch(() => {});
    return;
  }

  if (resolvedMode === 'meta') {
    if (!inf.driverPhone) return;
    const phone = inf.driverPhone.replace(/\D/g, '');
    const to    = phone.startsWith('52') ? phone : `52${phone}`;
    await fetch(
      `https://graph.facebook.com/v19.0/${cfg['wa_phone_number_id']}/messages`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg['wa_access_token']}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: msgText } }),
        signal: AbortSignal.timeout(15_000),
      }
    ).catch(() => {});
    return;
  }

  if (resolvedMode === 'webhook') {
    await fetch(cfg['wa_webhook_url'], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(cfg['wa_webhook_secret'] ? { 'X-Webhook-Secret': cfg['wa_webhook_secret'] } : {}) },
      body: JSON.stringify({ ...inf, tipo: 'infraccion', sentAt: new Date().toISOString() }),
      signal: AbortSignal.timeout(15_000),
    }).catch(() => {});
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  // Asegurar columnas (idempotente)
  await Promise.all([
    sql`ALTER TABLE infracciones ADD COLUMN IF NOT EXISTS fuente   TEXT DEFAULT 'manual'`.catch(() => {}),
    sql`ALTER TABLE infracciones ADD COLUMN IF NOT EXISTS ssim_id  TEXT`.catch(() => {}),
    sql`ALTER TABLE infracciones ADD COLUMN IF NOT EXISTS foto_url TEXT`.catch(() => {}),
    sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS numero_motor        TEXT`.catch(() => {}),
    sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS jalisco_propietario TEXT`.catch(() => {}),
  ]);

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS infracciones_ssim_id_unique
    ON infracciones (tenant_id, ssim_id)
    WHERE ssim_id IS NOT NULL
  `.catch(() => {});

  try {
    const tenants = await sql`
      SELECT DISTINCT tenant_id FROM vehicles WHERE status != 'deleted'
    `;

    let totalNuevas        = 0;
    let totalConsultadasSsim    = 0;
    let totalConsultadasJalisco = 0;
    const resumen: Array<{ tenantId: string; fuente: string; placa: string; nuevas: number }> = [];
    // Acumula infracciones nuevas para WA — se envían al final por tenant
    const waQueue: WaInfraccion[] = [];

    for (const tenant of tenants) {
      const tid = tenant.tenant_id;

      // ── 1. SSIM GDL ────────────────────────────────────────────────────────
      const vehiclesSsim = await sql`
        SELECT
          v.id  AS vehicle_id,
          COALESCE(NULLIF(TRIM(v.plates), ''), NULLIF(TRIM(v.eco), '')) AS placa,
          v.eco,
          v.wa_group_link,
          d.id    AS driver_id,
          d.phone AS driver_phone
        FROM vehicles v
        LEFT JOIN drivers d ON d.vehicle_id = v.id AND d.status = 'active'
        WHERE v.tenant_id = ${tid}
          AND v.status    != 'deleted'
          AND COALESCE(NULLIF(TRIM(v.plates), ''), NULLIF(TRIM(v.eco), '')) IS NOT NULL
      `;

      for (const v of vehiclesSsim) {
        totalConsultadasSsim++;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let ssimData: any[] = [];
        try {
          const res = await fetch(SSIM_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ placa: v.placa }),
            signal: AbortSignal.timeout(8_000),
          });
          if (res.ok) {
            const json = await res.json();
            ssimData = Array.isArray(json) ? json : [];
          }
        } catch { continue; }

        for (const inf of ssimData) {
          const ssimId  = String(inf.id ?? '');
          const folio   = String(inf.folio ?? ssimId);
          const fecha   = parseFecha(inf.fecha);
          const pagada  = String(inf.estatus ?? '').toUpperCase().includes('PAGADO')
                          && !String(inf.estatus ?? '').toUpperCase().includes('NO PAGADO');
          const monto   = Number(inf.monto ?? inf.pago?.monto_sin_descuento ?? inf.pago?.monto ?? 0);
          const fotoUrl = inf.fotos?.length > 0
            ? `https://apissim.guadalajara.gob.mx/image?foto=${folio}/${v.placa}-1.jpeg&pim=0`
            : null;
          const notas = pagada
            ? `Auto SSIM GDL. Placa: ${v.placa}. Ya pagada.`
            : `Auto SSIM GDL. Placa: ${v.placa}. PENDIENTE DE PAGO.`;

          const inserted = await sql`
            INSERT INTO infracciones (
              tenant_id, vehicle_id, driver_id,
              fecha, tipo, folio, descripcion,
              monto, pagada, responsable, cargo_chofer, cargo_monto,
              fuente, ssim_id, foto_url, notas
            )
            SELECT
              ${tid}, ${v.vehicle_id}, ${v.driver_id ?? null},
              ${fecha}, 'Infracción municipal GDL', ${folio},
              ${'Hora: ' + (inf.hora ?? 'N/D') + ' — SSIM ID: ' + ssimId},
              ${monto}, ${pagada}, 'chofer', true, ${monto},
              'ssim', ${ssimId}, ${fotoUrl}, ${notas}
            WHERE NOT EXISTS (
              SELECT 1 FROM infracciones
              WHERE tenant_id = ${tid} AND ssim_id = ${ssimId}
            )
            RETURNING id
          `.catch(() => []);

          if (inserted.length > 0) {
            totalNuevas++;
            resumen.push({ tenantId: tid, fuente: 'ssim', placa: v.placa, nuevas: 1 });
            waQueue.push({
              tenantId:    tid,
              vehicleEco:  String(v.eco),
              driverPhone: v.driver_phone as string | null,
              waGroupLink: v.wa_group_link as string | null,
              tipo:        'Infracción municipal GDL',
              folio:       folio,
              monto:       monto,
              fecha:       fecha,
              descripcion: String(inf.descripcion ?? inf.lugar ?? ''),
              fuente:      'ssim',
            });
          }
        }
      }

      // ── 2. Jalisco Estatal ─────────────────────────────────────────────────
      const vehiclesJalisco = await sql`
        SELECT
          v.id  AS vehicle_id,
          COALESCE(NULLIF(TRIM(v.plates), ''), NULLIF(TRIM(v.eco), '')) AS placa,
          v.eco,
          v.wa_group_link,
          TRIM(v.vin)                  AS vin,
          TRIM(v.numero_motor)         AS numero_motor,
          TRIM(v.jalisco_propietario)  AS jalisco_propietario,
          d.id    AS driver_id,
          d.phone AS driver_phone
        FROM vehicles v
        LEFT JOIN drivers d ON d.vehicle_id = v.id AND d.status = 'active'
        WHERE v.tenant_id = ${tid}
          AND v.status    != 'deleted'
          AND NULLIF(TRIM(v.vin), '')                    IS NOT NULL
          AND NULLIF(TRIM(v.numero_motor), '')            IS NOT NULL
          AND NULLIF(TRIM(v.jalisco_propietario), '')     IS NOT NULL
      `;

      for (const v of vehiclesJalisco) {
        totalConsultadasJalisco++;
        let adeudos: JaliscoAdeudo[] = [];
        try {
          const fd = new FormData();
          fd.append('placa',             String(v.placa));
          fd.append('numeroSerie',       String(v.vin).slice(-5));
          fd.append('nombrePropietario', String(v.jalisco_propietario));
          fd.append('numeroMotor',       String(v.numero_motor));

          const res = await fetch(JALISCO_API, {
            method: 'POST',
            body:   fd,
            signal: AbortSignal.timeout(15_000),
          });
          if (res.ok) adeudos = parseJaliscoHtml(await res.text());
        } catch { continue; }

        for (const adeudo of adeudos) {
          const adeudoId = String(adeudo.idAdeudo ?? '').trim();
          if (!adeudoId) continue;

          const monto     = Number(adeudo.total ?? 0);
          const concepto  = (adeudo.conceptos ?? []).find(c => c.folio);
          const folio     = String(concepto?.folio ?? adeudoId).trim();
          // Portal Jalisco no devuelve fecha exacta, solo período fiscal → usar fecha de detección
          const fechaStr  = new Date().toISOString().split('T')[0];
          const descs     = (adeudo.conceptos ?? [])
            .filter(c => (c.importe ?? 0) > 0)
            .map(c => String(c.descripcion ?? '').trim())
            .filter(Boolean).join(' / ');
          const baseLegal = (adeudo.conceptos ?? []).find(c => c.baseLegal)?.baseLegal ?? '';
          const notas     =
            `Auto Jalisco. Placa: ${v.placa}.` +
            (baseLegal ? ` Base legal: ${baseLegal}.` : '') +
            ` ID: ${adeudoId}. PENDIENTE DE PAGO.`;

          const inserted = await sql`
            INSERT INTO infracciones (
              tenant_id, vehicle_id, driver_id,
              fecha, tipo, folio, descripcion,
              monto, pagada, responsable, cargo_chofer, cargo_monto,
              fuente, ssim_id, notas
            )
            SELECT
              ${tid}, ${v.vehicle_id}, ${v.driver_id ?? null},
              ${fechaStr}::date, 'Infracción estatal Jalisco', ${folio}, ${descs || 'Sin descripción'},
              ${monto}, false, 'chofer', true, ${monto},
              'jalisco', ${adeudoId}, ${notas}
            WHERE NOT EXISTS (
              SELECT 1 FROM infracciones
              WHERE tenant_id = ${tid} AND ssim_id = ${adeudoId}
            )
            RETURNING id
          `.catch(() => []);

          if (inserted.length > 0) {
            totalNuevas++;
            resumen.push({ tenantId: tid, fuente: 'jalisco', placa: v.placa, nuevas: 1 });
            console.log(`[check-infracciones] Jalisco ${v.placa}: nuevo adeudo ${adeudoId} $${monto}`);
            waQueue.push({
              tenantId:    tid,
              vehicleEco:  String(v.eco),
              driverPhone: v.driver_phone as string | null,
              waGroupLink: v.wa_group_link as string | null,
              tipo:        'Infracción estatal Jalisco',
              folio:       folio,
              monto:       monto,
              fecha:       fechaStr,
              descripcion: descs,
              fuente:      'jalisco',
            });
          }
        }
      }
    }

    // ── 3. Enviar notificaciones WhatsApp por cada infracción nueva ───────────
    if (waQueue.length > 0) {
      // Cargar config WA una vez por tenant
      const tenantIds = Array.from(new Set(waQueue.map(w => w.tenantId)));
      const waConfigs: Record<string, Record<string, string>> = {};

      for (const tenantId of tenantIds) {
        const settingsRows = await sql`
          SELECT setting_key, value FROM tenant_settings
          WHERE tenant_id = ${tenantId}::uuid
            AND setting_key IN (
              'wa_mode', 'wa_phone_number_id', 'wa_access_token',
              'wa_template_name', 'wa_webhook_url', 'wa_webhook_secret',
              'wa_whapi_token', 'wa_whapi_channel'
            )
        `.catch(() => []);
        const cfg: Record<string, string> = {};
        for (const r of settingsRows) cfg[r.setting_key as string] = r.value as string;
        waConfigs[tenantId] = cfg;
      }

      // Enviar una notificación por cada infracción nueva
      for (const inf of waQueue) {
        const cfg = waConfigs[inf.tenantId];
        if (cfg && Object.keys(cfg).length > 0) {
          await sendWaInfraccion(inf, cfg);
          console.log(`[check-infracciones] WA enviado → ${inf.vehicleEco} folio:${inf.folio}`);
        }
      }
    }

    // ── 4. Crear alertas in-app (fleet_alerts) para infracciones nuevas ─────────
    if (waQueue.length > 0) {
      for (const inf of waQueue) {
        try {
          const msg = `🚨 Nueva infracción ECO ${inf.vehicleEco} — ${inf.tipo}. Folio: ${inf.folio}. Monto: $${Number(inf.monto).toLocaleString('es-MX')}`;
          await sql`
            INSERT INTO fleet_alerts (tenant_id, tipo, entidad_ref, severidad, mensaje, created_at)
            VALUES (${inf.tenantId}::uuid, 'INFRACCION_NUEVA', ${'infraccion:' + inf.folio}, 'alta', ${msg}, NOW())
            ON CONFLICT (tenant_id, tipo, entidad_ref)
            DO UPDATE SET
              mensaje    = EXCLUDED.mensaje,
              updated_at = NOW(),
              dismissed_at = NULL
          `.catch(() => {});
        } catch { /* no interrumpir */ }
      }
    }

    console.log(
      `[check-infracciones] SSIM: ${totalConsultadasSsim} consultadas | ` +
      `Jalisco: ${totalConsultadasJalisco} consultadas | Total nuevas: ${totalNuevas}`
    );

    return NextResponse.json({
      ok: true,
      totalConsultadasSsim,
      totalConsultadasJalisco,
      totalNuevas,
      resumen,
    });

  } catch (err) {
    console.error('[check-infracciones] Error:', err);
    return NextResponse.json({ message: 'Error', error: String(err) }, { status: 500 });
  }
}
