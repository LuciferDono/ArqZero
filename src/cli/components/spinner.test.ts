import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TIPS, STALLED_THRESHOLD_WIDEN, STALLED_THRESHOLD_FULL } from './Spinner.js';

describe('ShimmerSpinner constants', () => {
  describe('TIPS', () => {
    it('should be a non-empty array', () => {
      assert.ok(Array.isArray(TIPS));
      assert.ok(TIPS.length > 0);
    });

    it('should contain strings starting with "Tip:"', () => {
      for (const tip of TIPS) {
        assert.ok(typeof tip === 'string');
        assert.ok(tip.startsWith('Tip:'), `Expected tip to start with "Tip:", got: ${tip}`);
      }
    });

    it('should have at least 5 tips', () => {
      assert.ok(TIPS.length >= 5);
    });
  });

  describe('stalled thresholds', () => {
    it('should define widen threshold at 10 seconds', () => {
      assert.equal(STALLED_THRESHOLD_WIDEN, 10);
    });

    it('should define full threshold at 30 seconds', () => {
      assert.equal(STALLED_THRESHOLD_FULL, 30);
    });

    it('widen threshold should be less than full threshold', () => {
      assert.ok(STALLED_THRESHOLD_WIDEN < STALLED_THRESHOLD_FULL);
    });
  });
});
