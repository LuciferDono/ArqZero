import { readFileSync } from 'node:fs';
import type { Tool, ToolContext, ToolResult } from '../types.js';
import { guardPath } from '../path-guard.js';

interface NotebookReadInput {
  notebook_path: string;
  cell_index?: number;
}

interface NotebookCell {
  cell_type: string;
  source: string[];
  outputs?: Array<{ output_type: string; text?: string[]; data?: Record<string, string[]> }>;
  metadata?: Record<string, unknown>;
  execution_count?: number | null;
}

interface Notebook {
  cells: NotebookCell[];
  metadata?: Record<string, unknown>;
  nbformat?: number;
  nbformat_minor?: number;
}

function formatCell(cell: NotebookCell, index: number): string {
  const lines: string[] = [];
  lines.push(`[Cell ${index}] (${cell.cell_type})`);
  lines.push(cell.source.join(''));

  if (cell.cell_type === 'code' && cell.outputs && cell.outputs.length > 0) {
    lines.push('--- Output ---');
    for (const output of cell.outputs) {
      if (output.text) {
        lines.push(output.text.join(''));
      }
      if (output.data) {
        for (const [mime, content] of Object.entries(output.data)) {
          lines.push(`[${mime}]`);
          lines.push(content.join(''));
        }
      }
    }
  }

  return lines.join('\n');
}

export const notebookReadTool: Tool = {
  name: 'NotebookRead',
  description: 'Reads a Jupyter notebook (.ipynb) file and returns its cells with source and outputs.',
  inputSchema: {
    type: 'object',
    properties: {
      notebook_path: { type: 'string', description: 'Absolute path to the .ipynb file' },
      cell_index: { type: 'number', description: 'Optional index of a specific cell to read' },
    },
    required: ['notebook_path'],
  },
  permissionLevel: 'safe',

  async execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
    const { notebook_path, cell_index } = input as NotebookReadInput;

    let resolvedPath: string;
    try {
      resolvedPath = guardPath(notebook_path, ctx.cwd);
    } catch (err: any) {
      return { content: err.message, isError: true };
    }

    let raw: string;
    try {
      raw = readFileSync(resolvedPath, 'utf-8');
    } catch (err: any) {
      return { content: `Error reading notebook: ${err.message}`, isError: true };
    }

    let notebook: Notebook;
    try {
      notebook = JSON.parse(raw);
    } catch (err: any) {
      return { content: `Error parsing notebook JSON: ${err.message}`, isError: true };
    }

    if (!notebook.cells || !Array.isArray(notebook.cells)) {
      return { content: 'Invalid notebook: missing cells array', isError: true };
    }

    if (cell_index !== undefined) {
      if (cell_index < 0 || cell_index >= notebook.cells.length) {
        return {
          content: `Cell index ${cell_index} out of range (0-${notebook.cells.length - 1})`,
          isError: true,
        };
      }
      return { content: formatCell(notebook.cells[cell_index], cell_index) };
    }

    const formatted = notebook.cells.map((cell, i) => formatCell(cell, i)).join('\n\n');
    return { content: formatted };
  },
};
