import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { runtime, initRuntime } from './runtime.js';

describe('runtime config', () => {
  beforeEach(() => {
    // Reset to defaults before each test
    initRuntime({
      reducedMotion: false,
      syntaxHighlightingDisabled: false,
      verbose: false,
      theme: 'dark',
    });
  });

  it('has sensible defaults', () => {
    assert.equal(runtime.reducedMotion, false);
    assert.equal(runtime.syntaxHighlightingDisabled, false);
    assert.equal(runtime.verbose, false);
    assert.equal(runtime.theme, 'dark');
  });

  it('initRuntime applies partial overrides', () => {
    initRuntime({ reducedMotion: true, verbose: true });
    assert.equal(runtime.reducedMotion, true);
    assert.equal(runtime.verbose, true);
    assert.equal(runtime.syntaxHighlightingDisabled, false);
    assert.equal(runtime.theme, 'dark');
  });

  it('initRuntime can set theme', () => {
    initRuntime({ theme: 'light' });
    assert.equal(runtime.theme, 'light');
  });

  it('initRuntime can enable all accessibility flags', () => {
    initRuntime({
      reducedMotion: true,
      syntaxHighlightingDisabled: true,
    });
    assert.equal(runtime.reducedMotion, true);
    assert.equal(runtime.syntaxHighlightingDisabled, true);
  });
});
