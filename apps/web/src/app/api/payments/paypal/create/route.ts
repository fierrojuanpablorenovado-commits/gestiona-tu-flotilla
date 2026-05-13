import { NextRequest, NextResponse } from 'next/server';

const PLAN_AMOUNTS: Record<string, string> = {
  basico:      '999.00',
  profesional: '2499.00',
  enterprise:  '5999.00',
};

async function getPayPalToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID!;
  const secret   = process.env.PAYPAL_CLIENT_SECRET!;
  const mode     = process.env.PAYPAL_MODE || 'sandbox';
  const baseUrl  = mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  return data.access_token;
}

export async function POST(req: NextRequest) {
  try {
    const { plan, tenantId } = await req.json();

    const clientId = process.env.PAYPAL_CLIENT_ID;
    if (!clientId || clientId.includes('REPLACE')) {
      return NextResponse.json({
        message: 'PayPal no configurado. Agrega PAYPAL_CLIENT_ID en las variables de entorno.',
        configured: false,
      }, { status: 503 });
    }

    const amount    = PLAN_AMOUNTS[plan] || '999.00';
    const mode      = process.env.PAYPAL_MODE || 'sandbox';
    const baseUrl   = mode === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
    const appUrl    = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

    const token = await getPayPalToken();

    const order = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'MXN', value: amount },
          description: `Gestiona tu Flotilla — Plan ${plan}`,
          custom_id: tenantId || '',
        }],
        application_context: {
          return_url: `${appUrl}/dashboard?payment=success`,
          cancel_url: `${appUrl}/configuracion?tab=facturacion`,
        },
      }),
    }).then(r => r.json());

    const approvalLink = order.links?.find((l: any) => l.rel === 'approve')?.href;
    return NextResponse.json({ url: approvalLink, orderId: order.id });
  } catch (err: any) {
    console.error('[paypal create]', err);
    return NextResponse.json({ message: err.message || 'Error PayPal' }, { status: 500 });
  }
}
