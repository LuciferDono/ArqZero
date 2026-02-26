import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AppConfigSchema } from './schema.js';

describe('AppConfigSchema', () => {
  it('should validate a minimal config', () => {
    const result = AppConfigSchema.safeParse({
      provider: 'cursor',
    });
    assert.strictEqual(result.success, true);
  });

  it('should apply defaults for missing optional fields', () => {
    const result = AppConfigSchema.safeParse({
      provider: 'cursor',
    });
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.permissions.defaultMode, 'ask');
      assert.deepStrictEqual(result.data.permissions.alwaysAllow, ['Read', 'Glob', 'Grep']);
      assert.strictEqual(result.data.model, 'claude-4-sonnet');
    }
  });

  it('should reject invalid provider', () => {
    const result = AppConfigSchema.safeParse({
      provider: 'invalid',
    });
    assert.strictEqual(result.success, false);
  });

  it('should validate full config with MCP servers', () => {
    const result = AppConfigSchema.safeParse({
      provider: 'cursor',
      model: 'claude-4.5-opus-high',
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
