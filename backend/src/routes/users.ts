import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, sessions } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

export const userRoutes = new Hono();
userRoutes.use('*', authMiddleware);

// GET /users/me — return current user profile
userRoutes.get('/me', async (c) => {
  const userId = c.get('userId');

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { email: true, displayName: true },
  });

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json(user);
});

// PATCH /users/me — update displayName
userRoutes.patch('/me', async (c) => {
  const userId = c.get('userId');

  const body = z.object({
    displayName: z.string().max(100),
  }).parse(await c.req.json());

  const [updated] = await db.update(users)
    .set({ displayName: body.displayName, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ email: users.email, displayName: users.displayName });

  return c.json(updated);
});

// GET /users/sessions — list active CLI sessions
userRoutes.get('/sessions', async (c) => {
  const userId = c.get('userId');

  const activeSessions = await db.query.sessions.findMany({
    where: and(eq(sessions.userId, userId), eq(sessions.revoked, false)),
    columns: { id: true, deviceLabel: true, machineId: true, createdAt: true },
  });

  return c.json({
    sessions: activeSessions.map((s) => ({
      id: s.id,
      deviceLabel: s.deviceLabel,
      machineId: s.machineId ? s.machineId.slice(0, 8) : null,
      createdAt: s.createdAt,
    })),
  });
});

// DELETE /users/sessions/:id — revoke a specific session
userRoutes.delete('/sessions/:id', async (c) => {
  const userId = c.get('userId');
  const sessionId = c.req.param('id');

  const revoked = await db.update(sessions)
    .set({ revoked: true })
    .where(and(
      eq(sessions.id, sessionId),
      eq(sessions.userId, userId),
    ))
    .returning();

  if (revoked.length === 0) {
    return c.json({ error: 'Session not found' }, 404);
  }

  return c.json({ ok: true });
});
