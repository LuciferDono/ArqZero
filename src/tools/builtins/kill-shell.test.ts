import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { killShellTool } from './kill-shell.js';
import type { ToolContext } from '../types.js';

const ctx: ToolContext = {
  cwd: process.cwd(),
  config: { provider: 'fireworks' } as any,
  promptUser: async () => ({ allowed: true }),
};

describe('killShellTool', () => {
  it('should return not-implemented message', async () => {
    const result = await killShellTool.execute({ process_id: 'abc123' }, ctx);
    assert.equal(result.isError, undefined);
    assert.ok(result.content.includes('not yet implemented'));
  });

  it('should have ask permission level', () => {
    assert.equal(killShellTool.permissionLevel, 'ask');
  });
});
