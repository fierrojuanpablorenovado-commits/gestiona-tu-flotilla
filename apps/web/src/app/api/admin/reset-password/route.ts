import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import bcrypt from 'bcryptjs';

/**
 * POST /api/admin/reset-password
 * Resetea la contraseña de un usuario y devuelve la nueva
 * Protegido por x-admin-secret header
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret');
  const expected = process.env.ADMIN_SECRET || 'gtf-admin-secret';
  if (secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json() as { userId?: string; tenantId?: string };

    if (!body.userId && !body.tenantId) {
      return NextResponse.json(
        { error: 'userId o tenantId requerido' },
        { status: 400 }
      );
    }

    // Si es por tenantId, obtener el admin
    let userId = body.userId;
    if (body.tenantId && !userId) {
      const adminRes = await sql`
        SELECT id FROM users
        WHERE tenant_id = ${body.tenantId} AND role = 'admin_general'
        LIMIT 1
      `.catch(() => []);
      if (!adminRes.length) {
        return NextResponse.json(
          { error: 'No hay admin para este tenant' },
          { status: 404 }
        );
      }
      userId = adminRes[0].id;
    }

    // Generar contraseña temporal (16 caracteres)
    const newPassword = Math.random().toString(36).slice(2, 18).toUpperCase();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar en BD (columna correcta: password_hash)
    // Agregar tenant check si se recibió tenantId
    if (body.tenantId) {
      await sql`
        UPDATE users
        SET password_hash = ${hashedPassword}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${userId} AND tenant_id = ${body.tenantId}
      `;
    } else {
      await sql`
        UPDATE users
        SET password_hash = ${hashedPassword}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${userId}
      `;
    }

    return NextResponse.json({
      ok: true,
      newPassword, // 🔓 Mostrar solo esta vez
      userId,
      message: 'Contraseña reseteada. Guarda esta contraseña en un lugar seguro.',
    });
  } catch (err) {
    console.error('[reset-password]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
