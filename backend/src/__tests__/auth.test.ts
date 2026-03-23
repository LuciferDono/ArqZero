import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateVerificationCode, hashToken, generateRefreshToken, createAccessToken, verifyAccessToken } from '../utils/jwt.js';

describe('generateVerificationCode', () => {
  it('should return a 6-digit string', () => {
    const code = generateVerificationCode();
    assert.equal(code.length, 6);
    assert.ok(/^\d{6}$/.test(code));
  });

  it('should generate different codes', () => {
    const codes = new Set(Array.from({ length: 10 }, () => generateVerificationCode()));
    assert.ok(codes.size > 1);
  });
});

describe('hashToken', () => {
  it('should return a 64-char hex string', () => {
    const hash = hashToken('test-token');
    assert.equal(hash.length, 64);
    assert.ok(/^[a-f0-9]{64}$/.test(hash));
  });

  it('should be deterministic', () => {
    assert.equal(hashToken('abc'), hashToken('abc'));
  });

  it('should differ for different inputs', () => {
    assert.notEqual(hashToken('a'), hashToken('b'));
  });
});

describe('generateRefreshToken', () => {
  it('should return a base64url string of 32+ chars', () => {
    const token = generateRefreshToken();
    assert.ok(token.length >= 32);
    assert.ok(/^[A-Za-z0-9_-]+$/.test(token));
  });
});

describe('JWT round-trip', () => {
  it('should create and verify access token', async () => {
    const payload = { sub: 'user-123', tier: 'pro', cap: 0, email: 'test@example.com' };
    const token = await createAccessToken(payload);
    assert.ok(token.length > 50);

    const decoded = await verifyAccessToken(token);
    assert.equal(decoded.sub, 'user-123');
    assert.equal(decoded.tier, 'pro');
    assert.equal(decoded.cap, 0);
    assert.equal(decoded.email, 'test@example.com');
  });
});
