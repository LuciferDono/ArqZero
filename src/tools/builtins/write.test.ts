import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, unlinkSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { writeTool } from './write.js';
import type { ToolContext } from '../types.js';

const ctx: ToolContext = {
  cwd: process.cwd(),
  config: { provider: 'fireworks' } as any,
  promptUser: async () => ({ allowed: true }),
};

describe('writeTool', () => {
  it('should create a new file', async () => {
    const filePath = join(tmpdir(), `write-test-${randomUUID()}.txt`);
    try {
      const result = await writeTool.execute({ file_path: filePath, content: 'hello world' }, ctx);
      assert.equal(result.isError, undefined);
      assert.ok(result.content.includes('11'));
      assert.ok(result.content.includes(filePath));
      const written = readFileSync(filePath, 'utf-8');
      assert.equal(written, 'hello world');
    } finally {
      try { unlinkSync(filePath); } catch {}
    }
  });

  it('should create parent directories', async () => {
    const dir = join(tmpdir(), `write-test-${randomUUID()}`, 'nested', 'deep');
    const filePath = join(dir, 'file.txt');
    try {
      const result = await writeTool.execute({ file_path: filePath, content: 'nested content' }, ctx);
      assert.equal(result.isError, undefined);
      const written = readFileSync(filePath, 'utf-8');
      assert.equal(written, 'nested content');
    } finally {
      try { rmSync(join(tmpdir(), dir.split(tmpdir())[1].split(/[\\/]/)[1]), { recursive: true, force: true }); } catch {}
    }
  });

  it('should overwrite existing file', async () => {
    const filePath = join(tmpdir(), `write-test-${randomUUID()}.txt`);
    try {
      await writeTool.execute({ file_path: filePath, content: 'first content' }, ctx);
      const result = await writeTool.execute({ file_path: filePath, content: 'second content' }, ctx);
      assert.equal(result.isError, undefined);
      const written = readFileSync(filePath, 'utf-8');
      assert.equal(written, 'second content');
    } finally {
      try { unlinkSync(filePath); } catch {}
    }
  });

  it('should have ask permission level', () => {
    assert.equal(writeTool.permissionLevel, 'ask');
  });
});
