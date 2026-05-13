import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

// ─── GET /api/drivers/[id] ────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const [driver] = await sql`
      SELECT
        d.id,
        d.first_name AS "firstName",
        d.last_name  AS "lastName",
        d.phone,
        d.email,
        d.licencia,
        d.licencia_tipo        AS "licenseType",
        d.licencia_vencimiento AS "licenseExpiry",
        d.hire_date            AS "joinDate",
        d.status,
        d.rating,
        d.score,
        d.platforms,
        d.notes,
        d.whatsapp_group       AS "whatsappGroup",
        d.vehicle_id           AS "vehicleId"
      FROM drivers d
      WHERE d.id = ${params.id}
        AND d.tenant_id = ${session.tenantId}
      LIMIT 1
    `;

    if (!driver) {
      return NextResponse.json({ message: 'Chofer no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ data: driver });
  } catch (err) {
    console.error('[drivers/[id] GET] Error:', err);
    return NextResponse.json({ message: 'Error al obtener chofer' }, { status: 500 });
  }
}

// ─── PATCH /api/drivers/[id] ──────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();

    // Verificar que el chofer pertenece al tenant
    const [existing] = await sql`
      SELECT id FROM drivers
      WHERE id = ${params.id} AND tenant_id = ${session.tenantId}
      LIMIT 1
    `;
    if (!existing) {
      return NextResponse.json({ message: 'Chofer no encontrado' }, { status: 404 });
    }

    // Construir updates dinámicos
    const updates: string[] = [];

    if (body.firstName !== undefined)
      await sql`UPDATE drivers SET first_name = ${body.firstName} WHERE id = ${params.id} AND tenant_id = ${session.tenantId}`;
    if (body.lastName !== undefined)
      await sql`UPDATE drivers SET last_name = ${body.lastName} WHERE id = ${params.id} AND tenant_id = ${session.tenantId}`;
    if (body.phone !== undefined)
      await sql`UPDATE drivers SET phone = ${body.phone || null} WHERE id = ${params.id} AND tenant_id = ${session.tenantId}`;
    if (body.email !== undefined)
      await sql`UPDATE drivers SET email = ${body.email || null} WHERE id = ${params.id} AND tenant_id = ${session.tenantId}`;
    if (body.status !== undefined)
      await sql`UPDATE drivers SET status = ${body.status} WHERE id = ${params.id} AND tenant_id = ${session.tenantId}`;
    if (body.vehicleId !== undefined)
      await sql`UPDATE drivers SET vehicle_id = ${body.vehicleId || null} WHERE id = ${params.id} AND tenant_id = ${session.tenantId}`;
    if (body.notes !== undefined)
      await sql`UPDATE drivers SET notes = ${body.notes || null} WHERE id = ${params.id} AND tenant_id = ${session.tenantId}`;
    if (body.licencia !== undefined)
      await sql`UPDATE drivers SET licencia = ${body.licencia || null} WHERE id = ${params.id} AND tenant_id = ${session.tenantId}`;
    if (body.licenciaTipo !== undefined)
      await sql`UPDATE drivers SET licencia_tipo = ${body.licenciaTipo || null} WHERE id = ${params.id} AND tenant_id = ${session.tenantId}`;
    if (body.licenciaVencimiento !== undefined)
      await sql`UPDATE drivers SET licencia_vencimiento = ${body.licenciaVencimiento || null} WHERE id = ${params.id} AND tenant_id = ${session.tenantId}`;
    if (body.platforms !== undefined)
      await sql`UPDATE drivers SET platforms = ${body.platforms} WHERE id = ${params.id} AND tenant_id = ${session.tenantId}`;
    if (body.hireDate !== undefined)
      await sql`UPDATE drivers SET hire_date = ${body.hireDate || null} WHERE id = ${params.id} AND tenant_id = ${session.tenantId}`;

    // ── whatsapp_group: asegurar columna y actualizar ─────────────────────────
    if (body.whatsappGroup !== undefined) {
      await sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS whatsapp_group TEXT`.catch(() => {});
      await sql`
        UPDATE drivers
        SET whatsapp_group = ${body.whatsappGroup || null}
        WHERE id = ${params.id} AND tenant_id = ${session.tenantId}
      `;
    }

    // Retornar chofer actualizado
    const [updated] = await sql`
      SELECT
        d.id,
        d.first_name AS "firstName",
        d.last_name  AS "lastName",
        d.phone,
        d.email,
        d.licencia,
        d.licencia_tipo        AS "licenseType",
        d.licencia_vencimiento AS "licenseExpiry",
        d.hire_date            AS "joinDate",
        d.status,
        d.rating,
        d.score,
        d.platforms,
        d.notes,
        d.whatsapp_group       AS "whatsappGroup",
        d.vehicle_id           AS "vehicleId"
      FROM drivers d
      WHERE d.id = ${params.id} AND d.tenant_id = ${session.tenantId}
      LIMIT 1
    `;

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error('[drivers/[id] PATCH] Error:', err);
    return NextResponse.json({ message: 'Error al actualizar chofer' }, { status: 500 });
  }
}

// ─── DELETE /api/drivers/[id] ─────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const result = await sql`
      DELETE FROM drivers
      WHERE id = ${params.id} AND tenant_id = ${session.tenantId}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ message: 'Chofer no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Chofer eliminado', id: params.id });
  } catch (err) {
    console.error('[drivers/[id] DELETE] Error:', err);
    return NextResponse.json({ message: 'Error al eliminar chofer' }, { status: 500 });
  }
}
