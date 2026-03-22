import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AppConfigSchema } from './schema.js';

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
