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
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 80,
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
              text: 'Eres un extractor de montos de comprobantes bancarios mexicanos (Santander, BBVA, Banorte, SPEI, CoDi, etc.). Busca el campo "Importe", "Monto", "Total", "Cantidad" o similar. Responde ÚNICAMENTE con el número entero en pesos (sin comas, sin signos de peso, sin texto). Ejemplo: si dice "$3,500.00" responde: 3500. Si dice "Importe $1,200" responde: 1200. Si no encuentras ningún monto claro, responde: 0.',
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
