import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { globTool } from './glob.js';
import { grepTool } from './grep.js';
import type { ToolContext } from '../types.js';

const tmpDir = join(tmpdir(), `glob-test-${randomUUID()}`);

const ctx: ToolContext = {
  cwd: tmpDir,
  config: { provider: 'cursor' } as any,
  promptUser: async () => ({ allowed: true }),
};

describe('globTool', () => {
  before(() => {
    mkdirSync(join(tmpDir, 'sub'), { recursive: true });
    writeFileSync(join(tmpDir, 'foo.ts'), 'hello world\n', 'utf-8');
    writeFileSync(join(tmpDir, 'bar.js'), 'console.log("hi")\n', 'utf-8');
    writeFileSync(join(tmpDir, 'sub', 'baz.ts'), 'export const x = 1;\n', 'utf-8');
  });

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should find files matching pattern', async () => {
    const result = await globTool.execute({ pattern: '**/*.ts' }, ctx);
    assert.equal(result.isError, undefined);
    const lines = result.content.split('\n').filter((l) => l.length > 0);
    assert.equal(lines.length, 2);
    const normalized = lines.map((l) => l.replace(/\\/g, '/'));
    assert.ok(normalized.some((l) => l.includes('foo.ts')));
    assert.ok(normalized.some((l) => l.includes('sub/baz.ts')));
  });

  it('should return no matches message', async () => {
    const result = await globTool.execute({ pattern: '**/*.xyz' }, ctx);
    assert.equal(result.content, '(no matches)');
  });

  it('should have safe permission level', () => {
    assert.equal(globTool.permissionLevel, 'safe');
  });
});

describe('grepTool', () => {
  before(() => {
    mkdirSync(join(tmpDir, 'sub'), { recursive: true });
    writeFileSync(join(tmpDir, 'foo.ts'), 'hello world\n', 'utf-8');
    writeFileSync(join(tmpDir, 'bar.js'), 'console.log("hi")\n', 'utf-8');
    writeFileSync(join(tmpDir, 'sub', 'baz.ts'), 'export const x = 1;\n', 'utf-8');
  });

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should search file content with grep', async () => {
    const result = await grepTool.execute({ pattern: 'hello' }, ctx);
    assert.equal(result.isError, undefined);
    const lines = result.content.split('\n').filter((l) => l.length > 0);
    assert.equal(lines.length, 1);
    const normalized = lines[0].replace(/\\/g, '/');
    assert.ok(normalized.includes('foo.ts'));
  });

  it('should return content mode output', async () => {
    const result = await grepTool.execute(
      { pattern: 'hello', output_mode: 'content' },
      ctx,
    );
    assert.equal(result.isError, undefined);
    const lines = result.content.split('\n').filter((l) => l.length > 0);
    assert.equal(lines.length, 1);
    // Format: <file>:<line>:<content>
    // Use regex to handle Windows paths that contain ':'
    const match = lines[0].match(/^(.+):(\d+):(.+)$/);
    assert.ok(match, 'output should match <file>:<line>:<content> format');
    assert.ok(match![1].includes('foo.ts'));
    assert.equal(match![2], '1');
    assert.ok(match![3].includes('hello world'));
  });
});
