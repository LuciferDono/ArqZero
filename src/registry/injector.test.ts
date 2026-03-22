import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCapabilityContext } from './injector.js';
import type { MatchResult } from './matcher.js';

describe('buildCapabilityContext', () => {
  it('returns empty string for no matches', () => {
    assert.equal(buildCapabilityContext([]), '');
  });

  it('includes capability name and matched keywords', () => {
    const matches: MatchResult[] = [
      {
        capability: {
          name: 'planning',
          description: 'Planning',
          triggers: ['plan'],
          category: 'process',
        },
        score: 1,
        matchedKeywords: ['plan'],
      },
    ];
    const ctx = buildCapabilityContext(matches);
    assert.ok(ctx.includes('### planning'));
    assert.ok(ctx.includes('Matched: plan'));
  });

  it('includes systemPromptAddition when present', () => {
    const matches: MatchResult[] = [
      {
        capability: {
          name: 'debugging',
          description: 'Debug',
          triggers: ['bug'],
          category: 'process',
          systemPromptAddition: 'Debug systematically.',
        },
        score: 1,
        matchedKeywords: ['bug'],
      },
    ];
    const ctx = buildCapabilityContext(matches);
    assert.ok(ctx.includes('Debug systematically.'));
  });

  it('includes suggestedTools when present', () => {
    const matches: MatchResult[] = [
      {
        capability: {
          name: 'frontend',
          description: 'Frontend',
          triggers: ['react'],
          category: 'domain',
          suggestedTools: ['Read', 'Edit'],
        },
        score: 1,
        matchedKeywords: ['react'],
      },
    ];
    const ctx = buildCapabilityContext(matches);
    assert.ok(ctx.includes('Suggested tools: Read, Edit'));
  });

  it('includes Active Capabilities header', () => {
    const matches: MatchResult[] = [
      {
        capability: {
          name: 'search',
          description: 'Search',
          triggers: ['find'],
          category: 'tool',
        },
        score: 1,
        matchedKeywords: ['find'],
      },
    ];
    const ctx = buildCapabilityContext(matches);
    assert.ok(ctx.includes('## Active Capabilities'));
  });

  it('handles multiple matches', () => {
    const matches: MatchResult[] = [
      {
        capability: {
          name: 'planning',
          description: 'Planning',
          triggers: ['plan'],
          category: 'process',
          systemPromptAddition: 'Plan first.',
        },
        score: 1,
        matchedKeywords: ['plan'],
      },
      {
        capability: {
          name: 'frontend',
          description: 'Frontend',
          triggers: ['react'],
          category: 'domain',
          suggestedTools: ['Read'],
        },
        score: 1,
        matchedKeywords: ['react'],
      },
    ];
    const ctx = buildCapabilityContext(matches);
    assert.ok(ctx.includes('### planning'));
    assert.ok(ctx.includes('### frontend'));
    assert.ok(ctx.includes('Plan first.'));
    assert.ok(ctx.includes('Suggested tools: Read'));
  });
});
