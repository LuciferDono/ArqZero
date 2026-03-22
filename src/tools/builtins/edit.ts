import { readFileSync, writeFileSync } from 'node:fs';
import type { Tool, ToolContext, ToolResult } from '../types.js';

interface EditInput {
  file_path: string;
  old_string: string;
  new_string: string;
  replace_all?: boolean;
}

export const editTool: Tool = {
  name: 'Edit',
  description: 'Performs exact string replacements in a file.',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: 'Absolute path to the file to edit' },
      old_string: { type: 'string', description: 'The exact string to replace' },
      new_string: { type: 'string', description: 'The replacement string' },
      replace_all: { type: 'boolean', description: 'Replace all occurrences (default: false)' },
    },
    required: ['file_path', 'old_string', 'new_string'],
  },
  permissionLevel: 'ask',

  async execute(input: unknown, _ctx: ToolContext): Promise<ToolResult> {
    const { file_path, old_string, new_string, replace_all } = input as EditInput;

    const file = readFileSync(file_path, 'utf-8');

    if (!file.includes(old_string)) {
      return {
        content: 'old_string not found in file',
        isError: true,
      };
    }

    if (!replace_all && file.indexOf(old_string) !== file.lastIndexOf(old_string)) {
      return {
        content: 'old_string is not unique in file. Use replace_all to replace all occurrences.',
        isError: true,
      };
    }

    let updated: string;
    let count: number;

    if (replace_all) {
      const parts = file.split(old_string);
      count = parts.length - 1;
      updated = file.replaceAll(old_string, new_string);
    } else {
      count = 1;
      updated = file.replace(old_string, new_string);
    }

    writeFileSync(file_path, updated, 'utf-8');

    return {
      content: `Edited ${file_path}: replaced ${count} occurrence(s)`,
      metadata: {
        filePath: file_path,
        oldContent: file,
        newContent: updated,
        diffOperation: 'edit',
      },
    };
  },
};
