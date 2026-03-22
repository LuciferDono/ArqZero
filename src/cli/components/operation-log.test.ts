import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { groupConsecutiveTools } from './OperationLog.js';
import type { OperationEntryData } from './OperationEntry.js';
import type { GroupedEntry } from './OperationLog.js';

describe('groupConsecutiveTools', () => {
  it('should return empty array for empty input', () => {
    assert.deepEqual(groupConsecutiveTools([]), []);
  });

  it('should not group single tool entries', () => {
    const entries: OperationEntryData[] = [
      { type: 'tool', content: 'src/foo.ts', toolName: 'Read', elapsed: 100 },
    ];
    const result = groupConsecutiveTools(entries);
    assert.equal(result.length, 1);
    assert.equal(result[0].type, 'tool');
  });

  it('should group consecutive entries with the same tool name', () => {
    const entries: OperationEntryData[] = [
      { type: 'tool', content: 'src/foo.ts', toolName: 'Read', elapsed: 100 },
      { type: 'tool', content: 'src/bar.ts', toolName: 'Read', elapsed: 200 },
      { type: 'tool', content: 'src/baz.ts', toolName: 'Read', elapsed: 300 },
    ];
    const result = groupConsecutiveTools(entries);
    assert.equal(result.length, 1);
    const group = result[0] as GroupedEntry;
    assert.equal(group.type, 'grouped');
    assert.equal(group.toolName, 'Read');
    assert.equal(group.entries.length, 3);
    assert.equal(group.totalElapsed, 600);
  });

  it('should not group non-consecutive entries with the same tool name', () => {
    const entries: OperationEntryData[] = [
      { type: 'tool', content: 'src/foo.ts', toolName: 'Read', elapsed: 100 },
      { type: 'text', content: 'some text' },
      { type: 'tool', content: 'src/bar.ts', toolName: 'Read', elapsed: 200 },
    ];
    const result = groupConsecutiveTools(entries);
    assert.equal(result.length, 3);
    assert.equal(result[0].type, 'tool');
    assert.equal(result[1].type, 'text');
    assert.equal(result[2].type, 'tool');
  });

  it('should not group consecutive entries with different tool names', () => {
    const entries: OperationEntryData[] = [
      { type: 'tool', content: 'src/foo.ts', toolName: 'Read', elapsed: 100 },
      { type: 'tool', content: 'npm test', toolName: 'Bash', elapsed: 500 },
    ];
    const result = groupConsecutiveTools(entries);
    assert.equal(result.length, 2);
    assert.equal(result[0].type, 'tool');
    assert.equal(result[1].type, 'tool');
  });

  it('should handle mixed grouped and ungrouped entries', () => {
    const entries: OperationEntryData[] = [
      { type: 'user', content: 'hello' },
      { type: 'tool', content: 'src/a.ts', toolName: 'Read', elapsed: 100 },
      { type: 'tool', content: 'src/b.ts', toolName: 'Read', elapsed: 150 },
      { type: 'text', content: 'analysis' },
      { type: 'tool', content: 'edit result', toolName: 'Edit', elapsed: 200 },
    ];
    const result = groupConsecutiveTools(entries);
    assert.equal(result.length, 4);
    assert.equal(result[0].type, 'user');
    assert.equal((result[1] as GroupedEntry).type, 'grouped');
    assert.equal((result[1] as GroupedEntry).entries.length, 2);
    assert.equal((result[1] as GroupedEntry).totalElapsed, 250);
    assert.equal(result[2].type, 'text');
    assert.equal(result[3].type, 'tool');
  });

  it('should handle entries without elapsed times', () => {
    const entries: OperationEntryData[] = [
      { type: 'tool', content: 'a', toolName: 'Grep' },
      { type: 'tool', content: 'b', toolName: 'Grep' },
    ];
    const result = groupConsecutiveTools(entries);
    assert.equal(result.length, 1);
    const group = result[0] as GroupedEntry;
    assert.equal(group.totalElapsed, 0);
  });
});
