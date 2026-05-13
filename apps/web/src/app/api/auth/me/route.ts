import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);

    if (!session) {
      return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    }

    // Refrescar company/tenant name desde la DB (evita que el JWT desactualizado
    // muestre el nombre anterior del tenant)
    const rows = await sql`
      SELECT t.name AS company
      FROM users u
      LEFT JOIN tenants t ON t.id = u.tenant_id
      WHERE u.id = ${session.id}
      LIMIT 1
    `.catch(() => []);

    const freshCompany = rows[0]?.company ?? session.company;

    return NextResponse.json({
      user: {
        ...session,
        id:        session.id,
        company:   freshCompany,
      },
    });
  } catch {
    return NextResponse.json({ message: 'Sesión inválida' }, { status: 401 });
  }
}
