import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildSubagentPrompt } from './prompt-builder.js';

describe('buildSubagentPrompt', () => {
  it('includes task and cwd in prompt', () => {
    const prompt = buildSubagentPrompt({
      task: 'Refactor the auth module',
      cwd: '/home/user/project',
    });

    assert.ok(prompt.includes('sub-agent of ArqZero'));
    assert.ok(prompt.includes('Working directory: /home/user/project'));
    assert.ok(prompt.includes('## Task'));
    assert.ok(prompt.includes('Refactor the auth module'));
    assert.ok(prompt.includes('Work autonomously'));
  });

  it('includes relevant files when provided', () => {
    const prompt = buildSubagentPrompt({
      task: 'Fix tests',
      cwd: '/project',
      relevantFiles: ['src/auth.ts', 'src/auth.test.ts'],
    });

    assert.ok(prompt.includes('## Relevant Files'));
    assert.ok(prompt.includes('src/auth.ts, src/auth.test.ts'));
  });

  it('includes test command when provided', () => {
    const prompt = buildSubagentPrompt({
      task: 'Add validation',
      cwd: '/project',
      testCommand: 'npx tsx --test src/validate.test.ts',
    });

    assert.ok(prompt.includes('## Verification'));
    assert.ok(prompt.includes('npx tsx --test src/validate.test.ts'));
  });

  it('includes additional context when provided', () => {
    const prompt = buildSubagentPrompt({
      task: 'Update types',
      cwd: '/project',
      additionalContext: 'The project uses ESM with .js extensions',
    });

    assert.ok(prompt.includes('## Context'));
    assert.ok(prompt.includes('The project uses ESM with .js extensions'));
  });

  it('works without optional fields', () => {
    const prompt = buildSubagentPrompt({
      task: 'Simple task',
      cwd: '/tmp',
    });

    assert.ok(!prompt.includes('## Relevant Files'));
    assert.ok(!prompt.includes('## Verification'));
    assert.ok(!prompt.includes('## Context'));
    assert.ok(prompt.includes('## Task'));
    assert.ok(prompt.includes('Simple task'));
  });

  it('includes all sections when all options provided', () => {
    const prompt = buildSubagentPrompt({
      task: 'Full task',
      cwd: '/project',
      relevantFiles: ['a.ts', 'b.ts'],
      testCommand: 'npm test',
      additionalContext: 'Use strict mode',
    });

    assert.ok(prompt.includes('## Task'));
    assert.ok(prompt.includes('## Relevant Files'));
    assert.ok(prompt.includes('## Verification'));
    assert.ok(prompt.includes('## Context'));
  });
});
