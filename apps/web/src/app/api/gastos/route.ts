import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

// ── Ensure table exists ────────────────────────────────────────────────────────
async function ensureGastosTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS gastos (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id    UUID        NOT NULL,
      vehicle_id   UUID        REFERENCES vehicles(id) ON DELETE SET NULL,
      categoria    TEXT        NOT NULL DEFAULT 'otro',
      descripcion  TEXT,
      monto        NUMERIC(10,2) NOT NULL DEFAULT 0,
      fecha        DATE        NOT NULL DEFAULT CURRENT_DATE,
      recibo_url   TEXT,
      notas        TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_gastos_tenant_fecha
      ON gastos (tenant_id, fecha DESC)
  `.catch(() => {});
  await sql`
    CREATE INDEX IF NOT EXISTS idx_gastos_vehicle
      ON gastos (vehicle_id)
  `.catch(() => {});
}

// ── GET /api/gastos ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    await ensureGastosTable();

    const tid = session.tenantId;
    const { searchParams } = new URL(req.url);
    const vehicleId  = searchParams.get('vehicleId');
    const categoria  = searchParams.get('categoria');
    const desde      = searchParams.get('desde');
    const hasta      = searchParams.get('hasta');
    const limit      = parseInt(searchParams.get('limit') ?? '100');

    const rows = await sql`
      SELECT
        g.id, g.vehicle_id, g.categoria, g.descripcion,
        g.monto::float AS monto, g.fecha, g.recibo_url, g.notas, g.created_at,
        v.eco, v.plates, v.brand, v.model
      FROM gastos g
      LEFT JOIN vehicles v ON v.id = g.vehicle_id
      WHERE g.tenant_id = ${tid}
        ${vehicleId ? sql`AND g.vehicle_id = ${vehicleId}` : sql``}
        ${categoria ? sql`AND g.categoria = ${categoria}` : sql``}
        ${desde     ? sql`AND g.fecha >= ${desde}::date`  : sql``}
        ${hasta     ? sql`AND g.fecha <= ${hasta}::date`  : sql``}
      ORDER BY g.fecha DESC, g.created_at DESC
      LIMIT ${limit}
    `;

    // ── KPIs resumen ─────────────────────────────────────────────────────────
    const [resumen] = await sql`
      SELECT
        COALESCE(SUM(monto), 0)::float                                    AS total_mes,
        COALESCE(SUM(monto) FILTER (WHERE categoria = 'combustible'), 0)::float AS combustible,
        COALESCE(SUM(monto) FILTER (WHERE categoria = 'mantenimiento'), 0)::float AS mantenimiento,
        COALESCE(SUM(monto) FILTER (WHERE categoria = 'seguro'), 0)::float AS seguro,
        COALESCE(SUM(monto) FILTER (WHERE categoria = 'refaccion'), 0)::float AS refaccion,
        COALESCE(SUM(monto) FILTER (WHERE categoria = 'multa'), 0)::float AS multa,
        COALESCE(SUM(monto) FILTER (WHERE categoria = 'otro'), 0)::float AS otro
      FROM gastos
      WHERE tenant_id = ${tid}
        AND fecha >= date_trunc('month', CURRENT_DATE)
    `;

    return NextResponse.json({ rows, resumen });
  } catch (err) {
    console.error('[gastos GET]', err);
    return NextResponse.json({ message: 'Error al cargar gastos' }, { status: 500 });
  }
}

// ── POST /api/gastos ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    await ensureGastosTable();

    const tid  = session.tenantId;
    const body = await req.json();

    const { vehicleId, categoria, descripcion, monto, fecha, reciboUrl, notas } = body;

    if (!monto || !fecha) {
      return NextResponse.json({ message: 'Monto y fecha son requeridos' }, { status: 400 });
    }

    const [row] = await sql`
      INSERT INTO gastos (tenant_id, vehicle_id, categoria, descripcion, monto, fecha, recibo_url, notas)
      VALUES (
        ${tid},
        ${vehicleId || null},
        ${categoria || 'otro'},
        ${descripcion || null},
        ${parseFloat(monto)},
        ${fecha},
        ${reciboUrl || null},
        ${notas || null}
      )
      RETURNING id, monto::float, fecha, categoria
    `;

    return NextResponse.json({ ok: true, gasto: row });
  } catch (err) {
    console.error('[gastos POST]', err);
    return NextResponse.json({ message: 'Error al guardar gasto' }, { status: 500 });
  }
}

// ── PATCH /api/gastos?id= ──────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const tid = session.tenantId;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'ID requerido' }, { status: 400 });

    const body = await req.json();
    const { vehicleId, categoria, descripcion, monto, fecha, reciboUrl, notas } = body;

    await sql`
      UPDATE gastos SET
        vehicle_id  = ${vehicleId || null},
        categoria   = ${categoria || 'otro'},
        descripcion = ${descripcion || null},
        monto       = ${parseFloat(monto)},
        fecha       = ${fecha},
        recibo_url  = ${reciboUrl || null},
        notas       = ${notas || null},
        updated_at  = NOW()
      WHERE id = ${id} AND tenant_id = ${tid}
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[gastos PATCH]', err);
    return NextResponse.json({ message: 'Error al actualizar gasto' }, { status: 500 });
  }
}

// ── DELETE /api/gastos?id= ─────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const tid = session.tenantId;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'ID requerido' }, { status: 400 });

    await sql`DELETE FROM gastos WHERE id = ${id} AND tenant_id = ${tid}`;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[gastos DELETE]', err);
    return NextResponse.json({ message: 'Error al eliminar gasto' }, { status: 500 });
  }
}
