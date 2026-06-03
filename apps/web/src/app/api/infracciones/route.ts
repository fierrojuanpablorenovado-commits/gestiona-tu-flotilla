import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

// Crea la tabla si no existe y asegura todas las columnas (idempotente)
async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS infracciones (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id     UUID NOT NULL,
      vehicle_id    UUID,
      driver_id     UUID,
      fecha         DATE NOT NULL DEFAULT CURRENT_DATE,
      tipo          TEXT NOT NULL DEFAULT 'Infracción vial',
      folio         TEXT,
      descripcion   TEXT,
      monto         NUMERIC(12,2) NOT NULL DEFAULT 0,
      pagada        BOOLEAN NOT NULL DEFAULT FALSE,
      responsable   TEXT NOT NULL DEFAULT 'chofer',
      cargo_chofer  BOOLEAN NOT NULL DEFAULT TRUE,
      cargo_monto   NUMERIC(12,2) NOT NULL DEFAULT 0,
      notas         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  // Columnas adicionales (ALTER TABLE idempotente)
  await Promise.all([
    sql`ALTER TABLE infracciones ADD COLUMN IF NOT EXISTS fuente      TEXT DEFAULT 'manual'`.catch(() => {}),
    sql`ALTER TABLE infracciones ADD COLUMN IF NOT EXISTS ssim_id     TEXT`.catch(() => {}),
    sql`ALTER TABLE infracciones ADD COLUMN IF NOT EXISTS foto_url    TEXT`.catch(() => {}),
    sql`ALTER TABLE infracciones ADD COLUMN IF NOT EXISTS archivo_url TEXT`.catch(() => {}),
    sql`ALTER TABLE infracciones ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ`.catch(() => {}),
  ]);
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session?.tenantId)
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  await ensureTable();

  const { searchParams } = new URL(req.url);
  const pagada    = searchParams.get('pagada');    // 'true'|'false'
  const vehicleId = searchParams.get('vehicleId');
  const search    = searchParams.get('search') ?? '';

  try {
    const rows = await sql`
      SELECT
        i.id,
        TO_CHAR(i.fecha, 'YYYY-MM-DD')             AS fecha,
        i.tipo,
        i.folio,
        i.descripcion,
        i.monto::float                              AS monto,
        i.pagada,
        i.responsable,
        i.cargo_chofer                              AS "cargoChofer",
        i.cargo_monto::float                        AS "cargoMonto",
        i.notas,
        i.created_at                                AS "createdAt",
        i.vehicle_id                                AS "vehicleId",
        i.driver_id                                 AS "driverId",
        COALESCE(i.fuente, 'manual')                AS fuente,
        i.foto_url                                  AS "fotoUrl",
        i.ssim_id                                   AS "ssimId",
        i.archivo_url                               AS "archivoUrl",
        v.eco,
        v.plates,
        v.brand,
        v.model,
        v.year,
        COALESCE(d.first_name || ' ' || d.last_name, 'Sin asignar') AS "driverName"
      FROM infracciones i
      LEFT JOIN vehicles v ON v.id = i.vehicle_id
      LEFT JOIN drivers  d ON d.id = i.driver_id
      WHERE i.tenant_id = ${session.tenantId}
        AND i.deleted_at IS NULL
        ${pagada !== null ? sql`AND i.pagada = ${pagada === 'true'}` : sql``}
        ${vehicleId       ? sql`AND i.vehicle_id = ${vehicleId}::uuid` : sql``}
        ${search          ? sql`AND (
            i.folio        ILIKE ${'%' + search + '%'} OR
            i.descripcion  ILIKE ${'%' + search + '%'} OR
            v.eco          ILIKE ${'%' + search + '%'} OR
            v.plates       ILIKE ${'%' + search + '%'} OR
            d.first_name   ILIKE ${'%' + search + '%'} OR
            d.last_name    ILIKE ${'%' + search + '%'}
          )` : sql``}
      ORDER BY i.fecha DESC, i.created_at DESC
      LIMIT 200
    `;

    const summary = {
      total:            rows.length,
      pendientes:       rows.filter(r => !r.pagada).length,
      pagadas:          rows.filter(r =>  r.pagada).length,
      montoTotal:       rows.reduce((s, r) => s + (r.monto ?? 0), 0),
      montoCargoChofer: rows.filter(r => r.cargoChofer).reduce((s, r) => s + (r.cargoMonto ?? 0), 0),
    };

    return NextResponse.json({ data: rows, summary });
  } catch (err) {
    console.error('[infracciones GET]', err);
    return NextResponse.json({ message: 'Error al obtener infracciones' }, { status: 500 });
  }
}

// ── DELETE /api/infracciones?id= (soft-delete) ───────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session?.tenantId)
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ message: 'ID requerido' }, { status: 400 });

  await sql`
    UPDATE infracciones
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE id = ${id}::uuid
      AND tenant_id = ${session.tenantId}::uuid
  `.catch(() => {});

  return NextResponse.json({ ok: true });
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session?.tenantId)
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  await ensureTable();

  try {
    const body = await req.json();
    const {
      vehicleId,
      driverId,
      fecha,
      tipo,
      folio,
      descripcion,
      monto,
      pagada,
      responsable,
      cargoChofer,
      cargoMonto,
      notas,
    } = body;

    if (!fecha || monto === undefined || monto === null)
      return NextResponse.json({ message: 'fecha y monto son requeridos' }, { status: 400 });

    const result = await sql`
      INSERT INTO infracciones (
        tenant_id, vehicle_id, driver_id,
        fecha, tipo, folio, descripcion, monto,
        pagada, responsable, cargo_chofer, cargo_monto, notas
      ) VALUES (
        ${session.tenantId},
        ${vehicleId  ?? null},
        ${driverId   ?? null},
        ${fecha},
        ${tipo       ?? 'Infracción vial'},
        ${folio      ?? null},
        ${descripcion ?? null},
        ${monto},
        ${pagada      ?? false},
        ${responsable ?? 'chofer'},
        ${cargoChofer ?? true},
        ${cargoMonto  ?? 0},
        ${notas       ?? null}
      )
      RETURNING *
    `;

    return NextResponse.json({ data: result[0] }, { status: 201 });
  } catch (err) {
    console.error('[infracciones POST]', err);
    return NextResponse.json({ message: 'Error al crear infracción' }, { status: 500 });
  }
}
