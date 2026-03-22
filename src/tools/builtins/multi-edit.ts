import { readFileSync, writeFileSync } from 'node:fs';
import type { Tool, ToolContext, ToolResult } from '../types.js';
import { guardPath } from '../path-guard.js';

interface EditOp {
  old_string: string;
  new_string: string;
}

interface MultiEditInput {
  file_path: string;
  edits: EditOp[];
}

export const multiEditTool: Tool = {
  name: 'MultiEdit',
  description: 'Applies multiple sequential edits to a single file. Each edit validates that old_string exists and is unique.',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: 'Absolute path to the file to edit' },
      edits: {
        type: 'array',
        description: 'Array of edits to apply sequentially',
        items: {
          type: 'object',
          properties: {
            old_string: { type: 'string', description: 'The exact string to replace' },
            new_string: { type: 'string', description: 'The replacement string' },
          },
          required: ['old_string', 'new_string'],
        },
      },
    },
    required: ['file_path', 'edits'],
  },
  permissionLevel: 'ask',

  async execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
    const { file_path, edits } = input as MultiEditInput;

    if (!edits || edits.length === 0) {
      return { content: 'No edits provided', isError: true };
    }

    let resolvedPath: string;
    try {
      resolvedPath = guardPath(file_path, ctx.cwd);
    } catch (err: any) {
      return { content: err.message, isError: true };
    }

    const originalContent = readFileSync(resolvedPath, 'utf-8');
    let content = originalContent;

    for (let i = 0; i < edits.length; i++) {
      const { old_string, new_string } = edits[i];

      if (!content.includes(old_string)) {
        return {
          content: `Edit ${i + 1}: old_string not found in file`,
          isError: true,
        };
      }

      if (content.indexOf(old_string) !== content.lastIndexOf(old_string)) {
        return {
          content: `Edit ${i + 1}: old_string is not unique in file`,
          isError: true,
        };
      }

      content = content.replace(old_string, new_string);
    }

    writeFileSync(resolvedPath, content, 'utf-8');

    return {
      content: `Applied ${edits.length} edit(s) to ${resolvedPath}`,
      metadata: {
        filePath: resolvedPath,
        oldContent: originalContent,
        newContent: content,
        diffOperation: 'edit',
      },
    };
  },
};
