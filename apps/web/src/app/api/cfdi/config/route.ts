import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { cfdiEncrypt } from '@/lib/cfdi-encrypt';

export const dynamic = 'force-dynamic';

// GET — obtener config CFDI del tenant (sin exponer password)
export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const rows = await sql`
    SELECT id, rfc, razon_social AS "razonSocial", codigo_postal AS "codigoPostal",
           regimen_fiscal AS "regimenFiscal", pac, pac_user AS "pacUser",
           pac_sandbox AS "pacSandbox", serie_ingreso AS "serieIngreso",
           serie_global AS "serieGlobal", verified,
           created_at AS "createdAt", updated_at AS "updatedAt"
    FROM cfdi_config
    WHERE tenant_id = ${session.tenantId}
    LIMIT 1
  `.catch(() => []);

  return NextResponse.json({ config: rows[0] ?? null });
}

// POST — crear o actualizar config CFDI
export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (session.role !== 'admin_general' && session.role !== 'super_admin') {
    return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
  }

  const body = await req.json() as {
    rfc?: string;
    razonSocial?: string;
    codigoPostal?: string;
    regimenFiscal?: string;
    pacUser?: string;
    pacPassword?: string;
    pacSandbox?: boolean;
    serieIngreso?: string;
    serieGlobal?: string;
  };

  const { rfc, razonSocial, codigoPostal, regimenFiscal, pacUser, pacPassword, pacSandbox, serieIngreso, serieGlobal } = body;

  if (!rfc || !razonSocial || !codigoPostal || !pacUser) {
    return NextResponse.json({ error: 'rfc, razonSocial, codigoPostal y pacUser son requeridos' }, { status: 400 });
  }

  try {
    // Si viene password nueva, cifrarla; si no, mantener la existente
    let passwordUpdate: string | null = null;
    if (pacPassword) {
      passwordUpdate = cfdiEncrypt(pacPassword);
    }

    await sql`
      INSERT INTO cfdi_config (
        tenant_id, rfc, razon_social, codigo_postal, regimen_fiscal,
        pac_user, pac_password_enc, pac_sandbox, serie_ingreso, serie_global, verified
      ) VALUES (
        ${session.tenantId},
        ${rfc.toUpperCase().trim()},
        ${razonSocial.trim()},
        ${codigoPostal.trim()},
        ${regimenFiscal ?? '626'},
        ${pacUser.trim()},
        ${passwordUpdate ?? ''},
        ${pacSandbox ?? true},
        ${serieIngreso ?? 'A'},
        ${serieGlobal ?? 'G'},
        false
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        rfc            = EXCLUDED.rfc,
        razon_social   = EXCLUDED.razon_social,
        codigo_postal  = EXCLUDED.codigo_postal,
        regimen_fiscal = EXCLUDED.regimen_fiscal,
        pac_user       = EXCLUDED.pac_user,
        pac_password_enc = CASE
          WHEN ${passwordUpdate} IS NOT NULL THEN ${passwordUpdate}
          ELSE cfdi_config.pac_password_enc
        END,
        pac_sandbox    = EXCLUDED.pac_sandbox,
        serie_ingreso  = EXCLUDED.serie_ingreso,
        serie_global   = EXCLUDED.serie_global,
        verified       = false,
        updated_at     = NOW()
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[cfdi/config POST]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
