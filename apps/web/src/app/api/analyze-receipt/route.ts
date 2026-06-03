import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';

// POST /api/analyze-receipt
// Body: { imageBase64: string, mediaType: string }
// Devuelve: { amount: number, raw: string }
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { amount: 0, message: 'OPENAI_API_KEY no configurada en Vercel' },
        { status: 500 },
      );
    }

    const body = await req.json();
    const { imageBase64, mediaType } = body;

    if (!imageBase64 || !mediaType) {
      return NextResponse.json({ message: 'Imagen requerida' }, { status: 400 });
    }

    // GPT-4o acepta image/jpeg, image/png, image/gif, image/webp
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const safeType = allowedTypes.includes(mediaType) ? mediaType : 'image/jpeg';
    const dataUrl = `data:${safeType};base64,${imageBase64}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: dataUrl, detail: 'high' },
              },
              {
                type: 'text',
                text: 'Eres un extractor de montos de comprobantes bancarios mexicanos. Esto puede ser: Santander CoDi, SPEI, BBVA, Banorte, Banamex u otro banco. Lee TODO el texto visible en la imagen, incluyendo texto pequeño. Busca cualquier número que represente un monto: "Importe", "Monto", "Total", "Cantidad", "Monto enviado", "Monto transferido", "Por", o simplemente un número con formato de dinero como "$1,200.00" o "1200". Responde ÚNICAMENTE con el número entero (sin comas, sin $, sin texto adicional). Ejemplo: si ves "$1,200.00" responde 1200. Si ves "Monto: 3500" responde 3500. Si no puedes leer ningún monto con certeza, responde 0.',
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });

    const json = await res.json();

    if (!res.ok) {
      const errMsg = json?.error?.message ?? `OpenAI HTTP ${res.status}`;
      console.error('[analyze-receipt] OpenAI error:', errMsg);
      return NextResponse.json({ amount: 0, message: errMsg }, { status: 500 });
    }

    const raw = (json.choices?.[0]?.message?.content ?? '0').trim();
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const amount = Math.round(parseFloat(cleaned) || 0);

    return NextResponse.json({ amount, raw });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[analyze-receipt]', errMsg);
    return NextResponse.json({ amount: 0, message: errMsg }, { status: 500 });
  }
}
