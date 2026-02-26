import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ToolRegistry } from './registry.js';
import type { Tool, ToolResult, ToolContext } from './types.js';

function createMockTool(name: string): Tool {
  return {
    name,
    description: `Mock tool: ${name}`,
    inputSchema: {
      type: 'object',
      properties: {
        input: { type: 'string' },
      },
    },
    permissionLevel: 'safe',
    async execute(_input: unknown, _ctx: ToolContext): Promise<ToolResult> {
      return { content: `${name} executed` };
    },
  };
}

describe('ToolRegistry', () => {
  it('should register and retrieve a tool', () => {
    const registry = new ToolRegistry();
    const tool = createMockTool('read_file');

    registry.register(tool);

    const retrieved = registry.get('read_file');
    assert.ok(retrieved);
    assert.equal(retrieved.name, 'read_file');
    assert.equal(retrieved.description, 'Mock tool: read_file');
  });

  it('should throw on duplicate registration', () => {
    const registry = new ToolRegistry();
    const tool = createMockTool('read_file');

    registry.register(tool);

    assert.throws(
      () => registry.register(createMockTool('read_file')),
      { message: /already registered/ },
    );
  });

  it('should return undefined for unknown tool', () => {
    const registry = new ToolRegistry();

    const result = registry.get('nonexistent');

    assert.equal(result, undefined);
  });

  it('should check if tool exists', () => {
    const registry = new ToolRegistry();
    const tool = createMockTool('read_file');

    registry.register(tool);

    assert.equal(registry.has('read_file'), true);
    assert.equal(registry.has('nonexistent'), false);
  });

  it('should return all registered tools', () => {
    const registry = new ToolRegistry();

    registry.register(createMockTool('tool_a'));
    registry.register(createMockTool('tool_b'));

    const all = registry.getAll();
    assert.equal(all.length, 2);
  });

  it('should return LLM-compatible definitions', () => {
    const registry = new ToolRegistry();

    registry.register(createMockTool('read_file'));
    registry.register(createMockTool('write_file'));

    const definitions = registry.getDefinitions();
    assert.equal(definitions.length, 2);

    const readDef = definitions.find((d) => d.name === 'read_file');
    assert.ok(readDef);
    assert.equal(readDef.name, 'read_file');
    assert.equal(readDef.description, 'Mock tool: read_file');
    assert.deepEqual(readDef.input_schema, {
      type: 'object',
      properties: {
        input: { type: 'string' },
      },
    });
  });
});
