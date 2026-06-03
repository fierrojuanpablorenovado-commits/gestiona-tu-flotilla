import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

// PATCH /api/weekly-accounts/[id]/retiro
// Body: { retiro_confirmado, retiro_monto, retiro_nota?, retiro_gasto_monto? }
// saldo_pendiente = efectivo_a_entregar − retiro_monto − retiro_gasto_monto

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const tid = session.tenantId;
    const params = await Promise.resolve(context.params);
    const wid    = params.id;

    if (!wid) {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    }

    const body = await req.json();

    const confirmado  = body.retiro_confirmado !== false;
    const monto       = body.retiro_monto       != null ? Number(body.retiro_monto)      : null;
    const nota        = body.retiro_nota        != null ? String(body.retiro_nota).trim() || null : null;
    const gastoMonto  = body.retiro_gasto_monto != null ? Number(body.retiro_gasto_monto) : 0;

    // ── Verificar que la cuenta existe ──────────────────────────────────────
    const cuenta = await sql`
      SELECT id, COALESCE(efectivo_a_entregar, contabilidad, rent, 0)::numeric AS efectivo
      FROM weekly_accounts
      WHERE id = ${wid} AND tenant_id = ${tid}
      LIMIT 1
    `;

    if (!cuenta.length) {
      return NextResponse.json(
        { message: `Cuenta ${wid} no encontrada para tenant ${tid}` },
        { status: 404 },
      );
    }

    // ── Calcular saldo pendiente ────────────────────────────────────────────
    let saldoPendiente = 0;
    if (confirmado && monto !== null && monto > 0) {
      const efectivo = Number(cuenta[0].efectivo ?? 0);
      saldoPendiente = Math.max(0, Math.round(efectivo - monto - gastoMonto));
    }

    // Si el saldo restante es ≤ $100, marcar al corriente (igual que en payment)
    const UMBRAL_CORRIENTE = 100;
    const nuevoStatus = (confirmado && saldoPendiente <= UMBRAL_CORRIENTE) ? 'paid' : null;

    // ── UPDATE 1: columnas que SIEMPRE existen ──────────────────────────────
    if (monto !== null) {
      if (nuevoStatus) {
        await sql`
          UPDATE weekly_accounts
          SET
            retiro_confirmado = ${confirmado},
            retiro_monto      = ${monto},
            saldo_pendiente   = ${saldoPendiente},
            status            = ${nuevoStatus}
          WHERE id = ${wid} AND tenant_id = ${tid}
        `;
      } else {
        await sql`
          UPDATE weekly_accounts
          SET
            retiro_confirmado = ${confirmado},
            retiro_monto      = ${monto},
            saldo_pendiente   = ${saldoPendiente}
          WHERE id = ${wid} AND tenant_id = ${tid}
        `;
      }
    } else {
      await sql`
        UPDATE weekly_accounts
        SET
          retiro_confirmado = false,
          retiro_monto      = 0,
          saldo_pendiente   = 0
        WHERE id = ${wid} AND tenant_id = ${tid}
      `;
    }

    // ── UPDATE 2: columnas nuevas (retiro_nota, retiro_gasto_monto) ─────────
    // Las creamos si no existen, luego actualizamos
    try {
      await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS retiro_nota        TEXT`;
      await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS retiro_gasto_monto NUMERIC DEFAULT 0`;
      await sql`
        UPDATE weekly_accounts
        SET
          retiro_nota        = ${nota},
          retiro_gasto_monto = ${gastoMonto}
        WHERE id = ${wid} AND tenant_id = ${tid}
      `;
    } catch (e) {
      // Si falla el segundo bloque, no es bloqueante — el retiro principal ya guardó
      console.warn('[retiro] UPDATE 2 (nota/gasto) falló:', e instanceof Error ? e.message : e);
    }

    return NextResponse.json({ ok: true, saldoPendiente });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[weekly-accounts/retiro] Error:', msg);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
