import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ToolExecutor } from './executor.js';
import { ToolRegistry } from './registry.js';
import type { Tool, ToolResult, ToolContext } from './types.js';

function createMockTool(
  name: string,
  executeFn?: (input: unknown, ctx: ToolContext) => Promise<ToolResult>,
): Tool {
  return {
    name,
    description: `Mock ${name} tool`,
    inputSchema: { type: 'object', properties: {} },
    permissionLevel: 'safe',
    execute: executeFn || (async () => ({ content: 'mock result' })),
  };
}

const ctx: ToolContext = {
  cwd: process.cwd(),
  config: { provider: 'cursor' } as any,
  promptUser: async () => ({ allowed: true }),
};

describe('ToolExecutor', () => {
  it('should execute a registered tool', async () => {
    const registry = new ToolRegistry();
    const executor = new ToolExecutor(registry);
    registry.register(createMockTool('test_tool', async () => ({ content: 'ok' })));

    const result = await executor.execute('test_tool', {}, ctx);

    assert.equal(result.content, 'ok');
    assert.equal(result.isError, undefined);
  });

  it('should return error for unknown tool', async () => {
    const registry = new ToolRegistry();
    const executor = new ToolExecutor(registry);

    const result = await executor.execute('nonexistent', {}, ctx);

    assert.equal(result.isError, true);
    assert.ok(result.content.includes('Unknown tool'));
    assert.ok(result.content.includes('nonexistent'));
  });

  it('should catch thrown errors', async () => {
    const registry = new ToolRegistry();
    const executor = new ToolExecutor(registry);
    registry.register(
      createMockTool('failing_tool', async () => {
        throw new Error('boom');
      }),
    );

    const result = await executor.execute('failing_tool', {}, ctx);

    assert.equal(result.isError, true);
    assert.ok(result.content.includes('boom'));
    assert.ok(result.content.includes('failing_tool'));
  });

  it('should pass input and context to tool', async () => {
    const registry = new ToolRegistry();
    const executor = new ToolExecutor(registry);
    let receivedInput: unknown;
    let receivedCtx: ToolContext | undefined;

    registry.register(
      createMockTool('capture_tool', async (input, ctx) => {
        receivedInput = input;
        receivedCtx = ctx;
        return { content: 'captured' };
      }),
    );

    const testInput = { path: '/tmp/test.txt' };
    await executor.execute('capture_tool', testInput, ctx);

    assert.deepEqual(receivedInput, testInput);
    assert.equal(receivedCtx, ctx);
  });

  it('should preserve tool result properties', async () => {
    const registry = new ToolRegistry();
    const executor = new ToolExecutor(registry);
    registry.register(
      createMockTool('display_tool', async () => ({
        content: 'file contents here',
        isError: false,
        display: {
          language: 'typescript',
          truncated: true,
          lineCount: 42,
        },
      })),
    );

    const result = await executor.execute('display_tool', {}, ctx);

    assert.equal(result.content, 'file contents here');
    assert.equal(result.isError, false);
    assert.ok(result.display);
    assert.equal(result.display.language, 'typescript');
    assert.equal(result.display.truncated, true);
    assert.equal(result.display.lineCount, 42);
  });
});
