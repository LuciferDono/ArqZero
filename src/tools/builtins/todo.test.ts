import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { todoWriteTool } from './todo-write.js';
import { todoReadTool } from './todo-read.js';
import { getTodoStore } from './todo-store.js';
import type { ToolContext } from '../types.js';

const ctx: ToolContext = {
  cwd: process.cwd(),
  config: { provider: 'fireworks' } as any,
  promptUser: async () => ({ allowed: true }),
};

describe('TodoWrite + TodoRead', () => {
  beforeEach(() => {
    getTodoStore().clear();
  });

  it('should write and read todos', async () => {
    await todoWriteTool.execute(
      {
        todos: [
          { id: '1', content: 'First task', status: 'pending' },
          { id: '2', content: 'Second task', status: 'in_progress', priority: 'high' },
        ],
      },
      ctx,
    );

    const result = await todoReadTool.execute({}, ctx);
    assert.equal(result.isError, undefined);
    assert.ok(result.content.includes('First task'));
    assert.ok(result.content.includes('Second task'));
    assert.ok(result.content.includes('pending'));
    assert.ok(result.content.includes('in_progress'));
    assert.ok(result.content.includes('high'));
  });

  it('should update existing todos', async () => {
    await todoWriteTool.execute(
      { todos: [{ id: '1', content: 'Original', status: 'pending' }] },
      ctx,
    );
    await todoWriteTool.execute(
      { todos: [{ id: '1', content: 'Updated', status: 'completed' }] },
      ctx,
    );

    const result = await todoReadTool.execute({}, ctx);
    assert.ok(result.content.includes('Updated'));
    assert.ok(result.content.includes('completed'));
    assert.ok(!result.content.includes('Original'));
  });

  it('should return "No tasks" when store is empty', async () => {
    const result = await todoReadTool.execute({}, ctx);
    assert.ok(result.content.includes('No tasks'));
  });

  it('todoWriteTool should return formatted list after writing', async () => {
    const result = await todoWriteTool.execute(
      { todos: [{ id: 'a', content: 'Do stuff', status: 'pending', priority: 'medium' }] },
      ctx,
    );
    assert.equal(result.isError, undefined);
    assert.ok(result.content.includes('Do stuff'));
  });

  it('todoWriteTool should have safe permission level', () => {
    assert.equal(todoWriteTool.permissionLevel, 'safe');
  });

  it('todoReadTool should have safe permission level', () => {
    assert.equal(todoReadTool.permissionLevel, 'safe');
  });
});
