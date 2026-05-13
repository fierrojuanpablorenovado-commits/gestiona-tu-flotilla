import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
];

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const formData = await req.formData();
    const file       = formData.get('file') as File | null;
    const entityType = formData.get('entityType') as string | null; // 'driver','vehicle','maintenance','incident','candidate'
    const entityId   = formData.get('entityId')   as string | null;

    if (!file) {
      return NextResponse.json({ message: 'No se recibió ningún archivo' }, { status: 400 });
    }

    // Validar tipo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { message: 'Tipo de archivo no permitido. Solo imágenes y PDF.' },
        { status: 400 },
      );
    }

    // Validar tamaño
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { message: `El archivo excede el límite de ${MAX_SIZE_MB}MB` },
        { status: 400 },
      );
    }

    // Nombre único en storage
    const ext      = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 60);
    const blobPath = `${session.tenantId}/${entityType || 'general'}/${Date.now()}_${safeName}`;

    // Subir a Vercel Blob
    const blob = await put(blobPath, file, {
      access: 'public',
      contentType: file.type,
    });

    // Detectar tipo
    const fileType = file.type.startsWith('image/') ? 'image'
      : file.type === 'application/pdf' ? 'pdf'
      : 'other';

    // Guardar en tabla attachments si se especificó entidad
    let attachmentId: string | null = null;
    if (entityType && entityId) {
      const validEntityTypes = ['maintenance', 'driver', 'incident', 'candidate', 'vehicle'];
      if (!validEntityTypes.includes(entityType)) {
        return NextResponse.json({ message: 'entityType inválido' }, { status: 400 });
      }

      const att = await sql`
        INSERT INTO attachments (
          tenant_id, entity_type, entity_id,
          filename, original_name, file_type, mime_type,
          storage_path, storage_url, size_bytes, uploaded_by
        ) VALUES (
          ${session.tenantId},
          ${entityType},
          ${entityId},
          ${blobPath},
          ${file.name},
          ${fileType},
          ${file.type},
          ${blob.pathname},
          ${blob.url},
          ${file.size},
          ${session.id}
        )
        RETURNING id
      `;
      attachmentId = att[0]?.id ?? null;
    }

    return NextResponse.json({
      url:          blob.url,
      pathname:     blob.pathname,
      fileType,
      originalName: file.name,
      size:         file.size,
      attachmentId,
    });
  } catch (err: any) {
    console.error('[upload POST]', err);
    // Si Vercel Blob no está configurado, dar mensaje claro
    if (err?.message?.includes('BLOB_READ_WRITE_TOKEN')) {
      return NextResponse.json(
        { message: 'El almacenamiento de archivos no está configurado aún.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ message: 'Error al subir archivo' }, { status: 500 });
  }
}

// ── GET — Listar archivos adjuntos de una entidad ─────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType');
    const entityId   = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return NextResponse.json({ message: 'entityType y entityId son requeridos' }, { status: 400 });
    }

    const rows = await sql`
      SELECT
        id,
        original_name AS "originalName",
        file_type     AS "fileType",
        mime_type     AS "mimeType",
        storage_url   AS url,
        size_bytes    AS size,
        created_at    AS "uploadedAt"
      FROM attachments
      WHERE tenant_id   = ${session.tenantId}
        AND entity_type = ${entityType}
        AND entity_id   = ${entityId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error('[upload GET]', err);
    return NextResponse.json({ message: 'Error al obtener archivos' }, { status: 500 });
  }
}
