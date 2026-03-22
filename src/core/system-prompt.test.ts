import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildSystemPrompt } from './system-prompt.js';

describe('buildSystemPrompt', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arqzero-sysprompt-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('builds base prompt with cwd and platform', () => {
    const prompt = buildSystemPrompt(tmpDir);

    assert.ok(prompt.includes('You are ArqZero'));
    assert.ok(prompt.includes(`Current working directory: ${tmpDir}`));
    assert.ok(prompt.includes(`Platform: ${process.platform}`));
    assert.ok(prompt.includes('Date:'));
  });

  it('loads ARQZERO.md when present', () => {
    const content = '# My Project\nAlways use TypeScript.';
    fs.writeFileSync(path.join(tmpDir, 'ARQZERO.md'), content, 'utf-8');

    const prompt = buildSystemPrompt(tmpDir);

    assert.ok(prompt.includes('## Project Instructions (from ARQZERO.md)'));
    assert.ok(prompt.includes('Always use TypeScript.'));
  });

  it('skips ARQZERO.md when not present', () => {
    const prompt = buildSystemPrompt(tmpDir);

    assert.ok(!prompt.includes('Project Instructions'));
  });

  it('loads ARQZERO.md from parent directory', () => {
    const childDir = path.join(tmpDir, 'child');
    fs.mkdirSync(childDir);
    const content = '# Parent Instructions\nUse ESM.';
    fs.writeFileSync(path.join(tmpDir, 'ARQZERO.md'), content, 'utf-8');

    const prompt = buildSystemPrompt(childDir);

    assert.ok(prompt.includes('Use ESM.'));
    assert.ok(prompt.includes('Project Instructions'));
  });

  it('handles read errors gracefully', () => {
    // Create a directory named ARQZERO.md to cause a read error
    const mdPath = path.join(tmpDir, 'ARQZERO.md');
    fs.mkdirSync(mdPath);

    // Should not throw
    const prompt = buildSystemPrompt(tmpDir);
    assert.ok(prompt.includes('You are ArqZero'));
    // Should not contain project instructions since reading failed
    assert.ok(!prompt.includes('Project Instructions'));
  });

  it('includes both local and parent ARQZERO.md', () => {
    const childDir = path.join(tmpDir, 'child');
    fs.mkdirSync(childDir);
    fs.writeFileSync(path.join(tmpDir, 'ARQZERO.md'), 'Parent rules', 'utf-8');
    fs.writeFileSync(path.join(childDir, 'ARQZERO.md'), 'Child rules', 'utf-8');

    const prompt = buildSystemPrompt(childDir);

    assert.ok(prompt.includes('Child rules'));
    assert.ok(prompt.includes('Parent rules'));
  });
});
