import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Monto en centavos MXN
const PLAN_AMOUNTS: Record<string, number> = {
  basic:      49900,
  pro:        99900,
  enterprise: 199900,
};

const PLAN_NAMES: Record<string, string> = {
  basic:      'Plan Starter — Gestiona tu Flotilla',
  pro:        'Plan Pro — Gestiona tu Flotilla',
  enterprise: 'Plan Enterprise — Gestiona tu Flotilla',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, plan, email, empresa } = body;

    if (!tenantId || !plan || !email) {
      return NextResponse.json(
        { message: 'tenantId, plan y email son requeridos' },
        { status: 400 },
      );
    }

    const amount = PLAN_AMOUNTS[plan];
    if (!amount) {
      return NextResponse.json(
        { message: `Plan "${plan}" no requiere pago o no es válido` },
        { status: 400 },
      );
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            recurring: { interval: 'month' },
            product_data: {
              name: PLAN_NAMES[plan] ?? `Plan ${plan}`,
              description: empresa ? `Empresa: ${empresa}` : undefined,
              metadata: { plan, tenantId: String(tenantId) },
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: `https://gestionatuflotilla.com/login?registered=true&payment=success`,
      cancel_url:  `https://gestionatuflotilla.com/registro`,
      metadata: {
        tenantId: String(tenantId),
        plan,
      },
      subscription_data: {
        metadata: {
          tenantId: String(tenantId),
          plan,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[stripe/checkout POST]', err);
    const message = err instanceof Error ? err.message : 'Error al crear sesión de pago';
    return NextResponse.json({ message }, { status: 500 });
  }
}
