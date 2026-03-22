import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { licenses, dailyUsage } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

export const licenseRoutes = new Hono();
licenseRoutes.use('*', authMiddleware);

licenseRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const today = new Date().toISOString().slice(0, 10);

  const [license, usage] = await Promise.all([
    db.query.licenses.findFirst({
      where: and(eq(licenses.userId, userId), eq(licenses.status, 'active')),
    }),
    db.query.dailyUsage.findFirst({
      where: and(eq(dailyUsage.userId, userId), eq(dailyUsage.date, today)),
    }),
  ]);

  const tier = license?.tier ?? 'free';
  return c.json({
    tier,
    status: license?.status ?? 'active',
    periodEnd: license?.currentPeriodEnd?.toISOString() ?? null,
    dailyUsage: usage?.messageCount ?? 0,
    dailyCap: tier === 'free' ? 50 : null,
  });
});
