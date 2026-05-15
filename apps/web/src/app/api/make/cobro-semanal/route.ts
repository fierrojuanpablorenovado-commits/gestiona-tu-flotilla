import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// Endpoint dedicado para Make.com — autenticado con x-make-secret
// Retorna vehículos con renta pendiente para envío de cobros a GRUPOS de WhatsApp

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-make-secret');
  if (!secret || secret !== process.env.MAKE_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const tenantSlug = req.nextUrl.searchParams.get('tenant') || 'alvolantegdl';

  try {
    const tenants = await sql`
      SELECT id FROM tenants WHERE slug = ${tenantSlug} LIMIT 1
    `;
    if (!tenants[0]?.id) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }
    const tenantId = tenants[0].id;

    // Vehículos activos con grupo WA y saldo pendiente en las últimas 4 semanas
    const rows = await sql`
      SELECT
        v.id::text            AS vehicle_id,
        v.eco,
        v.wa_group_link,
        COALESCE(d.first_name || ' ' || d.last_name, 'Sin chofer') AS chofer,
        COALESCE((
          SELECT SUM(wa.efectivo_a_entregar)
          FROM weekly_accounts wa
          WHERE wa.vehicle_id = v.id
            AND wa.status     = 'pending'
            AND wa.week_start >= CURRENT_DATE - INTERVAL '30 days'
        ), 0) AS "totalDebt",
        COALESCE((
          SELECT wa.efectivo_a_entregar
          FROM weekly_accounts wa
          WHERE wa.vehicle_id = v.id
          ORDER BY wa.week_start DESC LIMIT 1
        ), 0) AS "lastRent",
        COALESCE((
          SELECT wa.week_start
          FROM weekly_accounts wa
          WHERE wa.vehicle_id = v.id
          ORDER BY wa.week_start DESC LIMIT 1
        ), CURRENT_DATE) AS "lastWeekStart"
      FROM vehicles v
      LEFT JOIN drivers d ON d.vehicle_id = v.id AND d.status = 'active'
      WHERE v.tenant_id  = ${tenantId}
        AND v.status     = 'active'
        AND v.wa_group_link IS NOT NULL
      ORDER BY v.eco
    `;

    const conDeuda = rows.filter((r) => Number(r.totalDebt) > 0);

    // Mensajes listos para Make — uno por grupo (vehicle)
    const mensajes = conDeuda.map((r) => ({
      eco:          r.eco,
      chofer:       r.chofer,
      waGroupLink:  r.wa_group_link,
      totalDebt:    Number(r.totalDebt),
      lastRent:     Number(r.lastRent),
      // Texto para el grupo — sin nombre personal, genérico para que lo vean todos
      groupText: `🚗 *RECORDATORIO DE RENTA — Al Volante GDL*\n\n` +
        `Unidad: *${r.eco}*\n` +
        `Chofer: ${r.chofer}\n` +
        `💰 Renta pendiente: *$${Number(r.totalDebt).toLocaleString('es-MX')} MXN*\n\n` +
        `Por favor, realiza tu pago esta semana. ¡Gracias! 🙏`,
    }));

    // Resumen consolidado para el admin (también va al grupo admin si Make lo configura)
    const totalPorCobrar = conDeuda.reduce((s, r) => s + Number(r.totalDebt), 0);
    const resumenAdmin = conDeuda.length > 0
      ? `📊 *COBRO SEMANAL — Al Volante GDL*\n\n` +
        conDeuda.map(r => `• ${r.eco} (${r.chofer}): $${Number(r.totalDebt).toLocaleString('es-MX')}`).join('\n') +
        `\n\nUnidades con deuda: ${conDeuda.length}\nTotal por cobrar: *$${totalPorCobrar.toLocaleString('es-MX')} MXN*`
      : '✅ Sin cobros pendientes esta semana. ¡Todo al corriente!';

    return NextResponse.json({
      ok:             true,
      total:          rows.length,
      conDeuda:       conDeuda.length,
      hayDeuda:       conDeuda.length > 0,
      totalPorCobrar,
      mensajes,
      resumenAdmin,
      generatedAt:    new Date().toISOString(),
    });
  } catch (err) {
    console.error('[make/cobro-semanal] Error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
