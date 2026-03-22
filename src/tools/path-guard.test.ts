import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { guardPath } from './path-guard.js';

describe('guardPath', () => {
  const cwd = path.resolve('/projects/myapp');

  it('allows a relative path within cwd', () => {
    const result = guardPath('src/index.ts', cwd);
    assert.strictEqual(result, path.resolve(cwd, 'src/index.ts'));
  });

  it('allows an absolute path within cwd', () => {
    const abs = path.join(cwd, 'src', 'foo.ts');
    const result = guardPath(abs, cwd);
    assert.strictEqual(result, abs);
  });

  it('allows a path within the home directory', () => {
    const home = os.homedir();
    const homeFile = path.join(home, '.config', 'settings.json');
    const result = guardPath(homeFile, cwd);
    assert.strictEqual(result, homeFile);
  });

  it('allows a path within the temp directory', () => {
    const tmpFile = path.join(os.tmpdir(), 'scratch.txt');
    const result = guardPath(tmpFile, cwd);
    assert.strictEqual(result, tmpFile);
  });

  it('blocks traversal outside allowed directories', () => {
    // Attempt to escape to an unrelated directory
    assert.throws(
      () => guardPath('/etc/passwd', cwd),
      (err: Error) => {
        assert.match(err.message, /Path traversal blocked/);
        return true;
      },
    );
  });

  it('blocks relative traversal that escapes cwd', () => {
    assert.throws(
      () => guardPath('../../etc/passwd', cwd),
      (err: Error) => {
        assert.match(err.message, /Path traversal blocked/);
        return true;
      },
    );
  });

  it('allows cwd itself', () => {
    const result = guardPath('.', cwd);
    assert.strictEqual(result, cwd);
  });
});
