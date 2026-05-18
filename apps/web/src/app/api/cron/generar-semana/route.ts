import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * Cron: cada lunes a las 7:00am
 * Genera automáticamente las cuentas semanales para todos los vehículos activos
 * con chofer asignado que no tengan cuenta en la semana actual.
 *
 * Sólo se puede ejecutar desde Vercel Cron (CRON_SECRET) o manualmente por admin.
 */
export async function GET(req: NextRequest) {
  // Verificar autorización del cron
  const authHeader = req.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const now = new Date();
    // Calcular inicio de semana actual (lunes)
    const dayOfWeek = now.getDay(); // 0=dom, 1=lun...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    // Obtener todos los tenants activos
    const tenants = await sql`
      SELECT DISTINCT tenant_id FROM vehicles WHERE status = 'active'
    `;

    let totalCreadas = 0;
    const resumenPorTenant: Array<{ tenantId: string; creadas: number }> = [];

    for (const tenant of tenants) {
      const tid = tenant.tenant_id;

      // Obtener vehículos activos con chofer asignado en este tenant
      const vehiculosConChofer = await sql`
        SELECT
          v.id          AS vehicle_id,
          v.eco,
          v.weekly_rent AS renta,
          d.id          AS driver_id,
          d.first_name  AS chofer_nombre
        FROM vehicles v
        JOIN drivers d ON d.vehicle_id = v.id AND d.status = 'active'
        WHERE v.tenant_id = ${tid}
          AND v.status = 'active'
      `;

      let creadasEnTenant = 0;

      for (const v of vehiculosConChofer) {
        // Verificar si ya existe cuenta para esta semana
        const existing = await sql`
          SELECT id FROM weekly_accounts
          WHERE tenant_id  = ${tid}
            AND vehicle_id = ${v.vehicle_id}
            AND week_start  = ${weekStart.toISOString().split('T')[0]}
          LIMIT 1
        `;

        if (existing.length === 0) {
          // Buscar saldo pendiente de la semana anterior para este vehículo
          const prevSaldo = await sql`
            SELECT COALESCE(saldo_pendiente, 0)::int AS saldo
            FROM weekly_accounts
            WHERE tenant_id  = ${tid}
              AND vehicle_id = ${v.vehicle_id}
              AND week_start < ${weekStart.toISOString().split('T')[0]}
              AND retiro_confirmado = true
            ORDER BY week_start DESC
            LIMIT 1
          `.catch(() => []);

          const saldoArrastre = Number(prevSaldo[0]?.saldo ?? 0);

          // Renta semanal y cobro contabilidad base
          const rentaBase     = Number(v.renta ?? 0);
          const contaBase     = 75;   // cobro fijo semanal de contabilidad (default)
          // Efectivo inicial = renta + contabilidad + saldo arrastre (se actualiza al importar Didi)
          const efectivoBase  = rentaBase + contaBase + saldoArrastre;

          // Crear cuenta semanal con status 'pending'
          // Si hay saldo pendiente de semana anterior, se suma como 'adicional'
          await sql`
            INSERT INTO weekly_accounts (
              tenant_id, vehicle_id, driver_id,
              week_start, rent, adicional,
              didi_income, uber_income, indriver_income, other_income,
              contabilidad, efectivo_a_entregar,
              status, notes
            ) VALUES (
              ${tid},
              ${v.vehicle_id},
              ${v.driver_id},
              ${weekStart.toISOString().split('T')[0]},
              ${rentaBase},
              ${saldoArrastre},
              0, 0, 0, 0,
              ${contaBase},
              ${efectivoBase},
              'pending',
              ${saldoArrastre > 0
                ? `Generado automáticamente · Incluye $${saldoArrastre} pendiente semana anterior`
                : 'Generado automáticamente'}
            )
          `;
          creadasEnTenant++;
          totalCreadas++;
        }
      }

      if (creadasEnTenant > 0) {
        resumenPorTenant.push({ tenantId: tid, creadas: creadasEnTenant });
      }
    }

    console.log(`[cron/generar-semana] Semana ${weekStart.toISOString().split('T')[0]}: ${totalCreadas} cuentas creadas`);

    return NextResponse.json({
      ok: true,
      semana: weekStart.toISOString().split('T')[0],
      totalCreadas,
      resumenPorTenant,
    });
  } catch (err) {
    console.error('[cron/generar-semana] Error:', err);
    return NextResponse.json({ message: 'Error al generar semana', error: String(err) }, { status: 500 });
  }
}
