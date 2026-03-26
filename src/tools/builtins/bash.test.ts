import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import { bashTool } from './bash.js';
import type { ToolContext } from '../types.js';

const ctx: ToolContext = {
  cwd: process.cwd(),
  config: {
    provider: 'fireworks',
    bash: { defaultTimeout: 30000, maxTimeout: 600000 },
  } as any,
  promptUser: async () => ({ allowed: true }),
};

describe('bashTool', () => {
  it('should execute a simple command', async () => {
    const result = await bashTool.execute({ command: 'echo hello' }, ctx);
    assert.equal(result.isError, undefined);
    assert.ok(result.content.includes('hello'));
  });

  it('should capture stderr', async () => {
    const result = await bashTool.execute(
      { command: 'node -e "console.error(\'warn\')"' },
      ctx,
    );
    assert.ok(result.content.includes('stderr:'));
    assert.ok(result.content.includes('warn'));
  });

  it('should reject interactive processes', async () => {
    const result = await bashTool.execute({ command: 'vim' }, ctx);
    assert.equal(result.isError, true);
    assert.ok(result.content.includes('Interactive processes'));
  });

  it('should reject bare python', async () => {
    const result = await bashTool.execute({ command: 'python' }, ctx);
    assert.equal(result.isError, true);
    assert.ok(result.content.includes('Interactive processes'));
  });

  it('should handle non-zero exit code', async () => {
    const result = await bashTool.execute(
      { command: 'node -e "process.exit(1)"' },
      ctx,
    );
    assert.equal(result.isError, true);
  });

  it('should have ask permission level', () => {
    assert.equal(bashTool.permissionLevel, 'ask');
  });

  it('should use cwd override', async () => {
    // Use a unique marker file to verify cwd was actually changed
    const tmpDir = os.tmpdir();
    const marker = `arqzero-test-${Date.now()}`;
    const result = await bashTool.execute(
      { command: `touch ${marker} && ls ${marker} && rm ${marker}`, cwd: tmpDir },
      ctx,
    );
    assert.equal(result.isError, undefined);
    assert.ok(
      result.content.includes(marker),
      `Expected cwd override to work, got: "${result.content}"`,
    );
  });
});
