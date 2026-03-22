import type { Context, Next } from 'hono';
import { verifyAccessToken } from '../utils/jwt.js';

/**
 * Auth middleware — extracts and verifies JWT from Authorization header.
 * Sets userId, tier, email on the context.
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyAccessToken(token);
    c.set('userId', payload.sub);
    c.set('tier', payload.tier);
    c.set('email', payload.email);
    await next();
  } catch {
    return c.json({ error: 'Invalid or expired access token' }, 401);
  }
}
