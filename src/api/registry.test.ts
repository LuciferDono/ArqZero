import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PROVIDERS, getProviderMeta, listProviderIds, isValidProviderId } from './registry.js';

describe('provider registry', () => {
  it('exposes all 12 providers', () => {
    const ids = listProviderIds();
    assert.strictEqual(ids.length, 12);
    for (const id of [
      'fireworks', 'openai', 'anthropic', 'groq', 'together',
      'deepseek', 'xai', 'google', 'mistral', 'ollama', 'openrouter', 'custom',
    ]) {
      assert.ok(ids.includes(id as never), `missing ${id}`);
    }
  });

  it('every provider has required metadata fields', () => {
    for (const id of listProviderIds()) {
      const meta = PROVIDERS[id];
      assert.ok(meta.id);
      assert.ok(meta.displayName);
      assert.ok(meta.defaultModel || id === 'custom');
      assert.ok(meta.keyEnvVar);
      assert.ok(typeof meta.supportsToolUse === 'boolean');
      assert.ok(typeof meta.requiresKey === 'boolean');
    }
  });

  it('only openrouter supports key fallback', () => {
    for (const id of listProviderIds()) {
      const meta = PROVIDERS[id];
      assert.strictEqual(meta.supportsKeyFallback, id === 'openrouter');
    }
  });

  it('only ollama is keyless', () => {
    for (const id of listProviderIds()) {
      const meta = PROVIDERS[id];
      if (id === 'ollama') assert.strictEqual(meta.requiresKey, false);
      else assert.strictEqual(meta.requiresKey, true);
    }
  });

  it('only anthropic is non-OpenAI-compat', () => {
    for (const id of listProviderIds()) {
      const meta = PROVIDERS[id];
      assert.strictEqual(meta.isOpenAICompat, id !== 'anthropic');
    }
  });

  it('isValidProviderId narrows correctly', () => {
    assert.strictEqual(isValidProviderId('fireworks'), true);
    assert.strictEqual(isValidProviderId('openrouter'), true);
    assert.strictEqual(isValidProviderId('bogus'), false);
  });

  it('getProviderMeta throws on unknown id', () => {
    assert.throws(() => getProviderMeta('bogus' as never));
  });
});
