import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Tool, ToolContext, ToolResult } from '../types.js';
import { guardPath } from '../path-guard.js';

interface WriteInput {
  file_path: string;
  content: string;
}

export const writeTool: Tool = {
  name: 'Write',
  description: 'Creates or overwrites a file at the given path with the provided content.',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: 'Absolute path to the file to write' },
      content: { type: 'string', description: 'Content to write to the file' },
    },
    required: ['file_path', 'content'],
  },
  permissionLevel: 'ask',

  async execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
    const { file_path, content } = input as WriteInput;

    let resolvedPath: string;
    try {
      resolvedPath = guardPath(file_path, ctx.cwd);
    } catch (err: any) {
      return { content: err.message, isError: true };
    }

    // Capture old content for diff display
    let oldContent = '';
    if (existsSync(resolvedPath)) {
      try {
        oldContent = readFileSync(resolvedPath, 'utf-8');
      } catch {
        // File exists but unreadable — treat as new
      }
    }

    mkdirSync(dirname(resolvedPath), { recursive: true });
    writeFileSync(resolvedPath, content, 'utf-8');

    return {
      content: `Wrote ${content.length} characters to ${resolvedPath}`,
      metadata: {
        filePath: resolvedPath,
        oldContent,
        newContent: content,
        diffOperation: 'write',
      },
    };
  },
};
