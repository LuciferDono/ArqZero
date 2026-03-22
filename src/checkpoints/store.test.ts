import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CheckpointStore } from './store.js';

describe('CheckpointStore', () => {
  let store: CheckpointStore;

  beforeEach(() => {
    store = new CheckpointStore();
  });

  describe('capture', () => {
    it('creates a checkpoint with incrementing id', () => {
      const cp1 = store.capture('Edit', '/a.ts', 'old', 'new');
      const cp2 = store.capture('Write', '/b.ts', null, 'content');
      assert.equal(cp1.id, 1);
      assert.equal(cp2.id, 2);
    });

    it('stores all provided fields', () => {
      const cp = store.capture('Edit', '/file.ts', 'before', 'after', 'fix bug');
      assert.equal(cp.toolName, 'Edit');
      assert.equal(cp.filePath, '/file.ts');
      assert.equal(cp.beforeContent, 'before');
      assert.equal(cp.afterContent, 'after');
      assert.equal(cp.promptText, 'fix bug');
      assert.equal(typeof cp.timestamp, 'number');
    });

    it('allows null beforeContent for new files', () => {
      const cp = store.capture('Write', '/new.ts', null, 'content');
      assert.equal(cp.beforeContent, null);
    });
  });

  describe('getAll', () => {
    it('returns empty array initially', () => {
      assert.deepEqual(store.getAll(), []);
    });

    it('returns all captured checkpoints', () => {
      store.capture('Edit', '/a.ts', 'old', 'new');
      store.capture('Write', '/b.ts', null, 'content');
      const all = store.getAll();
      assert.equal(all.length, 2);
    });

    it('returns a copy (not the internal array)', () => {
      store.capture('Edit', '/a.ts', 'old', 'new');
      const all = store.getAll();
      all.pop();
      assert.equal(store.getAll().length, 1);
    });
  });

  describe('getById', () => {
    it('returns the checkpoint with matching id', () => {
      store.capture('Edit', '/a.ts', 'old', 'new');
      const cp2 = store.capture('Write', '/b.ts', null, 'content');
      assert.deepEqual(store.getById(2), cp2);
    });

    it('returns undefined for non-existent id', () => {
      assert.equal(store.getById(999), undefined);
    });
  });

  describe('getAfter', () => {
    it('returns checkpoints from the given id onward', () => {
      store.capture('Edit', '/a.ts', 'old', 'new');
      store.capture('Write', '/b.ts', null, 'b');
      store.capture('Edit', '/c.ts', 'x', 'y');
      const after = store.getAfter(2);
      assert.equal(after.length, 2);
      assert.equal(after[0].id, 2);
      assert.equal(after[1].id, 3);
    });

    it('returns empty array for non-existent id', () => {
      store.capture('Edit', '/a.ts', 'old', 'new');
      assert.deepEqual(store.getAfter(999), []);
    });
  });

  describe('clear', () => {
    it('removes all checkpoints and resets id counter', () => {
      store.capture('Edit', '/a.ts', 'old', 'new');
      store.capture('Write', '/b.ts', null, 'content');
      store.clear();
      assert.deepEqual(store.getAll(), []);
      const cp = store.capture('Edit', '/c.ts', 'x', 'y');
      assert.equal(cp.id, 1);
    });
  });
});
