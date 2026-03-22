import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterSuggestions } from './SlashSuggestions.js';
import type { SlashSuggestion } from './SlashSuggestions.js';

const commands: SlashSuggestion[] = [
  { name: '/help', description: 'Show help' },
  { name: '/clear', description: 'Clear history' },
  { name: '/compress', description: 'Compress context' },
  { name: '/config', description: 'Show config' },
  { name: '/cost', description: 'Show costs' },
  { name: '/context', description: 'Show context usage' },
  { name: '/check', description: 'Check health' },
  { name: '/quit', description: 'Exit' },
];

describe('filterSuggestions', () => {
  it('should return empty for non-slash input', () => {
    assert.deepStrictEqual(filterSuggestions('hello', commands), []);
  });

  it('should return all commands for just "/"', () => {
    const result = filterSuggestions('/', commands);
    assert.strictEqual(result.length, commands.length);
  });

  it('should filter by prefix', () => {
    const result = filterSuggestions('/co', commands);
    const names = result.map((s) => s.name);
    assert.ok(names.includes('/compress'));
    assert.ok(names.includes('/config'));
    assert.ok(names.includes('/cost'));
    assert.ok(names.includes('/context'));
    assert.ok(!names.includes('/help'));
    assert.ok(!names.includes('/clear'));
  });

  it('should return exact match', () => {
    const result = filterSuggestions('/help', commands);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, '/help');
  });

  it('should be case-insensitive', () => {
    const result = filterSuggestions('/HELP', commands);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, '/help');
  });

  it('should return empty for no matches', () => {
    const result = filterSuggestions('/xyz', commands);
    assert.strictEqual(result.length, 0);
  });

  it('should return empty for empty input', () => {
    const result = filterSuggestions('', commands);
    assert.strictEqual(result.length, 0);
  });
});
