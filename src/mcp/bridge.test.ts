import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMcpToolAdapter, registerMcpTools } from './bridge.js';
import { ToolRegistry } from '../tools/registry.js';
import type { McpToolInfo, McpClientManager } from './client.js';
import type { ToolContext } from '../tools/types.js';

// --- Mock McpClientManager ---

class MockMcpManager {
  private tools: McpToolInfo[] = [];
  public lastCallArgs: {
    server: string;
    tool: string;
    args: Record<string, unknown>;
  } | null = null;
  private callResult: { content: string; isError?: boolean } = {
    content: 'mock result',
    isError: undefined,
  };
  private shouldThrow = false;
  private throwError = new Error('connection failed');

  addTool(
    serverName: string,
    name: string,
    description = '',
    inputSchema: Record<string, unknown> = {},
  ): void {
    this.tools.push({ serverName, name, description, inputSchema });
  }

  setCallResult(content: string, isError?: boolean): void {
    this.callResult = { content, isError };
  }

  setCallThrows(err: Error): void {
    this.shouldThrow = true;
    this.throwError = err;
  }

  getAllTools(): McpToolInfo[] {
    return this.tools;
  }

  async callTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<{ content: string; isError?: boolean }> {
    if (this.shouldThrow) {
      throw this.throwError;
    }
    this.lastCallArgs = { server: serverName, tool: toolName, args };
    return this.callResult;
  }
}

// --- Minimal ToolContext ---

const ctx: ToolContext = {
  cwd: process.cwd(),
  config: { provider: 'cursor' } as any,
  promptUser: async () => ({ allowed: true }),
};

// --- Tests ---

describe('createMcpToolAdapter', () => {
  it('should create tool with correct mcp__ prefix name', () => {
    const manager = new MockMcpManager();
    const toolInfo: McpToolInfo = {
      serverName: 'github',
      name: 'search_repos',
      description: 'Search GitHub repositories',
      inputSchema: { type: 'object', properties: {} },
    };

    const adapter = createMcpToolAdapter(
      toolInfo,
      manager as unknown as McpClientManager,
    );

    assert.equal(adapter.name, 'mcp__github__search_repos');
  });

  it('should set permission level to ask', () => {
    const manager = new MockMcpManager();
    const toolInfo: McpToolInfo = {
      serverName: 'github',
      name: 'search_repos',
      description: 'Search GitHub repositories',
      inputSchema: {},
    };

    const adapter = createMcpToolAdapter(
      toolInfo,
      manager as unknown as McpClientManager,
    );

    assert.equal(adapter.permissionLevel, 'ask');
  });

  it('should prefix description with server name', () => {
    const manager = new MockMcpManager();
    const toolInfo: McpToolInfo = {
      serverName: 'github',
      name: 'search_repos',
      description: 'Search GitHub repositories',
      inputSchema: {},
    };

    const adapter = createMcpToolAdapter(
      toolInfo,
      manager as unknown as McpClientManager,
    );

    assert.ok(adapter.description.startsWith('[MCP: github]'));
    assert.ok(adapter.description.includes('Search GitHub repositories'));
  });

  it('should pass input to mcpManager.callTool', async () => {
    const manager = new MockMcpManager();
    manager.setCallResult('found 5 repos');
    const toolInfo: McpToolInfo = {
      serverName: 'github',
      name: 'search_repos',
      description: 'Search',
      inputSchema: {},
    };

    const adapter = createMcpToolAdapter(
      toolInfo,
      manager as unknown as McpClientManager,
    );
    const result = await adapter.execute({ query: 'typescript' }, ctx);

    assert.ok(manager.lastCallArgs);
    assert.equal(manager.lastCallArgs.server, 'github');
    assert.equal(manager.lastCallArgs.tool, 'search_repos');
    assert.deepEqual(manager.lastCallArgs.args, { query: 'typescript' });
    assert.equal(result.content, 'found 5 repos');
    assert.equal(result.isError, undefined);
  });

  it('should handle callTool errors gracefully', async () => {
    const manager = new MockMcpManager();
    manager.setCallThrows(new Error('server crashed'));
    const toolInfo: McpToolInfo = {
      serverName: 'github',
      name: 'search_repos',
      description: 'Search',
      inputSchema: {},
    };

    const adapter = createMcpToolAdapter(
      toolInfo,
      manager as unknown as McpClientManager,
    );
    const result = await adapter.execute({}, ctx);

    assert.equal(result.isError, true);
    assert.ok(result.content.includes('server crashed'));
  });

  it('should handle null input as empty args', async () => {
    const manager = new MockMcpManager();
    manager.setCallResult('ok');
    const toolInfo: McpToolInfo = {
      serverName: 'fs',
      name: 'list',
      description: 'List files',
      inputSchema: {},
    };

    const adapter = createMcpToolAdapter(
      toolInfo,
      manager as unknown as McpClientManager,
    );
    await adapter.execute(null, ctx);

    assert.ok(manager.lastCallArgs);
    assert.deepEqual(manager.lastCallArgs.args, {});
  });
});

describe('registerMcpTools', () => {
  it('should register all MCP tools in registry', () => {
    const manager = new MockMcpManager();
    manager.addTool('github', 'search_repos', 'Search repos');
    manager.addTool('github', 'create_issue', 'Create issue');

    const registry = new ToolRegistry();
    const count = registerMcpTools(
      manager as unknown as McpClientManager,
      registry,
    );

    assert.equal(count, 2);
    assert.ok(registry.has('mcp__github__search_repos'));
    assert.ok(registry.has('mcp__github__create_issue'));
  });

  it('should skip duplicate tool names without throwing', () => {
    const manager = new MockMcpManager();
    // Two servers exposing the same tool name creates a collision
    manager.addTool('server_a', 'list_files', 'List from A');
    manager.addTool('server_b', 'list_files', 'List from B');

    const registry = new ToolRegistry();

    // These have different prefixed names, so no collision
    const count = registerMcpTools(
      manager as unknown as McpClientManager,
      registry,
    );

    assert.equal(count, 2);
    assert.ok(registry.has('mcp__server_a__list_files'));
    assert.ok(registry.has('mcp__server_b__list_files'));
  });

  it('should handle actual duplicate mcp names gracefully', () => {
    const manager = new MockMcpManager();
    // Same server, same tool name -- this creates a true duplicate
    manager.addTool('github', 'search', 'Search v1');
    manager.addTool('github', 'search', 'Search v2');

    const registry = new ToolRegistry();
    // Should not throw; the second one is skipped
    const count = registerMcpTools(
      manager as unknown as McpClientManager,
      registry,
    );

    assert.equal(count, 1);
    assert.ok(registry.has('mcp__github__search'));
  });

  it('should return zero when no MCP tools exist', () => {
    const manager = new MockMcpManager();
    const registry = new ToolRegistry();

    const count = registerMcpTools(
      manager as unknown as McpClientManager,
      registry,
    );

    assert.equal(count, 0);
  });
});
