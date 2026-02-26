import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import type { Tool, ToolContext, ToolResult } from '../types.js';

const languageMap: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.json': 'json',
  '.py': 'python',
  '.md': 'markdown',
  '.css': 'css',
  '.html': 'html',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.sh': 'bash',
  '.rs': 'rust',
  '.go': 'go',
  '.java': 'java',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.rb': 'ruby',
  '.sql': 'sql',
  '.xml': 'xml',
  '.toml': 'toml',
};

interface ReadInput {
  file_path: string;
  offset?: number;
  limit?: number;
}

function formatLineNumber(n: number): string {
  return String(n).padStart(6, ' ');
}

export const readTool: Tool = {
  name: 'Read',
  description: 'Reads a file from the filesystem and returns its content with line numbers.',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: 'Absolute path to the file to read' },
      offset: { type: 'number', description: 'Line number to start reading from (1-based)' },
      limit: { type: 'number', description: 'Maximum number of lines to read' },
    },
    required: ['file_path'],
  },
  permissionLevel: 'safe',

  async execute(input: unknown, _ctx: ToolContext): Promise<ToolResult> {
    const { file_path, offset, limit } = input as ReadInput;

    let raw: string;
    try {
      raw = readFileSync(file_path, 'utf-8');
    } catch (err: any) {
      return {
        content: `Error reading file: ${err.message}`,
        isError: true,
      };
    }

    const allLines = raw.endsWith('\n')
      ? raw.slice(0, -1).split('\n')
      : raw.split('\n');

    const totalLines = allLines.length;
    const ext = extname(file_path);
    const language = languageMap[ext];

    const startIndex = offset ? offset - 1 : 0;
    const endIndex = limit !== undefined ? startIndex + limit : totalLines;
    const selectedLines = allLines.slice(startIndex, endIndex);

    const truncated = offset !== undefined || limit !== undefined
      ? selectedLines.length < totalLines
      : false;

    const numbered = selectedLines.map((line, i) => {
      const lineNum = startIndex + i + 1;
      return `${formatLineNumber(lineNum)}\t${line}`;
    });

    return {
      content: numbered.join('\n'),
      display: {
        language,
        truncated: truncated || undefined,
        lineCount: truncated ? totalLines : undefined,
      },
    };
  },
};
