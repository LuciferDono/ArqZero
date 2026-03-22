import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CAPABILITIES } from './capabilities.js';
import type { CapabilityCategory } from './capabilities.js';

const VALID_CATEGORIES: CapabilityCategory[] = [
  'methodology',
  'architecture',
  'domain',
  'guardrail',
  'orchestration',
  'tool',
];

describe('CAPABILITIES registry', () => {
  it('has exactly 42 capabilities', () => {
    assert.equal(CAPABILITIES.length, 42);
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
    for (const cap of CAPABILITIES) {
      assert.ok(
        VALID_CATEGORIES.includes(cap.category),
        `${cap.name} has invalid category "${cap.category}"`,
      );
    }
  });

  it('has no duplicate capability names', () => {
    const names = CAPABILITIES.map((c) => c.name);
    const unique = new Set(names);
    assert.equal(names.length, unique.size, 'duplicate capability names found');
  });

  it('contains all six categories', () => {
    const categories = new Set(CAPABILITIES.map((c) => c.category));
    for (const cat of VALID_CATEGORIES) {
      assert.ok(categories.has(cat), `missing category: ${cat}`);
    }
  });
});

describe('CAPABILITIES — category counts', () => {
  it('has 8 methodology capabilities', () => {
    const count = CAPABILITIES.filter((c) => c.category === 'methodology').length;
    assert.equal(count, 8);
  });

  it('has 7 architecture capabilities', () => {
    const count = CAPABILITIES.filter((c) => c.category === 'architecture').length;
    assert.equal(count, 7);
  });

  it('has 11 domain capabilities', () => {
    const count = CAPABILITIES.filter((c) => c.category === 'domain').length;
    assert.equal(count, 11);
  });

  it('has 6 guardrail capabilities', () => {
    const count = CAPABILITIES.filter((c) => c.category === 'guardrail').length;
    assert.equal(count, 6);
  });

  it('has 5 orchestration capabilities', () => {
    const count = CAPABILITIES.filter((c) => c.category === 'orchestration').length;
    assert.equal(count, 5);
  });

  it('has 5 tool capabilities', () => {
    const count = CAPABILITIES.filter((c) => c.category === 'tool').length;
    assert.equal(count, 5);
  });
});

describe('CAPABILITIES — methodology requirements', () => {
  const methodCaps = CAPABILITIES.filter((c) => c.category === 'methodology');

  it('every methodology capability has a systemPromptAddition', () => {
    for (const cap of methodCaps) {
      assert.ok(
        cap.systemPromptAddition && cap.systemPromptAddition.length > 0,
        `methodology capability "${cap.name}" is missing systemPromptAddition`,
      );
    }
  });

  it('every methodology capability has a multi-step systemPromptAddition', () => {
    for (const cap of methodCaps) {
      const lines = cap.systemPromptAddition!.split('\n').filter((l) => l.trim().length > 0);
      assert.ok(
        lines.length >= 5,
        `methodology capability "${cap.name}" should have at least 5 steps, got ${lines.length}`,
      );
    }
  });

  it('every methodology capability has a phase', () => {
    for (const cap of methodCaps) {
      assert.ok(
        cap.phase !== undefined,
        `methodology capability "${cap.name}" is missing phase`,
      );
    }
  });
});

describe('CAPABILITIES — guardrail requirements', () => {
  const guardrailCaps = CAPABILITIES.filter((c) => c.category === 'guardrail');

  it('every guardrail capability has a verificationGate', () => {
    for (const cap of guardrailCaps) {
      assert.ok(
        cap.verificationGate,
        `guardrail capability "${cap.name}" is missing verificationGate`,
      );
    }
  });

  it('every verificationGate has at least one step', () => {
    for (const cap of guardrailCaps) {
      assert.ok(
        cap.verificationGate!.steps.length > 0,
        `guardrail capability "${cap.name}" has empty verificationGate steps`,
      );
    }
  });

  it('every verificationGate has a valid failAction', () => {
    for (const cap of guardrailCaps) {
      assert.ok(
        ['retry', 'report'].includes(cap.verificationGate!.failAction),
        `guardrail capability "${cap.name}" has invalid failAction "${cap.verificationGate!.failAction}"`,
      );
    }
  });
});

describe('CAPABILITIES — orchestration requirements', () => {
  const orchCaps = CAPABILITIES.filter((c) => c.category === 'orchestration');

  it('every orchestration capability has a dispatchHint', () => {
    for (const cap of orchCaps) {
      assert.ok(
        cap.dispatchHint,
        `orchestration capability "${cap.name}" is missing dispatchHint`,
      );
    }
  });

  it('every dispatchHint has at least one task', () => {
    for (const cap of orchCaps) {
      assert.ok(
        cap.dispatchHint!.tasks.length > 0,
        `orchestration capability "${cap.name}" has empty dispatchHint tasks`,
      );
    }
  });
});

describe('CAPABILITIES — dependency integrity', () => {
  const allNames = new Set(CAPABILITIES.map((c) => c.name));

  it('all requires references point to valid capability names', () => {
    for (const cap of CAPABILITIES) {
      for (const req of cap.requires ?? []) {
        assert.ok(
          allNames.has(req),
          `${cap.name} requires "${req}" which does not exist`,
        );
      }
    }
  });

  it('all recommends references point to valid capability names', () => {
    for (const cap of CAPABILITIES) {
      for (const rec of cap.recommends ?? []) {
        assert.ok(
          allNames.has(rec),
          `${cap.name} recommends "${rec}" which does not exist`,
        );
      }
    }
  });
});
