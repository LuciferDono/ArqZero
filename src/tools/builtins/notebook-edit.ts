import { readFileSync, writeFileSync } from 'node:fs';
import type { Tool, ToolContext, ToolResult } from '../types.js';

interface NotebookEditInput {
  notebook_path: string;
  cell_index: number;
  new_source?: string;
  cell_type?: string;
  action?: 'edit' | 'insert' | 'delete';
}

interface NotebookCell {
  cell_type: string;
  source: string[];
  outputs?: unknown[];
  metadata: Record<string, unknown>;
  execution_count?: number | null;
}

interface Notebook {
  cells: NotebookCell[];
  metadata?: Record<string, unknown>;
  nbformat?: number;
  nbformat_minor?: number;
}

function makeCell(cellType: string, source: string): NotebookCell {
  const cell: NotebookCell = {
    cell_type: cellType,
    source: [source],
    metadata: {},
  };
  if (cellType === 'code') {
    cell.outputs = [];
    cell.execution_count = null;
  }
  return cell;
}

export const notebookEditTool: Tool = {
  name: 'NotebookEdit',
  description: 'Edits a Jupyter notebook (.ipynb) file by modifying, inserting, or deleting cells.',
  inputSchema: {
    type: 'object',
    properties: {
      notebook_path: { type: 'string', description: 'Absolute path to the .ipynb file' },
      cell_index: { type: 'number', description: 'Index of the cell to edit, insert before, or delete' },
      new_source: { type: 'string', description: 'New source content for the cell (required for edit/insert)' },
      cell_type: { type: 'string', description: 'Cell type for insert (code, markdown, raw). Defaults to code.' },
      action: {
        type: 'string',
        enum: ['edit', 'insert', 'delete'],
        description: 'Action to perform (default: edit)',
      },
    },
    required: ['notebook_path', 'cell_index'],
  },
  permissionLevel: 'ask',

  async execute(input: unknown, _ctx: ToolContext): Promise<ToolResult> {
    const { notebook_path, cell_index, new_source, cell_type, action = 'edit' } = input as NotebookEditInput;

    let raw: string;
    try {
      raw = readFileSync(notebook_path, 'utf-8');
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

    const cellCount = notebook.cells.length;

    switch (action) {
      case 'edit': {
        if (cell_index < 0 || cell_index >= cellCount) {
          return {
            content: `Cell index ${cell_index} out of range (0-${cellCount - 1})`,
            isError: true,
          };
        }
        if (new_source === undefined) {
          return { content: 'new_source is required for edit action', isError: true };
        }
        notebook.cells[cell_index].source = [new_source];
        break;
      }
      case 'insert': {
        if (cell_index < 0 || cell_index > cellCount) {
          return {
            content: `Cell index ${cell_index} out of range for insert (0-${cellCount})`,
            isError: true,
          };
        }
        if (new_source === undefined) {
          return { content: 'new_source is required for insert action', isError: true };
        }
        const newCell = makeCell(cell_type || 'code', new_source);
        notebook.cells.splice(cell_index, 0, newCell);
        break;
      }
      case 'delete': {
        if (cell_index < 0 || cell_index >= cellCount) {
          return {
            content: `Cell index ${cell_index} out of range (0-${cellCount - 1})`,
            isError: true,
          };
        }
        notebook.cells.splice(cell_index, 1);
        break;
      }
      default:
        return { content: `Unknown action: ${action}`, isError: true };
    }

    try {
      writeFileSync(notebook_path, JSON.stringify(notebook, null, 2) + '\n', 'utf-8');
    } catch (err: any) {
      return { content: `Error writing notebook: ${err.message}`, isError: true };
    }

    const actionVerb = action === 'edit' ? 'edited' : action === 'insert' ? 'inserted' : 'deleted';
    return { content: `Cell ${cell_index} ${actionVerb} successfully (${notebook.cells.length} cells total)` };
  },
};
