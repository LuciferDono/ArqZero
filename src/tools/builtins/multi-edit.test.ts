import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { multiEditTool } from './multi-edit.js';
import type { ToolContext } from '../types.js';

function createTempFile(content: string): string {
  const filePath = join(tmpdir(), `multi-edit-test-${randomUUID()}.txt`);
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

const ctx: ToolContext = {
  cwd: process.cwd(),
  config: { provider: 'fireworks' } as any,
  promptUser: async () => ({ allowed: true }),
};

describe('multiEditTool', () => {
  it('should apply multiple edits sequentially', async () => {
    const filePath = createTempFile('Hello World\nFoo Bar\nBaz Qux');
    try {
      const result = await multiEditTool.execute(
        {
          file_path: filePath,
          edits: [
            { old_string: 'World', new_string: 'Universe' },
            { old_string: 'Foo', new_string: 'Fizz' },
          ],
        },
        ctx,
      );
      assert.equal(result.isError, undefined);
      const content = readFileSync(filePath, 'utf-8');
      assert.equal(content, 'Hello Universe\nFizz Bar\nBaz Qux');
    } finally {
      try { unlinkSync(filePath); } catch {}
    }
  });

  it('should error when old_string not found in any edit', async () => {
    const filePath = createTempFile('Hello World');
    try {
      const result = await multiEditTool.execute(
        {
          file_path: filePath,
          edits: [
            { old_string: 'nonexistent', new_string: 'replacement' },
          ],
        },
        ctx,
      );
      assert.equal(result.isError, true);
      assert.ok(result.content.includes('not found'));
    } finally {
      try { unlinkSync(filePath); } catch {}
    }
  });

  it('should error when old_string is not unique', async () => {
    const filePath = createTempFile('foo bar foo');
    try {
      const result = await multiEditTool.execute(
        {
          file_path: filePath,
          edits: [
            { old_string: 'foo', new_string: 'baz' },
          ],
        },
        ctx,
      );
      assert.equal(result.isError, true);
      assert.ok(result.content.includes('not unique'));
    } finally {
      try { unlinkSync(filePath); } catch {}
    }
  });

  it('should handle edits that depend on previous edits', async () => {
    const filePath = createTempFile('AAA BBB CCC');
    try {
      const result = await multiEditTool.execute(
        {
          file_path: filePath,
          edits: [
            { old_string: 'AAA', new_string: 'XXX' },
            { old_string: 'XXX BBB', new_string: 'YYY' },
          ],
        },
        ctx,
      );
      assert.equal(result.isError, undefined);
      const content = readFileSync(filePath, 'utf-8');
      assert.equal(content, 'YYY CCC');
    } finally {
      try { unlinkSync(filePath); } catch {}
    }
  });

  it('should have ask permission level', () => {
    assert.equal(multiEditTool.permissionLevel, 'ask');
  });

  it('should error on empty edits array', async () => {
    const filePath = createTempFile('Hello');
    try {
      const result = await multiEditTool.execute(
        { file_path: filePath, edits: [] },
        ctx,
      );
      assert.equal(result.isError, true);
    } finally {
      try { unlinkSync(filePath); } catch {}
    }
  });
});
