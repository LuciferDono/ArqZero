import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CAPABILITIES } from './capabilities.js';

describe('CAPABILITIES registry', () => {
  it('has at least one capability', () => {
    assert.ok(CAPABILITIES.length > 0);
  });

  it('every capability has a non-empty name', () => {
    for (const cap of CAPABILITIES) {
      assert.ok(cap.name.length > 0, `capability has empty name`);
    }
  });

  it('every capability has a non-empty description', () => {
    for (const cap of CAPABILITIES) {
      assert.ok(
        cap.description.length > 0,
        `${cap.name} has empty description`,
      );
    }
  });

  it('every capability has at least one trigger', () => {
    for (const cap of CAPABILITIES) {
      assert.ok(
        cap.triggers.length > 0,
        `${cap.name} has no triggers`,
      );
    }
  });

  it('no capability has empty trigger strings', () => {
    for (const cap of CAPABILITIES) {
      for (const trigger of cap.triggers) {
        assert.ok(
          trigger.trim().length > 0,
          `${cap.name} has an empty trigger`,
        );
      }
    }
  });

  it('every capability has a valid category', () => {
    const valid = ['process', 'domain', 'tool'];
    for (const cap of CAPABILITIES) {
      assert.ok(
        valid.includes(cap.category),
        `${cap.name} has invalid category "${cap.category}"`,
      );
    }
  });

  it('has no duplicate capability names', () => {
    const names = CAPABILITIES.map((c) => c.name);
    const unique = new Set(names);
    assert.equal(names.length, unique.size, 'duplicate capability names found');
  });

  it('contains process, domain, and tool categories', () => {
    const categories = new Set(CAPABILITIES.map((c) => c.category));
    assert.ok(categories.has('process'));
    assert.ok(categories.has('domain'));
    assert.ok(categories.has('tool'));
  });
});
