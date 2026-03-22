import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { matchCapabilities, selectCapabilities } from './matcher.js';
import type { Capability } from './capabilities.js';

const testCaps: Capability[] = [
  {
    name: 'planning',
    description: 'Planning',
    triggers: ['plan', 'design'],
    category: 'process',
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
    const result = matchCapabilities(
      'plan the react component',
      testCaps,
    );
    assert.ok(result.length >= 2);
    const names = result.map((r) => r.capability.name);
    assert.ok(names.includes('planning'));
    assert.ok(names.includes('frontend'));
  });

  it('sorts process capabilities first', () => {
    const result = matchCapabilities(
      'plan the react component',
      testCaps,
    );
    assert.equal(result[0].capability.category, 'process');
  });

  it('sorts by score descending within same priority', () => {
    const result = matchCapabilities(
      'find and search for react component using grep',
      testCaps,
    );
    // search has 3 matches (find, search, grep), frontend has 2 (react, component)
    const domainAndTool = result.filter(
      (r) => r.capability.category !== 'process',
    );
    assert.ok(domainAndTool.length >= 2);
    assert.ok(domainAndTool[0].score >= domainAndTool[1].score);
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

  it('defaults to max 5', () => {
    // Create many matches
    const many: Capability[] = Array.from({ length: 10 }, (_, i) => ({
      name: `cap-${i}`,
      description: `Cap ${i}`,
      triggers: [`kw${i}`],
      category: 'tool' as const,
    }));
    const msg = Array.from({ length: 10 }, (_, i) => `kw${i}`).join(' ');
    const matches = matchCapabilities(msg, many);
    const selected = selectCapabilities(matches);
    assert.ok(selected.length <= 5);
  });

  it('returns all if fewer than max', () => {
    const matches = matchCapabilities('plan something', testCaps);
    const selected = selectCapabilities(matches, 10);
    assert.equal(selected.length, matches.length);
  });
});
