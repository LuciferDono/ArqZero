import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AppConfigSchema, getProviderKeys } from './schema.js';

describe('AppConfigSchema', () => {
  it('should validate a minimal config', () => {
    const result = AppConfigSchema.safeParse({
      provider: 'fireworks',
      fireworksApiKey: 'test-key',
    });
    assert.strictEqual(result.success, true);
  });

  it('should apply defaults for missing optional fields', () => {
    const result = AppConfigSchema.safeParse({
      provider: 'fireworks',
      fireworksApiKey: 'test-key',
    });
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.permissions.defaultMode, 'ask');
      assert.deepStrictEqual(result.data.permissions.alwaysAllow, ['Read', 'Glob', 'Grep']);
      assert.strictEqual(result.data.model, 'accounts/fireworks/models/glm-4p7');
    }
  });

  it('should reject invalid provider', () => {
    const result = AppConfigSchema.safeParse({
      provider: 'invalid',
      fireworksApiKey: 'test-key',
    });
    assert.strictEqual(result.success, false);
  });

  it('should migrate legacy fireworksApiKey into apiKeys.fireworks', () => {
    const result = AppConfigSchema.safeParse({
      provider: 'fireworks',
      fireworksApiKey: 'legacy-key',
    });
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.apiKeys.fireworks, 'legacy-key');
      assert.strictEqual(result.data.fireworksApiKey, 'legacy-key');
    }
  });

  it('should accept new apiKeys shape with single string', () => {
    const result = AppConfigSchema.safeParse({
      provider: 'openai',
      apiKeys: { openai: 'sk-test' },
    });
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.deepStrictEqual(getProviderKeys(result.data, 'openai'), ['sk-test']);
    }
  });

  it('should accept apiKeys array for openrouter fallback chain', () => {
    const result = AppConfigSchema.safeParse({
      provider: 'openrouter',
      apiKeys: { openrouter: ['k1', 'k2', 'k3'] },
    });
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.deepStrictEqual(getProviderKeys(result.data, 'openrouter'), ['k1', 'k2', 'k3']);
    }
  });

  it('should accept all 12 provider ids', () => {
    for (const p of ['fireworks', 'openai', 'anthropic', 'groq', 'together', 'deepseek', 'xai', 'google', 'mistral', 'ollama', 'openrouter', 'custom']) {
      const result = AppConfigSchema.safeParse({ provider: p, apiKeys: { [p]: 'k' } });
      assert.strictEqual(result.success, true, `${p} should be a valid provider`);
    }
  });

  it('should accept baseURLs override', () => {
    const result = AppConfigSchema.safeParse({
      provider: 'custom',
      apiKeys: { custom: 'k' },
      baseURLs: { custom: 'https://my-proxy.example/v1' },
    });
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.baseURLs.custom, 'https://my-proxy.example/v1');
    }
  });

  it('should validate full config with MCP servers', () => {
    const result = AppConfigSchema.safeParse({
      provider: 'fireworks',
      fireworksApiKey: 'test-key',
      model: 'accounts/fireworks/models/glm-4p7',
      mcpServers: {
        github: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-github'],
          env: { GITHUB_TOKEN: 'test' },
        },
      },
    });
    assert.strictEqual(result.success, true);
  });
});
