import { readFileSync, statSync } from 'node:fs';
import fg from 'fast-glob';
import type { Tool, ToolContext, ToolResult } from '../types.js';

interface GrepInput {
  pattern: string;
  path?: string;
  glob?: string;
  output_mode?: 'content' | 'files_with_matches' | 'count';
}

export const grepTool: Tool = {
  name: 'Grep',
  description: 'Searches file contents using a regex pattern.',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Regex pattern to search for' },
      path: { type: 'string', description: 'File or directory to search in' },
      glob: { type: 'string', description: 'Glob pattern to filter files' },
      output_mode: {
        type: 'string',
        enum: ['content', 'files_with_matches', 'count'],
        description: 'Output format',
      },
    },
    required: ['pattern'],
  },
  permissionLevel: 'safe',

  async execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
    const { pattern, path, glob: globPattern, output_mode } = input as GrepInput;
    const mode = output_mode ?? 'files_with_matches';
    const regex = new RegExp(pattern, 'gm');
    const ignore = ['**/node_modules/**', '**/.git/**'];

    let files: string[];

    const searchPath = path ?? ctx.cwd;

    let isFile = false;
    try {
      isFile = statSync(searchPath).isFile();
    } catch {
      // not a file, treat as directory
    }

    if (isFile) {
      files = [searchPath];
    } else {
      const fileGlob = globPattern ?? '**/*';
      files = fg.sync(fileGlob, { cwd: searchPath, ignore, dot: true, onlyFiles: true })
        .map((f) => `${searchPath}/${f}`);
    }

    const output: string[] = [];

    for (const file of files) {
      let content: string;
      try {
        content = readFileSync(file, 'utf-8');
      } catch {
        continue;
      }

      const lines = content.split('\n');
      const matchingLines: { lineNum: number; text: string }[] = [];

      for (let i = 0; i < lines.length; i++) {
        regex.lastIndex = 0;
        if (regex.test(lines[i])) {
          matchingLines.push({ lineNum: i + 1, text: lines[i] });
        }
      }

      if (matchingLines.length === 0) continue;

      switch (mode) {
        case 'files_with_matches':
          output.push(file);
          break;
        case 'content':
          for (const m of matchingLines) {
            output.push(`${file}:${m.lineNum}:${m.text}`);
          }
          break;
        case 'count':
          output.push(`${file}:${matchingLines.length}`);
          break;
      }
    }

    if (output.length === 0) {
      return { content: '(no matches)' };
    }

    return { content: output.join('\n') };
  },
};
