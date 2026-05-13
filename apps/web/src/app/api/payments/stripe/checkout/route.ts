import { NextRequest, NextResponse } from 'next/server';

const PLAN_PRICES: Record<string, { amount: number; name: string }> = {
  basic:      { amount: 49900,  name: 'Plan Básico' },
  pro:        { amount: 99900,  name: 'Plan Pro' },
  enterprise: { amount: 199900, name: 'Plan Enterprise' },
};

export async function POST(req: NextRequest) {
  try {
    const { plan, email, tenantId } = await req.json();

    if (!plan || !PLAN_PRICES[plan]) {
      return NextResponse.json({ message: 'Plan no válido' }, { status: 400 });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey || stripeKey.includes('REPLACE')) {
      return NextResponse.json({
        message: 'Stripe no configurado. Agrega STRIPE_SECRET_KEY en las variables de entorno.',
        configured: false,
      }, { status: 503 });
    }

    // Dynamically import Stripe to avoid issues when key is not set
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' as any });

    const baseUrl = 'https://gestionatuflotilla.com';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      currency: 'mxn',
      customer_email: email || undefined,
      line_items: [{
        price_data: {
          currency: 'mxn',
          product_data: { name: PLAN_PRICES[plan].name },
          unit_amount: PLAN_PRICES[plan].amount,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      metadata: { tenantId: tenantId || '', plan },
      success_url: `${baseUrl}/dashboard?payment=success`,
      cancel_url:  `${baseUrl}/configuracion`,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    console.error('[stripe checkout]', err);
    return NextResponse.json({ message: err.message || 'Error al crear sesión de pago' }, { status: 500 });
  }
}
