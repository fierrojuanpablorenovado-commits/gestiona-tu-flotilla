import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

async function requireAdmin(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return { error: 'No autorizado', status: 401 };
  if (session.role !== 'admin_general' && session.role !== 'super_admin')
    return { error: 'Solo el Administrador General puede gestionar usuarios', status: 403 };
  return { session };
}

// ── PUT — Actualizar usuario (nombre, rol, teléfono, contraseña, estado) ──────
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const check = await requireAdmin(req);
  if ('error' in check) return NextResponse.json({ message: check.error }, { status: check.status });
  const { session } = check;

  try {
    const { id } = params;
    const body = await req.json();
    const { firstName, lastName, role, phone, active, password } = body;

    // Verificar que el usuario pertenece al mismo tenant
    const owns = await sql`
      SELECT id FROM users
      WHERE id = ${id} AND tenant_id = ${session.tenantId}
      LIMIT 1
    `;
    if (owns.length === 0) {
      return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
    }

    // Si viene nueva contraseña, hashearla
    let hashUpdate = null;
    if (password) {
      if (password.length < 8) {
        return NextResponse.json({ message: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
      }
      hashUpdate = await bcrypt.hash(password, 10);
    }

    const result = await sql`
      UPDATE users SET
        first_name       = COALESCE(${firstName  ?? null}, first_name),
        last_name        = COALESCE(${lastName   ?? null}, last_name),
        role             = COALESCE(${role       ?? null}, role),
        phone            = COALESCE(${phone      ?? null}, phone),
        active           = COALESCE(${active     ?? null}, active),
        password_hash    = COALESCE(${hashUpdate ?? null}, password_hash),
        password_visible = CASE WHEN ${password ?? null} IS NOT NULL THEN ${password ?? null} ELSE password_visible END,
        avatar           = CASE
                             WHEN ${firstName ?? null} IS NOT NULL AND ${lastName ?? null} IS NOT NULL
                             THEN LEFT(${firstName ?? ''}, 1) || LEFT(${lastName ?? ''}, 1)
                             ELSE avatar
                           END,
        updated_at       = NOW()
      WHERE id = ${id} AND tenant_id = ${session.tenantId}
      RETURNING id, first_name AS "firstName", last_name AS "lastName",
                email, role, avatar, phone, active, password_visible AS "passwordVisible"
    `;

    return NextResponse.json({ data: result[0] });
  } catch (err) {
    console.error('[users PUT]', err);
    return NextResponse.json({ message: 'Error al actualizar usuario' }, { status: 500 });
  }
}

// ── DELETE — Desactivar usuario (soft delete) ─────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const check = await requireAdmin(req);
  if ('error' in check) return NextResponse.json({ message: check.error }, { status: check.status });
  const { session } = check;

  try {
    const { id } = params;

    // No puedes desactivarte a ti mismo
    if (id === session.id) {
      return NextResponse.json({ message: 'No puedes desactivar tu propia cuenta' }, { status: 400 });
    }

    const result = await sql`
      UPDATE users SET active = false, updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${session.tenantId}
      RETURNING id, email
    `;

    if (result.length === 0) {
      return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Usuario desactivado correctamente' });
  } catch (err) {
    console.error('[users DELETE]', err);
    return NextResponse.json({ message: 'Error al desactivar usuario' }, { status: 500 });
  }
}
