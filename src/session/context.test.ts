import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ContextWindow } from './context.js';

describe('ContextWindow', () => {
  it('should track token usage', () => {
    const ctx = new ContextWindow();
    ctx.trackUsage({ inputTokens: 5000, outputTokens: 1000 });
    assert.equal(ctx.getEstimatedTokens(), 5000);
  });

  it('should detect when compaction is needed', () => {
    const ctx = new ContextWindow({ maxContextTokens: 10000, compactionThreshold: 0.85 });
    ctx.trackUsage({ inputTokens: 8600, outputTokens: 500 });
    assert.equal(ctx.needsCompaction(), true);
  });

  it('should not trigger compaction below threshold', () => {
    const ctx = new ContextWindow({ maxContextTokens: 10000, compactionThreshold: 0.85 });
    ctx.trackUsage({ inputTokens: 5000, outputTokens: 500 });
    assert.equal(ctx.needsCompaction(), false);
  });

  it('should calculate preserve count', () => {
    const ctx = new ContextWindow({ preserveRatio: 0.2 });
    const count = ctx.getPreserveCount(10);
    assert.equal(count, 2);
  });

  it('should enforce minimum preserve count of 2', () => {
    const ctx = new ContextWindow({ preserveRatio: 0.2 });
    // 3 messages * 0.2 = 0.6, ceil = 1, but minimum is 2
    const count = ctx.getPreserveCount(3);
    assert.equal(count, 2);
  });

  it('should provide usage summary', () => {
    const ctx = new ContextWindow({ maxContextTokens: 10000 });
    ctx.trackUsage({ inputTokens: 5000, outputTokens: 1000 });
    const summary = ctx.getUsageSummary();
    assert.equal(summary.input, 5000);
    assert.equal(summary.output, 1000);
    assert.equal(summary.max, 10000);
    assert.equal(summary.percent, 50);
  });

  it('should reset counters', () => {
    const ctx = new ContextWindow();
    ctx.trackUsage({ inputTokens: 5000, outputTokens: 1000 });
    ctx.reset();
    assert.equal(ctx.getEstimatedTokens(), 0);
  });

  it('should accept custom config', () => {
    const ctx = new ContextWindow({ maxContextTokens: 50000, compactionThreshold: 0.9 });
    // Threshold is 50000 * 0.9 = 45000
    ctx.trackUsage({ inputTokens: 44000, outputTokens: 500 });
    assert.equal(ctx.needsCompaction(), false);

    ctx.trackUsage({ inputTokens: 46000, outputTokens: 500 });
    assert.equal(ctx.needsCompaction(), true);
  });

  it('should use 0.95 as default compaction threshold', () => {
    const ctx = new ContextWindow({ maxContextTokens: 10000 });
    // 94% should not trigger
    ctx.trackUsage({ inputTokens: 9400, outputTokens: 100 });
    assert.equal(ctx.needsCompaction(), false);
    // push to 95%+
    ctx.trackUsage({ inputTokens: 200, outputTokens: 0 });
    assert.equal(ctx.needsCompaction(), true);
  });

  it('isCritical returns false below 90%', () => {
    const ctx = new ContextWindow({ maxContextTokens: 10000 });
    ctx.trackUsage({ inputTokens: 8900, outputTokens: 100 });
    assert.equal(ctx.isCritical(), false);
  });

  it('isCritical returns true at 90%', () => {
    const ctx = new ContextWindow({ maxContextTokens: 10000 });
    ctx.trackUsage({ inputTokens: 9000, outputTokens: 100 });
    assert.equal(ctx.isCritical(), true);
  });

  it('isCritical returns true above 90%', () => {
    const ctx = new ContextWindow({ maxContextTokens: 10000 });
    ctx.trackUsage({ inputTokens: 9500, outputTokens: 100 });
    assert.equal(ctx.isCritical(), true);
  });

  it('getTokenBudgetRemaining returns correct value', () => {
    const ctx = new ContextWindow({ maxContextTokens: 10000 });
    ctx.trackUsage({ inputTokens: 7000, outputTokens: 500 });
    assert.equal(ctx.getTokenBudgetRemaining(), 3000);
  });

  it('getTokenBudgetRemaining returns 0 when over max', () => {
    const ctx = new ContextWindow({ maxContextTokens: 10000 });
    ctx.trackUsage({ inputTokens: 11000, outputTokens: 500 });
    assert.equal(ctx.getTokenBudgetRemaining(), 0);
  });

  it('getTokenBudgetRemaining returns full budget when unused', () => {
    const ctx = new ContextWindow({ maxContextTokens: 200000 });
    assert.equal(ctx.getTokenBudgetRemaining(), 200000);
  });
});
