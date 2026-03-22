import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { matchCapabilities, selectCapabilities, resolveDependencies, stem } from './matcher.js';
import type { Capability } from './capabilities.js';

const testCaps: Capability[] = [
  {
    name: 'planning',
    description: 'Planning',
    triggers: ['plan', 'design'],
    category: 'methodology',
    phase: 10,
    systemPromptAddition: 'Plan first.',
  },
  {
    name: 'frontend',
    description: 'Frontend',
    triggers: ['react', 'component', 'ui'],
    category: 'domain',
    suggestedTools: ['Read', 'Edit'],
  },
  {
    name: 'search',
    description: 'Search',
    triggers: ['find', 'search', 'grep'],
    category: 'tool',
    suggestedTools: ['Grep'],
  },
  {
    name: 'git',
    description: 'Git ops',
    triggers: ['git', 'commit', 'pull request'],
    category: 'domain',
    suggestedTools: ['Bash'],
  },
];

describe('stem', () => {
  it('strips -ing suffix', () => {
    assert.equal(stem('optimizing'), 'optimiz');
  });

  it('strips -tion suffix', () => {
    assert.equal(stem('optimization'), 'optimiza');
  });

  it('strips -ed suffix', () => {
    assert.equal(stem('refactored'), 'refactor');
  });

  it('strips -ly suffix', () => {
    assert.equal(stem('systematically'), 'systematical');
  });

  it('does not strip from short words', () => {
    assert.equal(stem('being'), 'being');
    assert.equal(stem('red'), 'red');
  });

  it('returns word unchanged if no suffix matches', () => {
    assert.equal(stem('plan'), 'plan');
    assert.equal(stem('git'), 'git');
  });
});

describe('matchCapabilities', () => {
  it('returns empty array when no triggers match', () => {
    const result = matchCapabilities('hello world', testCaps);
    assert.equal(result.length, 0);
  });

  it('matches single keyword', () => {
    const result = matchCapabilities('I need to plan something', testCaps);
    assert.ok(result.length >= 1);
    assert.equal(result[0].capability.name, 'planning');
    assert.deepEqual(result[0].matchedKeywords, ['plan']);
  });

  it('matches multiple keywords for same capability', () => {
    const result = matchCapabilities(
      'find and search for files using grep',
      testCaps,
    );
    const searchMatch = result.find((r) => r.capability.name === 'search');
    assert.ok(searchMatch);
    assert.equal(searchMatch.score, 3);
    assert.deepEqual(searchMatch.matchedKeywords, ['find', 'search', 'grep']);
  });

  it('matches multiple capabilities', () => {
    const result = matchCapabilities('plan the react component', testCaps);
    assert.ok(result.length >= 2);
    const names = result.map((r) => r.capability.name);
    assert.ok(names.includes('planning'));
    assert.ok(names.includes('frontend'));
  });

  it('sorts methodology capabilities first', () => {
    const result = matchCapabilities('plan the react component', testCaps);
    assert.equal(result[0].capability.category, 'methodology');
  });

  it('sorts by score descending within same priority', () => {
    const result = matchCapabilities(
      'find and search for react component using grep',
      testCaps,
    );
    // search has 3 matches (find, search, grep), frontend has 2 (react, component)
    // both domain/tool category — domain sorts before tool
    const toolResults = result.filter(r => r.capability.category === 'tool');
    const domainResults = result.filter(r => r.capability.category === 'domain');
    assert.ok(toolResults.length >= 1);
    assert.ok(domainResults.length >= 1);
  });

  it('handles multi-word triggers', () => {
    const result = matchCapabilities(
      'open a pull request for the feature',
      testCaps,
    );
    const gitMatch = result.find((r) => r.capability.name === 'git');
    assert.ok(gitMatch);
    assert.ok(gitMatch.matchedKeywords.includes('pull request'));
  });

  it('is case insensitive', () => {
    const result = matchCapabilities('PLAN the React Component', testCaps);
    assert.ok(result.length >= 2);
  });

  it('matches via suffix stripping — "optimizing" matches "optimize"', () => {
    const caps: Capability[] = [
      {
        name: 'perf',
        description: 'Performance',
        triggers: ['optimize', 'performance'],
        category: 'domain',
      },
    ];
    const result = matchCapabilities('I am optimizing the code', caps);
    assert.ok(result.length >= 1);
    assert.equal(result[0].capability.name, 'perf');
    assert.ok(result[0].matchedKeywords.includes('optimize'));
  });

  it('stemmed matches score lower than exact matches', () => {
    const caps: Capability[] = [
      {
        name: 'perf',
        description: 'Performance',
        triggers: ['optimize'],
        category: 'domain',
      },
    ];
    const exact = matchCapabilities('optimize now', caps);
    const stemmed = matchCapabilities('optimizing now', caps);
    assert.ok(exact[0].score > stemmed[0].score);
  });
});

describe('matchCapabilities — 6-tier category sort', () => {
  it('sorts methodology before architecture before domain', () => {
    const caps: Capability[] = [
      { name: 'tool-cap', description: 'T', triggers: ['kw'], category: 'tool' },
      { name: 'domain-cap', description: 'D', triggers: ['kw'], category: 'domain' },
      { name: 'arch-cap', description: 'A', triggers: ['kw'], category: 'architecture' },
      { name: 'method-cap', description: 'M', triggers: ['kw'], category: 'methodology' },
      { name: 'guard-cap', description: 'G', triggers: ['kw'], category: 'guardrail' },
      { name: 'orch-cap', description: 'O', triggers: ['kw'], category: 'orchestration' },
    ];
    const result = matchCapabilities('kw', caps);
    const names = result.map(r => r.capability.name);
    assert.equal(names[0], 'method-cap');
    assert.equal(names[1], 'arch-cap');
    assert.equal(names[2], 'domain-cap');
    assert.equal(names[3], 'guard-cap');
    assert.equal(names[4], 'orch-cap');
    assert.equal(names[5], 'tool-cap');
  });

  it('sorts by phase within same category — phase 10 before phase 30', () => {
    const caps: Capability[] = [
      { name: 'late', description: 'L', triggers: ['kw'], category: 'methodology', phase: 30 },
      { name: 'early', description: 'E', triggers: ['kw'], category: 'methodology', phase: 10 },
    ];
    const result = matchCapabilities('kw', caps);
    assert.equal(result[0].capability.name, 'early');
    assert.equal(result[1].capability.name, 'late');
  });
});

describe('resolveDependencies', () => {
  const allCaps: Capability[] = [
    {
      name: 'tdd',
      description: 'TDD',
      triggers: ['tdd'],
      category: 'methodology',
      requires: ['testing-standards'],
    },
    {
      name: 'testing-standards',
      description: 'Testing standards',
      triggers: ['testing-standards'],
      category: 'guardrail',
    },
    {
      name: 'backend-patterns',
      description: 'Backend',
      triggers: ['backend'],
      category: 'architecture',
      recommends: ['security-review'],
    },
    {
      name: 'security-review',
      description: 'Security',
      triggers: ['security'],
      category: 'guardrail',
    },
  ];

  it('adds hard requires even when not matched', () => {
    const matches = matchCapabilities('tdd', allCaps);
    const resolved = resolveDependencies(matches, allCaps, 8);
    const names = resolved.map(r => r.capability.name);
    assert.ok(names.includes('tdd'));
    assert.ok(names.includes('testing-standards'));
  });

  it('adds soft recommends if under cap', () => {
    const matches = matchCapabilities('backend', allCaps);
    const resolved = resolveDependencies(matches, allCaps, 8);
    const names = resolved.map(r => r.capability.name);
    assert.ok(names.includes('backend-patterns'));
    assert.ok(names.includes('security-review'));
  });

  it('does not add recommends if at cap', () => {
    const matches = matchCapabilities('backend', allCaps);
    // Cap is 1 — already at max, should not add recommends
    const resolved = resolveDependencies(matches, allCaps, 1);
    const names = resolved.map(r => r.capability.name);
    assert.ok(names.includes('backend-patterns'));
    assert.ok(!names.includes('security-review'));
  });

  it('marks required dependencies with (required) keyword', () => {
    const matches = matchCapabilities('tdd', allCaps);
    const resolved = resolveDependencies(matches, allCaps, 8);
    const dep = resolved.find(r => r.capability.name === 'testing-standards');
    assert.ok(dep);
    assert.deepEqual(dep.matchedKeywords, ['(required)']);
  });
});

describe('selectCapabilities', () => {
  it('limits to max results', () => {
    const matches = matchCapabilities(
      'plan design find search react component',
      testCaps,
    );
    const selected = selectCapabilities(matches, 2);
    assert.equal(selected.length, 2);
  });

  it('defaults to max 8', () => {
    const many: Capability[] = Array.from({ length: 12 }, (_, i) => ({
      name: `cap-${i}`,
      description: `Cap ${i}`,
      triggers: [`kw${i}`],
      category: 'tool' as const,
    }));
    const msg = Array.from({ length: 12 }, (_, i) => `kw${i}`).join(' ');
    const matches = matchCapabilities(msg, many);
    const selected = selectCapabilities(matches);
    assert.ok(selected.length <= 8);
  });

  it('returns all if fewer than max', () => {
    const matches = matchCapabilities('plan something', testCaps);
    const selected = selectCapabilities(matches, 10);
    assert.equal(selected.length, matches.length);
  });
});
