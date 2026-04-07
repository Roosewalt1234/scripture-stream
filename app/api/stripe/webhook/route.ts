import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/client';
import { upsertSubscription, getUserIdByCustomer, mapStripeStatus, mapPlanFromPriceId } from '@/lib/stripe/helpers';
import type Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Webhook signature invalid: ${err}` }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId) break;
      if (session.mode === 'payment') {
        await upsertSubscription({
          userId,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: null,
          plan: 'lifetime',
          status: 'active',
          currentPeriodEnd: null,
        });
      }
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = await getUserIdByCustomer(sub.customer as string);
      if (!userId) break;
      const priceId = sub.items.data[0]?.price.id ?? '';
      await upsertSubscription({
        userId,
        stripeCustomerId: sub.customer as string,
        stripeSubscriptionId: sub.id,
        plan: mapPlanFromPriceId(priceId),
        status: mapStripeStatus(sub.status),
        currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = await getUserIdByCustomer(sub.customer as string);
      if (!userId) break;
      await upsertSubscription({
        userId,
        stripeCustomerId: sub.customer as string,
        stripeSubscriptionId: sub.id,
        plan: 'free',
        status: 'canceled',
        currentPeriodEnd: null,
      });
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const userId = await getUserIdByCustomer(invoice.customer as string);
      if (!userId) break;
      const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
      if (subId) {
        const stripe2 = getStripe();
        const stripeSub = await stripe2.subscriptions.retrieve(subId);
        await upsertSubscription({
          userId,
          stripeCustomerId: invoice.customer as string,
          stripeSubscriptionId: subId,
          plan: mapPlanFromPriceId(stripeSub.items.data[0]?.price.id ?? ''),
          status: 'past_due',
          currentPeriodEnd: stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null,
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
