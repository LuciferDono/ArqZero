import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { bashOutputTool } from './bash-output.js';
import type { ToolContext } from '../types.js';

const ctx: ToolContext = {
  cwd: process.cwd(),
  config: { provider: 'fireworks' } as any,
  promptUser: async () => ({ allowed: true }),
};

describe('bashOutputTool', () => {
  it('should return not-implemented message', async () => {
    const result = await bashOutputTool.execute({ process_id: 'abc123' }, ctx);
    assert.equal(result.isError, true);
    assert.ok(result.content.includes('not yet implemented'));
  });

  it('should have safe permission level', () => {
    assert.equal(bashOutputTool.permissionLevel, 'safe');
  });
});
