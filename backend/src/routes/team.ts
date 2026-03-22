import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { teamMemberships, users } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { sendTeamInviteEmail } from '../services/email.js';

export const teamRoutes = new Hono();
teamRoutes.use('*', authMiddleware);

// GET /team/members — list team members (team tier only)
teamRoutes.get('/members', async (c) => {
  const userId = c.get('userId');
  const tier = c.get('tier');

  if (tier !== 'team') {
    return c.json({ error: 'Team tier required' }, 403);
  }

  const members = await db.query.teamMemberships.findMany({
    where: eq(teamMemberships.ownerUserId, userId),
  });

  return c.json({ members });
});

// POST /team/invite — invite by email + role
teamRoutes.post('/invite', async (c) => {
  const userId = c.get('userId');
  const tier = c.get('tier');
  const ownerEmail = c.get('email');

  if (tier !== 'team') {
    return c.json({ error: 'Team tier required' }, 403);
  }

  const body = z.object({
    email: z.string().email(),
    role: z.enum(['admin', 'member']).default('member'),
  }).parse(await c.req.json());

  const invitedEmail = body.email.toLowerCase().trim();

  // Prevent self-invite
  if (invitedEmail === ownerEmail) {
    return c.json({ error: 'Cannot invite yourself' }, 400);
  }

  // Check for existing invite
  const existing = await db.query.teamMemberships.findFirst({
    where: and(
      eq(teamMemberships.ownerUserId, userId),
      eq(teamMemberships.invitedEmail, invitedEmail),
    ),
  });

  if (existing) {
    return c.json({ error: 'Invite already exists for this email' }, 409);
  }

  const [membership] = await db.insert(teamMemberships).values({
    ownerUserId: userId,
    invitedEmail,
    role: body.role,
    status: 'pending',
  }).returning();

  await sendTeamInviteEmail(invitedEmail, ownerEmail, userId);

  return c.json({ membership }, 201);
});

// DELETE /team/members/:memberId — revoke membership
teamRoutes.delete('/members/:memberId', async (c) => {
  const userId = c.get('userId');
  const tier = c.get('tier');
  const memberId = c.req.param('memberId');

  if (tier !== 'team') {
    return c.json({ error: 'Team tier required' }, 403);
  }

  const deleted = await db.delete(teamMemberships)
    .where(and(
      eq(teamMemberships.id, memberId),
      eq(teamMemberships.ownerUserId, userId),
    ))
    .returning();

  if (deleted.length === 0) {
    return c.json({ error: 'Membership not found' }, 404);
  }

  return c.json({ ok: true });
});

// POST /team/accept — invitee accepts pending invite
teamRoutes.post('/accept', async (c) => {
  const userId = c.get('userId');
  const email = c.get('email');

  const invite = await db.query.teamMemberships.findFirst({
    where: and(
      eq(teamMemberships.invitedEmail, email),
      eq(teamMemberships.status, 'pending'),
    ),
  });

  if (!invite) {
    return c.json({ error: 'No pending invite found' }, 404);
  }

  const [updated] = await db.update(teamMemberships)
    .set({
      memberUserId: userId,
      status: 'accepted',
      acceptedAt: new Date(),
    })
    .where(eq(teamMemberships.id, invite.id))
    .returning();

  return c.json({ membership: updated });
});
