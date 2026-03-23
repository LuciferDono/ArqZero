import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkRateLimit } from '../middleware/rate-limit.js';

describe('checkRateLimit', () => {
  it('should allow requests under the limit', () => {
    const key = `test-${Date.now()}-1`;
    assert.ok(checkRateLimit(key, 3, 60000));
    assert.ok(checkRateLimit(key, 3, 60000));
    assert.ok(checkRateLimit(key, 3, 60000));
  });

  it('should block requests over the limit', () => {
    const key = `test-${Date.now()}-2`;
    checkRateLimit(key, 2, 60000);
    checkRateLimit(key, 2, 60000);
    assert.ok(!checkRateLimit(key, 2, 60000));
  });

  it('should reset after window expires', () => {
    const key = `test-${Date.now()}-3`;
    checkRateLimit(key, 1, 1); // 1ms window
    // After a tiny wait the window has expired
    setTimeout(() => {
      assert.ok(checkRateLimit(key, 1, 1));
    }, 5);
  });

  it('should track different keys independently', () => {
    const a = `test-${Date.now()}-a`;
    const b = `test-${Date.now()}-b`;
    checkRateLimit(a, 1, 60000);
    assert.ok(!checkRateLimit(a, 1, 60000));
    assert.ok(checkRateLimit(b, 1, 60000)); // different key, still allowed
  });
});
