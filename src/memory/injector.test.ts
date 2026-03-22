import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MemoryStore } from './store.js';
import { injectMemories } from './injector.js';

describe('injectMemories', () => {
  let tmpDir: string;
  let store: MemoryStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arqzero-inject-'));
    store = new MemoryStore(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('appends persistent memory section to system prompt', () => {
    store.save({ name: 'rule-1', description: 'desc', type: 'user', content: 'Always use ESM.' });
    const result = injectMemories('Base prompt.', store);
    assert.ok(result.includes('Base prompt.'));
    assert.ok(result.includes('## Persistent Memory'));
    assert.ok(result.includes('rule-1'));
  });

  it('returns original prompt when no memories exist', () => {
    const result = injectMemories('Base prompt.', store);
    assert.equal(result, 'Base prompt.');
  });

  it('respects token budget', () => {
    // Create a memory with very long content
    const longContent = 'x'.repeat(10000);
    store.save({ name: 'big', description: 'large memory', type: 'user', content: longContent });

    // Budget of 100 tokens ~ 400 chars
    const result = injectMemories('Base.', store, 100);
    // The result should be truncated — total added content under budget
    const addedLength = result.length - 'Base.'.length;
    assert.ok(addedLength <= 400 + 100); // some slack for headers
  });

  it('includes index content in the injection', () => {
    store.save({ name: 'mem-a', description: 'first', type: 'feedback', content: 'content-a' });
    store.save({ name: 'mem-b', description: 'second', type: 'project', content: 'content-b' });

    const result = injectMemories('Prompt.', store);
    assert.ok(result.includes('mem-a'));
    assert.ok(result.includes('mem-b'));
  });
});
