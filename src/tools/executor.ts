import { ToolRegistry } from './registry.js';
import type { ToolContext, ToolResult } from './types.js';

export class ToolExecutor {
  constructor(private registry: ToolRegistry) {}

  async execute(toolName: string, input: unknown, ctx: ToolContext): Promise<ToolResult> {
    // 1. Look up tool in registry
    const tool = this.registry.get(toolName);
    if (!tool) {
      return {
        content: `Unknown tool: ${toolName}`,
        isError: true,
      };
    }

    // 2. Execute with try/catch
    try {
      return await tool.execute(input, ctx);
    } catch (error) {
      return {
        content: `Tool "${toolName}" failed: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  }
}
