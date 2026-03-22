import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, sessions, verificationTokens, licenses } from '../db/schema.js';
import { createAccessToken, generateRefreshToken, hashToken, generateVerificationCode } from '../utils/jwt.js';
import { sendVerificationCode } from '../services/email.js';
import { rateLimit } from '../middleware/rate-limit.js';

export const authRoutes = new Hono();

// POST /auth/login — send 6-digit code to email
authRoutes.post('/login',
  rateLimit({ keyFn: (c) => c.req.header('x-forwarded-for') ?? 'unknown', max: 10, windowMs: 60000 }),
  async (c) => {
    const { email } = z.object({ email: z.string().email() }).parse(await c.req.json());
    const normalEmail = email.toLowerCase().trim();

    // Create user if doesn't exist
    let user = await db.query.users.findFirst({ where: eq(users.email, normalEmail) });
    if (!user) {
      const [newUser] = await db.insert(users).values({ email: normalEmail }).returning();
      user = newUser;
    }

    // Generate code, hash it, store it
    const code = generateVerificationCode();
    const codeHash = hashToken(code);
    await db.insert(verificationTokens).values({
      userId: user.id,
      tokenHash: codeHash,
      purpose: 'email_verify',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
    });

    // Send email
    await sendVerificationCode(normalEmail, code);

    return c.json({ message: 'Verification code sent' });
  }
);

// POST /auth/verify — exchange code for tokens
authRoutes.post('/verify',
  rateLimit({ keyFn: (c) => c.req.header('x-forwarded-for') ?? 'unknown', max: 10, windowMs: 60000 }),
  async (c) => {
    const schema = z.object({
      email: z.string().email(),
      code: z.string().length(6),
      machineId: z.string().max(64).optional(),
      deviceLabel: z.string().max(255).optional(),
    });
    const { email, code, machineId, deviceLabel } = schema.parse(await c.req.json());
    const normalEmail = email.toLowerCase().trim();

    // Find user
    const user = await db.query.users.findFirst({ where: eq(users.email, normalEmail) });
    if (!user) return c.json({ error: 'Invalid email or code' }, 401);

    // Find valid verification token
    const codeHash = hashToken(code);
    const token = await db.query.verificationTokens.findFirst({
      where: and(
        eq(verificationTokens.userId, user.id),
        eq(verificationTokens.tokenHash, codeHash),
        eq(verificationTokens.purpose, 'email_verify'),
        eq(verificationTokens.used, false),
        gt(verificationTokens.expiresAt, new Date()),
      ),
    });

    if (!token) return c.json({ error: 'Invalid or expired code' }, 401);

    // Mark token as used
    await db.update(verificationTokens).set({ used: true }).where(eq(verificationTokens.id, token.id));

    // Mark email as verified
    await db.update(users).set({ emailVerified: true }).where(eq(users.id, user.id));

    // Get license tier
    const license = await db.query.licenses.findFirst({
      where: and(eq(licenses.userId, user.id), eq(licenses.status, 'active')),
    });
    const tier = license?.tier ?? 'free';
    const cap = tier === 'free' ? 50 : 0;

    // Create access token
    const accessToken = await createAccessToken({
      sub: user.id,
      tier,
      cap,
      email: normalEmail,
    });

    // Create refresh token + session
    const refreshToken = generateRefreshToken();
    await db.insert(sessions).values({
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      machineId: machineId ?? null,
      deviceLabel: deviceLabel ?? null,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    });

    return c.json({
      accessToken,
      refreshToken,
      expiresIn: 3600,
      tier,
      user: { id: user.id, email: normalEmail, displayName: user.displayName },
    });
  }
);

// POST /auth/refresh — exchange refresh token for new access token
authRoutes.post('/refresh', async (c) => {
  const { refreshToken, machineId } = z.object({
    refreshToken: z.string(),
    machineId: z.string().max(64).optional(),
  }).parse(await c.req.json());

  const tokenHash = hashToken(refreshToken);

  // Find valid session
  const session = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.refreshTokenHash, tokenHash),
      eq(sessions.revoked, false),
      gt(sessions.expiresAt, new Date()),
    ),
  });

  if (!session) return c.json({ error: 'Invalid or expired refresh token' }, 401);

  // Check machineId if both sides have one
  if (machineId && session.machineId && machineId !== session.machineId) {
    return c.json({ error: 'Machine ID mismatch' }, 401);
  }

  // Get user + license
  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  if (!user) return c.json({ error: 'User not found' }, 401);

  const license = await db.query.licenses.findFirst({
    where: and(eq(licenses.userId, user.id), eq(licenses.status, 'active')),
  });
  const tier = license?.tier ?? 'free';
  const cap = tier === 'free' ? 50 : 0;

  // Rotate refresh token
  const newRefreshToken = generateRefreshToken();
  await db.update(sessions).set({ revoked: true }).where(eq(sessions.id, session.id));
  await db.insert(sessions).values({
    userId: user.id,
    refreshTokenHash: hashToken(newRefreshToken),
    machineId: session.machineId,
    deviceLabel: session.deviceLabel,
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  });

  const accessToken = await createAccessToken({ sub: user.id, tier, cap, email: user.email });

  return c.json({
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: 3600,
    tier,
  });
});

// POST /auth/logout — revoke refresh token
authRoutes.post('/logout', async (c) => {
  const { refreshToken } = z.object({ refreshToken: z.string() }).parse(await c.req.json());
  const tokenHash = hashToken(refreshToken);

  await db.update(sessions).set({ revoked: true }).where(eq(sessions.refreshTokenHash, tokenHash));
  return c.json({ message: 'Logged out' });
});
