import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// We test the pure logic functions, not file I/O (which depends on homedir)
import { isAccessTokenExpired, isOfflineGraceExpired } from './store.js';
import type { AuthData } from './store.js';

function makeAuth(overrides: Partial<AuthData> = {}): AuthData {
  return {
    accessToken: 'test-token',
    refreshToken: 'test-refresh',
    tier: 'pro',
    email: 'test@example.com',
    expiresAt: Date.now() + 3600000, // 1 hour from now
    lastValidated: Date.now(),
    ...overrides,
  };
}

describe('isAccessTokenExpired', () => {
  it('should return false for valid token', () => {
    assert.ok(!isAccessTokenExpired(makeAuth()));
  });

  it('should return true for expired token', () => {
    assert.ok(isAccessTokenExpired(makeAuth({ expiresAt: Date.now() - 1000 })));
  });

  it('should return true for token expiring now', () => {
    assert.ok(isAccessTokenExpired(makeAuth({ expiresAt: Date.now() })));
  });
});

describe('isOfflineGraceExpired', () => {
  it('should return false within 7 days', () => {
    assert.ok(!isOfflineGraceExpired(makeAuth({ lastValidated: Date.now() - 6 * 24 * 60 * 60 * 1000 })));
  });

  it('should return true after 7 days', () => {
    assert.ok(isOfflineGraceExpired(makeAuth({ lastValidated: Date.now() - 8 * 24 * 60 * 60 * 1000 })));
  });

  it('should return false for just validated', () => {
    assert.ok(!isOfflineGraceExpired(makeAuth()));
  });
});
