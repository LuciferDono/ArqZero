import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildSystemPrompt } from './system-prompt.js';

describe('buildSystemPrompt', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arqcode-sysprompt-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('builds base prompt with cwd and platform', () => {
    const prompt = buildSystemPrompt(tmpDir);

    assert.ok(prompt.includes('You are ArqCode'));
    assert.ok(prompt.includes(`Current working directory: ${tmpDir}`));
    assert.ok(prompt.includes(`Platform: ${process.platform}`));
    assert.ok(prompt.includes('Date:'));
  });

  it('loads ARQCODE.md when present', () => {
    const content = '# My Project\nAlways use TypeScript.';
    fs.writeFileSync(path.join(tmpDir, 'ARQCODE.md'), content, 'utf-8');

    const prompt = buildSystemPrompt(tmpDir);

    assert.ok(prompt.includes('## Project Instructions (from ARQCODE.md)'));
    assert.ok(prompt.includes('Always use TypeScript.'));
  });

  it('skips ARQCODE.md when not present', () => {
    const prompt = buildSystemPrompt(tmpDir);

    assert.ok(!prompt.includes('Project Instructions'));
  });

  it('loads ARQCODE.md from parent directory', () => {
    const childDir = path.join(tmpDir, 'child');
    fs.mkdirSync(childDir);
    const content = '# Parent Instructions\nUse ESM.';
    fs.writeFileSync(path.join(tmpDir, 'ARQCODE.md'), content, 'utf-8');

    const prompt = buildSystemPrompt(childDir);

    assert.ok(prompt.includes('Use ESM.'));
    assert.ok(prompt.includes('Project Instructions'));
  });

  it('handles read errors gracefully', () => {
    // Create a directory named ARQCODE.md to cause a read error
    const mdPath = path.join(tmpDir, 'ARQCODE.md');
    fs.mkdirSync(mdPath);

    // Should not throw
    const prompt = buildSystemPrompt(tmpDir);
    assert.ok(prompt.includes('You are ArqCode'));
    // Should not contain project instructions since reading failed
    assert.ok(!prompt.includes('Project Instructions'));
  });

  it('includes both local and parent ARQCODE.md', () => {
    const childDir = path.join(tmpDir, 'child');
    fs.mkdirSync(childDir);
    fs.writeFileSync(path.join(tmpDir, 'ARQCODE.md'), 'Parent rules', 'utf-8');
    fs.writeFileSync(path.join(childDir, 'ARQCODE.md'), 'Child rules', 'utf-8');

    const prompt = buildSystemPrompt(childDir);

    assert.ok(prompt.includes('Child rules'));
    assert.ok(prompt.includes('Parent rules'));
  });
});
