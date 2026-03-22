// Simple in-memory rate limiter — no Redis needed for launch
// Sliding window per key

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }

  if (entry.count >= maxRequests) {
    return false; // blocked
  }

  entry.count++;
  return true; // allowed
}

// Hono middleware factory
import type { Context, Next } from 'hono';

export function rateLimit(options: {
  keyFn: (c: Context) => string;
  max: number;
  windowMs: number;
  message?: string;
}) {
  return async (c: Context, next: Next) => {
    const key = options.keyFn(c);
    if (!checkRateLimit(key, options.max, options.windowMs)) {
      return c.json(
        { error: options.message ?? 'Too many requests. Try again later.' },
        429,
      );
    }
    await next();
  };
}
