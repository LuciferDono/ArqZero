import fg from 'fast-glob';
import type { Tool, ToolContext, ToolResult } from '../types.js';

interface GlobInput {
  pattern: string;
  path?: string;
}

export const globTool: Tool = {
  name: 'Glob',
  description: 'Finds files matching a glob pattern.',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: "Glob pattern to match files (e.g., '**/*.ts')" },
      path: { type: 'string', description: 'Directory to search in' },
    },
    required: ['pattern'],
  },
  permissionLevel: 'safe',

  async execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
    const { pattern, path } = input as GlobInput;
    const cwd = path ?? ctx.cwd;
    const ignore = ['**/node_modules/**', '**/.git/**'];

    const matches = fg.sync(pattern, { cwd, ignore, dot: true, onlyFiles: true });

    if (matches.length === 0) {
      return { content: '(no matches)' };
    }

    return { content: matches.join('\n') };
  },
};
