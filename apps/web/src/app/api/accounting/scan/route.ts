/**
 * POST /api/accounting/scan
 *
 * Recibe una imagen o PDF de factura/ticket (base64 o form-data),
 * usa Claude Vision para extraer los datos fiscales y los guarda
 * en accounting_records.
 *
 * También acepta llamadas desde Make.com con source=whatsapp.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Eres un asistente experto en fiscalidad mexicana (SAT).
Tu tarea es extraer los datos de una factura, ticket o comprobante de gasto y devolver
SOLO un JSON válido sin texto adicional, sin markdown, sin \`\`\`json, solo el objeto JSON.

Extrae estos campos:
{
  "concepto": "descripción del gasto",
  "monto": número (sin símbolo de moneda, sin comas),
  "fecha": "YYYY-MM-DD",
  "rfc_emisor": "RFC del vendedor si aparece, si no null",
  "numero_factura": "número de factura/folio si aparece, si no null",
  "categoria": una de: "combustible" | "mantenimiento" | "seguro" | "servicios" | "otros",
  "es_deducible": true o false,
  "iva_incluido": número (monto del IVA si aparece, si no 0),
  "notas": "cualquier observación relevante"
}

Si el documento no es una factura o ticket, devuelve: {"error": "No es un comprobante de gasto"}
Si no puedes leer algún campo, usa null para ese campo.`;

// Categorías por palabras clave para fallback
function inferCategory(concepto: string): string {
  const c = concepto.toLowerCase();
  if (c.includes('gasolina') || c.includes('combustible') || c.includes('diesel') || c.includes('magna')) return 'combustible';
  if (c.includes('servicio') || c.includes('aceite') || c.includes('freno') || c.includes('llanta') || c.includes('taller')) return 'mantenimiento';
  if (c.includes('seguro') || c.includes('póliza')) return 'seguro';
  if (c.includes('gps') || c.includes('tracksolid') || c.includes('telematic')) return 'servicios';
  return 'otros';
}

export async function POST(req: NextRequest) {
  try {
    // ── Autenticación ──────────────────────────────────────────────────────────
    // Admite sesión normal O token especial de Make.com
    let tenantId: string | null = null;
    let isWebhook = false;

    const authHeader = req.headers.get('x-make-secret');
    if (authHeader && authHeader === process.env.MAKE_WEBHOOK_SECRET) {
      // Llamada desde Make.com — obtener tenantId del body
      isWebhook = true;
    } else {
      const session = await getSessionUser(req);
      if (!session?.tenantId) {
        return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
      }
      tenantId = session.tenantId;
    }

    // ── Parsear request ────────────────────────────────────────────────────────
    let imageBase64: string | null = null;
    let imageMediaType: string = 'image/jpeg';
    let imageUrl: string | null = null;
    let sourceName: string = 'ocr_app';
    let webhookTenantId: string | null = null;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // Upload directo desde la app
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) return NextResponse.json({ message: 'No se recibió archivo' }, { status: 400 });

      imageMediaType = file.type || 'image/jpeg';
      const arrayBuf = await file.arrayBuffer();
      imageBase64 = Buffer.from(arrayBuf).toString('base64');
      sourceName = 'ocr_app';
      if (isWebhook) webhookTenantId = formData.get('tenantId') as string;

    } else {
      // JSON (Make.com o test)
      const body = await req.json();
      webhookTenantId = body.tenantId || null;
      sourceName = body.source || 'ocr_whatsapp';

      if (body.image_base64) {
        imageBase64 = body.image_base64;
        imageMediaType = body.media_type || 'image/jpeg';
      } else if (body.image_url) {
        // Make puede mandar una URL pública de la imagen de WhatsApp
        imageUrl = body.image_url;
        // Descargar la imagen
        const imgRes = await fetch(imageUrl as string);
        if (!imgRes.ok) throw new Error('No se pudo descargar imagen de URL');
        const buf = await imgRes.arrayBuffer();
        imageBase64 = Buffer.from(buf).toString('base64');
        imageMediaType = imgRes.headers.get('content-type') || 'image/jpeg';
      } else {
        return NextResponse.json({ message: 'Falta image_base64 o image_url' }, { status: 400 });
      }
    }

    // Resolver tenantId para webhooks
    if (isWebhook) {
      if (!webhookTenantId) return NextResponse.json({ message: 'tenantId requerido para webhook' }, { status: 400 });
      tenantId = webhookTenantId;
    }

    // ── Llamar a Claude Vision ────────────────────────────────────────────────
    let ocrResult: any = {};
    let ocrRaw = '';

    if (!process.env.OPENAI_API_KEY) {
      // Sin API key — modo demo con datos ficticios para testing
      ocrResult = {
        concepto: 'Gasolina Magna (demo)',
        monto: 800,
        fecha: new Date().toISOString().slice(0, 10),
        numero_factura: null,
        rfc_emisor: null,
        categoria: 'combustible',
        es_deducible: true,
        iva_incluido: 110.34,
        notas: 'Modo demo — sin OPENAI_API_KEY',
      };
    } else {
      // GPT-4o Vision soporta jpeg, png, gif, webp y PDF (como imagen)
      const supported = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!supported.includes(imageMediaType)) {
        imageMediaType = 'image/jpeg';
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 512,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${imageMediaType};base64,${imageBase64!}`,
                  detail: 'high',
                },
              },
              {
                type: 'text',
                text: 'Extrae los datos de este comprobante de gasto y devuelve solo el JSON.',
              },
            ],
          },
        ],
      });

      ocrRaw = response.choices[0]?.message?.content || '';

      try {
        const cleaned = ocrRaw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        ocrResult = JSON.parse(cleaned);
      } catch {
        return NextResponse.json({
          message: 'No se pudo parsear la respuesta de OCR',
          raw: ocrRaw,
        }, { status: 422 });
      }
    }

    // ── Verificar que sea un comprobante válido ───────────────────────────────
    if (ocrResult.error) {
      return NextResponse.json({ message: ocrResult.error, ocr: ocrResult }, { status: 422 });
    }

    // ── Determinar mes/año del gasto ──────────────────────────────────────────
    let periodMonth = new Date().getMonth() + 1;
    let periodYear  = new Date().getFullYear();
    if (ocrResult.fecha) {
      try {
        const d = new Date(ocrResult.fecha + 'T12:00:00');
        if (!isNaN(d.getTime())) {
          periodMonth = d.getMonth() + 1;
          periodYear  = d.getFullYear();
        }
      } catch { /* usar fecha actual */ }
    }

    const categoria  = ocrResult.categoria || inferCategory(ocrResult.concepto || '');
    const monto      = Number(ocrResult.monto) || 0;
    const concepto   = ocrResult.concepto || 'Gasto escaneado';
    const numFactura = ocrResult.numero_factura || null;
    const esDeducible = ocrResult.es_deducible !== false; // default true para gastos flotilla

    // ── Guardar en accounting_records ─────────────────────────────────────────
    const [record] = await sql`
      INSERT INTO accounting_records (
        tenant_id, period_month, period_year,
        source, category, description,
        amount, is_income, is_deductible,
        invoice_number, source_image_url, ocr_raw, via
      ) VALUES (
        ${tenantId!}::uuid,
        ${periodMonth}, ${periodYear},
        ${sourceName},
        ${categoria},
        ${concepto},
        ${monto},
        false,
        ${esDeducible},
        ${numFactura},
        ${imageUrl},
        ${ocrRaw || null},
        ${sourceName}
      )
      RETURNING id, description, amount, category, period_month, period_year
    `;

    return NextResponse.json({
      ok:      true,
      record,
      ocr:     ocrResult,
      message: `Gasto guardado: ${concepto} — $${monto} (${categoria})`,
    });

  } catch (err: any) {
    console.error('[accounting/scan]', err);
    return NextResponse.json({ message: err.message || 'Error al procesar imagen' }, { status: 500 });
  }
}
