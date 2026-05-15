/**
 * POST /api/webhooks/whatsapp-scan
 *
 * Webhook que recibe mensajes de WhatsApp desde Make.com.
 * Cuando alguien manda una imagen/PDF al grupo o chat de WhatsApp,
 * Make la procesa y la manda aquí para OCR con Claude.
 *
 * Payload esperado de Make:
 * {
 *   secret: "MAKE_WEBHOOK_SECRET",
 *   tenantId: "UUID del tenant",
 *   phone: "+52 xxx xxxx xxxx",  // quien envió
 *   sender_name: "Miguel Torres",
 *   image_url: "https://...",    // URL temporal de WhatsApp
 *   caption: "factura gasolina", // texto del mensaje (opcional)
 * }
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Verificar secret de Make
    if (body.secret !== process.env.MAKE_WEBHOOK_SECRET) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { tenantId, image_url, image_base64, phone, sender_name, caption } = body;
    if (!tenantId) {
      return NextResponse.json({ message: 'tenantId requerido' }, { status: 400 });
    }
    if (!image_url && !image_base64) {
      return NextResponse.json({ message: 'Falta imagen (image_url o image_base64)' }, { status: 400 });
    }

    // Llamar al endpoint de scan internamente
    const scanUrl  = new URL('/api/accounting/scan', req.url);
    const scanBody: any = {
      tenantId,
      source:     'ocr_whatsapp',
      sender:     sender_name || phone || 'WhatsApp',
      caption,
    };

    if (image_base64) {
      scanBody.image_base64 = image_base64;
      scanBody.media_type   = body.media_type || 'image/jpeg';
    } else if (image_url && body.meta_token) {
      // URL de Meta requiere Authorization header — descargamos aquí
      const imgRes = await fetch(image_url, {
        headers: { Authorization: `Bearer ${body.meta_token}` },
      });
      if (!imgRes.ok) throw new Error(`No se pudo descargar imagen de Meta: ${imgRes.status}`);
      const buf = await imgRes.arrayBuffer();
      scanBody.image_base64 = Buffer.from(buf).toString('base64');
      scanBody.media_type   = imgRes.headers.get('content-type') || 'image/jpeg';
    } else {
      scanBody.image_url = image_url;
    }

    const scanRes  = await fetch(scanUrl.toString(), {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-make-secret':   process.env.MAKE_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify(scanBody),
    });

    const scanData = await scanRes.json();

    if (!scanRes.ok) {
      console.error('[whatsapp-scan] Error en OCR:', scanData.message);
      return NextResponse.json({ ok: false, message: scanData.message }, { status: 422 });
    }

    console.log(`[whatsapp-scan] Gasto guardado: ${scanData.message} — de ${sender_name || phone}`);

    // Respuesta para Make (puede usarla para mandar confirmación al WA)
    return NextResponse.json({
      ok:      true,
      message: scanData.message,
      record:  scanData.record,
      reply:   `✅ Guardado: ${scanData.ocr?.concepto} — $${scanData.ocr?.monto} (${scanData.ocr?.categoria})\nMes: ${scanData.record?.period_month}/${scanData.record?.period_year}`,
    });

  } catch (err: any) {
    console.error('[whatsapp-scan]', err);
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}

// Vercel CRON no aplica aquí, pero dejamos GET para ping de Make
export async function GET() {
  return NextResponse.json({ status: 'whatsapp-scan webhook activo' });
}
