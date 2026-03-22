import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { CheckpointStore } from './store.js';
import { rewindToCheckpoint, formatCheckpointList } from './rewind.js';

describe('rewindToCheckpoint', () => {
  let store: CheckpointStore;
  let tmpDir: string;

  beforeEach(() => {
    store = new CheckpointStore();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rewind-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('restores a file to its previous content', () => {
    const filePath = path.join(tmpDir, 'a.txt');
    fs.writeFileSync(filePath, 'modified', 'utf-8');
    store.capture('Edit', filePath, 'original', 'modified');

    const result = rewindToCheckpoint(store, 1);
    assert.equal(fs.readFileSync(filePath, 'utf-8'), 'original');
    assert.deepEqual(result.restoredFiles, [filePath]);
    assert.equal(result.checkpointsRewound, 1);
  });

  it('deletes a file if beforeContent was null (new file)', () => {
    const filePath = path.join(tmpDir, 'new.txt');
    fs.writeFileSync(filePath, 'content', 'utf-8');
    store.capture('Write', filePath, null, 'content');

    rewindToCheckpoint(store, 1);
    assert.equal(fs.existsSync(filePath), false);
  });

  it('restores multiple files from multiple checkpoints', () => {
    const fileA = path.join(tmpDir, 'a.txt');
    const fileB = path.join(tmpDir, 'b.txt');
    fs.writeFileSync(fileA, 'a-v2', 'utf-8');
    fs.writeFileSync(fileB, 'b-v2', 'utf-8');

    store.capture('Edit', fileA, 'a-v1', 'a-v2');
    store.capture('Edit', fileB, 'b-v1', 'b-v2');

    const result = rewindToCheckpoint(store, 1);
    assert.equal(fs.readFileSync(fileA, 'utf-8'), 'a-v1');
    assert.equal(fs.readFileSync(fileB, 'utf-8'), 'b-v1');
    assert.equal(result.checkpointsRewound, 2);
    assert.equal(result.restoredFiles.length, 2);
  });

  it('restores same file to earliest checkpoint state only', () => {
    const filePath = path.join(tmpDir, 'x.txt');
    fs.writeFileSync(filePath, 'v3', 'utf-8');

    store.capture('Edit', filePath, 'v1', 'v2');
    store.capture('Edit', filePath, 'v2', 'v3');

    const result = rewindToCheckpoint(store, 1);
    // Should restore to v1 (the beforeContent of the first checkpoint)
    assert.equal(fs.readFileSync(filePath, 'utf-8'), 'v1');
    assert.equal(result.restoredFiles.length, 1); // deduplicated
  });

  it('does not restore files when restoreCode is false', () => {
    const filePath = path.join(tmpDir, 'skip.txt');
    fs.writeFileSync(filePath, 'modified', 'utf-8');
    store.capture('Edit', filePath, 'original', 'modified');

    const result = rewindToCheckpoint(store, 1, { restoreCode: false });
    assert.equal(fs.readFileSync(filePath, 'utf-8'), 'modified');
    assert.deepEqual(result.restoredFiles, []);
    assert.equal(result.checkpointsRewound, 1);
  });

  it('handles rewind when file was already deleted', () => {
    const filePath = path.join(tmpDir, 'gone.txt');
    // File doesn't exist on disk but checkpoint says it was new
    store.capture('Write', filePath, null, 'content');

    // Should not throw
    const result = rewindToCheckpoint(store, 1);
    assert.equal(result.checkpointsRewound, 1);
  });
});

describe('formatCheckpointList', () => {
  it('returns message when no checkpoints', () => {
    assert.equal(formatCheckpointList([]), 'No checkpoints in this session.');
  });

  it('formats checkpoints as list', () => {
    const checkpoints = [
      { id: 1, timestamp: new Date('2026-01-01T10:00:00').getTime(), toolName: 'Edit', filePath: '/a.ts', beforeContent: 'old', afterContent: 'new' },
      { id: 2, timestamp: new Date('2026-01-01T10:05:00').getTime(), toolName: 'Write', filePath: '/b.ts', beforeContent: null, afterContent: 'content' },
    ];
    const output = formatCheckpointList(checkpoints);
    assert.ok(output.includes('[1]'));
    assert.ok(output.includes('[2]'));
    assert.ok(output.includes('Edit /a.ts'));
    assert.ok(output.includes('Write /b.ts'));
  });
});
