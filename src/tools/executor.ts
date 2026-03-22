import fs from 'node:fs';
import { ToolRegistry } from './registry.js';
import type { ToolContext, ToolResult } from './types.js';
import type { PermissionManager } from '../permissions/manager.js';
import type { CheckpointStore } from '../checkpoints/store.js';

const FILE_MUTATING_TOOLS = new Set(['Write', 'Edit', 'MultiEdit']);

export class ToolExecutor {
  private permissions: PermissionManager | null;
  private checkpointStore: CheckpointStore | null;

  constructor(
    private registry: ToolRegistry,
    permissions?: PermissionManager,
    checkpointStore?: CheckpointStore,
  ) {
    this.permissions = permissions ?? null;
    this.checkpointStore = checkpointStore ?? null;
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

    // 3. Capture before-content for file-mutating tools
    let beforeContent: string | null = null;
    let filePath: string | undefined;
    if (this.checkpointStore && FILE_MUTATING_TOOLS.has(toolName)) {
      filePath = this.extractFilePath(input);
      if (filePath) {
        try {
          beforeContent = fs.readFileSync(filePath, 'utf-8');
        } catch {
          beforeContent = null; // file doesn't exist yet
        }
      }
    }

    // 4. Execute with try/catch
    try {
      const result = await tool.execute(input, ctx);

      // 5. Capture checkpoint after successful file mutation
      if (this.checkpointStore && filePath && !result.isError) {
        try {
          const afterContent = fs.readFileSync(filePath, 'utf-8');
          this.checkpointStore.capture(toolName, filePath, beforeContent, afterContent);
        } catch {
          // File may have been deleted or is unreadable — skip checkpoint
        }
      }

      return result;
    } catch (error) {
      return {
        content: `Tool "${toolName}" failed: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  }

  private extractFilePath(input: unknown): string | undefined {
    if (input && typeof input === 'object') {
      const obj = input as Record<string, unknown>;
      if (typeof obj.file_path === 'string') return obj.file_path;
      if (typeof obj.filePath === 'string') return obj.filePath;
      if (typeof obj.path === 'string') return obj.path;
    }
    return undefined;
  }
}
