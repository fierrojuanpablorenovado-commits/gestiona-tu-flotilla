import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ message: 'Token y contraseña son requeridos' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ message: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
    }

    // Busca usuario con token válido y no expirado
    const rows = await sql`
      SELECT id, email FROM users
      WHERE reset_token     = ${token}
        AND reset_token_exp > NOW()
        AND active          = true
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { message: 'El enlace ha expirado o no es válido. Solicita uno nuevo.' },
        { status: 400 }
      );
    }

    const user = rows[0];
    const hash = await bcrypt.hash(password, 10);

    await sql`
      UPDATE users
      SET password_hash  = ${hash},
          reset_token    = NULL,
          reset_token_exp = NULL
      WHERE id = ${user.id}
    `;

    return NextResponse.json({ ok: true, email: user.email });
  } catch (err) {
    console.error('[reset-password]', err);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
