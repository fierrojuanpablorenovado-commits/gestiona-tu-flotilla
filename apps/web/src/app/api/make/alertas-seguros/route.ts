import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// Endpoint dedicado para Make.com — pólizas de seguro próximas a vencer
// Tabla real: vehicle_insurance (columnas en inglés)
// Se ejecuta cada 7 días (cron Make.com)

const REAL_TENANT_ID = '5f3faf9d-cc84-4112-9128-ef0d6d555e1b'; // Al Volante GDL

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-make-secret');
  if (!secret || secret !== process.env.MAKE_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const tenantSlug = req.nextUrl.searchParams.get('tenant') || 'alvolantegdl';
  const diasAlerta = parseInt(req.nextUrl.searchParams.get('dias') || '30');

  try {
    const tenants = await sql`
      SELECT id FROM tenants WHERE slug = ${tenantSlug} LIMIT 1
    `;
    const tenantId = tenants[0]?.id ?? REAL_TENANT_ID;

    // Seguros por vencer en los próximos N días (tabla real: vehicle_insurance)
    const seguros = await sql`
      SELECT
        i.id,
        i.policy_number                               AS poliza,
        i.insurer                                     AS aseguradora,
        i.annual_premium                              AS prima_anual,
        ROUND(i.annual_premium / 12, 2)               AS prima_mensual,
        i.coverage_type                               AS cobertura,
        i.expiry_date                                 AS vencimiento,
        (i.expiry_date - CURRENT_DATE)::int           AS dias_restantes,
        v.eco                                         AS vehiculo,
        v.brand,
        v.model,
        v.plates,
        CASE
          WHEN i.expiry_date < CURRENT_DATE           THEN 'VENCIDA'
          WHEN i.expiry_date <= CURRENT_DATE + 7      THEN 'CRITICA'
          WHEN i.expiry_date <= CURRENT_DATE + 30     THEN 'URGENTE'
          ELSE 'PRONTO'
        END AS urgencia
      FROM vehicle_insurance i
      JOIN vehicles v ON v.id = i.vehicle_id
      WHERE i.tenant_id = ${tenantId}
        AND i.expiry_date <= CURRENT_DATE + ${diasAlerta}
      ORDER BY i.expiry_date ASC
    `;

    const resumen = {
      vencidas:  seguros.filter((s) => s.urgencia === 'VENCIDA').length,
      criticas:  seguros.filter((s) => s.urgencia === 'CRITICA').length,
      urgentes:  seguros.filter((s) => s.urgencia === 'URGENTE').length,
      pronto:    seguros.filter((s) => s.urgencia === 'PRONTO').length,
      total:     seguros.length,
    };

    // Mensaje consolidado para WhatsApp
    const mensajeAdmin = seguros.length > 0
      ? `🔔 ALERTAS SEGUROS — Al Volante GDL\n\n` +
        (resumen.vencidas  > 0 ? `🚨 VENCIDAS: ${resumen.vencidas}\n` : '') +
        (resumen.criticas  > 0 ? `⚠️ Críticas (≤7d): ${resumen.criticas}\n` : '') +
        (resumen.urgentes  > 0 ? `🟡 Urgentes (≤30d): ${resumen.urgentes}\n` : '') +
        `\nDetalle:\n` +
        seguros.map((s) => {
          const fechaStr = String(s.vencimiento).slice(0, 10);        // "2026-06-01"
          const diasNum  = Number(s.dias_restantes);
          const diasLabel = isNaN(diasNum) ? '?' : diasNum;
          return `• ${s.vehiculo} (${s.aseguradora}) — vence ${fechaStr} [${s.urgencia}, ${diasLabel}d]`;
        }).join('\n') +
        `\n\nhttps://app.gestionatuflotilla.com/seguros`
      : '✅ Sin seguros por vencer en los próximos 30 días.';

    return NextResponse.json({
      ok: true,
      hayAlertas: seguros.length > 0,
      resumen,
      seguros,
      mensajeAdmin,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[make/alertas-seguros] Error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
