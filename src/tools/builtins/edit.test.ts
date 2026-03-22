import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { editTool } from './edit.js';
import type { ToolContext } from '../types.js';

function createTempFile(content: string): string {
  const filePath = join(tmpdir(), `edit-test-${randomUUID()}.txt`);
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

const ctx: ToolContext = {
  cwd: process.cwd(),
  config: { provider: 'fireworks' } as any,
  promptUser: async () => ({ allowed: true }),
};

describe('editTool', () => {
  it('should replace a unique string', async () => {
    const filePath = createTempFile('Hello World');
    try {
      const result = await editTool.execute(
        { file_path: filePath, old_string: 'World', new_string: 'Universe' },
        ctx,
      );
      assert.equal(result.isError, undefined);
      assert.ok(result.content.includes('1 occurrence'));
      const content = readFileSync(filePath, 'utf-8');
      assert.equal(content, 'Hello Universe');
    } finally {
      try { unlinkSync(filePath); } catch {}
    }
  });

  it('should error when old_string not found', async () => {
    const filePath = createTempFile('Hello World');
    try {
      const result = await editTool.execute(
        { file_path: filePath, old_string: 'nonexistent', new_string: 'replacement' },
        ctx,
      );
      assert.equal(result.isError, true);
      assert.ok(result.content.includes('old_string not found in file'));
    } finally {
      try { unlinkSync(filePath); } catch {}
    }
  });

  it('should error when old_string is not unique without replace_all', async () => {
    const filePath = createTempFile('foo bar foo baz foo');
    try {
      const result = await editTool.execute(
        { file_path: filePath, old_string: 'foo', new_string: 'qux' },
        ctx,
      );
      assert.equal(result.isError, true);
      assert.ok(result.content.includes('old_string is not unique in file'));
      assert.ok(result.content.includes('replace_all'));
    } finally {
      try { unlinkSync(filePath); } catch {}
    }
  });

  it('should replace all occurrences with replace_all', async () => {
    const filePath = createTempFile('foo bar foo baz foo');
    try {
      const result = await editTool.execute(
        { file_path: filePath, old_string: 'foo', new_string: 'qux', replace_all: true },
        ctx,
      );
      assert.equal(result.isError, undefined);
      assert.ok(result.content.includes('3 occurrence'));
      const content = readFileSync(filePath, 'utf-8');
      assert.equal(content, 'qux bar qux baz qux');
    } finally {
      try { unlinkSync(filePath); } catch {}
    }
  });

  it('should have ask permission level', () => {
    assert.equal(editTool.permissionLevel, 'ask');
  });
});
