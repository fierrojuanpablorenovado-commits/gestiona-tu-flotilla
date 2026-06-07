import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * DELETE /api/admin/delete-tenant
 * Elimina (hard delete) un tenant completo y todos sus datos.
 * Header: x-admin-secret
 * Body: { tenantId, confirm: "ELIMINAR" }
 *
 * Orden de borrado respeta FKs:
 * weekly_accounts → weekly_account_items → insurance → maintenance
 * → incidents → infracciones → gastos → vehicles → drivers → users → tenants
 */
export async function DELETE(req: NextRequest) {
  const secret   = req.headers.get('x-admin-secret');
  const expected = process.env.ADMIN_SECRET || 'gtf-admin-secret';
  if (secret !== expected) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tenantId, confirm } = await req.json() as { tenantId: string; confirm: string };

  if (!tenantId) return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });
  if (confirm !== 'ELIMINAR') return NextResponse.json({ error: 'Debes confirmar con "ELIMINAR"' }, { status: 400 });

  // Verificar que el tenant existe
  const rows = await sql`SELECT id, name FROM tenants WHERE id = ${tenantId} LIMIT 1`;
  if (!rows.length) return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
  const tenantName = rows[0].name;

  const deleted: Record<string, number> = {};

  const del = async (table: string, where: string) => {
    try {
      const r = await sql.unsafe(`DELETE FROM ${table} WHERE ${where} = '${tenantId}' RETURNING id`);
      deleted[table] = r.length;
    } catch { deleted[table] = 0; }
  };

  // Borrar en orden (hijos primero)
  await del('weekly_account_items', 'tenant_id');
  await del('weekly_accounts', 'tenant_id');
  await del('insurance', 'tenant_id');
  await del('maintenance_orders', 'tenant_id');
  await del('infracciones', 'tenant_id');
  await del('incidents', 'tenant_id');
  await del('gastos', 'tenant_id');
  await del('gps_alerts', 'tenant_id');
  await del('recruitment_applications', 'tenant_id');
  await del('recruitment_jobs', 'tenant_id');
  await del('vehicles', 'tenant_id');
  await del('drivers', 'tenant_id');
  await del('users', 'tenant_id');

  // Finalmente el tenant
  await sql`DELETE FROM tenants WHERE id = ${tenantId}`.catch(() => {});
  deleted['tenants'] = 1;

  return NextResponse.json({
    ok: true,
    empresa: tenantName,
    eliminado: deleted,
  });
}
