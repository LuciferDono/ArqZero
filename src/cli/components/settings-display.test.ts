// src/cli/components/settings-display.test.ts
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { formatSettingsDisplay, shortModel, pad } from './settings-display.js';
import { runtime, initRuntime } from '../../config/runtime.js';
import type { AppConfig } from '../../config/schema.js';

function makeConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    provider: 'fireworks',
    model: 'accounts/fireworks/models/glm-4p7',
    fireworksApiKey: 'test-key',
    maxTokens: 8192,
    permissions: {
      defaultMode: 'ask',
      alwaysAllow: ['Read', 'Glob', 'Grep'],
      alwaysDeny: [],
      trustedPatterns: {},
    },
    mcpServers: {},
    bash: { defaultTimeout: 30000, maxTimeout: 600000 },
    ...overrides,
  };
}

describe('shortModel', () => {
  it('strips fireworks prefix', () => {
    assert.equal(shortModel('accounts/fireworks/models/glm-4p7'), 'glm-4p7');
  });

  it('returns unchanged for non-prefixed models', () => {
    assert.equal(shortModel('gpt-4'), 'gpt-4');
  });

  it('handles empty string', () => {
    assert.equal(shortModel(''), '');
  });
});

describe('pad', () => {
  it('pads string to given width', () => {
    assert.equal(pad('hi', 5), 'hi   ');
  });

  it('does not truncate longer strings', () => {
    assert.equal(pad('hello world', 3), 'hello world');
  });

  it('handles exact width', () => {
    assert.equal(pad('abc', 3), 'abc');
  });

  it('handles zero width', () => {
    assert.equal(pad('abc', 0), 'abc');
  });
});

describe('formatSettingsDisplay', () => {
  let savedReducedMotion: boolean;
  let savedSyntaxDisabled: boolean;

  beforeEach(() => {
    savedReducedMotion = runtime.reducedMotion;
    savedSyntaxDisabled = runtime.syntaxHighlightingDisabled;
    initRuntime({ reducedMotion: false, syntaxHighlightingDisabled: false });
  });

  afterEach(() => {
    initRuntime({
      reducedMotion: savedReducedMotion,
      syntaxHighlightingDisabled: savedSyntaxDisabled,
    });
  });

  it('includes provider', () => {
    const output = formatSettingsDisplay(makeConfig());
    assert.ok(output.includes('fireworks'));
  });

  it('includes short model name', () => {
    const output = formatSettingsDisplay(makeConfig());
    assert.ok(output.includes('glm-4p7'));
    assert.ok(!output.includes('accounts/fireworks/models/'));
  });

  it('includes max tokens', () => {
    const output = formatSettingsDisplay(makeConfig());
    assert.ok(output.includes('8192'));
  });

  it('includes mode', () => {
    const output = formatSettingsDisplay(makeConfig());
    assert.ok(output.includes('ask'));
  });

  it('includes always allow tools', () => {
    const output = formatSettingsDisplay(makeConfig());
    assert.ok(output.includes('Read, Glob, Grep'));
  });

  it('shows (none) for empty always deny', () => {
    const output = formatSettingsDisplay(makeConfig());
    assert.ok(output.includes('(none)'));
  });

  it('shows always deny tools when present', () => {
    const config = makeConfig({
      permissions: {
        defaultMode: 'ask',
        alwaysAllow: [],
        alwaysDeny: ['Bash', 'Write'],
        trustedPatterns: {},
      },
    });
    const output = formatSettingsDisplay(config);
    assert.ok(output.includes('Bash, Write'));
  });

  it('shows reduced motion status', () => {
    initRuntime({ reducedMotion: true });
    const output = formatSettingsDisplay(makeConfig());
    assert.ok(output.includes('Reduced Motion'));
    assert.ok(output.includes('on'));
  });

  it('shows syntax highlight status', () => {
    initRuntime({ syntaxHighlightingDisabled: true });
    const output = formatSettingsDisplay(makeConfig());
    assert.ok(output.includes('Syntax Highlight'));
    // When disabled, should show 'off'
    const lines = output.split('\n');
    const syntaxLine = lines.find((l) => l.includes('Syntax Highlight'));
    assert.ok(syntaxLine?.includes('off'));
  });

  it('has box-drawing border characters', () => {
    const output = formatSettingsDisplay(makeConfig());
    assert.ok(output.includes('\u256D'));
    assert.ok(output.includes('\u256E'));
    assert.ok(output.includes('\u2570'));
    assert.ok(output.includes('\u256F'));
  });

  it('includes Settings header', () => {
    const output = formatSettingsDisplay(makeConfig());
    assert.ok(output.includes('ArqZero Settings'));
  });
});
