import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadEnvOverrides } from './env.js';

describe('loadEnvOverrides', () => {
  const savedEnv: Record<string, string | undefined> = {};
  const envKeys = [
    'ARQZERO_MODEL',
    'ARQZERO_MAX_TOKENS',
    'ARQZERO_REDUCED_MOTION',
    'ARQZERO_NO_HIGHLIGHT',
    'ARQZERO_VERBOSE',
    'FIREWORKS_API_KEY',
  ];

  beforeEach(() => {
    for (const key of envKeys) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
  });

  it('returns defaults when no env vars are set', () => {
    const overrides = loadEnvOverrides();
    assert.equal(overrides.model, undefined);
    assert.equal(overrides.maxTokens, undefined);
    assert.equal(overrides.reducedMotion, false);
    assert.equal(overrides.syntaxHighlightingDisabled, false);
    assert.equal(overrides.verbose, false);
    assert.equal(overrides.apiKey, undefined);
  });

  it('reads ARQZERO_MODEL', () => {
    process.env.ARQZERO_MODEL = 'my-model';
    const overrides = loadEnvOverrides();
    assert.equal(overrides.model, 'my-model');
  });

  it('parses ARQZERO_MAX_TOKENS as integer', () => {
    process.env.ARQZERO_MAX_TOKENS = '4096';
    const overrides = loadEnvOverrides();
    assert.equal(overrides.maxTokens, 4096);
  });

  it('reads boolean flags when set to 1', () => {
    process.env.ARQZERO_REDUCED_MOTION = '1';
    process.env.ARQZERO_NO_HIGHLIGHT = '1';
    process.env.ARQZERO_VERBOSE = '1';
    const overrides = loadEnvOverrides();
    assert.equal(overrides.reducedMotion, true);
    assert.equal(overrides.syntaxHighlightingDisabled, true);
    assert.equal(overrides.verbose, true);
  });

  it('boolean flags are false when set to other values', () => {
    process.env.ARQZERO_REDUCED_MOTION = '0';
    process.env.ARQZERO_NO_HIGHLIGHT = 'yes';
    process.env.ARQZERO_VERBOSE = 'true';
    const overrides = loadEnvOverrides();
    assert.equal(overrides.reducedMotion, false);
    assert.equal(overrides.syntaxHighlightingDisabled, false);
    assert.equal(overrides.verbose, false);
  });

  it('reads FIREWORKS_API_KEY', () => {
    process.env.FIREWORKS_API_KEY = 'fw-test-key';
    const overrides = loadEnvOverrides();
    assert.equal(overrides.apiKey, 'fw-test-key');
  });
});
