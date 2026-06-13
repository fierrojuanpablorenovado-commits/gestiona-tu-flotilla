import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { probarConexionFacturama } from '@/lib/facturama';

export const dynamic = 'force-dynamic';

// POST — probar conexión con Facturama y marcar verified
export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const rows = await sql`
    SELECT rfc, razon_social AS "razonSocial", codigo_postal AS "codigoPostal",
           regimen_fiscal AS "regimenFiscal", pac_user AS "pacUser",
           pac_password_enc AS "pacPasswordEnc", pac_sandbox AS "pacSandbox",
           serie_ingreso AS "serieIngreso", serie_global AS "serieGlobal"
    FROM cfdi_config
    WHERE tenant_id = ${session.tenantId}
    LIMIT 1
  `.catch(() => []);

  if (!rows.length) {
    return NextResponse.json({ error: 'No hay configuración CFDI guardada' }, { status: 404 });
  }

  const cfg = rows[0];
  if (!cfg.pacPasswordEnc) {
    return NextResponse.json({ error: 'Contraseña Facturama no configurada' }, { status: 400 });
  }

  const result = await probarConexionFacturama({
    rfc: cfg.rfc,
    razonSocial: cfg.razonSocial,
    codigoPostal: cfg.codigoPostal,
    regimenFiscal: cfg.regimenFiscal,
    pacUser: cfg.pacUser,
    pacPasswordEnc: cfg.pacPasswordEnc,
    pacSandbox: cfg.pacSandbox,
    serieIngreso: cfg.serieIngreso,
    serieGlobal: cfg.serieGlobal,
  });

  await sql`
    UPDATE cfdi_config
    SET verified = ${result.ok}, updated_at = NOW()
    WHERE tenant_id = ${session.tenantId}
  `.catch(() => null);

  return NextResponse.json({ ok: result.ok, error: result.error });
}
