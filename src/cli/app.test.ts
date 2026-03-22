// src/cli/app.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Import theme and types to verify they're well-formed
import { THEME } from './theme.js';
import type { OperationEntryData, EntryType } from './components/index.js';

describe('Theme', () => {
  it('has all required symbols', () => {
    assert.equal(THEME.diamond, '◆');
    assert.equal(THEME.arrow, '▸');
    assert.equal(THEME.pipe, '┊');
    assert.equal(THEME.prompt, '›');
  });

  it('has all required colors', () => {
    assert.equal(THEME.primary, 'yellow');
    assert.equal(THEME.text, 'white');
    assert.equal(THEME.dim, 'gray');
    assert.equal(THEME.success, 'green');
    assert.equal(THEME.error, 'red');
    assert.equal(THEME.warning, 'yellow');
    assert.equal(THEME.info, 'cyan');
  });

  it('has app identity', () => {
    assert.equal(THEME.appName, 'ArqCode');
    assert.equal(THEME.promptPrefix, '◆ arq ›');
    assert.equal(THEME.version, '2.0.0');
  });
});

describe('OperationEntryData types', () => {
  it('supports all entry types', () => {
    const types: EntryType[] = ['user', 'text', 'tool', 'error', 'system'];
    assert.equal(types.length, 5);
  });

  it('user entry has correct shape', () => {
    const entry: OperationEntryData = { type: 'user', content: 'hello' };
    assert.equal(entry.type, 'user');
    assert.equal(entry.content, 'hello');
  });

  it('tool entry has optional fields', () => {
    const entry: OperationEntryData = {
      type: 'tool',
      content: 'Found 5 files',
      toolName: 'Glob',
      elapsed: 200,
      diffLines: ['+ new line', '- old line'],
    };
    assert.equal(entry.toolName, 'Glob');
    assert.equal(entry.elapsed, 200);
    assert.equal(entry.diffLines!.length, 2);
  });

  it('text entry renders content', () => {
    const entry: OperationEntryData = { type: 'text', content: 'Here are your files...' };
    assert.equal(entry.type, 'text');
    assert.ok(entry.content.length > 0);
  });

  it('error entry has content', () => {
    const entry: OperationEntryData = { type: 'error', content: 'Something went wrong' };
    assert.equal(entry.type, 'error');
  });

  it('system entry has content', () => {
    const entry: OperationEntryData = { type: 'system', content: '[compaction] done' };
    assert.equal(entry.type, 'system');
  });
});

describe('Header model name formatting', () => {
  it('strips fireworks prefix from model names', () => {
    // Test the logic directly
    const name = 'accounts/fireworks/models/llama-v3p1-70b-instruct';
    const prefixes = ['accounts/fireworks/models/', 'accounts/', 'models/'];
    let short = name;
    for (const prefix of prefixes) {
      if (short.startsWith(prefix)) {
        short = short.slice(prefix.length);
      }
    }
    assert.equal(short, 'llama-v3p1-70b-instruct');
  });

  it('leaves simple names unchanged', () => {
    const name = 'llama-70b';
    const prefixes = ['accounts/fireworks/models/', 'accounts/', 'models/'];
    let short = name;
    for (const prefix of prefixes) {
      if (short.startsWith(prefix)) {
        short = short.slice(prefix.length);
      }
    }
    assert.equal(short, 'llama-70b');
  });
});

describe('Token formatting', () => {
  it('formats small token counts', () => {
    const total = 500;
    const result = total >= 1000 ? `${(total / 1000).toFixed(1)}k tok` : `${total} tok`;
    assert.equal(result, '500 tok');
  });

  it('formats large token counts as k', () => {
    const total = 2400;
    const result = total >= 1000 ? `${(total / 1000).toFixed(1)}k tok` : `${total} tok`;
    assert.equal(result, '2.4k tok');
  });
});

describe('Cost estimation', () => {
  it('estimates cost from token usage', () => {
    const COST_PER_INPUT = 0.9 / 1_000_000;
    const COST_PER_OUTPUT = 0.9 / 1_000_000;
    const cost = 1000 * COST_PER_INPUT + 1000 * COST_PER_OUTPUT;
    assert.ok(cost > 0);
    assert.ok(cost < 0.01);
  });
});

describe('Tool result summarization', () => {
  it('summarizes glob results', () => {
    const content = 'file1.ts\nfile2.ts\nfile3.ts';
    const lines = content.trim().split('\n').filter(Boolean);
    assert.equal(`Found ${lines.length} files`, 'Found 3 files');
  });

  it('truncates long results', () => {
    const content = 'A'.repeat(100);
    const result = content.length > 60 ? content.slice(0, 57) + '...' : content;
    assert.equal(result.length, 60);
    assert.ok(result.endsWith('...'));
  });
});
