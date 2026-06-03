import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import Anthropic from '@anthropic-ai/sdk';
import { getSessionUser } from '@/lib/session';

/**
 * POST /api/vehicles/extract-tarjeta
 *
 * Solo admin. Recibe una imagen/PDF de la tarjeta de circulación,
 * la sube a Vercel Blob y usa Claude Vision para extraer los datos del vehículo.
 *
 * Body: multipart/form-data
 *   file      — imagen (JPG/PNG/WEBP) de la tarjeta
 *   vehicleId — UUID del vehículo (opcional; si se envía, guarda tarjeta_url en la BD)
 *
 * Response: { url, extracted: { vin, numeroMotor, propietario, plates, brand, model, year, color } }
 */
export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session?.tenantId)
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  if (session.role !== 'admin')
    return NextResponse.json({ message: 'Solo administradores pueden subir tarjetas de circulación' }, { status: 403 });

  try {
    const formData  = await req.formData();
    const file      = formData.get('file') as File | null;
    const vehicleId = (formData.get('vehicleId') as string | null)?.trim() || null;

    if (!file) return NextResponse.json({ message: 'Archivo requerido' }, { status: 400 });

    // ── 1. Subir a Vercel Blob ───────────────────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);
    const ext         = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const blobPath    = `tarjetas/${session.tenantId}/${vehicleId ?? 'tmp'}-${Date.now()}.${ext}`;

    const blob = await put(blobPath, buffer, {
      access:      'public',
      contentType: file.type || 'image/jpeg',
    });

    // ── 2. Extraer datos con Claude Vision ───────────────────────────────────
    let extracted: Record<string, string | number | null> = {};

    // Solo imágenes — PDF no soporta vision directo
    const isImage = file.type.startsWith('image/');
    if (isImage) {
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY ?? '',
      });

      const base64    = buffer.toString('base64');
      const mediaType = (
        file.type === 'image/png'  ? 'image/png'  :
        file.type === 'image/webp' ? 'image/webp' :
        file.type === 'image/gif'  ? 'image/gif'  :
        'image/jpeg'
      ) as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

      const response = await anthropic.messages.create({
        model:      'claude-opus-4-5',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type:   'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: `Eres un asistente que extrae datos de tarjetas de circulación mexicanas.
Analiza esta imagen y devuelve ÚNICAMENTE un JSON válido (sin markdown, sin texto extra) con los siguientes campos:
{
  "vin":           "número de serie del vehículo (17 caracteres)",
  "numeroMotor":   "número de motor exactamente como aparece",
  "propietario":   "nombre completo del propietario tal como aparece",
  "plates":        "número de placas",
  "brand":         "marca del vehículo",
  "model":         "modelo del vehículo",
  "year":          año numérico,
  "color":         "color del vehículo"
}
Si algún dato no es visible o no puedes leerlo claramente, usa null para ese campo.
Devuelve SOLO el JSON, nada más.`,
            },
          ],
        }],
      });

      try {
        const text      = (response.content[0] as { type: 'text'; text: string }).text.trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) extracted = JSON.parse(jsonMatch[0]);
      } catch {
        // Si la extracción falla, continúa sin datos extraídos
      }
    }

    // ── 3. Guardar tarjeta_url en el vehículo (si se envió vehicleId) ────────
    if (vehicleId) {
      const { sql } = await import('@/lib/db');
      await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS tarjeta_url TEXT`.catch(() => {});
      await sql`
        UPDATE vehicles
        SET tarjeta_url = ${blob.url}
        WHERE id        = ${vehicleId}::uuid
          AND tenant_id = ${session.tenantId}
      `;
    }

    return NextResponse.json({ url: blob.url, extracted });
  } catch (err) {
    console.error('[extract-tarjeta] Error:', err);
    return NextResponse.json({ message: 'Error al procesar la tarjeta' }, { status: 500 });
  }
}
