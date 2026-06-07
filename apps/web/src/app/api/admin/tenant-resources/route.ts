import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/admin/tenant-resources?tenantId=xxx
 * Métricas detalladas de consumo de recursos por tenant.
 * - Rows en DB por tabla
 * - Estimación de storage (KB)
 * - Archivos en Vercel Blob (si aplica)
 * Header: x-admin-secret
 */
export async function GET(req: NextRequest) {
  const secret   = req.headers.get('x-admin-secret');
  const expected = process.env.ADMIN_SECRET || 'gtf-admin-secret';
  if (secret !== expected) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId');
  if (!tenantId) return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });

  const t = tenantId;

  // Conteo paralelo de todas las tablas
  const [
    vehicles, drivers, weekly_accounts, insurance,
    maintenance, incidents, infracciones, gastos,
    users, gps_alerts,
  ] = await Promise.all([
    sql`SELECT COUNT(*)::int AS n FROM vehicles          WHERE tenant_id = ${t}`.then(r => r[0]?.n ?? 0),
    sql`SELECT COUNT(*)::int AS n FROM drivers           WHERE tenant_id = ${t}`.then(r => r[0]?.n ?? 0),
    sql`SELECT COUNT(*)::int AS n FROM weekly_accounts   WHERE tenant_id = ${t}`.then(r => r[0]?.n ?? 0),
    sql`SELECT COUNT(*)::int AS n FROM insurance         WHERE tenant_id = ${t}`.then(r => r[0]?.n ?? 0).catch(() => 0),
    sql`SELECT COUNT(*)::int AS n FROM maintenance_orders WHERE tenant_id = ${t}`.then(r => r[0]?.n ?? 0).catch(() => 0),
    sql`SELECT COUNT(*)::int AS n FROM incidents         WHERE tenant_id = ${t}`.then(r => r[0]?.n ?? 0).catch(() => 0),
    sql`SELECT COUNT(*)::int AS n FROM infracciones      WHERE tenant_id = ${t}`.then(r => r[0]?.n ?? 0).catch(() => 0),
    sql`SELECT COUNT(*)::int AS n FROM gastos            WHERE tenant_id = ${t}`.then(r => r[0]?.n ?? 0).catch(() => 0),
    sql`SELECT COUNT(*)::int AS n FROM users             WHERE tenant_id = ${t}`.then(r => r[0]?.n ?? 0),
    sql`SELECT COUNT(*)::int AS n FROM gps_alerts        WHERE tenant_id = ${t}`.then(r => r[0]?.n ?? 0).catch(() => 0),
  ]);

  // Estimación de storage en KB por tabla (basado en tamaño promedio de row)
  const KB_PER_ROW: Record<string, number> = {
    vehicles:         3.5,  // foto IMEI, datos completos
    drivers:          2.0,  // datos + licencia
    weekly_accounts:  1.0,  // cuenta semanal con items
    insurance:        1.5,  // póliza completa
    maintenance:      1.5,
    incidents:        0.8,
    infracciones:     4.0,  // tiene PDF adjunto
    gastos:           0.8,
    users:            0.5,
    gps_alerts:       0.3,
  };

  const rows: Record<string, number> = {
    vehicles, drivers, weekly_accounts, insurance,
    maintenance, incidents, infracciones, gastos,
    users, gps_alerts,
  };

  const totalRows = Object.values(rows).reduce((s, n) => s + (n as number), 0);
  const storageKb = Math.round(
    vehicles         * KB_PER_ROW.vehicles        +
    drivers          * KB_PER_ROW.drivers         +
    weekly_accounts  * KB_PER_ROW.weekly_accounts +
    insurance        * KB_PER_ROW.insurance       +
    maintenance      * KB_PER_ROW.maintenance     +
    incidents        * KB_PER_ROW.incidents       +
    infracciones     * KB_PER_ROW.infracciones    +
    gastos           * KB_PER_ROW.gastos          +
    users            * KB_PER_ROW.users           +
    gps_alerts       * KB_PER_ROW.gps_alerts
  );

  // Estimación de costo mensual en Neon Free Tier
  // Free tier: 512 MB, luego $0.000164/GB·hora
  const storageMb    = storageKb / 1024;
  const costoMensual = storageMb > 512 ? ((storageMb - 512) / 1024) * 0.000164 * 730 : 0;

  return NextResponse.json({
    tenantId,
    rows,
    totalRows,
    storage: {
      estimadoKb:  storageKb,
      estimadoMb:  Math.round(storageMb * 100) / 100,
      costoUSD:    Math.round(costoMensual * 1000) / 1000,
      nota:        'Estimación basada en tamaño promedio por tabla. Archivos en Vercel Blob no incluidos.',
    },
    computeNota: 'GTF usa Vercel Serverless — sin costo fijo por tenant. Costo por invocación: ~$0.00001/req (incluido en Hobby plan).',
  });
}
