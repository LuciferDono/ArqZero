import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { McpServerConfig } from '../config/schema.js';

export interface McpToolInfo {
  serverName: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpConnection {
  serverName: string;
  client: Client;
  tools: McpToolInfo[];
}

export class McpClientManager {
  private connections = new Map<string, McpConnection>();

  /**
   * Connect to an MCP server and discover its tools.
   */
  async connect(
    serverName: string,
    config: McpServerConfig,
  ): Promise<McpToolInfo[]> {
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: { ...process.env, ...config.env } as Record<string, string>,
    });

    const client = new Client({
      name: 'arqzero',
      version: '0.1.0',
    });

    await client.connect(transport);

    const { tools } = await client.listTools();
    const toolInfos: McpToolInfo[] = (tools ?? []).map((tool) => ({
      serverName,
      name: tool.name,
      description: tool.description ?? '',
      inputSchema: (tool.inputSchema ?? {}) as Record<string, unknown>,
    }));

    this.connections.set(serverName, {
      serverName,
      client,
      tools: toolInfos,
    });
    return toolInfos;
  }

  /**
   * Call a tool on a specific server.
   */
  async callTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<{ content: string; isError?: boolean }> {
    const conn = this.connections.get(serverName);
    if (!conn) {
      throw new Error(`MCP server "${serverName}" is not connected`);
    }

    const result = await conn.client.callTool({
      name: toolName,
      arguments: args,
    });

    // Extract text content from MCP result
    const textParts: string[] = [];
    if (Array.isArray(result.content)) {
      for (const block of result.content) {
        if (
          typeof block === 'object' &&
          block !== null &&
          'type' in block &&
          block.type === 'text' &&
          'text' in block &&
          typeof block.text === 'string'
        ) {
          textParts.push(block.text);
        } else {
          textParts.push(JSON.stringify(block));
        }
      }
    } else if (typeof result.content === 'string') {
      textParts.push(result.content);
    }

    return {
      content: textParts.join('\n') || '(no output)',
      isError: result.isError === true ? true : undefined,
    };
  }

  /**
   * Get all discovered tools across all connected servers.
   */
  getAllTools(): McpToolInfo[] {
    const tools: McpToolInfo[] = [];
    for (const conn of this.connections.values()) {
      tools.push(...conn.tools);
    }
    return tools;
  }

  /**
   * Disconnect a specific server.
   */
  async disconnect(serverName: string): Promise<void> {
    const conn = this.connections.get(serverName);
    if (conn) {
      try {
        await conn.client.close();
      } catch {
        /* ignore close errors */
      }
      this.connections.delete(serverName);
    }
  }

  /**
   * Disconnect all servers.
   */
  async disconnectAll(): Promise<void> {
    for (const name of [...this.connections.keys()]) {
      await this.disconnect(name);
    }
  }

  /**
   * Check if a server is connected.
   */
  isConnected(serverName: string): boolean {
    return this.connections.has(serverName);
  }
}
