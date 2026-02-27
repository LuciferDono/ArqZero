import { ToolRegistry } from './registry.js';
import type { ToolContext, ToolResult } from './types.js';
import type { PermissionManager } from '../permissions/manager.js';

export class ToolExecutor {
  private permissions: PermissionManager | null;

  constructor(
    private registry: ToolRegistry,
    permissions?: PermissionManager,
  ) {
    this.permissions = permissions ?? null;
  }

  async execute(toolName: string, input: unknown, ctx: ToolContext): Promise<ToolResult> {
    // 1. Look up tool in registry
    const tool = this.registry.get(toolName);
    if (!tool) {
      return {
        content: `Unknown tool: ${toolName}`,
        isError: true,
      };
    }

    // 2. Check permissions (if manager is wired)
    if (this.permissions) {
      const result = await this.permissions.check(
        toolName,
        tool.permissionLevel,
        input,
        ctx.promptUser,
      );
      if (!result.allowed) {
        return {
          content: result.denial ?? `Tool "${toolName}" was denied`,
          isError: true,
        };
      }
    }

    // 3. Execute with try/catch
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
