import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

// PATCH /api/weekly-accounts/[id]
// Edita campos de una cuenta semanal y recalcula efectivo_a_entregar
// Body: { rent?, contabilidad?, adicional?, saldo_pendiente?, dias_trabajados?, nota?, didi_balance? }

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const tid = session.tenantId;
    const wid = params.id;
    const body = await req.json();

    // Obtener cuenta actual para no pisar campos no enviados
    const existing = await sql`
      SELECT rent, contabilidad, adicional, saldo_pendiente,
             dias_trabajados, nota, didi_balance, monto_kms
      FROM weekly_accounts
      WHERE id = ${wid} AND tenant_id = ${tid}
      LIMIT 1
    `;
    if (!existing.length) {
      return NextResponse.json({ message: 'Cuenta no encontrada' }, { status: 404 });
    }

    const cur = existing[0];

    // Caso especial: solo cambiar status (ej. revertir pago a pending)
    const VALID_STATUSES = ['pending', 'paid', 'partial', 'disputed', 'approved'] as const;
    if (body.status !== undefined && Object.keys(body).length === 1) {
      const newStatus = body.status as string;
      if (!VALID_STATUSES.includes(newStatus as typeof VALID_STATUSES[number])) {
        return NextResponse.json({ message: 'Status inválido' }, { status: 400 });
      }
      await sql`
        UPDATE weekly_accounts SET status = ${newStatus}
        WHERE id = ${wid} AND tenant_id = ${tid}
      `;
      return NextResponse.json({ ok: true, status: newStatus });
    }

    const rent          = body.rent          !== undefined ? Number(body.rent)          : Number(cur.rent);
    const contabilidad  = body.contabilidad  !== undefined ? Number(body.contabilidad)  : Number(cur.contabilidad ?? 0);
    const adicional     = body.adicional     !== undefined ? Number(body.adicional)     : Number(cur.adicional ?? 0);
    const saldoPendiente= body.saldo_pendiente !== undefined ? Number(body.saldo_pendiente) : Number(cur.saldo_pendiente ?? 0);
    const diasTrabajados= body.dias_trabajados !== undefined ? Number(body.dias_trabajados) : Number(cur.dias_trabajados ?? 7);
    const didiBalance   = body.didi_balance  !== undefined ? Number(body.didi_balance)  : Number(cur.didi_balance ?? 0);
    const montoKms      = Number(cur.monto_kms ?? 0);
    const nota          = body.nota          !== undefined ? String(body.nota || '')    : String(cur.nota ?? '');

    // Recalcular: efectivo = renta + contabilidad - deposito_didi + kms_extra + adicional + saldo_previo
    const efectivoAEntregar = rent + contabilidad - didiBalance + montoKms + adicional + saldoPendiente;

    await sql`
      UPDATE weekly_accounts
      SET
        rent                 = ${rent},
        contabilidad         = ${contabilidad},
        adicional            = ${adicional},
        saldo_pendiente      = ${saldoPendiente},
        dias_trabajados      = ${diasTrabajados},
        didi_balance         = ${didiBalance},
        nota                 = ${nota},
        efectivo_a_entregar  = ${efectivoAEntregar}
      WHERE id         = ${wid}
        AND tenant_id  = ${tid}
    `;

    return NextResponse.json({ ok: true, efectivoAEntregar });
  } catch (err) {
    console.error('[weekly-accounts PATCH]', err);
    return NextResponse.json({ message: 'Error al actualizar cuenta' }, { status: 500 });
  }
}
