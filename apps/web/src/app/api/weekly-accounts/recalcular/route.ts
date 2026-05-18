import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

/**
 * POST /api/weekly-accounts/recalcular
 * Body: { weekStart: 'YYYY-MM-DD' }
 *
 * Recalcula efectivo_a_entregar para todas las cuentas de la semana indicada
 * que tienen efectivo_a_entregar = 0 pero rent > 0 (generadas por cron sin importar).
 *
 * Fórmula: (rent/7 * dias_trabajados) + contabilidad - didi_balance + adicional + monto_kms + saldo_pendiente
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const tid  = session.tenantId;
    const body = await req.json();
    const weekStart: string = body.weekStart;

    if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return NextResponse.json({ message: 'weekStart inválido (YYYY-MM-DD)' }, { status: 400 });
    }

    // Traer todas las cuentas de la semana
    const cuentas = await sql`
      SELECT id, rent, contabilidad, didi_balance, adicional, monto_kms,
             saldo_pendiente, dias_trabajados, efectivo_a_entregar
      FROM weekly_accounts
      WHERE tenant_id  = ${tid}
        AND week_start = ${weekStart}
    `;

    if (!cuentas.length) {
      return NextResponse.json({ message: `Sin cuentas para semana ${weekStart}` }, { status: 404 });
    }

    let actualizadas = 0;
    const detalle: Array<{ id: string; antes: number; despues: number }> = [];

    for (const c of cuentas) {
      const rent          = Number(c.rent          ?? 0);
      const contabilidad  = Number(c.contabilidad  ?? 0) || 75; // default 75 si no tiene
      const didiBalance   = Number(c.didi_balance  ?? 0);
      const adicional     = Number(c.adicional     ?? 0);
      const montoKms      = Number(c.monto_kms     ?? 0);
      const saldo         = Number(c.saldo_pendiente ?? 0);
      const dias          = Math.max(1, Math.min(7, Number(c.dias_trabajados ?? 7)));
      const efectivoActual = Number(c.efectivo_a_entregar ?? 0);

      // Solo recalcular si efectivo = 0 pero rent > 0 (cuenta no importada todavía)
      if (efectivoActual === 0 && rent > 0) {
        const nuevo = ((rent / 7) * dias) + contabilidad - didiBalance + adicional + montoKms + saldo;
        const nuevoRedondeado = Math.round(nuevo * 100) / 100;

        await sql`
          UPDATE weekly_accounts
          SET efectivo_a_entregar = ${nuevoRedondeado},
              contabilidad        = ${contabilidad}
          WHERE id = ${c.id} AND tenant_id = ${tid}
        `;
        detalle.push({ id: c.id, antes: efectivoActual, despues: nuevoRedondeado });
        actualizadas++;
      }
    }

    return NextResponse.json({
      ok: true,
      weekStart,
      total:       cuentas.length,
      actualizadas,
      detalle,
      mensaje:     actualizadas > 0
        ? `✅ ${actualizadas} cuenta(s) recalculadas`
        : 'Todas las cuentas ya tenían efectivo_a_entregar calculado',
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[weekly-accounts/recalcular]', msg);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
