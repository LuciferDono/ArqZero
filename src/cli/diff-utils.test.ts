// src/cli/diff-utils.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { wordDiff, generateDiffLines, generateSimpleDiffLines } from './diff-utils.js';
import type { DiffSegment, DiffLine } from './diff-utils.js';

describe('wordDiff', () => {
  it('returns all same segments for identical lines', () => {
    const result = wordDiff('hello world', 'hello world');
    assert.deepStrictEqual(result, [{ text: 'hello world', type: 'same' }]);
  });

  it('detects a single changed word', () => {
    const result = wordDiff('the quick fox', 'the slow fox');
    const types = result.map(s => s.type);
    assert.ok(types.includes('removed'), 'should have removed segment');
    assert.ok(types.includes('added'), 'should have added segment');
    // The changed word should be 'quick' removed and 'slow' added
    const removed = result.filter(s => s.type === 'removed').map(s => s.text.trim());
    const added = result.filter(s => s.type === 'added').map(s => s.text.trim());
    assert.ok(removed.some(t => t === 'quick'), `expected 'quick' in removed, got ${JSON.stringify(removed)}`);
    assert.ok(added.some(t => t === 'slow'), `expected 'slow' in added, got ${JSON.stringify(added)}`);
  });

  it('handles completely different lines', () => {
    const result = wordDiff('aaa bbb', 'xxx yyy');
    const hasRemoved = result.some(s => s.type === 'removed');
    const hasAdded = result.some(s => s.type === 'added');
    assert.ok(hasRemoved);
    assert.ok(hasAdded);
  });

  it('handles added words at end', () => {
    const result = wordDiff('hello', 'hello world');
    const addedText = result.filter(s => s.type === 'added').map(s => s.text.trim()).join(' ');
    assert.ok(addedText.includes('world'));
  });

  it('handles removed words at end', () => {
    const result = wordDiff('hello world', 'hello');
    const removedText = result.filter(s => s.type === 'removed').map(s => s.text.trim()).join(' ');
    assert.ok(removedText.includes('world'));
  });

  it('handles empty old line', () => {
    const result = wordDiff('', 'new content');
    assert.ok(result.some(s => s.type === 'added'));
  });

  it('handles empty new line', () => {
    const result = wordDiff('old content', '');
    assert.ok(result.some(s => s.type === 'removed'));
  });

  it('handles both empty', () => {
    const result = wordDiff('', '');
    assert.deepStrictEqual(result, []);
  });
});

describe('generateDiffLines', () => {
  it('returns empty array for identical content', () => {
    const result = generateDiffLines('hello\nworld', 'hello\nworld');
    // All context lines, but with no changes they get filtered out
    const changes = result.filter(l => l.type !== 'context');
    assert.strictEqual(changes.length, 0);
  });

  it('detects added lines', () => {
    const result = generateDiffLines('line1\nline3', 'line1\nline2\nline3');
    const added = result.filter(l => l.type === 'added');
    assert.strictEqual(added.length, 1);
    assert.strictEqual(added[0]!.content, 'line2');
  });

  it('detects removed lines', () => {
    const result = generateDiffLines('line1\nline2\nline3', 'line1\nline3');
    const removed = result.filter(l => l.type === 'removed');
    assert.strictEqual(removed.length, 1);
    assert.strictEqual(removed[0]!.content, 'line2');
  });

  it('detects modified lines with word-level segments', () => {
    const result = generateDiffLines('the quick fox', 'the slow fox');
    const removed = result.filter(l => l.type === 'removed');
    const added = result.filter(l => l.type === 'added');
    assert.strictEqual(removed.length, 1);
    assert.strictEqual(added.length, 1);
    // Should have word-level segments since they are paired
    assert.ok(removed[0]!.segments, 'removed line should have word-level segments');
    assert.ok(added[0]!.segments, 'added line should have word-level segments');
  });

  it('includes context lines around changes', () => {
    const old = 'a\nb\nc\nd\ne\nf\ng\nh\ni\nj';
    const nw = 'a\nb\nc\nd\nX\nf\ng\nh\ni\nj';
    const result = generateDiffLines(old, nw, 2);
    // Should include context around the change at line 5
    const contextLines = result.filter(l => l.type === 'context');
    assert.ok(contextLines.length > 0, 'should have context lines');
    assert.ok(contextLines.length <= 4, 'should have limited context');
  });

  it('handles empty old content (new file)', () => {
    const result = generateDiffLines('', 'line1\nline2');
    const added = result.filter(l => l.type === 'added');
    assert.ok(added.length >= 1);
  });

  it('handles empty new content (deleted file)', () => {
    const result = generateDiffLines('line1\nline2', '');
    const removed = result.filter(l => l.type === 'removed');
    assert.ok(removed.length >= 1);
  });

  it('handles multiline additions and removals', () => {
    const old = 'first\nsecond\nthird';
    const nw = 'first\nalpha\nbeta\nthird';
    const result = generateDiffLines(old, nw);
    const removed = result.filter(l => l.type === 'removed');
    const added = result.filter(l => l.type === 'added');
    assert.strictEqual(removed.length, 1); // 'second' removed
    assert.ok(added.length >= 1); // 'alpha' and/or 'beta' added
  });
});

describe('generateSimpleDiffLines', () => {
  it('produces prefixed string lines', () => {
    const result = generateSimpleDiffLines('aaa\nbbb', 'aaa\nccc');
    assert.ok(result.some(l => l.startsWith('- ')));
    assert.ok(result.some(l => l.startsWith('+ ')));
  });

  it('returns empty for identical content', () => {
    const result = generateSimpleDiffLines('same', 'same');
    const changes = result.filter(l => !l.startsWith('  '));
    assert.strictEqual(changes.length, 0);
  });
});
