import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCapabilityContext } from './injector.js';
import type { MatchResult } from './matcher.js';

describe('buildCapabilityContext', () => {
  it('returns empty string for no matches', () => {
    assert.equal(buildCapabilityContext([]), '');
  });

  it('includes Active Capabilities header', () => {
    const matches: MatchResult[] = [
      {
        capability: {
          name: 'search',
          description: 'Search',
          triggers: ['find'],
          category: 'tool',
          suggestedTools: ['Grep'],
        },
        score: 1,
        matchedKeywords: ['find'],
      },
    ];
    const ctx = buildCapabilityContext(matches);
    assert.ok(ctx.includes('## Active Capabilities'));
  });

  it('renders methodology under Workflow section', () => {
    const matches: MatchResult[] = [
      {
        capability: {
          name: 'planning',
          description: 'Planning',
          triggers: ['plan'],
          category: 'methodology',
          systemPromptAddition: 'Plan first.',
        },
        score: 1,
        matchedKeywords: ['plan'],
      },
    ];
    const ctx = buildCapabilityContext(matches);
    assert.ok(ctx.includes('### Workflow'));
    assert.ok(ctx.includes('**planning**'));
    assert.ok(ctx.includes('Plan first.'));
  });

  it('renders architecture under Architecture Constraints section', () => {
    const matches: MatchResult[] = [
      {
        capability: {
          name: 'microservices',
          description: 'Microservice patterns',
          triggers: ['microservice'],
          category: 'architecture',
          systemPromptAddition: 'Use bounded contexts.',
        },
        score: 1,
        matchedKeywords: ['microservice'],
      },
    ];
    const ctx = buildCapabilityContext(matches);
    assert.ok(ctx.includes('### Architecture Constraints'));
    assert.ok(ctx.includes('**microservices**: Microservice patterns'));
    assert.ok(ctx.includes('Use bounded contexts.'));
  });

  it('renders domain under Technology Context with tool hints', () => {
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
    assert.ok(ctx.includes('### Technology Context'));
    assert.ok(ctx.includes('- **frontend** (tools: Read, Edit)'));
  });

  it('renders tool suggested tools section', () => {
    const matches: MatchResult[] = [
      {
        capability: {
          name: 'search',
          description: 'Search',
          triggers: ['find'],
          category: 'tool',
          suggestedTools: ['Grep', 'Glob'],
        },
        score: 1,
        matchedKeywords: ['find'],
      },
    ];
    const ctx = buildCapabilityContext(matches);
    assert.ok(ctx.includes('### Suggested Tools: Grep, Glob'));
  });

  it('renders dispatch hints from orchestration', () => {
    const matches: MatchResult[] = [
      {
        capability: {
          name: 'parallel-test',
          description: 'Parallel testing',
          triggers: ['parallel'],
          category: 'orchestration',
          dispatchHint: {
            when: 'Multiple test suites exist',
            tasks: ['Run unit tests', 'Run integration tests'],
          },
        },
        score: 1,
        matchedKeywords: ['parallel'],
      },
    ];
    const ctx = buildCapabilityContext(matches);
    assert.ok(ctx.includes('### Parallelization'));
    assert.ok(ctx.includes('WHEN: Multiple test suites exist'));
    assert.ok(ctx.includes('USE Dispatch to run in parallel:'));
    assert.ok(ctx.includes('1. Run unit tests'));
    assert.ok(ctx.includes('2. Run integration tests'));
  });

  it('renders verification gates last', () => {
    const matches: MatchResult[] = [
      {
        capability: {
          name: 'planning',
          description: 'Planning',
          triggers: ['plan'],
          category: 'methodology',
          systemPromptAddition: 'Plan first.',
        },
        score: 1,
        matchedKeywords: ['plan'],
      },
      {
        capability: {
          name: 'testing',
          description: 'Testing',
          triggers: ['test'],
          category: 'methodology',
          verificationGate: {
            steps: ['Run test suite', 'Check coverage'],
            failAction: 'retry',
          },
        },
        score: 1,
        matchedKeywords: ['test'],
      },
    ];
    const ctx = buildCapabilityContext(matches);
    const gateIdx = ctx.indexOf('### Verification Gates (MANDATORY)');
    const workflowIdx = ctx.indexOf('### Workflow');
    assert.ok(gateIdx > workflowIdx, 'verification gates should come after workflow');
    assert.ok(ctx.includes('Before reporting completion, you MUST complete these steps:'));
    assert.ok(ctx.includes('1. Run test suite'));
    assert.ok(ctx.includes('2. Check coverage'));
    assert.ok(ctx.includes('On failure: fix and re-verify'));
    assert.ok(ctx.includes('Do NOT claim completion until all gates pass.'));
  });

  it('renders report failAction correctly', () => {
    const matches: MatchResult[] = [
      {
        capability: {
          name: 'lint-check',
          description: 'Lint',
          triggers: ['lint'],
          category: 'guardrail',
          verificationGate: {
            steps: ['Run linter'],
            failAction: 'report',
          },
        },
        score: 1,
        matchedKeywords: ['lint'],
      },
    ];
    const ctx = buildCapabilityContext(matches);
    assert.ok(ctx.includes('On failure: report failures explicitly'));
  });

  it('omits empty category sections', () => {
    const matches: MatchResult[] = [
      {
        capability: {
          name: 'search',
          description: 'Search',
          triggers: ['find'],
          category: 'tool',
          suggestedTools: ['Grep'],
        },
        score: 1,
        matchedKeywords: ['find'],
      },
    ];
    const ctx = buildCapabilityContext(matches);
    assert.ok(!ctx.includes('### Workflow'));
    assert.ok(!ctx.includes('### Architecture Constraints'));
    assert.ok(!ctx.includes('### Technology Context'));
    assert.ok(!ctx.includes('### Parallelization'));
    assert.ok(!ctx.includes('### Verification Gates'));
  });

  it('renders structured sections in correct order', () => {
    const matches: MatchResult[] = [
      {
        capability: {
          name: 'planning',
          description: 'Planning',
          triggers: ['plan'],
          category: 'methodology',
          systemPromptAddition: 'Plan first.',
        },
        score: 2,
        matchedKeywords: ['plan'],
      },
      {
        capability: {
          name: 'microservices',
          description: 'Microservice patterns',
          triggers: ['microservice'],
          category: 'architecture',
        },
        score: 1,
        matchedKeywords: ['microservice'],
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
      {
        capability: {
          name: 'search',
          description: 'Search',
          triggers: ['find'],
          category: 'tool',
          suggestedTools: ['Grep'],
        },
        score: 1,
        matchedKeywords: ['find'],
      },
    ];
    const ctx = buildCapabilityContext(matches);
    const workflowIdx = ctx.indexOf('### Workflow');
    const archIdx = ctx.indexOf('### Architecture Constraints');
    const techIdx = ctx.indexOf('### Technology Context');
    const toolIdx = ctx.indexOf('### Suggested Tools');
    assert.ok(workflowIdx < archIdx, 'Workflow before Architecture');
    assert.ok(archIdx < techIdx, 'Architecture before Technology');
    assert.ok(techIdx < toolIdx, 'Technology before Suggested Tools');
  });

  it('handles multiple matches in same category', () => {
    const matches: MatchResult[] = [
      {
        capability: {
          name: 'planning',
          description: 'Planning',
          triggers: ['plan'],
          category: 'methodology',
          systemPromptAddition: 'Plan first.',
        },
        score: 1,
        matchedKeywords: ['plan'],
      },
      {
        capability: {
          name: 'debugging',
          description: 'Debug',
          triggers: ['bug'],
          category: 'methodology',
          systemPromptAddition: 'Debug systematically.',
        },
        score: 1,
        matchedKeywords: ['bug'],
      },
    ];
    const ctx = buildCapabilityContext(matches);
    assert.ok(ctx.includes('**planning**'));
    assert.ok(ctx.includes('**debugging**'));
    assert.ok(ctx.includes('Plan first.'));
    assert.ok(ctx.includes('Debug systematically.'));
  });
});
