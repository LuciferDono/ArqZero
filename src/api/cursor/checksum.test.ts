// src/api/cursor/checksum.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateChecksum } from './checksum.js';

describe('generateChecksum', () => {
  it('should return a non-empty string', () => {
    const result = generateChecksum('test-machine-id');
    assert.ok(typeof result === 'string');
    assert.ok(result.length > 0);
  });

  it('should include machine ID in output', () => {
    const machineId = 'abc123-machine';
    const result = generateChecksum(machineId);
    assert.ok(result.includes(machineId));
  });

  it('should produce different output at different times', () => {
    const r1 = generateChecksum('test', 1000000);
    const r2 = generateChecksum('test', 2000000);
    assert.notStrictEqual(r1, r2);
  });
});
