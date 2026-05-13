import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sql } from '@/lib/db';
import { sendWhatsApp, WhatsAppTemplates } from '@/lib/whatsapp';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  // En Next.js 14 App Router usamos req.text() para el raw body
  const body = await req.text();
  const sig  = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook signature inválida';
    console.error('[stripe/webhook] Firma inválida:', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      // ── Checkout completado ────────────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId      = session.metadata?.tenantId;
        const plan          = session.metadata?.plan;
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id ?? null;
        const amountTotal    = session.amount_total ?? 0;
        const currency       = session.currency ?? 'mxn';

        if (tenantId && plan) {
          // Activar tenant
          await sql`
            UPDATE tenants
            SET status = 'active',
                plan   = ${plan},
                subscription_id = ${subscriptionId}
            WHERE id = ${tenantId}
          `;

          // Registrar pago
          await sql`
            INSERT INTO payments (
              tenant_id, amount, currency, stripe_session_id,
              stripe_subscription_id, status, plan
            ) VALUES (
              ${tenantId},
              ${amountTotal / 100},
              ${currency},
              ${session.id},
              ${subscriptionId},
              'paid',
              ${plan}
            )
            ON CONFLICT DO NOTHING
          `;

          // Enviar WhatsApp de bienvenida si hay teléfono del admin
          try {
            const tenantRows = await sql`
              SELECT t.company_name, u.first_name, u.phone
              FROM tenants t
              LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'admin_general'
              WHERE t.id = ${tenantId}
              LIMIT 1
            `;
            const tenant = tenantRows[0] as { company_name?: string; first_name?: string; phone?: string } | undefined;
            if (tenant?.phone) {
              const msg = WhatsAppTemplates.bienvenida(
                tenant.first_name ?? 'Usuario',
                tenant.company_name ?? 'tu empresa'
              );
              await sendWhatsApp(tenant.phone, msg);
            }

            // También enviar confirmación de pago
            if (tenant?.phone) {
              const msgPago = WhatsAppTemplates.pagoRecibido(
                tenant.company_name ?? 'tu empresa',
                amountTotal / 100,
                plan
              );
              await sendWhatsApp(tenant.phone, msgPago);
            }
          } catch (waErr) {
            // No fallar el webhook por error de WhatsApp
            console.error('[stripe/webhook] WhatsApp error:', waErr);
          }
        }
        break;
      }

      // ── Suscripción cancelada / eliminada ──────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        await sql`
          UPDATE tenants
          SET status = 'suspended'
          WHERE subscription_id = ${subscription.id}
        `;
        break;
      }

      // ── Pago de factura fallido ────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id ?? null;

        if (subId) {
          await sql`
            UPDATE tenants
            SET status = 'past_due'
            WHERE subscription_id = ${subId}
          `;
        }
        break;
      }

      default:
        // Ignorar otros eventos
        break;
    }
  } catch (err) {
    console.error('[stripe/webhook] Error procesando evento:', event.type, err);
    // Retornamos 200 igualmente para que Stripe no reintente indefinidamente
  }

  // Stripe requiere 200 siempre
  return NextResponse.json({ received: true }, { status: 200 });
}
