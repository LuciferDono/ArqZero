import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { WorktreeManager } from './manager.js';

function initTempRepo(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'arq-wt-test-'));
  spawnSync('git', ['init', '-b', 'main'], { cwd: dir });
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir });
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  // Need at least one commit for worktrees to work
  spawnSync('git', ['commit', '--allow-empty', '-m', 'init'], { cwd: dir });
  return dir;
}

describe('WorktreeManager', () => {
  let repoRoot: string;
  let manager: WorktreeManager;

  beforeEach(() => {
    repoRoot = initTempRepo();
    manager = new WorktreeManager(repoRoot);
  });

  afterEach(() => {
    // Clean up worktrees first, then the repo
    try {
      const worktrees = manager.list();
      for (const wt of worktrees) {
        if (wt.path !== repoRoot) {
          manager.remove(wt.name);
        }
      }
    } catch {
      // ignore
    }
    // Clean up the worktrees sibling directory
    const worktreeDir = path.join(path.dirname(repoRoot), 'arqzero-worktrees');
    rmSync(worktreeDir, { recursive: true, force: true });
    rmSync(repoRoot, { recursive: true, force: true });
  });

  describe('getPath', () => {
    it('should return the worktree path relative to repo parent', () => {
      const wtPath = manager.getPath('feature-auth');
      const expected = path.join(path.dirname(repoRoot), 'arqzero-worktrees', 'feature-auth');
      assert.equal(wtPath, expected);
    });
  });

  describe('list', () => {
    it('should return at least the main worktree', () => {
      const worktrees = manager.list();
      assert.ok(worktrees.length >= 1);
      // The main worktree should have the repo root path
      const main = worktrees.find(w => path.resolve(w.path) === path.resolve(repoRoot));
      assert.ok(main, 'main worktree should be listed');
    });
  });

  describe('exists', () => {
    it('should return false for a non-existent worktree', () => {
      assert.equal(manager.exists('nonexistent'), false);
    });
  });

  describe('create', () => {
    it('should create a new worktree with the correct branch', () => {
      const info = manager.create('test-wt');
      assert.equal(info.name, 'test-wt');
      assert.equal(info.branch, 'arqzero/test-wt');
      assert.equal(path.resolve(info.path), path.resolve(manager.getPath('test-wt')));
    });

    it('should make the worktree appear in list', () => {
      manager.create('test-wt');
      assert.equal(manager.exists('test-wt'), true);
    });

    it('should throw if worktree already exists', () => {
      manager.create('test-wt');
      assert.throws(() => manager.create('test-wt'), /already exists/i);
    });
  });

  describe('remove', () => {
    it('should remove an existing worktree', () => {
      manager.create('to-remove');
      assert.equal(manager.exists('to-remove'), true);

      manager.remove('to-remove');
      assert.equal(manager.exists('to-remove'), false);
    });

    it('should throw if worktree does not exist', () => {
      assert.throws(() => manager.remove('nonexistent'), /does not exist|not found/i);
    });
  });
});
