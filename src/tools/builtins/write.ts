import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Tool, ToolContext, ToolResult } from '../types.js';

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

  async execute(input: unknown, _ctx: ToolContext): Promise<ToolResult> {
    const { file_path, content } = input as WriteInput;

    mkdirSync(dirname(file_path), { recursive: true });
    writeFileSync(file_path, content, 'utf-8');

    return {
      content: `Wrote ${content.length} characters to ${file_path}`,
    };
  },
};
