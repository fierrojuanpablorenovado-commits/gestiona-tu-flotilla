import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

type Params = { params: Promise<{ id: string }> };

// ── PATCH — actualizar infracción (incl. marcar pagada) ───────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSessionUser(req);
  if (!session?.tenantId)
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const { id } = await params;

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
      archivoUrl,
    } = body;

    // Asegurar columna archivo_url (idempotente)
    await sql`ALTER TABLE infracciones ADD COLUMN IF NOT EXISTS archivo_url TEXT`.catch(() => {});

    const result = await sql`
      UPDATE infracciones
      SET
        vehicle_id   = COALESCE(${vehicleId   ?? null}, vehicle_id),
        driver_id    = COALESCE(${driverId    ?? null}, driver_id),
        fecha        = COALESCE(${fecha       ?? null}::date, fecha),
        tipo         = COALESCE(${tipo        ?? null}, tipo),
        folio        = COALESCE(${folio       ?? null}, folio),
        descripcion  = COALESCE(${descripcion ?? null}, descripcion),
        monto        = COALESCE(${monto       ?? null}::numeric, monto),
        pagada       = COALESCE(${pagada      ?? null}, pagada),
        responsable  = COALESCE(${responsable ?? null}, responsable),
        cargo_chofer = COALESCE(${cargoChofer ?? null}, cargo_chofer),
        cargo_monto  = COALESCE(${cargoMonto  ?? null}::numeric, cargo_monto),
        notas        = COALESCE(${notas       ?? null}, notas),
        archivo_url  = COALESCE(${archivoUrl  ?? null}, archivo_url),
        updated_at   = NOW()
      WHERE id = ${id}::uuid
        AND tenant_id = ${session.tenantId}
      RETURNING *
    `;

    if (!result.length)
      return NextResponse.json({ message: 'Infracción no encontrada' }, { status: 404 });

    return NextResponse.json({ data: result[0] });
  } catch (err) {
    console.error('[infracciones PATCH]', err);
    return NextResponse.json({ message: 'Error al actualizar infracción' }, { status: 500 });
  }
}

// ── DELETE — eliminar infracción ──────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSessionUser(req);
  if (!session?.tenantId)
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  try {
    const result = await sql`
      DELETE FROM infracciones
      WHERE id = ${id}::uuid
        AND tenant_id = ${session.tenantId}
      RETURNING id
    `;

    if (!result.length)
      return NextResponse.json({ message: 'Infracción no encontrada' }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[infracciones DELETE]', err);
    return NextResponse.json({ message: 'Error al eliminar infracción' }, { status: 500 });
  }
}
