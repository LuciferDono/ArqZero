import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { dailyUsage, licenses } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

export const usageRoutes = new Hono();
usageRoutes.use('*', authMiddleware);

usageRoutes.post('/sync', async (c) => {
  const userId = c.get('userId');
  const { date, messageCount } = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    messageCount: z.number().int().min(0),
  }).parse(await c.req.json());

  // Upsert: update if exists, insert if not, always take the max
  const existing = await db.query.dailyUsage.findFirst({
    where: and(eq(dailyUsage.userId, userId), eq(dailyUsage.date, date)),
  });

  let totalCount: number;
  if (existing) {
    // Take the max of server count and client count (handles multi-device)
    totalCount = Math.max(existing.messageCount, messageCount);
    await db.update(dailyUsage)
      .set({ messageCount: totalCount })
      .where(eq(dailyUsage.id, existing.id));
  } else {
    totalCount = messageCount;
    await db.insert(dailyUsage).values({ userId, date, messageCount });
  }

  // Get cap
  const license = await db.query.licenses.findFirst({
    where: and(eq(licenses.userId, userId), eq(licenses.status, 'active')),
  });
  const tier = license?.tier ?? 'free';
  const cap = tier === 'free' ? 50 : null;

  return c.json({
    date,
    totalMessageCount: totalCount,
    cap,
    exceeded: cap !== null && totalCount >= cap,
  });
});
