import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isFeatureAllowed, isToolAllowed, isCommandAllowed, getCapabilityLimit, getUpgradeMessage, PRO_TOOLS, PRO_COMMANDS } from './gates.js';

describe('isToolAllowed', () => {
  it('should allow free tools on free tier', () => {
    assert.ok(isToolAllowed('Read', 'free'));
    assert.ok(isToolAllowed('Write', 'free'));
    assert.ok(isToolAllowed('Bash', 'free'));
    assert.ok(isToolAllowed('Glob', 'free'));
  });

  it('should block pro tools on free tier', () => {
    assert.ok(!isToolAllowed('Dispatch', 'free'));
    assert.ok(!isToolAllowed('MultiEdit', 'free'));
    assert.ok(!isToolAllowed('NotebookRead', 'free'));
  });

  it('should allow pro tools on pro tier', () => {
    assert.ok(isToolAllowed('Dispatch', 'pro'));
    assert.ok(isToolAllowed('MultiEdit', 'pro'));
  });

  it('should allow pro tools on team tier', () => {
    assert.ok(isToolAllowed('Dispatch', 'team'));
  });
});

describe('isCommandAllowed', () => {
  it('should allow free commands on free tier', () => {
    assert.ok(isCommandAllowed('/help', 'free'));
    assert.ok(isCommandAllowed('/clear', 'free'));
    assert.ok(isCommandAllowed('/config', 'free'));
  });

  it('should block pro commands on free tier', () => {
    assert.ok(!isCommandAllowed('/memory', 'free'));
    assert.ok(!isCommandAllowed('/undo', 'free'));
    assert.ok(!isCommandAllowed('/agents', 'free'));
  });

  it('should allow pro commands on pro tier', () => {
    assert.ok(isCommandAllowed('/memory', 'pro'));
    assert.ok(isCommandAllowed('/undo', 'pro'));
  });
});

describe('isFeatureAllowed', () => {
  it('should allow ungated features on all tiers', () => {
    assert.ok(isFeatureAllowed('some-random-feature', 'free'));
  });

  it('should block team features on pro tier', () => {
    assert.ok(!isFeatureAllowed('team-memory', 'pro'));
    assert.ok(!isFeatureAllowed('team-settings', 'pro'));
  });

  it('should allow team features on team tier', () => {
    assert.ok(isFeatureAllowed('team-memory', 'team'));
  });

  it('should block pro features on free tier', () => {
    assert.ok(!isFeatureAllowed('subagents', 'free'));
    assert.ok(!isFeatureAllowed('memory', 'free'));
  });
});

describe('getCapabilityLimit', () => {
  it('should return 10 for free tier', () => {
    assert.equal(getCapabilityLimit('free'), 10);
  });

  it('should return 42 for pro tier', () => {
    assert.equal(getCapabilityLimit('pro'), 42);
  });

  it('should return 42 for team tier', () => {
    assert.equal(getCapabilityLimit('team'), 42);
  });
});

describe('getUpgradeMessage', () => {
  it('should return pro URL for pro features', () => {
    const msg = getUpgradeMessage('subagents');
    assert.ok(msg.includes('Pro'));
    assert.ok(msg.includes('$12/mo'));
  });

  it('should return team URL for team features', () => {
    const msg = getUpgradeMessage('team-memory');
    assert.ok(msg.includes('Team'));
    assert.ok(msg.includes('$30'));
  });
});
