import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadAgents, getDefaultAgentsDir } from './loader.js';

describe('Agent Loader', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arq-agents-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return empty array when directory does not exist', async () => {
    const agents = await loadAgents(path.join(tmpDir, 'nonexistent'));
    assert.deepEqual(agents, []);
  });

  it('should return empty array when directory is empty', async () => {
    const agents = await loadAgents(tmpDir);
    assert.deepEqual(agents, []);
  });

  it('should parse a valid agent .md file with YAML frontmatter', async () => {
    const md = `---
name: code-review
description: Reviews code for quality
model: gpt-4
allowedTools: Read, Grep, Glob
---
You are a code reviewer. Analyze code for bugs and style issues.`;
    fs.writeFileSync(path.join(tmpDir, 'code-review.md'), md);

    const agents = await loadAgents(tmpDir);
    assert.equal(agents.length, 1);
    assert.equal(agents[0].name, 'code-review');
    assert.equal(agents[0].description, 'Reviews code for quality');
    assert.equal(agents[0].model, 'gpt-4');
    assert.deepEqual(agents[0].allowedTools, ['Read', 'Grep', 'Glob']);
    assert.equal(agents[0].systemPrompt, 'You are a code reviewer. Analyze code for bugs and style issues.');
  });

  it('should handle agent .md without optional fields', async () => {
    const md = `---
name: simple-agent
description: A simple agent
---
Do something simple.`;
    fs.writeFileSync(path.join(tmpDir, 'simple.md'), md);

    const agents = await loadAgents(tmpDir);
    assert.equal(agents.length, 1);
    assert.equal(agents[0].name, 'simple-agent');
    assert.equal(agents[0].description, 'A simple agent');
    assert.equal(agents[0].model, undefined);
    assert.equal(agents[0].allowedTools, undefined);
    assert.equal(agents[0].systemPrompt, 'Do something simple.');
  });

  it('should skip non-.md files', async () => {
    fs.writeFileSync(path.join(tmpDir, 'readme.txt'), 'not an agent');
    fs.writeFileSync(path.join(tmpDir, 'agent.md'), `---
name: real-agent
description: A real agent
---
I am an agent.`);

    const agents = await loadAgents(tmpDir);
    assert.equal(agents.length, 1);
    assert.equal(agents[0].name, 'real-agent');
  });

  it('should skip .md files without valid frontmatter', async () => {
    fs.writeFileSync(path.join(tmpDir, 'bad.md'), 'No frontmatter here');

    const agents = await loadAgents(tmpDir);
    assert.deepEqual(agents, []);
  });

  it('should load multiple agent files', async () => {
    fs.writeFileSync(path.join(tmpDir, 'a.md'), `---
name: alpha
description: First
---
Alpha prompt`);
    fs.writeFileSync(path.join(tmpDir, 'b.md'), `---
name: beta
description: Second
---
Beta prompt`);

    const agents = await loadAgents(tmpDir);
    assert.equal(agents.length, 2);
    const names = agents.map((a) => a.name).sort();
    assert.deepEqual(names, ['alpha', 'beta']);
  });

  it('should return correct default agents directory', () => {
    const dir = getDefaultAgentsDir();
    assert.ok(dir.includes('.arqzero'));
    assert.ok(dir.endsWith('agents'));
  });
});
