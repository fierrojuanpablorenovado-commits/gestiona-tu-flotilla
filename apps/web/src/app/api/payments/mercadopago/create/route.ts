import { NextRequest, NextResponse } from 'next/server';

const PLAN_AMOUNTS: Record<string, number> = {
  basico:      999,
  profesional: 2499,
  enterprise:  5999,
};

export async function POST(req: NextRequest) {
  try {
    const { plan, email, tenantId } = await req.json();

    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken || accessToken.includes('REPLACE')) {
      return NextResponse.json({
        message: 'MercadoPago no configurado. Agrega MP_ACCESS_TOKEN en las variables de entorno.',
        configured: false,
      }, { status: 503 });
    }

    const amount = PLAN_AMOUNTS[plan] || 999;
    const appUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

    const preference = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        items: [{
          title: `Gestiona tu Flotilla — Plan ${plan}`,
          quantity: 1,
          currency_id: 'MXN',
          unit_price: amount,
        }],
        payer: { email: email || '' },
        external_reference: tenantId || '',
        back_urls: {
          success: `${appUrl}/dashboard?payment=success`,
          failure: `${appUrl}/configuracion?tab=facturacion`,
          pending: `${appUrl}/configuracion?tab=facturacion`,
        },
        auto_return: 'approved',
      }),
    }).then(r => r.json());

    return NextResponse.json({
      url:          preference.init_point,
      sandboxUrl:   preference.sandbox_init_point,
      preferenceId: preference.id,
    });
  } catch (err: any) {
    console.error('[mercadopago create]', err);
    return NextResponse.json({ message: err.message || 'Error MercadoPago' }, { status: 500 });
  }
}
