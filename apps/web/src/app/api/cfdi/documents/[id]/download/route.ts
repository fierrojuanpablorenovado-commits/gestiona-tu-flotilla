import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { descargarArchivoCFDI, type CFDIConfig } from '@/lib/facturama';

export const dynamic = 'force-dynamic';

// GET /api/cfdi/documents/[id]/download?tipo=xml|pdf
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionUser(req);
  if (!session?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const tipo = (new URL(req.url).searchParams.get('tipo') ?? 'pdf') as 'xml' | 'pdf';

  const [doc] = await sql`
    SELECT facturama_id AS "facturamaId", folio, serie, receptor_rfc AS "receptorRfc"
    FROM cfdi_documents
    WHERE id = ${params.id} AND tenant_id = ${session.tenantId}
    LIMIT 1
  `.catch(() => []);

  if (!doc?.facturamaId) {
    return NextResponse.json({ error: 'CFDI no disponible para descarga' }, { status: 404 });
  }

  const [cfg] = await sql`
    SELECT rfc, razon_social AS "razonSocial", codigo_postal AS "codigoPostal",
           regimen_fiscal AS "regimenFiscal", pac_user AS "pacUser",
           pac_password_enc AS "pacPasswordEnc", pac_sandbox AS "pacSandbox",
           serie_ingreso AS "serieIngreso", serie_global AS "serieGlobal"
    FROM cfdi_config WHERE tenant_id = ${session.tenantId} LIMIT 1
  `.catch(() => []);

  if (!cfg) return NextResponse.json({ error: 'Sin configuración CFDI' }, { status: 422 });

  const file = await descargarArchivoCFDI(cfg as unknown as CFDIConfig, doc.facturamaId, tipo);
  if (!file) {
    return NextResponse.json({ error: 'No se pudo descargar el archivo de Facturama' }, { status: 502 });
  }

  const filename = `CFDI_${doc.serie ?? ''}${doc.folio ?? params.id}.${tipo}`;
  const buffer = Buffer.from(file.content, 'base64');

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    },
  });
}
