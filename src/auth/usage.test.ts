import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isUsageCapped } from './usage.js';

describe('isUsageCapped', () => {
  it('should return false when cap is 0 (unlimited)', () => {
    assert.ok(!isUsageCapped(0));
  });

  it('should return false when cap is very high', () => {
    // Usage file may have accumulated counts from other test suites
    // Use a very high cap to ensure it's never reached during testing
    assert.ok(!isUsageCapped(999999));
  });
});
