import type { Tool, ToolContext, ToolResult } from '../tools/types.js';
import type { ToolRegistry } from '../tools/registry.js';
import type { McpClientManager, McpToolInfo } from './client.js';

/**
 * Create an ArqZero Tool adapter from an MCP tool.
 * Tool name convention: mcp__<server>__<toolname>
 */
function createMcpToolAdapter(
  toolInfo: McpToolInfo,
  mcpManager: McpClientManager,
): Tool {
  const arqName = `mcp__${toolInfo.serverName}__${toolInfo.name}`;

  return {
    name: arqName,
    description: `[MCP: ${toolInfo.serverName}] ${toolInfo.description}`,
    inputSchema: toolInfo.inputSchema,
    permissionLevel: 'ask', // Conservative default for external tools
    async execute(input: unknown, _ctx: ToolContext): Promise<ToolResult> {
      try {
        const args = (input ?? {}) as Record<string, unknown>;
        const result = await mcpManager.callTool(
          toolInfo.serverName,
          toolInfo.name,
          args,
        );
        return {
          content: result.content,
          isError: result.isError,
        };
      } catch (err) {
        return {
          content: `MCP tool error: ${err instanceof Error ? err.message : String(err)}`,
          isError: true,
        };
      }
    },
  };
}

/**
 * Discover all MCP tools and register them in the ToolRegistry.
 * Returns the number of tools registered.
 */
export function registerMcpTools(
  mcpManager: McpClientManager,
  registry: ToolRegistry,
): number {
  const allTools = mcpManager.getAllTools();
  let registered = 0;

  for (const toolInfo of allTools) {
    const adapter = createMcpToolAdapter(toolInfo, mcpManager);
    try {
      registry.register(adapter);
      registered++;
    } catch {
      // Skip duplicate registrations (tool name collision)
    }
  }

  return registered;
}

export { createMcpToolAdapter };
