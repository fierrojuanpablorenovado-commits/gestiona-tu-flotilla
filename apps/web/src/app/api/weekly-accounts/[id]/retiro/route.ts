import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

// PATCH /api/weekly-accounts/[id]/retiro
// Confirma que el efectivo sin tarjeta fue recibido fisicamente.
// Body: { retiro_confirmado: boolean, retiro_comprobante_url?: string }

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

    const confirmado  = body.retiro_confirmado !== false; // default true
    const comprobante = (body.retiro_comprobante_url || '').trim() || null;
    const monto       = body.retiro_monto != null ? Number(body.retiro_monto) : null;

    if (monto !== null) {
      await sql`
        UPDATE weekly_accounts
        SET
          retiro_confirmado      = ${confirmado},
          retiro_comprobante_url = ${comprobante},
          retiro_monto           = ${monto}
        WHERE id        = ${wid}
          AND tenant_id = ${tid}
      `;
    } else {
      await sql`
        UPDATE weekly_accounts
        SET
          retiro_confirmado      = ${confirmado},
          retiro_comprobante_url = ${comprobante}
        WHERE id        = ${wid}
          AND tenant_id = ${tid}
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[weekly-accounts/retiro] Error:', err);
    return NextResponse.json({ message: 'Error al confirmar retiro' }, { status: 500 });
  }
}
