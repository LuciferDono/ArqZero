# ArqZero Commercial Implementation Plan

**Date:** 2026-03-22
**Author:** prana
**Status:** Ready for execution
**Source:** `2026-03-22-arqzero-commercial-design.md` + `2026-03-22-arqzero-infrastructure-architecture.md`

---

## Overview

43 tasks across 3 systems:

| System | Tasks | Description |
|---|---|---|
| **Backend** | B1–B15 | Hono API, PostgreSQL, Stripe, Resend |
| **CLI Auth** | C1–C14 | Login flow, token storage, tier gating, usage tracking |
| **Website** | W1–W14 | Next.js site, Stripe Checkout, dashboard, docs |

## Dependency Graph

```
B1 (DB schema) ──► B2 (auth routes) ──► B3 (verify) ──► B4 (refresh)
                                                          │
B5 (license route) ◄── B1                                │
B6 (usage route) ◄── B1                                  │
B7 (Resend) ◄── B2                                       ▼
B8 (Stripe webhook) ◄── B1, B5                    C1 (auth.json)
B9 (checkout route) ◄── B8                         C2 (login cmd)
B10 (JWT utils) ──► B2, B3, B4                     C3 (verify flow)
B11 (rate limit) ──► B2                            C4 (token refresh)
B12 (middleware) ──► B5, B6                        C5 (offline grace)
B13 (machine-id) ──► B6                            C6 (tier type)
B14 (tests) ◄── B1-B13                            C7 (feature gate)
B15 (deploy) ◄── B14                              C8 (tool gate)
                                                    C9 (cmd gate)
W1 (scaffold) ── independent                       C10 (capability gate)
W2 (landing) ◄── W1                                C11 (usage tracker)
W3 (pricing) ◄── W1                                C12 (setup wizard)
W4 (docs) ◄── W1                                   C13 (status cmd)
W5 (auth pages) ◄── W1, B2                         C14 (tests)
W6 (dashboard) ◄── W5
W7 (Stripe portal) ◄── W5, B9
W8 (blog) ◄── W1
W9 (SEO) ◄── W1
W10 (analytics) ◄── W1
W11 (terminal demo) ◄── W2
W12 (responsive) ◄── W2-W8
W13 (OG images) ◄── W1
W14 (deploy) ◄── W1-W13
```

**Parallel execution groups:**
- **Group 1 (no deps):** B1, B10, C1, C6, W1
- **Group 2 (after Group 1):** B2, B5, B6, B7, B11, B12, B13, C2, C7, W2, W3, W4, W8
- **Group 3 (after Group 2):** B3, B4, B8, B9, C3, C4, C5, C8, C9, C10, C11, C12, C13, W5, W6, W7, W9, W10, W11, W12, W13
- **Group 4 (final):** B14, B15, C14, W14

---

## System 1: Backend (B1–B15)

### B1 — Database Schema & Migrations

**Files to create:**
- `backend/drizzle/0001_initial.sql`
- `backend/src/db/schema.ts`
- `backend/src/db/client.ts`

**Specs:**

```sql
-- 0001_initial.sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  display_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR(10) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'team')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(128) NOT NULL,
  machine_id VARCHAR(64),
  device_label VARCHAR(100),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_refresh ON sessions(refresh_token_hash);

CREATE TABLE daily_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);

CREATE TABLE verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token_hash VARCHAR(128) NOT NULL,
  purpose VARCHAR(20) NOT NULL DEFAULT 'login' CHECK (purpose IN ('login', 'email_verify')),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_vt_email ON verification_tokens(email);
```

```typescript
// backend/src/db/schema.ts
import { pgTable, uuid, varchar, boolean, integer, date, timestamp, unique, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  emailVerified: boolean('email_verified').default(false),
  displayName: varchar('display_name', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const licenses = pgTable('licenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tier: varchar('tier', { length: 10 }).notNull().default('free'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  periodEnd: timestamp('period_end', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  refreshTokenHash: varchar('refresh_token_hash', { length: 128 }).notNull(),
  machineId: varchar('machine_id', { length: 64 }),
  deviceLabel: varchar('device_label', { length: 100 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const dailyUsage = pgTable('daily_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  messageCount: integer('message_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [unique().on(t.userId, t.date)]);

export const verificationTokens = pgTable('verification_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  tokenHash: varchar('token_hash', { length: 128 }).notNull(),
  purpose: varchar('purpose', { length: 20 }).notNull().default('login'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  used: boolean('used').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
```

```typescript
// backend/src/db/client.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
export type Database = typeof db;
```

**Dependencies:** None
**Verification:** `drizzle-kit push` succeeds against a test Supabase instance; all tables exist with correct constraints.

---

### B2 — Auth Login Route (Send Verification Code)

**Files to create:**
- `backend/src/routes/auth.ts`

**Specs:**

```typescript
// POST /auth/login
// Request: { email: string }
// Response: { ok: true, message: "Verification code sent" }
// Error: 400 if email invalid, 429 if rate limited

import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client.js';
import { users, verificationTokens } from '../db/schema.js';
import { sendVerificationEmail } from '../services/email.js';
import { hashToken, generateCode } from '../utils/crypto.js';
import { eq } from 'drizzle-orm';

const loginSchema = z.object({
  email: z.string().email().max(255),
});

export const authRoutes = new Hono();

authRoutes.post('/login', async (c) => {
  const body = loginSchema.parse(await c.req.json());

  // Upsert user (create if first login)
  let user = await db.query.users.findFirst({
    where: eq(users.email, body.email.toLowerCase()),
  });
  if (!user) {
    const [created] = await db.insert(users).values({
      email: body.email.toLowerCase(),
    }).returning();
    user = created;

    // Also create free license
    await db.insert(licenses).values({ userId: user.id, tier: 'free' });
  }

  // Generate 6-digit code
  const code = generateCode(); // "123456"
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await db.insert(verificationTokens).values({
    userId: user.id,
    email: body.email.toLowerCase(),
    tokenHash: hashToken(code),
    purpose: 'login',
    expiresAt,
  });

  await sendVerificationEmail(body.email, code);

  return c.json({ ok: true, message: 'Verification code sent' });
});
```

**Dependencies:** B1, B7, B10, B11
**Verification:** `curl -X POST /auth/login -d '{"email":"test@example.com"}'` returns 200 with ok:true. Email is received with 6-digit code.

---

### B3 — Auth Verify Route (Exchange Code for Tokens)

**Files to modify:**
- `backend/src/routes/auth.ts` (append to same file)

**Specs:**

```typescript
// POST /auth/verify
// Request: { email: string, code: string, machineId?: string, deviceLabel?: string }
// Response: { accessToken: string, refreshToken: string, tier: string, expiresIn: 3600 }
// Error: 400 invalid code, 410 expired code

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  machineId: z.string().max(64).optional(),
  deviceLabel: z.string().max(100).optional(),
});

authRoutes.post('/verify', async (c) => {
  const body = verifySchema.parse(await c.req.json());
  const email = body.email.toLowerCase();

  // Find unexpired, unused token for this email
  const token = await db.query.verificationTokens.findFirst({
    where: and(
      eq(verificationTokens.email, email),
      eq(verificationTokens.tokenHash, hashToken(body.code)),
      eq(verificationTokens.used, false),
      gt(verificationTokens.expiresAt, new Date()),
    ),
  });

  if (!token) return c.json({ error: 'Invalid or expired code' }, 400);

  // Mark used
  await db.update(verificationTokens).set({ used: true }).where(eq(verificationTokens.id, token.id));

  // Mark email verified
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) return c.json({ error: 'User not found' }, 404);
  await db.update(users).set({ emailVerified: true }).where(eq(users.id, user.id));

  // Get license
  const license = await db.query.licenses.findFirst({ where: eq(licenses.userId, user.id) });
  const tier = license?.tier ?? 'free';

  // Generate refresh token (256-bit random, stored hashed)
  const refreshToken = generateRefreshToken(); // 64-char hex
  const refreshExpires = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days

  await db.insert(sessions).values({
    userId: user.id,
    refreshTokenHash: hashToken(refreshToken),
    machineId: body.machineId ?? null,
    deviceLabel: body.deviceLabel ?? null,
    expiresAt: refreshExpires,
  });

  // Generate JWT access token (1 hour)
  const accessToken = signJwt({
    sub: user.id,
    tier,
    dailyCap: tier === 'free' ? 50 : -1,
  }, '1h');

  return c.json({
    accessToken,
    refreshToken,
    tier,
    expiresIn: 3600,
  });
});
```

**Dependencies:** B1, B2, B10
**Verification:** Full flow test — login, get code from DB, verify, receive tokens. JWT decodes correctly with expected claims.

---

### B4 — Auth Refresh Route

**Files to modify:**
- `backend/src/routes/auth.ts` (append)

**Specs:**

```typescript
// POST /auth/refresh
// Request: { refreshToken: string }
// Response: { accessToken: string, expiresIn: 3600 }
// Error: 401 if token invalid/expired

authRoutes.post('/refresh', async (c) => {
  const { refreshToken } = z.object({ refreshToken: z.string() }).parse(await c.req.json());

  const session = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.refreshTokenHash, hashToken(refreshToken)),
      gt(sessions.expiresAt, new Date()),
    ),
  });

  if (!session) return c.json({ error: 'Invalid or expired refresh token' }, 401);

  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  if (!user) return c.json({ error: 'User not found' }, 401);

  const license = await db.query.licenses.findFirst({ where: eq(licenses.userId, user.id) });
  const tier = license?.tier ?? 'free';

  const accessToken = signJwt({ sub: user.id, tier, dailyCap: tier === 'free' ? 50 : -1 }, '1h');

  return c.json({ accessToken, expiresIn: 3600 });
});
```

**Dependencies:** B1, B10
**Verification:** With a valid refresh token from B3, calling `/auth/refresh` returns a new access token that decodes correctly.

---

### B5 — License Route

**Files to create:**
- `backend/src/routes/license.ts`

**Specs:**

```typescript
// GET /license
// Headers: Authorization: Bearer <access_token>
// Response: { tier: string, status: string, periodEnd: string | null }

import { Hono } from 'hono';
import { db } from '../db/client.js';
import { licenses } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';

export const licenseRoutes = new Hono();

licenseRoutes.get('/', authMiddleware, async (c) => {
  const userId = c.get('userId'); // set by authMiddleware

  const license = await db.query.licenses.findFirst({
    where: eq(licenses.userId, userId),
  });

  if (!license) {
    return c.json({ tier: 'free', status: 'active', periodEnd: null });
  }

  return c.json({
    tier: license.tier,
    status: license.status,
    periodEnd: license.periodEnd?.toISOString() ?? null,
  });
});
```

**Dependencies:** B1, B12
**Verification:** Authenticated request returns correct tier for the user.

---

### B6 — Usage Sync Route

**Files to create:**
- `backend/src/routes/usage.ts`

**Specs:**

```typescript
// POST /usage/sync
// Headers: Authorization: Bearer <access_token>
// Request: { date: string (YYYY-MM-DD), messageCount: number, machineId: string }
// Response: { totalCount: number, cap: number, remaining: number }

import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client.js';
import { dailyUsage } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';

const syncSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  messageCount: z.number().int().min(0),
  machineId: z.string().max(64),
});

export const usageRoutes = new Hono();

usageRoutes.post('/sync', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const tier = c.get('tier');
  const body = syncSchema.parse(await c.req.json());

  // Upsert: increment message_count
  await db.insert(dailyUsage).values({
    userId,
    date: body.date,
    messageCount: body.messageCount,
  }).onConflictDoUpdate({
    target: [dailyUsage.userId, dailyUsage.date],
    set: {
      messageCount: sql`GREATEST(daily_usage.message_count, ${body.messageCount})`,
    },
  });

  const row = await db.query.dailyUsage.findFirst({
    where: and(eq(dailyUsage.userId, userId), eq(dailyUsage.date, body.date)),
  });

  const totalCount = row?.messageCount ?? 0;
  const cap = tier === 'free' ? 50 : -1; // -1 = unlimited
  const remaining = cap === -1 ? -1 : Math.max(0, cap - totalCount);

  return c.json({ totalCount, cap, remaining });
});
```

**Dependencies:** B1, B12
**Verification:** Syncing usage increments count; repeated syncs from same machine take max; cross-machine syncs merge correctly.

---

### B7 — Email Service (Resend)

**Files to create:**
- `backend/src/services/email.ts`

**Specs:**

```typescript
// backend/src/services/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  await resend.emails.send({
    from: 'ArqZero <noreply@arqzero.dev>',
    to: email,
    subject: `Your ArqZero login code: ${code}`,
    html: `
      <div style="font-family: monospace; background: #1a1a1a; color: #FFB800; padding: 40px; text-align: center;">
        <h1 style="color: #FFB800;">◆ ArqZero</h1>
        <p style="color: #ccc; font-size: 16px;">Your verification code:</p>
        <div style="font-size: 48px; letter-spacing: 12px; margin: 24px 0; color: #FFB800;">${code}</div>
        <p style="color: #888; font-size: 14px;">This code expires in 10 minutes.</p>
        <p style="color: #888; font-size: 14px;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}
```

**Dependencies:** None (Resend npm package)
**Verification:** Calling `sendVerificationEmail('test@example.com', '123456')` delivers an email. Check Resend dashboard.

---

### B8 — Stripe Webhook Handler

**Files to create:**
- `backend/src/routes/webhooks.ts`

**Specs:**

```typescript
// POST /webhooks/stripe
// Raw body, verified via Stripe signature

import { Hono } from 'hono';
import Stripe from 'stripe';
import { db } from '../db/client.js';
import { licenses, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const webhookRoutes = new Hono();

webhookRoutes.post('/stripe', async (c) => {
  const sig = c.req.header('stripe-signature')!;
  const body = await c.req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return c.json({ error: 'Invalid signature' }, 400);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId) break;

      await db.update(licenses).set({
        tier: 'pro',
        status: 'active',
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        updatedAt: new Date(),
      }).where(eq(licenses.userId, userId));
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const license = await db.query.licenses.findFirst({
        where: eq(licenses.stripeSubscriptionId, sub.id),
      });
      if (!license) break;

      await db.update(licenses).set({
        status: sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'past_due' : 'canceled',
        periodEnd: new Date(sub.current_period_end * 1000),
        updatedAt: new Date(),
      }).where(eq(licenses.id, license.id));
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await db.update(licenses).set({
        tier: 'free',
        status: 'canceled',
        stripeSubscriptionId: null,
        periodEnd: null,
        updatedAt: new Date(),
      }).where(eq(licenses.stripeSubscriptionId, sub.id));
      break;
    }
  }

  return c.json({ received: true });
});
```

**Dependencies:** B1, B5
**Verification:** Using Stripe CLI `stripe trigger checkout.session.completed`, the license row updates to tier='pro'. Subscription delete reverts to 'free'.

---

### B9 — Checkout Session Route

**Files to create:**
- `backend/src/routes/checkout.ts`

**Specs:**

```typescript
// POST /checkout/session
// Headers: Authorization: Bearer <access_token>
// Request: { plan: 'pro' | 'team', successUrl: string, cancelUrl: string }
// Response: { url: string }

import { Hono } from 'hono';
import { z } from 'zod';
import Stripe from 'stripe';
import { authMiddleware } from '../middleware/auth.js';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_IDS: Record<string, string> = {
  pro: process.env.STRIPE_PRO_PRICE_ID!,    // $12/mo
  team: process.env.STRIPE_TEAM_PRICE_ID!,   // $30/user/mo
};

const checkoutSchema = z.object({
  plan: z.enum(['pro', 'team']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export const checkoutRoutes = new Hono();

checkoutRoutes.post('/session', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = checkoutSchema.parse(await c.req.json());

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return c.json({ error: 'User not found' }, 404);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: user.email,
    line_items: [{ price: PRICE_IDS[body.plan], quantity: 1 }],
    success_url: body.successUrl,
    cancel_url: body.cancelUrl,
    metadata: { userId },
  });

  return c.json({ url: session.url });
});
```

**Dependencies:** B1, B8, B12
**Verification:** Authenticated request returns a valid Stripe Checkout URL. Completing checkout in test mode triggers the webhook and updates the license.

---

### B10 — JWT & Crypto Utilities

**Files to create:**
- `backend/src/utils/crypto.ts`
- `backend/src/utils/jwt.ts`

**Specs:**

```typescript
// backend/src/utils/crypto.ts
import { createHash, randomBytes, randomInt } from 'node:crypto';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateCode(): string {
  return String(randomInt(100000, 999999));
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString('hex'); // 64-char hex = 256 bits
}
```

```typescript
// backend/src/utils/jwt.ts
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export interface ArqJwtPayload extends JWTPayload {
  sub: string;      // user_id
  tier: string;     // 'free' | 'pro' | 'team'
  dailyCap: number; // 50 for free, -1 for unlimited
}

export async function signJwt(payload: Omit<ArqJwtPayload, 'iat' | 'exp'>, expiresIn: string): Promise<string> {
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(SECRET);
}

export async function verifyJwt(token: string): Promise<ArqJwtPayload> {
  const { payload } = await jwtVerify(token, SECRET);
  return payload as unknown as ArqJwtPayload;
}
```

**Dependencies:** None
**Verification:** `signJwt({ sub: 'uuid', tier: 'pro', dailyCap: -1 }, '1h')` produces a token; `verifyJwt(token)` returns the payload. Expired tokens throw.

---

### B11 — Rate Limiter Middleware

**Files to create:**
- `backend/src/middleware/rate-limit.ts`

**Specs:**

```typescript
// backend/src/middleware/rate-limit.ts
// In-memory rate limiter (sufficient for single-instance Railway deploy)
// Limits: 5 requests per email per 10 minutes on /auth/login

import type { MiddlewareHandler } from 'hono';

const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(opts: { windowMs: number; max: number; keyFn: (c: any) => string }): MiddlewareHandler {
  return async (c, next) => {
    const key = opts.keyFn(c);
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + opts.windowMs });
      return next();
    }

    if (entry.count >= opts.max) {
      return c.json({ error: 'Too many requests. Try again later.' }, 429);
    }

    entry.count++;
    return next();
  };
}
```

**Dependencies:** None
**Verification:** 6th request to `/auth/login` with same email within 10 minutes returns 429.

---

### B12 — Auth Middleware (JWT Verification)

**Files to create:**
- `backend/src/middleware/auth.ts`

**Specs:**

```typescript
// backend/src/middleware/auth.ts
import type { MiddlewareHandler } from 'hono';
import { verifyJwt } from '../utils/jwt.js';

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = header.slice(7);
  try {
    const payload = await verifyJwt(token);
    c.set('userId', payload.sub);
    c.set('tier', payload.tier);
    c.set('dailyCap', payload.dailyCap);
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  return next();
};
```

**Dependencies:** B10
**Verification:** Request without token returns 401. Request with valid token passes through with userId/tier set. Expired token returns 401.

---

### B13 — Machine ID Utility

**Files to create:**
- `backend/src/utils/machine-id.ts`

**Specs:**

Note: The CLI already has `src/system/machine-id.ts`. The backend just accepts the machine ID string from the client. This task is about documenting the contract.

```typescript
// backend/src/utils/machine-id.ts
// Machine ID is generated client-side (see CLI task C1).
// The backend stores it as an opaque string (max 64 chars).
// Used to track per-device sessions and merge usage counts.

export function validateMachineId(id: string | undefined): string | null {
  if (!id) return null;
  if (id.length > 64) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  return id;
}
```

**Dependencies:** None
**Verification:** Valid machine IDs pass, invalid ones return null.

---

### B14 — Backend App Entry & Tests

**Files to create:**
- `backend/src/index.ts`
- `backend/package.json`
- `backend/tsconfig.json`
- `backend/.env.example`
- `backend/src/routes/__tests__/auth.test.ts`
- `backend/src/routes/__tests__/license.test.ts`
- `backend/src/routes/__tests__/usage.test.ts`
- `backend/src/routes/__tests__/webhooks.test.ts`

**Specs:**

```typescript
// backend/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './routes/auth.js';
import { licenseRoutes } from './routes/license.js';
import { usageRoutes } from './routes/usage.js';
import { checkoutRoutes } from './routes/checkout.js';
import { webhookRoutes } from './routes/webhooks.js';

const app = new Hono();

app.use('*', cors({
  origin: ['https://arqzero.dev', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST'],
  allowHeaders: ['Authorization', 'Content-Type'],
}));

app.route('/auth', authRoutes);
app.route('/license', licenseRoutes);
app.route('/usage', usageRoutes);
app.route('/checkout', checkoutRoutes);
app.route('/webhooks', webhookRoutes);

app.get('/health', (c) => c.json({ ok: true, timestamp: new Date().toISOString() }));

export default app;
```

```json
// backend/package.json
{
  "name": "@arqzero/backend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "tsx --test src/**/*.test.ts",
    "db:push": "drizzle-kit push",
    "db:generate": "drizzle-kit generate"
  },
  "dependencies": {
    "hono": "^4.x",
    "drizzle-orm": "^0.36.x",
    "pg": "^8.x",
    "jose": "^5.x",
    "resend": "^4.x",
    "stripe": "^17.x",
    "zod": "^4.x"
  },
  "devDependencies": {
    "drizzle-kit": "^0.28.x",
    "tsx": "^4.x",
    "typescript": "^5.x",
    "@types/node": "^22.x",
    "@types/pg": "^8.x"
  }
}
```

```
# backend/.env.example
DATABASE_URL=postgresql://user:pass@host:5432/arqzero
JWT_SECRET=your-256-bit-secret-here
RESEND_API_KEY=re_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRO_PRICE_ID=price_xxxxx
STRIPE_TEAM_PRICE_ID=price_xxxxx
```

**Test strategy:** Each test file uses an in-memory mock of the DB (or test transactions with rollback). Tests cover:
- Login: valid email, invalid email, rate limiting
- Verify: valid code, expired code, wrong code, replay attack
- Refresh: valid token, expired token, revoked session
- License: returns correct tier
- Usage: sync increments, multi-device merge, cap enforcement
- Webhooks: checkout.session.completed, subscription.updated, subscription.deleted

**Dependencies:** B1–B13
**Verification:** `cd backend && npm test` — all tests pass.

---

### B15 — Backend Deployment (Railway)

**Files to create:**
- `backend/Dockerfile`
- `backend/railway.toml`

**Specs:**

```dockerfile
# backend/Dockerfile
FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

```toml
# backend/railway.toml
[build]
builder = "dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 5
restartPolicyType = "on_failure"

[[services]]
name = "arqzero-api"
```

**Environment variables to set in Railway:**
- `DATABASE_URL` (from Supabase connection string)
- `JWT_SECRET` (generate with `openssl rand -hex 32`)
- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_TEAM_PRICE_ID`

**Dependencies:** B14
**Verification:** `railway up` succeeds; `curl https://arqzero-api.up.railway.app/health` returns `{ ok: true }`.

---

## System 2: CLI Auth Integration (C1–C14)

### C1 — Auth Token Storage

**Files to create:**
- `src/auth/store.ts`

**Specs:**

```typescript
// src/auth/store.ts
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface AuthData {
  accessToken: string;
  refreshToken: string;
  tier: 'free' | 'pro' | 'team';
  email: string;
  expiresAt: number; // Unix ms when access token expires
  lastValidated: number; // Unix ms of last server validation
}

const AUTH_PATH = path.join(os.homedir(), '.arqzero', 'auth.json');

export function loadAuth(): AuthData | null {
  try {
    if (!fs.existsSync(AUTH_PATH)) return null;
    const raw = fs.readFileSync(AUTH_PATH, 'utf-8');
    return JSON.parse(raw) as AuthData;
  } catch {
    return null;
  }
}

export function saveAuth(data: AuthData): void {
  const dir = path.dirname(AUTH_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(AUTH_PATH, JSON.stringify(data, null, 2), { mode: 0o600 });
}

export function clearAuth(): void {
  try { fs.unlinkSync(AUTH_PATH); } catch { /* ok */ }
}

export function isAccessTokenExpired(auth: AuthData): boolean {
  return Date.now() >= auth.expiresAt - 60_000; // 1 min buffer
}

export function isOfflineGraceExpired(auth: AuthData): boolean {
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - auth.lastValidated > SEVEN_DAYS;
}
```

**Dependencies:** None
**Verification:** `saveAuth(data)` creates `~/.arqzero/auth.json` with mode 0600; `loadAuth()` reads it back identically.

---

### C2 — Login Command

**Files to create:**
- `src/auth/client.ts`

**Files to modify:**
- `src/commands/builtins.ts` (add loginCommand, logoutCommand)
- `src/cli/args.ts` (add --login flag)

**Specs:**

```typescript
// src/auth/client.ts
const API_BASE = process.env.ARQZERO_API_URL ?? 'https://api.arqzero.dev';

export async function requestLoginCode(email: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function verifyLoginCode(
  email: string,
  code: string,
  machineId?: string,
): Promise<{ accessToken: string; refreshToken: string; tier: string; expiresIn: number }> {
  const res = await fetch(`${API_BASE}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, machineId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Verification failed' }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error('Refresh failed');
  return res.json();
}

export async function fetchLicense(
  accessToken: string,
): Promise<{ tier: string; status: string; periodEnd: string | null }> {
  const res = await fetch(`${API_BASE}/license`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('License fetch failed');
  return res.json();
}

export async function syncUsage(
  accessToken: string,
  date: string,
  messageCount: number,
  machineId: string,
): Promise<{ totalCount: number; cap: number; remaining: number }> {
  const res = await fetch(`${API_BASE}/usage/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ date, messageCount, machineId }),
  });
  if (!res.ok) throw new Error('Usage sync failed');
  return res.json();
}

export async function createCheckoutSession(
  accessToken: string,
  plan: 'pro' | 'team',
): Promise<{ url: string }> {
  const res = await fetch(`${API_BASE}/checkout/session`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan,
      successUrl: 'https://arqzero.dev/dashboard?upgraded=true',
      cancelUrl: 'https://arqzero.dev/pricing',
    }),
  });
  if (!res.ok) throw new Error('Checkout failed');
  return res.json();
}
```

**Slash commands to add in `src/commands/builtins.ts`:**

```typescript
export const loginCommand: SlashCommand = {
  name: '/login',
  description: 'Log in to ArqZero (email + verification code)',
  async execute(_args: string, ctx: SlashCommandContext): Promise<string> {
    // 1. Prompt for email via ctx.promptUser
    // 2. Call requestLoginCode(email)
    // 3. Prompt for 6-digit code
    // 4. Call verifyLoginCode(email, code, machineId)
    // 5. Save tokens via saveAuth()
    // 6. Return "Logged in as {email} (tier: {tier})"
  },
};

export const logoutCommand: SlashCommand = {
  name: '/logout',
  description: 'Log out and clear stored credentials',
  async execute(_args: string, _ctx: SlashCommandContext): Promise<string> {
    clearAuth();
    return 'Logged out. You are now on the free tier.';
  },
};

export const upgradeCommand: SlashCommand = {
  name: '/upgrade',
  description: 'Upgrade to ArqZero Pro',
  async execute(_args: string, ctx: SlashCommandContext): Promise<string> {
    const auth = loadAuth();
    if (!auth) return 'Not logged in. Run /login first.';
    if (auth.tier === 'pro') return 'You are already on the Pro tier.';
    const { url } = await createCheckoutSession(auth.accessToken, 'pro');
    return `Open this URL to upgrade:\n${url}`;
  },
};
```

**Dependencies:** C1
**Verification:** `/login` → enter email → receive code → enter code → `auth.json` created with valid tokens and tier.

---

### C3 — Token Refresh on Startup

**Files to create:**
- `src/auth/refresh.ts`

**Specs:**

```typescript
// src/auth/refresh.ts
import { loadAuth, saveAuth, isAccessTokenExpired, isOfflineGraceExpired, type AuthData } from './store.js';
import { refreshAccessToken, fetchLicense } from './client.js';

export type Tier = 'free' | 'pro' | 'team';

export interface AuthState {
  authenticated: boolean;
  tier: Tier;
  email: string | null;
  offline: boolean;
}

export async function resolveAuthState(): Promise<AuthState> {
  const auth = loadAuth();

  // No auth file → free tier, not authenticated
  if (!auth) {
    return { authenticated: false, tier: 'free', email: null, offline: false };
  }

  // Access token still valid → use cached tier
  if (!isAccessTokenExpired(auth)) {
    return { authenticated: true, tier: auth.tier as Tier, email: auth.email, offline: false };
  }

  // Access token expired → try refresh
  try {
    const result = await refreshAccessToken(auth.refreshToken);
    const license = await fetchLicense(result.accessToken);
    const updated: AuthData = {
      ...auth,
      accessToken: result.accessToken,
      tier: license.tier as Tier,
      expiresAt: Date.now() + result.expiresIn * 1000,
      lastValidated: Date.now(),
    };
    saveAuth(updated);
    return { authenticated: true, tier: updated.tier, email: updated.email, offline: false };
  } catch {
    // Offline → check grace period
    if (!isOfflineGraceExpired(auth)) {
      return { authenticated: true, tier: auth.tier as Tier, email: auth.email, offline: true };
    }
    // Grace expired → fall back to free
    return { authenticated: true, tier: 'free', email: auth.email, offline: true };
  }
}
```

**Dependencies:** C1, C2
**Verification:** With expired access token + valid refresh token, `resolveAuthState()` returns refreshed tier. With no network + valid grace period, returns cached tier. With expired grace, returns 'free'.

---

### C4 — Silent Token Refresh in Engine

**Files to modify:**
- `src/core/engine.ts` (add auth state to EngineOptions, call refresh before chat)

**Specs:**

Add to `EngineOptions`:

```typescript
export interface EngineOptions {
  // ... existing fields ...
  authState?: AuthState;
}
```

In the engine's `chat()` method, before the first LLM call each hour, check if the access token needs refresh. This is a background operation that does not block the user.

```typescript
// In ConversationEngine constructor or chat():
private lastAuthCheck = 0;
private async maybeRefreshAuth(): Promise<void> {
  if (!this.options.authState?.authenticated) return;
  if (Date.now() - this.lastAuthCheck < 3600_000) return; // 1 hour
  this.lastAuthCheck = Date.now();
  // Fire and forget — don't block chat
  resolveAuthState().catch(() => {});
}
```

**Dependencies:** C3
**Verification:** After 1 hour, the engine silently refreshes the auth token without interrupting the user.

---

### C5 — Offline Grace Period

**Files to modify:**
- `src/auth/store.ts` (already has `isOfflineGraceExpired`)
- `src/auth/refresh.ts` (already handles it)

**Specs:**

This is handled in C1 and C3. This task validates the full offline flow:

1. User logs in, gets tokens, auth.json saved with `lastValidated = now`
2. User goes offline
3. Access token expires (1 hour) → refresh fails (no network)
4. Grace check: `lastValidated + 7 days > now` → true → use cached tier
5. After 7 days offline → grace expires → fall back to free tier
6. User comes back online → next startup refreshes tokens → back to their tier

**Dependencies:** C1, C3
**Verification:** Simulated offline test with mocked Date.now() verifies all 6 scenarios.

---

### C6 — Tier Type System

**Files to modify:**
- `src/config/schema.ts` (add Tier type and tier field to AppConfig)

**Specs:**

```typescript
// Add to src/config/schema.ts:
export type Tier = 'free' | 'pro' | 'team';

export const AppConfigSchema = z.object({
  // ... existing fields ...
  tier: z.enum(['free', 'pro', 'team']).default('free'),
});
```

The `tier` field is populated at startup from `resolveAuthState()`, not from the config file. It's a runtime override.

**Files to modify:**
- `src/config/loader.ts` (inject tier after loading config)

```typescript
// In loadConfig(), after parsing:
// The tier is NOT stored in config.json — it comes from auth state.
// This is set by the bootstrap code in bin/arq.ts after resolveAuthState().
```

**Dependencies:** None
**Verification:** `AppConfigSchema.parse({ ..., tier: 'pro' })` succeeds. Default is 'free'.

---

### C7 — Feature Gate Module

**Files to create:**
- `src/auth/gates.ts`

**Specs:**

```typescript
// src/auth/gates.ts
import type { Tier } from './refresh.js';

// Tools available per tier
const FREE_TOOLS = new Set([
  'Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'LS',
  'WebSearch', 'WebFetch', 'Prompt',
]);

const PRO_TOOLS = new Set([
  ...FREE_TOOLS,
  'MultiEdit', 'NotebookRead', 'NotebookEdit', 'TodoWrite', 'TodoRead',
  'BashOutput', 'KillShell', 'Dispatch', 'Task',
]);

// Slash commands available per tier
const FREE_COMMANDS = new Set(['/help', '/clear', '/config', '/quit', '/status', '/login', '/logout', '/upgrade']);

const PRO_COMMANDS = new Set([
  ...FREE_COMMANDS,
  '/model', '/compress', '/undo', '/context', '/cost', '/think', '/permissions',
  '/tools', '/export', '/check', '/setup', '/agents', '/loop', '/vim',
  '/reload-plugins', '/plugin', '/memory', '/skill',
]);

// Capabilities: free gets 10 basic, pro gets all 42
const FREE_CAPABILITY_LIMIT = 10;

export function isToolAllowed(toolName: string, tier: Tier): boolean {
  if (tier === 'team' || tier === 'pro') return true;
  return FREE_TOOLS.has(toolName);
}

export function isCommandAllowed(commandName: string, tier: Tier): boolean {
  if (tier === 'team' || tier === 'pro') return true;
  return FREE_COMMANDS.has(commandName);
}

export function getCapabilityLimit(tier: Tier): number {
  if (tier === 'team' || tier === 'pro') return Infinity;
  return FREE_CAPABILITY_LIMIT;
}

export function isFeatureAllowed(feature: string, tier: Tier): boolean {
  if (tier === 'team' || tier === 'pro') return true;

  const FREE_FEATURES = new Set([
    'basic-tools', 'basic-commands', 'headless-mode', 'basic-capabilities',
    'markdown-rendering',
  ]);
  return FREE_FEATURES.has(feature);
}

export function getUpgradeMessage(feature: string): string {
  return `This feature requires ArqZero Pro ($12/mo). Run /upgrade or visit https://arqzero.dev/pricing`;
}

// Features that require Team tier
export function isTeamFeature(feature: string): boolean {
  const TEAM_FEATURES = new Set([
    'shared-memory', 'team-settings', 'usage-dashboard',
  ]);
  return TEAM_FEATURES.has(feature);
}
```

**Dependencies:** C6
**Verification:** `isToolAllowed('Dispatch', 'free')` returns false. `isToolAllowed('Dispatch', 'pro')` returns true. `isCommandAllowed('/undo', 'free')` returns false.

---

### C8 — Tool Execution Gate

**Files to modify:**
- `src/tools/executor.ts`

**Specs:**

Add tier check before tool execution:

```typescript
// In ToolExecutor.execute(), after registry lookup and before permission check:

import { isToolAllowed, getUpgradeMessage } from '../auth/gates.js';
import type { Tier } from '../auth/refresh.js';

// Add tier to constructor:
constructor(
  private registry: ToolRegistry,
  permissions?: PermissionManager,
  checkpointStore?: CheckpointStore,
  private tier: Tier = 'free',
) { ... }

// In execute():
if (!isToolAllowed(toolName, this.tier)) {
  return {
    content: getUpgradeMessage(toolName),
    isError: true,
  };
}
```

**Dependencies:** C7
**Verification:** With tier='free', calling `execute('Dispatch', ...)` returns the upgrade message. With tier='pro', it proceeds normally.

---

### C9 — Slash Command Gate

**Files to modify:**
- `src/commands/registry.ts`

**Specs:**

```typescript
// In CommandRegistry.execute(), before running the command:

import { isCommandAllowed, getUpgradeMessage } from '../auth/gates.js';

// Add tier to CommandRegistry:
export class CommandRegistry {
  private tier: Tier = 'free';

  setTier(tier: Tier): void { this.tier = tier; }

  async execute(name: string, args: string, ctx: SlashCommandContext): Promise<string> {
    if (!isCommandAllowed(name, this.tier)) {
      return getUpgradeMessage(name);
    }
    // ... existing logic
  }
}
```

**Dependencies:** C7
**Verification:** With tier='free', `/undo` returns upgrade message. With tier='pro', it executes normally.

---

### C10 — Capability Injection Gate

**Files to modify:**
- `src/registry/matcher.ts`

**Specs:**

```typescript
// In selectCapabilities() or matchCapabilities(), limit results based on tier:

import { getCapabilityLimit } from '../auth/gates.js';

export function selectCapabilities(
  matches: MatchResult[],
  tier: Tier = 'free',
): MatchResult[] {
  const limit = getCapabilityLimit(tier);
  // Sort by relevance score, take top N
  const sorted = matches.sort((a, b) => b.score - a.score);
  return sorted.slice(0, limit);
}
```

**Dependencies:** C7
**Verification:** With tier='free', at most 10 capabilities are injected. With tier='pro', all matching capabilities are injected.

---

### C11 — Usage Tracker (Client-Side)

**Files to create:**
- `src/auth/usage.ts`

**Specs:**

```typescript
// src/auth/usage.ts
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadAuth } from './store.js';
import { syncUsage } from './client.js';
import { getMachineId } from '../system/machine-id.js';

interface UsageData {
  date: string; // YYYY-MM-DD
  count: number;
  lastSyncedCount: number;
}

const USAGE_PATH = path.join(os.homedir(), '.arqzero', 'usage.json');
const SYNC_INTERVAL = 10; // sync every 10 messages

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadUsage(): UsageData {
  try {
    const raw = fs.readFileSync(USAGE_PATH, 'utf-8');
    const data = JSON.parse(raw) as UsageData;
    if (data.date !== today()) {
      return { date: today(), count: 0, lastSyncedCount: 0 };
    }
    return data;
  } catch {
    return { date: today(), count: 0, lastSyncedCount: 0 };
  }
}

function saveUsage(data: UsageData): void {
  fs.writeFileSync(USAGE_PATH, JSON.stringify(data, null, 2));
}

export function incrementUsage(): { count: number; capped: boolean } {
  const auth = loadAuth();
  const tier = auth?.tier ?? 'free';
  const cap = tier === 'free' ? 50 : -1;

  const usage = loadUsage();
  usage.count++;
  saveUsage(usage);

  // Sync to server every SYNC_INTERVAL messages
  if (usage.count - usage.lastSyncedCount >= SYNC_INTERVAL && auth) {
    usage.lastSyncedCount = usage.count;
    saveUsage(usage);
    // Fire and forget
    syncUsage(auth.accessToken, usage.date, usage.count, getMachineId()).catch(() => {});
  }

  const capped = cap !== -1 && usage.count >= cap;
  return { count: usage.count, capped };
}

export function isUsageCapped(): boolean {
  const auth = loadAuth();
  const tier = auth?.tier ?? 'free';
  if (tier !== 'free') return false;

  const usage = loadUsage();
  return usage.count >= 50;
}

export function getUsageSummary(): { count: number; cap: number; remaining: number } {
  const auth = loadAuth();
  const tier = auth?.tier ?? 'free';
  const cap = tier === 'free' ? 50 : -1;
  const usage = loadUsage();
  const remaining = cap === -1 ? -1 : Math.max(0, cap - usage.count);
  return { count: usage.count, cap, remaining };
}
```

**Dependencies:** C1, C2
**Verification:** `incrementUsage()` increments count; after 50 calls with free tier, `isUsageCapped()` returns true.

---

### C12 — Setup Wizard Enhancement

**Files to modify:**
- `src/config/init.ts`

**Specs:**

Modify the existing setup wizard to include auth steps:

```typescript
// In the init flow (called by `arqzero setup` or first run):

// Step 1: "Do you have an ArqZero account?" → y/n
//   If yes → run /login flow (email + code)
//   If no → "Create one at arqzero.dev or continue with free tier"
// Step 2: Enter LLM provider details (existing flow)
//   - baseURL (default: Fireworks)
//   - API key
//   - Model (default: GLM-4.7)
// Step 3: Write config.json
// Step 4: Display tier info:
//   Free: "You're on the free tier (9 tools, 50 msgs/day). Upgrade: /upgrade"
//   Pro: "You're on ArqZero Pro. All features unlocked."
```

**Dependencies:** C1, C2
**Verification:** Fresh install → `arqzero setup` → prompts for account → can skip to free → prompts for API key → writes config.json → displays tier.

---

### C13 — Status Command Enhancement

**Files to modify:**
- `src/commands/builtins.ts` (enhance existing `/status` command)

**Specs:**

```typescript
// Enhance /status to show auth info:
export const statusCommand: SlashCommand = {
  name: '/status',
  description: 'Show current session status',
  async execute(_args: string, ctx: SlashCommandContext): Promise<string> {
    const auth = loadAuth();
    const usage = getUsageSummary();

    const lines = [
      `Model: ${ctx.config.model}`,
      `Provider: ${ctx.config.provider}`,
      '',
      `Account: ${auth ? auth.email : 'Not logged in'}`,
      `Tier: ${auth?.tier ?? 'free'}`,
      `Messages today: ${usage.count}${usage.cap !== -1 ? ` / ${usage.cap}` : ' (unlimited)'}`,
    ];

    if (auth?.tier === 'free') {
      lines.push('', 'Upgrade to Pro for all features: /upgrade');
    }

    return lines.join('\n');
  },
};
```

**Dependencies:** C1, C11
**Verification:** `/status` shows account email, tier, and usage count.

---

### C14 — CLI Auth Tests

**Files to create:**
- `src/auth/store.test.ts`
- `src/auth/client.test.ts`
- `src/auth/refresh.test.ts`
- `src/auth/gates.test.ts`
- `src/auth/usage.test.ts`

**Specs:**

Each test file follows the existing pattern: `npx tsx --test <file>`.

**store.test.ts:**
- `saveAuth` creates file with correct permissions
- `loadAuth` reads back saved data
- `clearAuth` removes the file
- `isAccessTokenExpired` returns true/false correctly
- `isOfflineGraceExpired` returns true after 7 days

**client.test.ts:**
- Mock fetch to test `requestLoginCode`, `verifyLoginCode`, `refreshAccessToken`
- Error handling for network failures, HTTP errors

**refresh.test.ts:**
- `resolveAuthState` with no auth → free tier
- `resolveAuthState` with valid token → cached tier
- `resolveAuthState` with expired token + valid refresh → refreshed tier
- `resolveAuthState` with expired token + failed refresh + valid grace → cached tier
- `resolveAuthState` with expired token + failed refresh + expired grace → free

**gates.test.ts:**
- All tool/command/capability gates return correct values for each tier
- Upgrade messages are correct

**usage.test.ts:**
- `incrementUsage` increments correctly
- `isUsageCapped` returns true at 50 for free tier
- `isUsageCapped` returns false for pro tier
- Sync fires every 10 messages

**Dependencies:** C1–C13
**Verification:** `npx tsx --test src/auth/store.test.ts src/auth/client.test.ts src/auth/refresh.test.ts src/auth/gates.test.ts src/auth/usage.test.ts` — all pass.

---

## System 3: Website (W1–W14)

### W1 — Next.js Project Scaffold

**Files to create:**
- `website/package.json`
- `website/tsconfig.json`
- `website/next.config.ts`
- `website/tailwind.config.ts`
- `website/src/app/layout.tsx`
- `website/src/app/page.tsx`
- `website/src/lib/constants.ts`
- `website/src/styles/globals.css`

**Specs:**

```json
// website/package.json
{
  "name": "@arqzero/website",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^15.x",
    "react": "^19.x",
    "react-dom": "^19.x",
    "tailwindcss": "^4.x",
    "stripe": "^17.x"
  }
}
```

```typescript
// website/src/lib/constants.ts
export const SITE = {
  name: 'ArqZero',
  tagline: 'The terminal-native coding agent. Bring your own AI.',
  url: 'https://arqzero.dev',
  apiUrl: 'https://api.arqzero.dev',
  colors: {
    amber: '#FFB800',
    dark: '#0a0a0a',
    gray: '#1a1a1a',
  },
};

export const TIERS = {
  free: { name: 'Free', price: 0, priceLabel: '$0' },
  pro: { name: 'Pro', price: 12, priceLabel: '$12/mo' },
  team: { name: 'Team', price: 30, priceLabel: '$30/user/mo' },
};
```

```tsx
// website/src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ArqZero — The terminal-native coding agent',
  description: 'AI engineering agent with structured methodologies. Works with any OpenAI-compatible LLM. BYOK.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0a0a] text-white font-mono antialiased">
        {children}
      </body>
    </html>
  );
}
```

**Dependencies:** None
**Verification:** `cd website && npm run dev` serves on localhost:3000 with dark background and monospace font.

---

### W2 — Landing Page

**Files to create:**
- `website/src/app/page.tsx` (overwrite scaffold)
- `website/src/components/Hero.tsx`
- `website/src/components/Features.tsx`
- `website/src/components/Comparison.tsx`
- `website/src/components/CTA.tsx`

**Specs:**

**Hero section:**
- Headline: "The terminal-native coding agent. Bring your own AI."
- Subheadline: "ArqZero follows real engineering methodologies — TDD, debugging protocols, code review checklists. Works with any OpenAI-compatible LLM."
- CTA buttons: "Get Started" (links to /docs/install), "View Pricing" (links to /pricing)
- Terminal demo GIF/animation below (see W11)

**Features section (4 cards):**
1. "42 Structured Capabilities" — Not ad-hoc prompting. Real multi-step methodologies.
2. "Any LLM Provider" — Fireworks, OpenAI, Anthropic, Ollama, any OpenAI-compatible.
3. "Subagent Parallelization" — Up to 7 parallel agents for complex tasks.
4. "Verification Gates" — Every capability has mandatory verification steps.

**Comparison table:**
- ArqZero vs Claude Code vs Cursor vs Continue (from design doc)

**CTA section:**
- "Get started in 30 seconds"
- `npm install -g arqzero && arqzero setup`

**Dependencies:** W1
**Verification:** Landing page renders all sections. Links work. Responsive down to 375px.

---

### W3 — Pricing Page

**Files to create:**
- `website/src/app/pricing/page.tsx`
- `website/src/components/PricingCard.tsx`

**Specs:**

Three columns: Free / Pro / Team.

**Free ($0):**
- 9 basic tools
- 5 slash commands
- 10 capabilities
- 50 messages/day
- Basic markdown rendering
- CTA: "Install Free" → docs/install

**Pro ($12/mo):**
- All 18 tools
- All 25+ slash commands
- All 42 capabilities + verification gates
- Unlimited messages
- Subagents (7 parallel)
- Cross-session memory
- Plugins, custom commands, worktrees
- Session resume, diff previews, shimmer spinner
- CTA: "Start Pro" → /dashboard (requires login)

**Team ($30/user/mo):**
- Everything in Pro
- Shared team memory
- ARQZERO.md sync across team
- Team settings profiles
- Usage dashboard
- Priority support
- CTA: "Contact Us" → mailto:team@arqzero.dev

**Feature comparison table below the cards** (full gating table from design doc).

**Dependencies:** W1
**Verification:** Pricing page renders three tiers with correct features and prices. CTA buttons link correctly.

---

### W4 — Documentation Pages

**Files to create:**
- `website/src/app/docs/layout.tsx` (sidebar layout)
- `website/src/app/docs/page.tsx` (docs index)
- `website/src/app/docs/install/page.tsx`
- `website/src/app/docs/configuration/page.tsx`
- `website/src/app/docs/tools/page.tsx`
- `website/src/app/docs/commands/page.tsx`
- `website/src/app/docs/capabilities/page.tsx`
- `website/src/app/docs/providers/page.tsx`
- `website/src/components/DocsSidebar.tsx`

**Specs:**

**Sidebar navigation:**
- Getting Started: Install, Configuration, Providers
- Reference: Tools (18), Slash Commands (25+), Capabilities (42)
- Advanced: Plugins, Hooks, Subagents, Memory, Worktrees

**Install page:**
```
npm install -g arqzero
arqzero setup
```
Prerequisites: Node.js 18.19+. Provider API key (Fireworks recommended).

**Configuration page:**
Document `~/.arqzero/config.json` schema. All fields with types and defaults.

**Tools page:**
Table of all 18 tools with name, description, permission level, tier requirement.

**Commands page:**
Table of all 25+ slash commands with name, description, tier requirement.

**Providers page:**
Configuration examples for Fireworks, OpenAI, Together AI, Groq, Ollama.

**Dependencies:** W1
**Verification:** All doc pages render with sidebar navigation. Code blocks are syntax highlighted.

---

### W5 — Auth Pages (Login/Signup)

**Files to create:**
- `website/src/app/login/page.tsx`
- `website/src/app/verify/page.tsx`
- `website/src/lib/auth.ts`

**Specs:**

**Login page (`/login`):**
- Email input field
- "Send Code" button → calls backend `POST /auth/login`
- Redirects to `/verify?email=...`

**Verify page (`/verify`):**
- 6-digit code input (6 separate boxes, auto-advance)
- "Verify" button → calls backend `POST /auth/verify`
- On success: stores tokens in httpOnly cookie or localStorage, redirects to `/dashboard`

```typescript
// website/src/lib/auth.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.arqzero.dev';

export async function login(email: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error('Login failed');
}

export async function verify(email: string, code: string): Promise<{ accessToken: string; tier: string }> {
  const res = await fetch(`${API_BASE}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  if (!res.ok) throw new Error('Verification failed');
  return res.json();
}
```

**Dependencies:** W1, B2
**Verification:** Full login flow on website: enter email → receive code → enter code → redirected to dashboard.

---

### W6 — Dashboard Page

**Files to create:**
- `website/src/app/dashboard/page.tsx`
- `website/src/app/dashboard/layout.tsx`
- `website/src/components/DashboardNav.tsx`
- `website/src/components/UsageChart.tsx`
- `website/src/components/LicenseCard.tsx`

**Specs:**

**Dashboard shows:**
- Current tier (Free/Pro/Team) with visual badge
- Account email
- Usage stats: messages today, messages this month (chart)
- Active sessions: list of devices (from sessions table) with "Revoke" button
- License status: active/canceled/past_due, period_end date
- Quick actions: "Upgrade" (if free), "Manage Billing" (if pro/team)

**API calls:**
- `GET /license` → tier, status, periodEnd
- `GET /usage/history` (new endpoint, optional — can defer to V2)

**Dependencies:** W5
**Verification:** Logged-in user sees dashboard with correct tier and usage data.

---

### W7 — Stripe Billing Portal

**Files to create:**
- `website/src/app/api/create-checkout/route.ts`
- `website/src/app/api/create-portal/route.ts`

**Specs:**

```typescript
// website/src/app/api/create-checkout/route.ts
// Server-side Next.js route that proxies to backend
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { plan, accessToken } = await req.json();

  const res = await fetch(`${process.env.API_URL}/checkout/session`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan,
      successUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?upgraded=true`,
      cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
    }),
  });

  const data = await res.json();
  return NextResponse.json(data);
}
```

```typescript
// website/src/app/api/create-portal/route.ts
// Create Stripe Customer Portal session for managing subscription
import Stripe from 'stripe';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const { customerId } = await req.json();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}
```

**Dependencies:** W5, B9
**Verification:** Clicking "Upgrade" on dashboard → redirected to Stripe Checkout → complete payment → redirected back with tier updated. "Manage Billing" opens Stripe Customer Portal.

---

### W8 — Blog

**Files to create:**
- `website/src/app/blog/page.tsx`
- `website/src/app/blog/[slug]/page.tsx`
- `website/src/lib/blog.ts`
- `website/content/blog/launch.md`

**Specs:**

Static blog using MDX or markdown files in `website/content/blog/`.

**Blog post format:**
```markdown
---
title: "Introducing ArqZero"
date: "2026-03-22"
description: "The terminal-native coding agent with structured methodologies"
---

Content here...
```

**Blog list page:** Cards with title, date, description.
**Blog post page:** Full rendered markdown with syntax highlighting.

**Launch post topics:**
- What ArqZero is
- Why BYOK matters
- 42 capabilities explained
- Comparison with Claude Code and Cursor

**Dependencies:** W1
**Verification:** `/blog` lists posts. `/blog/launch` renders the full post with syntax highlighting.

---

### W9 — SEO & Meta Tags

**Files to modify:**
- `website/src/app/layout.tsx` (add meta tags)
- `website/src/app/page.tsx` (page-specific meta)
- `website/src/app/pricing/page.tsx` (page-specific meta)

**Files to create:**
- `website/public/robots.txt`
- `website/public/sitemap.xml`

**Specs:**

```typescript
// Per-page metadata exports:
export const metadata: Metadata = {
  title: 'ArqZero — The terminal-native coding agent',
  description: '...',
  openGraph: {
    title: 'ArqZero',
    description: '...',
    url: 'https://arqzero.dev',
    siteName: 'ArqZero',
    images: [{ url: '/og.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ArqZero',
    description: '...',
    images: ['/og.png'],
  },
};
```

```
// robots.txt
User-agent: *
Allow: /
Sitemap: https://arqzero.dev/sitemap.xml
```

**Dependencies:** W1
**Verification:** `curl -s https://arqzero.dev | grep og:image` returns the OG image URL. Google Lighthouse SEO score > 90.

---

### W10 — Analytics

**Files to modify:**
- `website/src/app/layout.tsx`

**Specs:**

Add Plausible Analytics (privacy-friendly, no cookie banner needed):

```tsx
// In layout.tsx <head>:
<script defer data-domain="arqzero.dev" src="https://plausible.io/js/script.js" />
```

Alternatively, Vercel Analytics (built-in):

```tsx
import { Analytics } from '@vercel/analytics/react';
// In body: <Analytics />
```

Track:
- Page views
- /pricing visits → conversion to checkout
- /docs/install visits → correlate with npm installs
- /dashboard visits → active users

**Dependencies:** W1
**Verification:** After deploy, analytics dashboard shows page views.

---

### W11 — Terminal Demo Component

**Files to create:**
- `website/src/components/TerminalDemo.tsx`

**Specs:**

Animated terminal component for the landing page hero. Simulates an ArqZero session:

```tsx
// Typewriter animation showing:
// 1. User types: "add error handling to the API client"
// 2. ArqZero reads files (with spinner)
// 3. Shows inline diff
// 4. Runs tests
// 5. "All tests pass. Error handling added."

// Visual style:
// - Dark background (#1a1a1a)
// - Amber (#FFB800) accent for ArqZero prompt
// - Green/red for diff lines
// - Monospace font
// - Rounded corners, subtle border

export function TerminalDemo() {
  // State machine with timed transitions
  // Each step shows for 2-3 seconds
  // Loops infinitely
}
```

**Dependencies:** W2
**Verification:** Terminal demo animates on the landing page. Smooth transitions, no layout shift.

---

### W12 — Responsive Design

**Files to modify:**
- All component files in `website/src/components/`
- All page files in `website/src/app/`

**Specs:**

Breakpoints:
- Mobile: 375px–767px (single column, stacked pricing cards)
- Tablet: 768px–1023px (two columns where appropriate)
- Desktop: 1024px+ (full layout)

Key responsive behaviors:
- Pricing cards stack vertically on mobile
- Docs sidebar becomes hamburger menu on mobile
- Terminal demo scales down gracefully
- Feature grid goes from 4-col to 2-col to 1-col
- Navigation collapses to hamburger menu on mobile

**Dependencies:** W2–W8
**Verification:** Chrome DevTools responsive mode — all pages look correct at 375px, 768px, 1024px, 1440px.

---

### W13 — Open Graph Images

**Files to create:**
- `website/public/og.png` (1200x630)
- `website/public/og-pricing.png` (1200x630)
- `website/src/app/api/og/route.tsx` (dynamic OG generation, optional)

**Specs:**

**Static OG image (og.png):**
- Dark background (#0a0a0a)
- ArqZero logo/diamond (amber #FFB800)
- Text: "The terminal-native coding agent"
- Subtext: "Bring your own AI. $12/mo."
- Terminal-style visual element

**Dynamic OG (optional):**
Using `@vercel/og` for blog posts:

```tsx
import { ImageResponse } from '@vercel/og';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title') ?? 'ArqZero';

  return new ImageResponse(
    <div style={{ background: '#0a0a0a', color: '#FFB800', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
      <div style={{ fontSize: 60 }}>{title}</div>
    </div>,
    { width: 1200, height: 630 }
  );
}
```

**Dependencies:** W1
**Verification:** Sharing arqzero.dev on Twitter/LinkedIn shows the OG image correctly.

---

### W14 — Website Deployment (Vercel)

**Files to create:**
- `website/vercel.json`

**Specs:**

```json
// website/vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "env": {
    "NEXT_PUBLIC_API_URL": "https://api.arqzero.dev",
    "NEXT_PUBLIC_SITE_URL": "https://arqzero.dev",
    "STRIPE_SECRET_KEY": "@stripe-secret-key",
    "API_URL": "https://api.arqzero.dev"
  }
}
```

**DNS setup:**
- Domain: `arqzero.dev`
- A record → Vercel
- CNAME `www` → `cname.vercel-dns.com`
- CNAME `api` → Railway deployment URL (or separate DNS for API)

**Deploy steps:**
1. `vercel` from `website/` directory
2. Set environment variables in Vercel dashboard
3. Configure custom domain
4. Verify SSL certificate

**Dependencies:** W1–W13
**Verification:** `https://arqzero.dev` loads the landing page. `https://api.arqzero.dev/health` returns ok. SSL valid. Lighthouse score > 90.

---

## Execution Schedule

| Week | Tasks | Deliverable |
|---|---|---|
| **Week 1** | B1, B10, B11, B12, B13, B7, C1, C6, C7, W1 | DB schema, JWT utils, middleware, auth store, gates, website scaffold |
| **Week 2** | B2, B3, B4, B5, B6, C2, C3, C5, W2, W3, W4 | Full auth API, CLI login, landing/pricing/docs pages |
| **Week 3** | B8, B9, C4, C8, C9, C10, C11, C12, C13, W5, W6, W7 | Stripe integration, feature gating, usage tracking, website auth/dashboard |
| **Week 4** | B14, B15, C14, W8, W9, W10, W11, W12, W13, W14 | Tests, deployment, blog, SEO, polish |

## Environment Variables Summary

### Backend (Railway)

| Variable | Example | Source |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | Supabase |
| `JWT_SECRET` | `64-char hex` | `openssl rand -hex 32` |
| `RESEND_API_KEY` | `re_xxxxx` | Resend dashboard |
| `STRIPE_SECRET_KEY` | `sk_test_xxxxx` | Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxxxx` | Stripe CLI |
| `STRIPE_PRO_PRICE_ID` | `price_xxxxx` | Stripe product |
| `STRIPE_TEAM_PRICE_ID` | `price_xxxxx` | Stripe product |

### Website (Vercel)

| Variable | Example |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.arqzero.dev` |
| `NEXT_PUBLIC_SITE_URL` | `https://arqzero.dev` |
| `STRIPE_SECRET_KEY` | `sk_test_xxxxx` |
| `API_URL` | `https://api.arqzero.dev` |

### CLI (User's machine)

| Variable | Example | Purpose |
|---|---|---|
| `ARQZERO_API_URL` | `https://api.arqzero.dev` | Override API base (for dev/testing) |
| `FIREWORKS_API_KEY` | `fw_xxxxx` | LLM provider key (env var fallback) |

## NPM Dependencies to Add

### Backend (`backend/package.json`)
- `hono` — HTTP framework
- `drizzle-orm` + `drizzle-kit` — ORM + migrations
- `pg` — PostgreSQL driver
- `jose` — JWT signing/verification
- `resend` — Email delivery
- `stripe` — Payment processing
- `zod` — Validation (already used in CLI)

### CLI (`package.json` — existing)
- No new dependencies. Uses native `fetch` (Node 18+) and existing `zod`.

### Website (`website/package.json`)
- `next` — Framework
- `react` + `react-dom` — UI
- `tailwindcss` — Styling
- `stripe` — Checkout/portal (server-side)
- `@vercel/analytics` — Analytics (optional)
- `@vercel/og` — Dynamic OG images (optional)
