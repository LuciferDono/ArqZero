import { Hono } from 'hono';
import { z } from 'zod';
import Stripe from 'stripe';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { licenses, users } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' });

export const checkoutRoutes = new Hono();
checkoutRoutes.use('*', authMiddleware);

// Price IDs — set these in env or hardcode for now
const PRICE_IDS: Record<string, string> = {
  pro: process.env.STRIPE_PRO_PRICE_ID ?? 'price_pro_placeholder',
  team: process.env.STRIPE_TEAM_PRICE_ID ?? 'price_team_placeholder',
};

// POST /checkout/session — create Stripe checkout session
checkoutRoutes.post('/session', async (c) => {
  const userId = c.get('userId');
  const email = c.get('email');
  const { tier } = z.object({ tier: z.enum(['pro', 'team']) }).parse(await c.req.json());

  const priceId = PRICE_IDS[tier];
  if (!priceId || priceId.includes('placeholder')) {
    return c.json({ error: 'Pricing not configured yet' }, 503);
  }

  // Check if user already has a Stripe customer
  const license = await db.query.licenses.findFirst({
    where: eq(licenses.userId, userId),
  });

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL ?? 'https://arqzero.dev'}/dashboard?upgraded=true`,
    cancel_url: `${process.env.FRONTEND_URL ?? 'https://arqzero.dev'}/pricing`,
    client_reference_id: userId,
    customer_email: license?.stripeCustomerId ? undefined : email,
    customer: license?.stripeCustomerId ?? undefined,
    metadata: { userId, tier },
  };

  const session = await stripe.checkout.sessions.create(sessionParams);
  return c.json({ url: session.url });
});

// POST /checkout/portal — Stripe Customer Portal
checkoutRoutes.post('/portal', async (c) => {
  const userId = c.get('userId');

  const license = await db.query.licenses.findFirst({
    where: eq(licenses.userId, userId),
  });

  if (!license?.stripeCustomerId) {
    return c.json({ error: 'No billing account found. Subscribe first.' }, 404);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: license.stripeCustomerId,
    return_url: `${process.env.FRONTEND_URL ?? 'https://arqzero.dev'}/dashboard/billing`,
  });

  return c.json({ url: session.url });
});
