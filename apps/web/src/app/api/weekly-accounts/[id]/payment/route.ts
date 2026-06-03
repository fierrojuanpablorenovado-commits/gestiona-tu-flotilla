import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

// ── POST — Registrar pago de cuenta semanal ───────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionUser(req);
  if (!session?.tenantId) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = params;
    const body = await req.json();
    const { monto, notas, comprobante_url } = body;

    if (!monto || isNaN(Number(monto)) || Number(monto) <= 0) {
      return NextResponse.json({ message: 'Monto inválido' }, { status: 400 });
    }

    // Verificar que la cuenta pertenece al tenant
    const [cuenta] = await sql`
      SELECT id, rent, status,
             COALESCE(efectivo_a_entregar, 0) AS efectivo_a_entregar,
             COALESCE(cash_collected, 0)      AS cash_collected,
             COALESCE(saldo_pendiente, 0)     AS saldo_pendiente
      FROM weekly_accounts
      WHERE id = ${id} AND tenant_id = ${session.tenantId}
      LIMIT 1
    `;

    if (!cuenta) {
      return NextResponse.json({ message: 'Cuenta no encontrada' }, { status: 404 });
    }

    const montoNum         = Number(monto);
    // Usar efectivo_a_entregar - cash_collected para el balance real de renta
    // (saldo_pendiente puede estar modificado por el flujo de retiro — no es confiable aquí)
    const totalDebt        = Number(cuenta.efectivo_a_entregar);
    const yaColectado      = Number(cuenta.cash_collected);
    const saldoActual      = Math.max(0, totalDebt - yaColectado);  // cuánto debe el chofer ANTES de este pago
    const nuevoSaldo       = Math.max(0, saldoActual - montoNum);

    // Si el saldo restante es ≤ $100 (rentas no exactas → diferencia de centavos) → al corriente
    const UMBRAL_CORRIENTE = 100;
    const nuevoStatus = nuevoSaldo <= UMBRAL_CORRIENTE ? 'paid' : 'partial';

    // Añadir cash_collected si no existe aún (migration segura)
    await sql`
      ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS cash_collected NUMERIC DEFAULT 0
    `.catch(() => {});

    const [updated] = await sql`
      UPDATE weekly_accounts
      SET
        status         = ${nuevoStatus},
        cash_collected = COALESCE(cash_collected, 0) + ${montoNum},
        updated_at     = NOW()
      WHERE id        = ${id}
        AND tenant_id = ${session.tenantId}
      RETURNING id, status, cash_collected AS "cashCollected", rent,
                efectivo_a_entregar AS "efectivoAEntregar"
    `;

    // Guardar comprobante_url en weekly_accounts si se proporcionó
    if (comprobante_url) {
      await sql`
        ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS comprobante_url TEXT
      `.catch(() => {});
      await sql`
        UPDATE weekly_accounts
        SET comprobante_url = ${comprobante_url}
        WHERE id = ${id} AND tenant_id = ${session.tenantId}
      `.catch(() => {});
    }

    // Registrar en tesorería como ingreso
    const concepto = [
      'Renta semanal — cuenta #' + id,
      notas ? `Notas: ${notas}` : null,
      comprobante_url ? `Comprobante: ${comprobante_url}` : null,
    ].filter(Boolean).join(' | ');

    await sql`
      INSERT INTO treasury_transactions (tenant_id, tipo, monto, concepto, fecha, status, created_by)
      VALUES (
        ${session.tenantId},
        'ingreso',
        ${montoNum},
        ${concepto},
        CURRENT_DATE,
        'completed',
        ${session.id}
      )
    `.catch(() => {}); // No falla si tesorería no acepta el insert

    // Descartar alerta de pago pendiente si existe
    await sql`
      UPDATE fleet_alerts
      SET dismissed_at = NOW()
      WHERE tenant_id   = ${session.tenantId}
        AND tipo        = 'PAGO_PENDIENTE'
        AND entidad_ref = ${'weekly:' + id}
    `.catch(() => {});

    return NextResponse.json({
      ok: true,
      data: {
        id:              updated.id,
        status:          updated.status,
        cashCollected:   Number(updated.cashCollected),
        rent:            Number(updated.rent),
        efectivoTotal:   Number(updated.efectivoAEntregar),
        saldoPendiente:  Math.max(0, Number(updated.efectivoAEntregar) - Number(updated.cashCollected)),
      },
    });
  } catch (err) {
    console.error('[weekly-accounts payment POST]', err);
    return NextResponse.json({ message: 'Error al registrar pago' }, { status: 500 });
  }
}
