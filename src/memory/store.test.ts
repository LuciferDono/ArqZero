import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MemoryStore } from './store.js';

describe('MemoryStore', () => {
  let tmpDir: string;
  let store: MemoryStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arqzero-memory-'));
    store = new MemoryStore(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('save', () => {
    it('creates a markdown file with YAML frontmatter', () => {
      const filePath = store.save({
        name: 'test-memory',
        description: 'A test memory',
        type: 'user',
        content: 'This is the content.',
      });

      assert.ok(fs.existsSync(filePath));
      const raw = fs.readFileSync(filePath, 'utf-8');
      assert.ok(raw.includes('---'));
      assert.ok(raw.includes('name: test-memory'));
      assert.ok(raw.includes('description: A test memory'));
      assert.ok(raw.includes('type: user'));
      assert.ok(raw.includes('This is the content.'));
    });

    it('slugifies the name for the filename', () => {
      const filePath = store.save({
        name: 'My Cool Memory',
        description: 'desc',
        type: 'project',
        content: 'body',
      });

      assert.ok(path.basename(filePath).includes('my-cool-memory'));
    });

    it('updates the MEMORY.md index', () => {
      store.save({
        name: 'indexed-memory',
        description: 'Should appear in index',
        type: 'feedback',
        content: 'content',
      });

      const index = fs.readFileSync(path.join(tmpDir, 'MEMORY.md'), 'utf-8');
      assert.ok(index.includes('indexed-memory'));
      assert.ok(index.includes('Should appear in index'));
    });

    it('creates baseDir if it does not exist', () => {
      const nested = path.join(tmpDir, 'deep', 'nested');
      const nestedStore = new MemoryStore(nested);
      nestedStore.save({
        name: 'deep-memory',
        description: 'deep',
        type: 'user',
        content: 'deep content',
      });

      assert.ok(fs.existsSync(nested));
    });
  });

  describe('load', () => {
    it('returns a stored memory by name', () => {
      store.save({
        name: 'find-me',
        description: 'desc',
        type: 'reference',
        content: 'Found!',
      });

      const mem = store.load('find-me');
      assert.ok(mem);
      assert.equal(mem.name, 'find-me');
      assert.equal(mem.type, 'reference');
      assert.equal(mem.content, 'Found!');
    });

    it('returns null for non-existent memory', () => {
      assert.equal(store.load('nope'), null);
    });
  });

  describe('loadAll', () => {
    it('returns all stored memories', () => {
      store.save({ name: 'a', description: 'da', type: 'user', content: 'ca' });
      store.save({ name: 'b', description: 'db', type: 'feedback', content: 'cb' });

      const all = store.loadAll();
      assert.equal(all.length, 2);
      const names = all.map((m) => m.name).sort();
      assert.deepEqual(names, ['a', 'b']);
    });

    it('excludes MEMORY.md from results', () => {
      store.save({ name: 'x', description: 'd', type: 'user', content: 'c' });
      const all = store.loadAll();
      assert.ok(all.every((m) => !m.filePath.endsWith('MEMORY.md')));
    });

    it('returns empty array when no memories exist', () => {
      assert.deepEqual(store.loadAll(), []);
    });
  });

  describe('remove', () => {
    it('deletes the memory file and returns true', () => {
      const filePath = store.save({
        name: 'remove-me',
        description: 'will be removed',
        type: 'user',
        content: 'bye',
      });

      const result = store.remove('remove-me');
      assert.equal(result, true);
      assert.ok(!fs.existsSync(filePath));
    });

    it('updates the index after removal', () => {
      store.save({ name: 'keep', description: 'keep-desc', type: 'user', content: 'c' });
      store.save({ name: 'drop', description: 'drop-desc', type: 'user', content: 'c' });
      store.remove('drop');

      const index = fs.readFileSync(path.join(tmpDir, 'MEMORY.md'), 'utf-8');
      assert.ok(index.includes('keep'));
      assert.ok(!index.includes('drop'));
    });

    it('returns false for non-existent memory', () => {
      assert.equal(store.remove('ghost'), false);
    });
  });

  describe('search', () => {
    it('matches on name', () => {
      store.save({ name: 'typescript-rules', description: 'desc', type: 'user', content: 'c' });
      store.save({ name: 'python-rules', description: 'desc', type: 'user', content: 'c' });

      const results = store.search('typescript');
      assert.equal(results.length, 1);
      assert.equal(results[0].name, 'typescript-rules');
    });

    it('matches on description', () => {
      store.save({ name: 'a', description: 'ESM module patterns', type: 'project', content: 'c' });
      store.save({ name: 'b', description: 'CJS patterns', type: 'project', content: 'c' });

      const results = store.search('ESM');
      assert.equal(results.length, 1);
      assert.equal(results[0].name, 'a');
    });

    it('is case-insensitive', () => {
      store.save({ name: 'Zod-Tips', description: 'desc', type: 'user', content: 'c' });
      const results = store.search('zod');
      assert.equal(results.length, 1);
    });

    it('returns empty array for no match', () => {
      store.save({ name: 'a', description: 'd', type: 'user', content: 'c' });
      assert.deepEqual(store.search('zzzzz'), []);
    });
  });

  describe('getIndex', () => {
    it('returns MEMORY.md content', () => {
      store.save({ name: 'idx', description: 'in index', type: 'user', content: 'c' });
      const index = store.getIndex();
      assert.ok(index.includes('idx'));
      assert.ok(index.includes('in index'));
    });

    it('returns empty string when no memories exist', () => {
      assert.equal(store.getIndex(), '');
    });
  });
});
