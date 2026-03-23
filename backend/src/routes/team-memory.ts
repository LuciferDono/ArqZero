import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { teamMemberships, teamMemory } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

/**
 * Resolve the team owner ID for a given user.
 * - If the user is a team-tier owner, returns their own ID.
 * - If the user is an accepted team member, returns the owner's ID.
 * - Otherwise returns null (no team access).
 */
async function resolveTeamOwnerId(userId: string, tier: string): Promise<string | null> {
  if (tier === 'team') {
    return userId;
  }

  // Check if user is an accepted member of any team
  const membership = await db.query.teamMemberships.findFirst({
    where: and(
      eq(teamMemberships.memberUserId, userId),
      eq(teamMemberships.status, 'accepted'),
    ),
  });

  return membership?.ownerUserId ?? null;
}

export const teamMemoryRoutes = new Hono();
teamMemoryRoutes.use('*', authMiddleware);

// GET /team-memory — list all team memory entries
teamMemoryRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const tier = c.get('tier');

  const ownerId = await resolveTeamOwnerId(userId, tier);
  if (!ownerId) {
    return c.json({ error: 'No team access' }, 403);
  }

  const entries = await db.query.teamMemory.findMany({
    where: eq(teamMemory.ownerUserId, ownerId),
  });

  return c.json({ entries });
});

// PUT /team-memory/:key — upsert a team memory entry
teamMemoryRoutes.put('/:key', async (c) => {
  const userId = c.get('userId');
  const tier = c.get('tier');
  const key = c.req.param('key');

  const ownerId = await resolveTeamOwnerId(userId, tier);
  if (!ownerId) {
    return c.json({ error: 'No team access' }, 403);
  }

  const body = z.object({
    value: z.string().max(65536),
  }).parse(await c.req.json());

  // Upsert: try update first, insert if not found
  const existing = await db.query.teamMemory.findFirst({
    where: and(
      eq(teamMemory.ownerUserId, ownerId),
      eq(teamMemory.key, key),
    ),
  });

  let entry;
  if (existing) {
    [entry] = await db.update(teamMemory)
      .set({ value: body.value, updatedAt: new Date() })
      .where(eq(teamMemory.id, existing.id))
      .returning();
  } else {
    [entry] = await db.insert(teamMemory)
      .values({ ownerUserId: ownerId, key, value: body.value })
      .returning();
  }

  return c.json({ entry });
});

// DELETE /team-memory/:key — delete a team memory entry
teamMemoryRoutes.delete('/:key', async (c) => {
  const userId = c.get('userId');
  const tier = c.get('tier');
  const key = c.req.param('key');

  const ownerId = await resolveTeamOwnerId(userId, tier);
  if (!ownerId) {
    return c.json({ error: 'No team access' }, 403);
  }

  const deleted = await db.delete(teamMemory)
    .where(and(
      eq(teamMemory.ownerUserId, ownerId),
      eq(teamMemory.key, key),
    ))
    .returning();

  if (deleted.length === 0) {
    return c.json({ error: 'Entry not found' }, 404);
  }

  return c.json({ ok: true });
});
