import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// Endpoint dedicado para Make.com — autenticado con x-make-secret
// Retorna choferes activos con renta pendiente para envío de cobros por WhatsApp

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

    // Choferes activos con saldo pendiente
    const drivers = await sql`
      SELECT
        d.id,
        d.first_name || ' ' || d.last_name AS name,
        d.phone,
        v.eco AS vehicle,
        COALESCE((
          SELECT SUM(wa.rent)
          FROM weekly_accounts wa
          WHERE wa.driver_id = d.id
            AND wa.status = 'pending'
            AND wa.week_start >= CURRENT_DATE - INTERVAL '30 days'
        ), 0) AS "totalDebt",
        COALESCE((
          SELECT SUM(wa.uber_income + wa.didi_income + wa.indriver_income + wa.other_income)
          FROM weekly_accounts wa
          WHERE wa.driver_id = d.id
            AND wa.week_start >= date_trunc('week', CURRENT_DATE)
        ), 0) AS "weeklyIncome",
        COALESCE((
          SELECT wa.rent
          FROM weekly_accounts wa
          WHERE wa.driver_id = d.id
          ORDER BY wa.week_start DESC LIMIT 1
        ), 0) AS "lastRent"
      FROM drivers d
      LEFT JOIN vehicles v ON v.id = d.vehicle_id
      WHERE d.tenant_id = ${tenantId}
        AND d.status = 'active'
        AND d.phone IS NOT NULL
      ORDER BY d.first_name
    `;

    const conDeuda = drivers.filter((d) => Number(d.totalDebt) > 0);

    // Generar mensajes individuales listos para WhatsApp (CallMeBot / WhatsApp API)
    const mensajes = conDeuda.map((d) => ({
      phone: d.phone?.replace(/\D/g, '') || '',
      name:  d.name,
      vehicle: d.vehicle || 'Sin unidad',
      totalDebt: Number(d.totalDebt),
      whatsappText: `🚗 RECORDATORIO DE RENTA — Al Volante GDL\n\nHola ${d.name}, te recordamos que tienes renta pendiente:\n\n💰 $${Number(d.totalDebt).toFixed(2)} MXN\n🚙 Unidad: ${d.vehicle || 'Sin unidad'}\n\nFavor de realizar tu pago esta semana.\n¡Gracias! 🙏`,
      whatsappUrl: `https://wa.me/${d.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${d.name}, tienes renta pendiente de $${Number(d.totalDebt)} MXN. Por favor realiza tu pago. — Al Volante GDL`)}`,
    }));

    // Mensaje consolidado para el admin
    const resumenAdmin = conDeuda.length > 0
      ? `📊 COBRO SEMANAL — Al Volante GDL\n\n${conDeuda.map((d) => `• ${d.name} (${d.vehicle || 'S/U'}): $${Number(d.totalDebt).toFixed(0)}`).join('\n')}\n\nTotal choferes con deuda: ${conDeuda.length}\nTotal por cobrar: $${conDeuda.reduce((s, d) => s + Number(d.totalDebt), 0).toFixed(0)} MXN`
      : '✅ Sin cobros pendientes esta semana. ¡Todo al corriente!';

    return NextResponse.json({
      ok: true,
      total: drivers.length,
      conDeuda: conDeuda.length,
      data: conDeuda,
      mensajes,
      resumenAdmin,
      hayDeuda: conDeuda.length > 0,
      totalPorCobrar: conDeuda.reduce((s, d) => s + Number(d.totalDebt), 0),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[make/cobro-semanal] Error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
