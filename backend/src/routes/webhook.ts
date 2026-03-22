import { Hono } from 'hono';
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { licenses, users } from '../db/schema.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export const webhookRoutes = new Hono();

// POST /webhooks/stripe — handle Stripe events
webhookRoutes.post('/stripe', async (c) => {
  const body = await c.req.text();
  const sig = c.req.header('stripe-signature');

  if (!sig) return c.json({ error: 'Missing signature' }, 400);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return c.json({ error: 'Invalid signature' }, 400);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id ?? session.metadata?.userId;
      const tier = (session.metadata?.tier ?? 'pro') as 'pro' | 'team';

      if (!userId) break;

      // Check if license exists
      const existing = await db.query.licenses.findFirst({
        where: eq(licenses.userId, userId),
      });

      if (existing) {
        await db.update(licenses).set({
          tier,
          status: 'active',
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          updatedAt: new Date(),
        }).where(eq(licenses.id, existing.id));
      } else {
        await db.insert(licenses).values({
          userId,
          tier,
          status: 'active',
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
        });
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const license = await db.query.licenses.findFirst({
        where: eq(licenses.stripeSubscriptionId, sub.id),
      });
      if (license) {
        const status = sub.status === 'active' ? 'active'
          : sub.status === 'past_due' ? 'past_due'
          : sub.status === 'canceled' ? 'canceled'
          : 'expired';
        await db.update(licenses).set({
          status,
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          updatedAt: new Date(),
        }).where(eq(licenses.id, license.id));
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const license = await db.query.licenses.findFirst({
        where: eq(licenses.stripeSubscriptionId, sub.id),
      });
      if (license) {
        await db.update(licenses).set({
          status: 'canceled',
          tier: 'free',
          updatedAt: new Date(),
        }).where(eq(licenses.id, license.id));
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        const license = await db.query.licenses.findFirst({
          where: eq(licenses.stripeSubscriptionId, invoice.subscription as string),
        });
        if (license) {
          await db.update(licenses).set({
            status: 'past_due',
            updatedAt: new Date(),
          }).where(eq(licenses.id, license.id));
        }
      }
      break;
    }
  }

  return c.json({ received: true });
});
