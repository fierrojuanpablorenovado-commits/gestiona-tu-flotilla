import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

/** Solo admin_general puede gestionar usuarios */
async function requireAdmin(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return { error: 'No autorizado', status: 401 };
  if (session.role !== 'admin_general' && session.role !== 'super_admin')
    return { error: 'Solo el Administrador General puede gestionar usuarios', status: 403 };
  return { session };
}

// ── GET — Listar todos los usuarios del tenant ────────────────────────────────
export async function GET(req: NextRequest) {
  const check = await requireAdmin(req);
  if ('error' in check) return NextResponse.json({ message: check.error }, { status: check.status });
  const { session } = check;

  try {
    const rows = await sql`
      SELECT
        id,
        first_name       AS "firstName",
        last_name        AS "lastName",
        email,
        role,
        avatar,
        phone,
        active           AS "isActive",
        password_visible AS "passwordVisible",
        created_at       AS "createdAt"
      FROM users
      WHERE tenant_id = ${session.tenantId}
      ORDER BY
        CASE role
          WHEN 'admin_general'  THEN 1
          WHEN 'administrador'  THEN 2
          WHEN 'tesoreria'      THEN 3
          WHEN 'operaciones'    THEN 4
          WHEN 'mecanico'       THEN 5
          WHEN 'supervisor'     THEN 6
          WHEN 'socio'          THEN 7
          WHEN 'chofer'         THEN 8
          ELSE 9
        END,
        first_name
    `;
    return NextResponse.json(rows);
  } catch (err) {
    console.error('[users GET]', err);
    return NextResponse.json({ message: 'Error al obtener usuarios' }, { status: 500 });
  }
}

// ── POST — Crear nuevo usuario ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const check = await requireAdmin(req);
  if ('error' in check) return NextResponse.json({ message: check.error }, { status: check.status });
  const { session } = check;

  try {
    const body = await req.json();
    const { firstName, lastName, email, password, role, phone } = body;

    if (!firstName || !lastName || !email || !password || !role) {
      return NextResponse.json(
        { message: 'Nombre, apellido, correo, contraseña y rol son requeridos' },
        { status: 400 },
      );
    }
    if (password.length < 8) {
      return NextResponse.json({ message: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
    }

    // Verificar que el email no exista
    const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()} LIMIT 1`;
    if (existing.length > 0) {
      return NextResponse.json({ message: 'Ya existe un usuario con ese correo' }, { status: 409 });
    }

    const hash   = await bcrypt.hash(password, 10);
    const avatar = (firstName[0] + lastName[0]).toUpperCase();

    const result = await sql`
      INSERT INTO users (tenant_id, first_name, last_name, email, password_hash, role, avatar, phone)
      VALUES (
        ${session.tenantId},
        ${firstName.trim()},
        ${lastName.trim()},
        ${email.toLowerCase().trim()},
        ${hash},
        ${role},
        ${avatar},
        ${phone || null}
      )
      RETURNING id, first_name AS "firstName", last_name AS "lastName",
                email, role, avatar, phone, active, created_at AS "createdAt"
    `;

    return NextResponse.json({ data: result[0] }, { status: 201 });
  } catch (err) {
    console.error('[users POST]', err);
    return NextResponse.json({ message: 'Error al crear usuario' }, { status: 500 });
  }
}
