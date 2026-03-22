import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getModelByName, getModelByTier, getModelCost, routeModel, MODELS } from './model-router.js';

describe('getModelByName', () => {
  it('finds by display name (case-insensitive)', () => {
    const m = getModelByName('Enso');
    assert.ok(m);
    assert.equal(m.id, 'accounts/fireworks/models/glm-4p7');
  });

  it('finds by display name lowercase', () => {
    const m = getModelByName('primus');
    assert.ok(m);
    assert.equal(m.id, 'accounts/fireworks/models/glm-5');
  });

  it('finds by full model ID', () => {
    const m = getModelByName('accounts/fireworks/models/glm-5');
    assert.ok(m);
    assert.equal(m.displayName, 'PRIMUS');
  });

  it('finds by short name (last segment)', () => {
    const m = getModelByName('glm-4p7');
    assert.ok(m);
    assert.equal(m.displayName, 'Enso');
  });

  it('returns undefined for unknown model', () => {
    const m = getModelByName('nonexistent-model');
    assert.equal(m, undefined);
  });
});

describe('getModelByTier', () => {
  it('returns default tier model', () => {
    const m = getModelByTier('default');
    assert.equal(m.tier, 'default');
    assert.equal(m.displayName, 'Enso');
  });

  it('returns strong tier model', () => {
    const m = getModelByTier('strong');
    assert.equal(m.tier, 'strong');
    assert.equal(m.displayName, 'PRIMUS');
  });

  it('falls back to MODELS[0] for missing tier', () => {
    const m = getModelByTier('fast');
    assert.equal(m.id, MODELS[0].id);
  });
});

describe('getModelCost', () => {
  it('returns cost for known model', () => {
    const cost = getModelCost('accounts/fireworks/models/glm-5');
    assert.equal(cost.costPerMInput, 1.00);
    assert.equal(cost.costPerMOutput, 3.00);
  });

  it('returns default cost for unknown model', () => {
    const cost = getModelCost('unknown/model');
    const defaultModel = getModelByTier('default');
    assert.equal(cost.costPerMInput, defaultModel.costPerMInput);
    assert.equal(cost.costPerMOutput, defaultModel.costPerMOutput);
  });
});

describe('routeModel', () => {
  const defaultModel = 'accounts/fireworks/models/glm-4p7';

  it('returns strong model for architecture/planning tasks', () => {
    const result = routeModel('design the database schema', ['planning', 'database-design'], defaultModel);
    assert.equal(result.model, 'accounts/fireworks/models/glm-5');
    assert.ok(result.reason.includes('task'));
  });

  it('returns strong model for security review', () => {
    const result = routeModel('review this for vulnerabilities', ['security-review'], defaultModel);
    assert.equal(result.model, 'accounts/fireworks/models/glm-5');
  });

  it('returns strong model for code review', () => {
    const result = routeModel('review my pull request', ['code-review'], defaultModel);
    assert.equal(result.model, 'accounts/fireworks/models/glm-5');
  });

  it('returns default model for simple tasks', () => {
    const result = routeModel('fix this typo', ['editing', 'formatting'], defaultModel);
    assert.equal(result.model, defaultModel);
    assert.equal(result.reason, 'default');
  });

  it('returns default model when no capabilities matched', () => {
    const result = routeModel('hello world', [], defaultModel);
    assert.equal(result.model, defaultModel);
    assert.equal(result.reason, 'default');
  });

  it('returns default when already using strong model', () => {
    const strongModel = 'accounts/fireworks/models/glm-5';
    const result = routeModel('plan the architecture', ['planning'], strongModel);
    assert.equal(result.model, strongModel);
    assert.equal(result.reason, 'default');
  });

  it('routes for migration tasks', () => {
    const result = routeModel('migrate from v1 to v2', ['migration'], defaultModel);
    assert.equal(result.model, 'accounts/fireworks/models/glm-5');
  });

  it('routes for incident response', () => {
    const result = routeModel('the server is down', ['incident-response'], defaultModel);
    assert.equal(result.model, 'accounts/fireworks/models/glm-5');
  });
});
