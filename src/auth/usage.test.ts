import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isUsageCapped } from './usage.js';

describe('isUsageCapped', () => {
  it('should return false when cap is 0 (unlimited)', () => {
    assert.ok(!isUsageCapped(0));
  });

  it('should return false when under cap', () => {
    // This tests the function signature — actual count depends on file state
    // With a fresh usage file (count 0), should not be capped
    assert.ok(!isUsageCapped(50));
  });
});
