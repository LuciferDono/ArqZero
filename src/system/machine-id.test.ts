import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getMachineId } from './machine-id.js';

describe('getMachineId', () => {
  it('should return a non-empty string', async () => {
    const id = await getMachineId();
    assert.ok(typeof id === 'string');
    assert.ok(id.length > 0);
  });

  it('should return consistent results', async () => {
    const id1 = await getMachineId();
    const id2 = await getMachineId();
    assert.strictEqual(id1, id2);
  });
});
