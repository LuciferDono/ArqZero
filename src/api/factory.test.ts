import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { buildProvider, resolveKeys, ProviderConfigError } from './factory.js';
import type { AppConfig } from '../config/schema.js';

function baseConfig(over: Partial<AppConfig> = {}): AppConfig {
  return {
    provider: 'fireworks',
    model: 'm',
    apiKeys: {},
    baseURLs: {},
    maxTokens: 8192,
    permissions: {
      defaultMode: 'ask',
      alwaysAllow: [],
      alwaysDeny: [],
      trustedPatterns: {},
    },
    mcpServers: {},
    bash: { defaultTimeout: 30000, maxTimeout: 600000 },
    ...over,
  };
}

const SAVED_ENV = { ...process.env };
function clearProviderEnv() {
  for (const k of Object.keys(process.env)) {
    if (k.endsWith('_API_KEY') || k === 'GEMINI_API_KEY') delete process.env[k];
  }
}

describe('factory', () => {
  beforeEach(() => clearProviderEnv());
  afterEach(() => {
    for (const k of Object.keys(process.env)) {
      if (k.endsWith('_API_KEY') || k === 'GEMINI_API_KEY') delete process.env[k];
    }
    Object.assign(process.env, SAVED_ENV);
  });

  describe('resolveKeys', () => {
    it('reads single string key from config', () => {
      const c = baseConfig({ apiKeys: { fireworks: 'k1' } });
      assert.deepStrictEqual(resolveKeys(c, 'fireworks'), ['k1']);
    });

    it('reads array of keys from config', () => {
      const c = baseConfig({ apiKeys: { openrouter: ['a', 'b'] } });
      assert.deepStrictEqual(resolveKeys(c, 'openrouter'), ['a', 'b']);
    });

    it('falls back to env var when config has none', () => {
      process.env.OPENAI_API_KEY = 'envkey';
      assert.deepStrictEqual(resolveKeys(baseConfig(), 'openai'), ['envkey']);
    });

    it('splits comma-delimited env var for openrouter', () => {
      process.env.OPENROUTER_API_KEY = 'a,b,c';
      assert.deepStrictEqual(resolveKeys(baseConfig(), 'openrouter'), ['a', 'b', 'c']);
    });

    it('does NOT split comma-delimited env var for non-fallback providers', () => {
      process.env.OPENAI_API_KEY = 'a,b';
      assert.deepStrictEqual(resolveKeys(baseConfig(), 'openai'), ['a,b']);
    });

    it('returns empty when no key anywhere', () => {
      assert.deepStrictEqual(resolveKeys(baseConfig(), 'openai'), []);
    });
  });

  describe('buildProvider', () => {
    it('builds fireworks adapter (OpenAI-compat)', () => {
      const p = buildProvider(baseConfig({ apiKeys: { fireworks: 'k' } }));
      assert.strictEqual(p.name, 'fireworks');
    });

    it('builds anthropic adapter', () => {
      const p = buildProvider(baseConfig({ provider: 'anthropic', apiKeys: { anthropic: 'k' } }));
      assert.strictEqual(p.name, 'anthropic');
    });

    it('builds openrouter adapter with fallback chain', () => {
      const p = buildProvider(baseConfig({ provider: 'openrouter', apiKeys: { openrouter: ['a', 'b'] } }));
      assert.strictEqual(p.name, 'openrouter');
    });

    it('builds ollama with no key', () => {
      const p = buildProvider(baseConfig({ provider: 'ollama' }));
      assert.strictEqual(p.name, 'ollama');
    });

    it('throws ProviderConfigError when key missing for required provider', () => {
      assert.throws(
        () => buildProvider(baseConfig({ provider: 'openai' })),
        (err: Error) => err instanceof ProviderConfigError,
      );
    });

    it('throws on unknown provider id', () => {
      assert.throws(
        () => buildProvider(baseConfig({ provider: 'mystery' })),
        (err: Error) => err instanceof ProviderConfigError,
      );
    });

    it('respects providerOverride', () => {
      process.env.GROQ_API_KEY = 'gk';
      const p = buildProvider(baseConfig({ provider: 'fireworks' }), { providerOverride: 'groq' });
      assert.strictEqual(p.name, 'groq');
    });

    it('throws on custom without baseURL', () => {
      assert.throws(
        () => buildProvider(baseConfig({ provider: 'custom', apiKeys: { custom: 'k' } })),
        (err: Error) => err instanceof ProviderConfigError,
      );
    });

    it('builds custom when baseURL provided', () => {
      const p = buildProvider(baseConfig({
        provider: 'custom',
        apiKeys: { custom: 'k' },
        baseURLs: { custom: 'https://example.com/v1' },
      }));
      assert.strictEqual(p.name, 'custom');
    });
  });
});
