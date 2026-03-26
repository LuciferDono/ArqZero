import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { lsTool } from './ls.js';
import type { ToolContext } from '../types.js';

function createTempDir(): string {
  const dirPath = join(tmpdir(), `ls-test-${randomUUID()}`);
  mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

const ctx: ToolContext = {
  cwd: process.cwd(),
  config: { provider: 'fireworks' } as any,
  promptUser: async () => ({ allowed: true }),
};

describe('lsTool', () => {
  it('should list files and directories', async () => {
    const dir = createTempDir();
    try {
      writeFileSync(join(dir, 'file.txt'), 'hello', 'utf-8');
      mkdirSync(join(dir, 'subdir'));

      const result = await lsTool.execute({ path: dir }, ctx);
      assert.equal(result.isError, undefined);
      assert.ok(result.content.includes('file.txt'));
      assert.ok(result.content.includes('subdir/'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('should default to cwd when no path given', async () => {
    const dir = createTempDir();
    try {
      writeFileSync(join(dir, 'test.txt'), 'data', 'utf-8');

      const localCtx: ToolContext = { ...ctx, cwd: dir };
      const result = await lsTool.execute({}, localCtx);
      assert.equal(result.isError, undefined);
      assert.ok(result.content.includes('test.txt'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('should error on nonexistent directory', async () => {
    const result = await lsTool.execute(
      { path: join(tmpdir(), `nonexistent-${randomUUID()}`) },
      ctx,
    );
    assert.equal(result.isError, true);
  });

  it('should show directory entries with trailing slash', async () => {
    const dir = createTempDir();
    try {
      mkdirSync(join(dir, 'mydir'));

      const result = await lsTool.execute({ path: dir }, ctx);
      assert.ok(result.content.includes('mydir/'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('should have safe permission level', () => {
    assert.equal(lsTool.permissionLevel, 'safe');
  });

  it('should block listing sensitive directories', async () => {
    const home = homedir();
    const result = await lsTool.execute({ path: join(home, '.ssh') }, ctx);
    assert.equal(result.isError, true);
    assert.ok(result.content.includes('sensitive'));
  });

  it('should block path traversal outside allowed dirs', async () => {
    const result = await lsTool.execute({ path: '/etc' }, ctx);
    assert.equal(result.isError, true);
    assert.ok(result.content.includes('blocked') || result.content.includes('denied') || result.content.includes('outside'));
  });
});
