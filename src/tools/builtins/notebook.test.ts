import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, unlinkSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { notebookReadTool } from './notebook-read.js';
import { notebookEditTool } from './notebook-edit.js';
import type { ToolContext } from '../types.js';

const sampleNotebook = {
  cells: [
    {
      cell_type: 'code',
      source: ["print('hello')"],
      metadata: {},
      outputs: [{ output_type: 'stream', text: ['hello\n'] }],
      execution_count: 1,
    },
    {
      cell_type: 'markdown',
      source: ['# Title'],
      metadata: {},
    },
  ],
  metadata: {
    kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
  },
  nbformat: 4,
  nbformat_minor: 5,
};

function createTempNotebook(): string {
  const filePath = join(tmpdir(), `notebook-test-${randomUUID()}.ipynb`);
  writeFileSync(filePath, JSON.stringify(sampleNotebook, null, 2), 'utf-8');
  return filePath;
}

const ctx: ToolContext = {
  cwd: process.cwd(),
  config: { provider: 'fireworks' } as any,
  promptUser: async () => ({ allowed: true }),
};

describe('notebookReadTool', () => {
  it('should read all cells', async () => {
    const filePath = createTempNotebook();
    try {
      const result = await notebookReadTool.execute({ notebook_path: filePath }, ctx);
      assert.equal(result.isError, undefined);
      assert.ok(result.content.includes('[Cell 0] (code)'));
      assert.ok(result.content.includes("print('hello')"));
      assert.ok(result.content.includes('--- Output ---'));
      assert.ok(result.content.includes('hello'));
      assert.ok(result.content.includes('[Cell 1] (markdown)'));
      assert.ok(result.content.includes('# Title'));
    } finally {
      unlinkSync(filePath);
    }
  });

  it('should read a single cell by index', async () => {
    const filePath = createTempNotebook();
    try {
      const result = await notebookReadTool.execute({ notebook_path: filePath, cell_index: 1 }, ctx);
      assert.equal(result.isError, undefined);
      assert.ok(result.content.includes('[Cell 1] (markdown)'));
      assert.ok(result.content.includes('# Title'));
      // Should NOT contain cell 0
      assert.ok(!result.content.includes('[Cell 0]'));
    } finally {
      unlinkSync(filePath);
    }
  });

  it('should return error for invalid path', async () => {
    const result = await notebookReadTool.execute(
      { notebook_path: join(tmpdir(), `nonexistent-${randomUUID()}.ipynb`) },
      ctx,
    );
    assert.equal(result.isError, true);
  });

  it('should return error for invalid cell index', async () => {
    const filePath = createTempNotebook();
    try {
      const result = await notebookReadTool.execute({ notebook_path: filePath, cell_index: 99 }, ctx);
      assert.equal(result.isError, true);
      assert.ok(result.content.includes('out of range'));
    } finally {
      unlinkSync(filePath);
    }
  });
});

describe('notebookEditTool', () => {
  it('should edit cell source', async () => {
    const filePath = createTempNotebook();
    try {
      const result = await notebookEditTool.execute(
        { notebook_path: filePath, cell_index: 0, new_source: "print('updated')" },
        ctx,
      );
      assert.equal(result.isError, undefined);

      const nb = JSON.parse(readFileSync(filePath, 'utf-8'));
      assert.deepEqual(nb.cells[0].source, ["print('updated')"]);
    } finally {
      unlinkSync(filePath);
    }
  });

  it('should insert a new cell', async () => {
    const filePath = createTempNotebook();
    try {
      const result = await notebookEditTool.execute(
        {
          notebook_path: filePath,
          cell_index: 1,
          action: 'insert',
          new_source: 'x = 42',
          cell_type: 'code',
        },
        ctx,
      );
      assert.equal(result.isError, undefined);

      const nb = JSON.parse(readFileSync(filePath, 'utf-8'));
      assert.equal(nb.cells.length, 3);
      assert.equal(nb.cells[1].cell_type, 'code');
      assert.deepEqual(nb.cells[1].source, ['x = 42']);
      // Original cell 1 should now be cell 2
      assert.equal(nb.cells[2].cell_type, 'markdown');
    } finally {
      unlinkSync(filePath);
    }
  });

  it('should delete a cell', async () => {
    const filePath = createTempNotebook();
    try {
      const result = await notebookEditTool.execute(
        { notebook_path: filePath, cell_index: 0, action: 'delete' },
        ctx,
      );
      assert.equal(result.isError, undefined);

      const nb = JSON.parse(readFileSync(filePath, 'utf-8'));
      assert.equal(nb.cells.length, 1);
      assert.equal(nb.cells[0].cell_type, 'markdown');
    } finally {
      unlinkSync(filePath);
    }
  });

  it('should return error for invalid path', async () => {
    const result = await notebookEditTool.execute(
      { notebook_path: join(tmpdir(), `nonexistent-${randomUUID()}.ipynb`), cell_index: 0, new_source: 'x' },
      ctx,
    );
    assert.equal(result.isError, true);
  });

  it('should return error for invalid cell index on edit', async () => {
    const filePath = createTempNotebook();
    try {
      const result = await notebookEditTool.execute(
        { notebook_path: filePath, cell_index: 99, new_source: 'x' },
        ctx,
      );
      assert.equal(result.isError, true);
      assert.ok(result.content.includes('out of range'));
    } finally {
      unlinkSync(filePath);
    }
  });
});
