import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { emitirCFDIGlobal, type CFDIConfig } from '@/lib/facturama';

export const dynamic = 'force-dynamic';

// POST /api/cron/cfdi-global
// Cron mensual (día 1 de cada mes, 6 AM) — genera CFDI global del mes anterior
// para todos los tenants con cfdi_config verificada
export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret') ?? req.headers.get('authorization')?.replace('Bearer ', '');
  if (cronSecret !== (process.env.CRON_SECRET || 'cron-secret-dev')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  // Mes anterior
  const targetDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const mes  = targetDate.getMonth() + 1;
  const anio = targetDate.getFullYear();

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesLabel = MESES[mes - 1];

  // Tenants con config verificada y sin CFDI global del mes anterior
  const tenants = await sql`
    SELECT cc.tenant_id, cc.rfc, cc.razon_social AS "razonSocial",
           cc.codigo_postal AS "codigoPostal", cc.regimen_fiscal AS "regimenFiscal",
           cc.pac_user AS "pacUser", cc.pac_password_enc AS "pacPasswordEnc",
           cc.pac_sandbox AS "pacSandbox", cc.serie_ingreso AS "serieIngreso",
           cc.serie_global AS "serieGlobal"
    FROM cfdi_config cc
    WHERE cc.verified = true
      AND NOT EXISTS (
        SELECT 1 FROM cfdi_documents cd
        WHERE cd.tenant_id = cc.tenant_id
          AND cd.tipo = 'global'
          AND cd.mes  = ${mes}
          AND cd.anio = ${anio}
          AND cd.status = 'timbrado'
      )
  `.catch(() => []);

  const results: Array<{ tenantId: string; ok: boolean; error?: string }> = [];

  for (const tenant of tenants) {
    try {
      const [totals] = await sql`
        SELECT COALESCE(SUM(rent), 0)::numeric AS total_rentas
        FROM weekly_accounts
        WHERE tenant_id = ${tenant.tenant_id}
          AND EXTRACT(MONTH FROM week_start) = ${mes}
          AND EXTRACT(YEAR  FROM week_start) = ${anio}
          AND status = 'paid'
      `.catch(() => [{ total_rentas: 0 }]);

      const montoBase = Number(totals?.total_rentas ?? 0);
      if (montoBase <= 0) {
        results.push({ tenantId: tenant.tenant_id, ok: false, error: 'Sin rentas cobradas' });
        continue;
      }

      const [folioRow] = await sql`
        SELECT COUNT(*) AS cnt FROM cfdi_documents
        WHERE tenant_id = ${tenant.tenant_id} AND tipo = 'global'
      `.catch(() => [{ cnt: '0' }]);
      const folio = parseInt(String(folioRow?.cnt ?? '0'), 10) + 1;

      const descripcion = `Servicio de arrendamiento de vehículos — ${mesLabel} ${anio}`;

      const result = await emitirCFDIGlobal(tenant as unknown as CFDIConfig, mes, anio, [{ descripcion, monto: montoBase }], folio);

      const iva = parseFloat((montoBase * 0.16).toFixed(2));
      const total = parseFloat((montoBase + iva).toFixed(2));

      await sql`
        INSERT INTO cfdi_documents (
          tenant_id, facturama_id, uuid_sat, serie, folio, tipo,
          periodicidad, mes, anio, period_label,
          receptor_rfc, receptor_nombre, receptor_uso_cfdi,
          subtotal, iva, total, status, error_message
        ) VALUES (
          ${tenant.tenant_id},
          ${result.id || null}, ${result.uuid || null},
          ${result.serie || tenant.serieGlobal},
          ${result.folio || String(folio)},
          'global', 'mensual', ${mes}, ${anio}, ${`${mesLabel} ${anio}`},
          'XAXX010101000', 'PÚBLICO EN GENERAL', 'S01',
          ${montoBase}, ${iva}, ${total},
          ${result.error ? 'error' : 'timbrado'},
          ${result.error || null}
        )
      `;

      results.push({ tenantId: tenant.tenant_id, ok: !result.error, error: result.error });
    } catch (err) {
      results.push({ tenantId: tenant.tenant_id, ok: false, error: String(err) });
    }
  }

  const exitosos = results.filter(r => r.ok).length;
  console.log(`[cron/cfdi-global] ${mesLabel} ${anio}: ${exitosos}/${results.length} CFDIs generados`);

  return NextResponse.json({ ok: true, mes, anio, mesLabel, results });
}
