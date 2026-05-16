import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSessionUser } from '@/lib/session';

const client = new Anthropic();

// POST /api/analyze-receipt
// Body: { imageBase64: string, mediaType: string }
// Devuelve: { amount: number, raw: string }
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { imageBase64, mediaType } = body;

    if (!imageBase64 || !mediaType) {
      return NextResponse.json({ message: 'Imagen requerida' }, { status: 400 });
    }

    // Solo aceptar tipos de imagen válidos para Anthropic
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const safeType = allowedTypes.includes(mediaType) ? mediaType : 'image/jpeg';

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: safeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'Eres un extractor de montos de comprobantes bancarios mexicanos. Esto puede ser: Santander CoDi, SPEI, BBVA, Banorte, Banamex u otro banco. Lee TODO el texto visible en la imagen, incluyendo texto pequeño. Busca cualquier número que represente un monto: "Importe", "Monto", "Total", "Cantidad", "Monto enviado", "Monto transferido", "Por", o simplemente un número con formato de dinero como "$1,200.00" o "1200". Responde ÚNICAMENTE con el número entero (sin comas, sin $, sin texto adicional). Ejemplo: si ves "$1,200.00" responde 1200. Si ves "Monto: 3500" responde 3500. Si no puedes leer ningún monto con certeza, responde 0.',
            },
          ],
        },
      ],
    });

    const raw = (message.content[0] as { type: string; text: string }).text?.trim() ?? '0';
    // Limpiar: solo dígitos y punto decimal
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const amount = Math.round(parseFloat(cleaned) || 0);

    return NextResponse.json({ amount, raw });
  } catch (err) {
    console.error('[analyze-receipt]', err);
    return NextResponse.json({ amount: 0, message: 'Error al analizar imagen' }, { status: 500 });
  }
}
