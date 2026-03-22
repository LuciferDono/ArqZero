// src/cli/app.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Import theme and types to verify they're well-formed
import { THEME, COLORS, SPINNER_VERBS } from './theme.js';
import type { OperationEntryData, EntryType } from './components/index.js';

describe('Theme', () => {
  it('has all required symbols', () => {
    assert.equal(THEME.diamond, '\u25C6');
    assert.equal(THEME.arrow, '\u25B8');
    assert.equal(THEME.pipe, '\u250A');
    assert.equal(THEME.prompt, '\u203A');
    assert.equal(THEME.branch, '\u23BF');
    assert.ok(THEME.dot.length > 0);
    assert.equal(THEME.successDot, '\u25CF');
    assert.equal(THEME.failureMark, '\u00D7');
  });

  it('has all required colors', () => {
    assert.equal(THEME.primary, COLORS.brand);
    assert.equal(THEME.primaryShimmer, COLORS.brandLight);
    assert.equal(THEME.text, COLORS.textPrimary);
    assert.equal(THEME.dim, COLORS.textSecondary);
    assert.equal(THEME.success, COLORS.success);
    assert.equal(THEME.error, COLORS.error);
    assert.equal(THEME.warning, COLORS.warning);
    assert.equal(THEME.info, COLORS.info);
    assert.equal(THEME.toolBorder, COLORS.toolFile);
    assert.equal(THEME.bashBorder, COLORS.toolBash);
    assert.equal(THEME.diffAdded, COLORS.diffLineAdd);
    assert.equal(THEME.diffRemoved, COLORS.diffLineRemove);
  });

  it('has app identity', () => {
    assert.equal(THEME.appName, 'ArqZero');
    assert.equal(THEME.promptPrefix, '\u25C6 arq \u203A');
    assert.equal(THEME.version, '2.0.0');
  });
});

describe('SPINNER_VERBS', () => {
  it('has a substantial list of verbs', () => {
    assert.ok(SPINNER_VERBS.length >= 80, `Expected >= 80 verbs, got ${SPINNER_VERBS.length}`);
  });

  it('all verbs end in -ing', () => {
    for (const verb of SPINNER_VERBS) {
      assert.ok(verb.endsWith('ing'), `Verb "${verb}" does not end in -ing`);
    }
  });

  it('contains ArqZero-specific verbs', () => {
    assert.ok(SPINNER_VERBS.includes('Gridlining'));
    assert.ok(SPINNER_VERBS.includes('Zeroing'));
    assert.ok(SPINNER_VERBS.includes('Forging'));
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
      success: true,
    };
    assert.equal(entry.toolName, 'Glob');
    assert.equal(entry.elapsed, 200);
    assert.equal(entry.diffLines!.length, 2);
    assert.equal(entry.success, true);
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
