import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

// ── GET — Obtener alertas activas del tenant ──────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session?.tenantId) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    // Crear tabla si no existe aún
    await sql`
      CREATE TABLE IF NOT EXISTS fleet_alerts (
        id            BIGSERIAL PRIMARY KEY,
        tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        tipo          TEXT        NOT NULL,
        entidad_ref   TEXT        NOT NULL,
        severidad     TEXT        NOT NULL CHECK (severidad IN ('alta', 'media', 'baja')),
        mensaje       TEXT        NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ,
        dismissed_at  TIMESTAMPTZ,
        CONSTRAINT fleet_alerts_unique UNIQUE (tenant_id, tipo, entidad_ref)
      )
    `.catch(() => {}); // silencioso si ya existe

    const alerts = await sql`
      SELECT
        id,
        tipo,
        entidad_ref AS "entidadRef",
        severidad,
        mensaje,
        created_at AS "createdAt"
      FROM fleet_alerts
      WHERE tenant_id   = ${session.tenantId}
        AND dismissed_at IS NULL
      ORDER BY
        CASE severidad WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END,
        created_at DESC
      LIMIT 20
    `.catch(() => []);

    return NextResponse.json({ data: alerts });
  } catch (err) {
    console.error('[alerts GET]', err);
    return NextResponse.json({ message: 'Error al obtener alertas' }, { status: 500 });
  }
}

// ── PATCH — Descartar alerta ──────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session?.tenantId) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ message: 'id requerido' }, { status: 400 });
    }

    await sql`
      UPDATE fleet_alerts
      SET dismissed_at = NOW()
      WHERE id        = ${id}
        AND tenant_id = ${session.tenantId}
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[alerts PATCH]', err);
    return NextResponse.json({ message: 'Error al descartar alerta' }, { status: 500 });
  }
}
