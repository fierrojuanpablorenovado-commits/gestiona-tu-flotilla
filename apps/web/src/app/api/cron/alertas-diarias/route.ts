import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * Cron: cada día a las 7:00am
 * Detecta y registra alertas operativas activas:
 *   - Seguros próximos a vencer (15 días)
 *   - Seguros vencidos
 *   - Mantenimientos pendientes / programados
 *   - Cuentas semanales con status 'pending' de esta semana
 *   - Vehículos sin chofer asignado
 *
 * Evita duplicados: no re-inserta alertas que ya existen y no fueron descartadas.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    // Auto-crear tabla fleet_alerts si no existe (primera vez)
    await sql`
      CREATE TABLE IF NOT EXISTS fleet_alerts (
        id            BIGSERIAL PRIMARY KEY,
        tenant_id     TEXT        NOT NULL,
        tipo          TEXT        NOT NULL,
        entidad_ref   TEXT        NOT NULL,
        severidad     TEXT        NOT NULL CHECK (severidad IN ('alta', 'media', 'baja')),
        mensaje       TEXT        NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ,
        dismissed_at  TIMESTAMPTZ,
        CONSTRAINT fleet_alerts_unique UNIQUE (tenant_id, tipo, entidad_ref)
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_fleet_alerts_tenant
        ON fleet_alerts (tenant_id, dismissed_at, severidad)
    `;

    const tenants = await sql`SELECT id AS tenant_id FROM tenants`;
    let totalAlertas = 0;

    for (const tenant of tenants) {
      const tid = tenant.tenant_id;

      // ── 1. Seguros próximos a vencer (≤15 días) ──────────────────────────────
      const segurosVenciendo = await sql`
        SELECT i.id, v.eco, i.insurer, i.expiry_date,
               (i.expiry_date::date - CURRENT_DATE) AS dias_restantes
        FROM vehicle_insurance i
        JOIN vehicles v ON v.id = i.vehicle_id
        WHERE i.tenant_id = ${tid}
          AND i.expiry_date::date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '15 days')
      `.catch(() => []);

      for (const seg of segurosVenciendo) {
        const tipo = seg.dias_restantes <= 3 ? 'SEGURO_VENCE_3D' : 'SEGURO_VENCE_15D';
        const severidad = seg.dias_restantes <= 3 ? 'alta' : 'media';
        await upsertAlerta(tid, tipo, `insurance:${seg.id}`, severidad,
          `Seguro ${seg.insurer} — ${seg.eco} vence en ${seg.dias_restantes} día(s)`);
        totalAlertas++;
        if (seg.dias_restantes <= 3) {
          await notificarWA(`🔔 Seguro por vencer — ${seg.eco} (${seg.insurer}) vence en ${seg.dias_restantes} día(s). [Gestiona tu Flotilla]`);
        }
      }

      // ── 2. Seguros vencidos ───────────────────────────────────────────────────
      const segurosVencidos = await sql`
        SELECT i.id, v.eco, i.insurer
        FROM vehicle_insurance i
        JOIN vehicles v ON v.id = i.vehicle_id
        WHERE i.tenant_id = ${tid}
          AND i.expiry_date::date < CURRENT_DATE
      `.catch(() => []);

      for (const seg of segurosVencidos) {
        await upsertAlerta(tid, 'SEGURO_VENCIDO', `insurance:${seg.id}`, 'alta',
          `⚠️ Seguro vencido — ${seg.eco} (${seg.insurer}). Renovar de inmediato.`);
        totalAlertas++;
        await notificarWA(`⚠️ SEGURO VENCIDO — ${seg.eco} (${seg.insurer}). Renovar de inmediato.`, 'urgent');
      }

      // ── 3. Mantenimientos programados vencidos o próximos (≤7 días) ──────────
      const mantPendientes = await sql`
        SELECT mo.id, v.eco, mo.tipo,
               (mo.fecha_ingreso::date - CURRENT_DATE) AS dias_restantes
        FROM maintenance_orders mo
        JOIN vehicles v ON v.id = mo.vehicle_id
        WHERE mo.tenant_id = ${tid}
          AND mo.status = 'Programado'
          AND mo.fecha_ingreso::date <= (CURRENT_DATE + INTERVAL '7 days')
      `.catch(() => []);

      for (const mant of mantPendientes) {
        const tipo = mant.dias_restantes < 0 ? 'MANTENIMIENTO_VENCIDO' : 'MANTENIMIENTO_PROXIMO';
        const severidad = mant.dias_restantes <= 0 ? 'alta' : 'media';
        const texto = mant.dias_restantes < 0
          ? `Mantenimiento vencido — ${mant.eco}: ${mant.tipo}`
          : `Mantenimiento en ${mant.dias_restantes}d — ${mant.eco}: ${mant.tipo}`;
        await upsertAlerta(tid, tipo, `maintenance:${mant.id}`, severidad, texto);
        totalAlertas++;
      }

      // ── 4. Pagos pendientes esta semana ───────────────────────────────────────
      const pagosPendientes = await sql`
        SELECT wa.id, d.first_name, d.last_name, wa.rent,
               wa.week_start
        FROM weekly_accounts wa
        LEFT JOIN drivers d ON d.id = wa.driver_id
        WHERE wa.tenant_id = ${tid}
          AND wa.status = 'pending'
          AND wa.week_start >= date_trunc('week', CURRENT_DATE)
      `.catch(() => []);

      for (const pago of pagosPendientes) {
        const nombre = `${pago.first_name ?? ''} ${pago.last_name ?? ''}`.trim() || 'Chofer';
        await upsertAlerta(tid, 'PAGO_PENDIENTE', `weekly:${pago.id}`, 'media',
          `💰 ${nombre} — Renta $${Number(pago.rent).toLocaleString('es-MX')} pendiente esta semana`);
        totalAlertas++;
      }

      // ── 5. Vehículos activos sin chofer asignado ──────────────────────────────
      const sinChofer = await sql`
        SELECT v.id, v.eco
        FROM vehicles v
        WHERE v.tenant_id = ${tid}
          AND v.status = 'active'
          AND NOT EXISTS (
            SELECT 1 FROM drivers d
            WHERE d.vehicle_id = v.id AND d.status = 'active'
          )
      `.catch(() => []);

      for (const v of sinChofer) {
        await upsertAlerta(tid, 'VEHICULO_SIN_CHOFER', `vehicle:${v.id}`, 'baja',
          `Vehículo sin chofer — ${v.eco} está activo pero sin conductor asignado`);
        totalAlertas++;
      }

      // ── 6. Vehículos activos sin actividad (sin cuenta semanal en 14 días) ─────
      const sinActividad = await sql`
        SELECT v.id, v.eco
        FROM vehicles v
        WHERE v.tenant_id = ${tid}
          AND v.status = 'active'
          AND NOT EXISTS (
            SELECT 1 FROM weekly_accounts wa
            WHERE wa.vehicle_id = v.id
              AND wa.week_start >= (CURRENT_DATE - INTERVAL '14 days')
          )
      `.catch(() => []);

      for (const v of sinActividad) {
        await upsertAlerta(tid, 'VEHICULO_SIN_ACTIVIDAD', `vehicle:${v.id}`, 'media',
          `Vehículo ${v.eco} sin actividad — no tiene cuentas semanales en los últimos 14 días`);
        totalAlertas++;
      }
    }

    console.log(`[cron/alertas-diarias] ${totalAlertas} alertas procesadas`);
    return NextResponse.json({ ok: true, totalAlertas });

  } catch (err) {
    console.error('[cron/alertas-diarias] Error:', err);
    return NextResponse.json({ message: 'Error en alertas diarias', error: String(err) }, { status: 500 });
  }
}

// ─── Helper: insertar o actualizar alerta (evita duplicados) ──────────────────

async function upsertAlerta(
  tenantId: string,
  tipo: string,
  entidadRef: string,
  severidad: string,
  mensaje: string,
) {
  try {
    await sql`
      INSERT INTO fleet_alerts (tenant_id, tipo, entidad_ref, severidad, mensaje, created_at)
      VALUES (${tenantId}, ${tipo}, ${entidadRef}, ${severidad}, ${mensaje}, NOW())
      ON CONFLICT (tenant_id, tipo, entidad_ref)
      DO UPDATE SET
        mensaje    = EXCLUDED.mensaje,
        severidad  = EXCLUDED.severidad,
        updated_at = NOW(),
        dismissed_at = NULL
    `;
  } catch {
    // Si la tabla no existe aún, no falla el cron
  }
}

// ─── Helper: notificación push vía ntfy.sh (sin cuenta, sin API key) ────────
// Topic único de la app — JP suscribe desde: https://ntfy.sh/gtflotilla-alvolante-jp

const NTFY_TOPIC = process.env.NTFY_TOPIC || 'gtflotilla-alvolante-jp';

async function notificarWA(mensaje: string, prioridad: 'urgent' | 'high' | 'default' = 'high') {
  try {
    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      headers: {
        'Title':    '🚗 Gestiona tu Flotilla',
        'Priority': prioridad,
        'Tags':     prioridad === 'urgent' ? 'warning,rotating_light' : 'warning',
        'Content-Type': 'text/plain',
      },
      body: mensaje,
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // No interrumpir el cron si ntfy falla
  }
}
