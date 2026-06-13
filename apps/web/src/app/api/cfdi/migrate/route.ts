import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret');
  if (secret !== (process.env.ADMIN_SECRET || 'gtf-admin-secret')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: string[] = [];

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS cfdi_config (
        id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id        UUID NOT NULL UNIQUE,
        rfc              VARCHAR(13)  NOT NULL,
        razon_social     VARCHAR(255) NOT NULL,
        codigo_postal    VARCHAR(5)   NOT NULL DEFAULT '44100',
        regimen_fiscal   VARCHAR(3)   NOT NULL DEFAULT '626',
        pac              VARCHAR(20)  NOT NULL DEFAULT 'facturama',
        pac_user         VARCHAR(255) NOT NULL DEFAULT '',
        pac_password_enc TEXT         NOT NULL DEFAULT '',
        pac_sandbox      BOOLEAN      NOT NULL DEFAULT true,
        serie_ingreso    VARCHAR(10)  NOT NULL DEFAULT 'A',
        serie_global     VARCHAR(10)  NOT NULL DEFAULT 'G',
        verified         BOOLEAN      NOT NULL DEFAULT false,
        created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `;
    results.push('cfdi_config ✓');

    await sql`
      CREATE TABLE IF NOT EXISTS cfdi_documents (
        id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id        UUID         NOT NULL,
        facturama_id     VARCHAR(100),
        uuid_sat         VARCHAR(36),
        serie            VARCHAR(10),
        folio            VARCHAR(20),
        tipo             VARCHAR(20)  NOT NULL DEFAULT 'ingreso',
        periodicidad     VARCHAR(20),
        mes              INTEGER,
        anio             INTEGER,
        receptor_rfc     VARCHAR(13)  NOT NULL DEFAULT 'XAXX010101000',
        receptor_nombre  VARCHAR(255) NOT NULL DEFAULT 'PÚBLICO EN GENERAL',
        receptor_uso_cfdi VARCHAR(3)  NOT NULL DEFAULT 'S01',
        subtotal         DECIMAL(12,2) NOT NULL DEFAULT 0,
        iva              DECIMAL(12,2) NOT NULL DEFAULT 0,
        total            DECIMAL(12,2) NOT NULL DEFAULT 0,
        forma_pago       VARCHAR(2)   DEFAULT '99',
        moneda           VARCHAR(3)   NOT NULL DEFAULT 'MXN',
        driver_id        UUID,
        period_label     VARCHAR(50),
        xml_url          TEXT,
        pdf_url          TEXT,
        status           VARCHAR(20)  NOT NULL DEFAULT 'draft',
        error_message    TEXT,
        notas            TEXT,
        created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `;
    results.push('cfdi_documents ✓');

    await sql`
      CREATE TABLE IF NOT EXISTS cfdi_items (
        id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        cfdi_id         UUID         NOT NULL,
        clave_prod_serv VARCHAR(10)  NOT NULL DEFAULT '78131600',
        cantidad        DECIMAL(12,6) NOT NULL DEFAULT 1,
        clave_unidad    VARCHAR(5)   NOT NULL DEFAULT 'E48',
        descripcion     VARCHAR(1000) NOT NULL,
        valor_unitario  DECIMAL(12,6) NOT NULL,
        importe         DECIMAL(12,2) NOT NULL,
        tasa_iva        DECIMAL(6,4)  DEFAULT 0.16,
        created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `;
    results.push('cfdi_items ✓');

    await sql`CREATE INDEX IF NOT EXISTS idx_cfdi_docs_tenant  ON cfdi_documents(tenant_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cfdi_docs_status  ON cfdi_documents(tenant_id, status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cfdi_docs_mes     ON cfdi_documents(tenant_id, mes, anio)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cfdi_items_cfdi   ON cfdi_items(cfdi_id)`;
    results.push('indexes ✓');

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    return NextResponse.json({ error: String(err), results }, { status: 500 });
  }
}
