import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Tool, ToolContext, ToolResult } from '../types.js';

interface LsInput {
  path?: string;
}

export const lsTool: Tool = {
  name: 'LS',
  description: 'Lists directory contents showing name, type (file/dir), and size.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Directory path to list (defaults to cwd)' },
    },
    required: [],
  },
  permissionLevel: 'safe',

  async execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
    const { path } = input as LsInput;
    const dirPath = path ? resolve(path) : ctx.cwd;

    let entries: string[];
    try {
      entries = readdirSync(dirPath);
    } catch (err: any) {
      return {
        content: `Failed to list directory: ${err.message}`,
        isError: true,
      };
    }

    if (entries.length === 0) {
      return { content: '(empty directory)' };
    }

    const lines: string[] = [];
    for (const name of entries.sort()) {
      try {
        const fullPath = join(dirPath, name);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          lines.push(`${name}/`);
        } else {
          lines.push(`${name}  (${formatSize(stat.size)})`);
        }
      } catch {
        lines.push(`${name}  (unreadable)`);
      }
    }

    return { content: lines.join('\n') };
  },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
