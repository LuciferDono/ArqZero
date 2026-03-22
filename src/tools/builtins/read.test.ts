import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { readTool } from './read.js';
import type { ToolContext } from '../types.js';

function createTempFile(content: string, ext: string): string {
  const filePath = join(tmpdir(), `read-test-${randomUUID()}${ext}`);
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

const ctx: ToolContext = {
  cwd: process.cwd(),
  config: { provider: 'fireworks' } as any,
  promptUser: async () => ({ allowed: true }),
};

describe('readTool', () => {
  it('should read a file with line numbers', async () => {
    const filePath = createTempFile('line one\nline two\nline three\n', '.txt');
    try {
      const result = await readTool.execute({ file_path: filePath }, ctx);
      assert.equal(result.isError, undefined);
      const lines = result.content.split('\n').filter((l) => l.length > 0);
      assert.equal(lines.length, 3);
      assert.ok(lines[0].includes('1\tline one'));
      assert.ok(lines[1].includes('2\tline two'));
      assert.ok(lines[2].includes('3\tline three'));
      // Verify right-aligned 6-char field
      assert.ok(lines[0].startsWith('     1\t'));
    } finally {
      unlinkSync(filePath);
    }
  });

  it('should handle offset and limit', async () => {
    const content = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`).join('\n') + '\n';
    const filePath = createTempFile(content, '.txt');
    try {
      const result = await readTool.execute({ file_path: filePath, offset: 3, limit: 2 }, ctx);
      assert.equal(result.isError, undefined);
      const lines = result.content.split('\n').filter((l) => l.length > 0);
      assert.equal(lines.length, 2);
      assert.ok(lines[0].includes('3\tline 3'));
      assert.ok(lines[1].includes('4\tline 4'));
      assert.equal(result.display?.truncated, true);
      assert.equal(result.display?.lineCount, 10);
    } finally {
      unlinkSync(filePath);
    }
  });

  it('should return error for missing file', async () => {
    const result = await readTool.execute(
      { file_path: join(tmpdir(), `nonexistent-${randomUUID()}.txt`) },
      ctx,
    );
    assert.equal(result.isError, true);
    assert.ok(result.content.length > 0);
  });

  it('should set display.language from extension', async () => {
    const filePath = createTempFile('const x = 1;\n', '.ts');
    try {
      const result = await readTool.execute({ file_path: filePath }, ctx);
      assert.equal(result.display?.language, 'typescript');
    } finally {
      unlinkSync(filePath);
    }
  });

  it('should read entire file when no offset/limit', async () => {
    const filePath = createTempFile('hello\nworld\n', '.txt');
    try {
      const result = await readTool.execute({ file_path: filePath }, ctx);
      assert.ok(!result.display?.truncated);
    } finally {
      unlinkSync(filePath);
    }
  });
});
