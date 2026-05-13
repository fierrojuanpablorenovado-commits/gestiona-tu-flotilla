import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: 'El correo es requerido' }, { status: 400 });
    }

    // Asegura que las columnas existan
    await sql`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS reset_token       TEXT,
        ADD COLUMN IF NOT EXISTS reset_token_exp   TIMESTAMPTZ
    `.catch(() => {});

    // Busca el usuario (responde igual si no existe — seguridad)
    const rows = await sql`
      SELECT id, email, first_name FROM users
      WHERE email = ${email.toLowerCase().trim()} AND active = true
      LIMIT 1
    `;

    if (rows.length === 0) {
      // Responde exitoso para no revelar si el correo existe
      return NextResponse.json({ ok: true });
    }

    const user = rows[0];

    // Genera token seguro (32 bytes hex = 64 chars)
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await sql`
      UPDATE users
      SET reset_token = ${token}, reset_token_exp = ${expires.toISOString()}
      WHERE id = ${user.id}
    `;

    return NextResponse.json({ ok: true, token, userId: user.id });
  } catch (err) {
    console.error('[forgot-password]', err);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
