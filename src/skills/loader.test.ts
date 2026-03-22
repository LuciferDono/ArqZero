import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { scanSkills, getDefaultSkillsDir } from './loader.js';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'arqcode-test-skills-'));
}

function createSkill(
  skillsDir: string,
  name: string,
  manifest: Record<string, unknown>,
  promptContent: string,
): void {
  const skillDir = path.join(skillsDir, name);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'skill.json'), JSON.stringify(manifest), 'utf-8');
  fs.writeFileSync(path.join(skillDir, 'prompt.md'), promptContent, 'utf-8');
}

describe('getDefaultSkillsDir', () => {
  it('should return a path under the home directory', () => {
    const dir = getDefaultSkillsDir();
    assert.ok(dir.startsWith(os.homedir()));
    assert.ok(dir.endsWith(path.join('.arqcode', 'skills')));
  });
});

describe('scanSkills', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should load a valid skill', async () => {
    createSkill(tmpDir, 'commit', {
      name: 'commit',
      description: 'Generate a git commit message',
      version: '1.0.0',
      command: '/commit',
      triggers: ['/commit'],
      prompt: 'prompt.md',
    }, '# Commit Skill\nYou are a commit message generator.');

    const skills = await scanSkills(tmpDir);
    assert.equal(skills.length, 1);
    assert.equal(skills[0].manifest.name, 'commit');
    assert.equal(skills[0].manifest.command, '/commit');
    assert.equal(skills[0].promptContent, '# Commit Skill\nYou are a commit message generator.');
    assert.equal(skills[0].directory, path.join(tmpDir, 'commit'));
  });

  it('should load multiple valid skills', async () => {
    createSkill(tmpDir, 'commit', {
      name: 'commit',
      description: 'Generate a commit',
      version: '1.0.0',
      command: '/commit',
      triggers: ['/commit'],
      prompt: 'prompt.md',
    }, 'Commit prompt');

    createSkill(tmpDir, 'review', {
      name: 'review',
      description: 'Code review',
      version: '1.0.0',
      command: '/review',
      triggers: ['/review'],
      prompt: 'prompt.md',
    }, 'Review prompt');

    const skills = await scanSkills(tmpDir);
    assert.equal(skills.length, 2);

    const names = skills.map((s) => s.manifest.name).sort();
    assert.deepEqual(names, ['commit', 'review']);
  });

  it('should skip directories without skill.json', async () => {
    // Create a directory but no skill.json
    fs.mkdirSync(path.join(tmpDir, 'broken-skill'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'broken-skill', 'prompt.md'), 'some content', 'utf-8');

    const skills = await scanSkills(tmpDir);
    assert.equal(skills.length, 0);
  });

  it('should skip skills with invalid manifest', async () => {
    const skillDir = path.join(tmpDir, 'bad-manifest');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'skill.json'), '{"name": "only-name"}', 'utf-8');
    fs.writeFileSync(path.join(skillDir, 'prompt.md'), 'some content', 'utf-8');

    const skills = await scanSkills(tmpDir);
    assert.equal(skills.length, 0);
  });

  it('should skip skills with invalid JSON in skill.json', async () => {
    const skillDir = path.join(tmpDir, 'bad-json');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'skill.json'), 'not valid json!!!', 'utf-8');
    fs.writeFileSync(path.join(skillDir, 'prompt.md'), 'some content', 'utf-8');

    const skills = await scanSkills(tmpDir);
    assert.equal(skills.length, 0);
  });

  it('should skip skills without prompt.md', async () => {
    const skillDir = path.join(tmpDir, 'no-prompt');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'skill.json'), JSON.stringify({
      name: 'no-prompt',
      description: 'Missing prompt file',
      version: '1.0.0',
      command: '/no-prompt',
      triggers: ['/no-prompt'],
      prompt: 'prompt.md',
    }), 'utf-8');

    const skills = await scanSkills(tmpDir);
    assert.equal(skills.length, 0);
  });

  it('should return empty array for empty directory', async () => {
    const skills = await scanSkills(tmpDir);
    assert.equal(skills.length, 0);
  });

  it('should return empty array for non-existent directory', async () => {
    const skills = await scanSkills(path.join(tmpDir, 'nonexistent'));
    assert.equal(skills.length, 0);
  });

  it('should skip regular files in the skills directory', async () => {
    fs.writeFileSync(path.join(tmpDir, 'not-a-directory.txt'), 'hello', 'utf-8');

    createSkill(tmpDir, 'valid', {
      name: 'valid',
      description: 'A valid skill',
      version: '1.0.0',
      command: '/valid',
      triggers: ['/valid'],
      prompt: 'prompt.md',
    }, 'Valid prompt');

    const skills = await scanSkills(tmpDir);
    assert.equal(skills.length, 1);
    assert.equal(skills[0].manifest.name, 'valid');
  });

  it('should load valid skills while skipping invalid ones', async () => {
    // Valid skill
    createSkill(tmpDir, 'good', {
      name: 'good',
      description: 'A good skill',
      version: '1.0.0',
      command: '/good',
      triggers: ['/good'],
      prompt: 'prompt.md',
    }, 'Good prompt');

    // Invalid skill (bad manifest)
    const badDir = path.join(tmpDir, 'bad');
    fs.mkdirSync(badDir, { recursive: true });
    fs.writeFileSync(path.join(badDir, 'skill.json'), '{}', 'utf-8');
    fs.writeFileSync(path.join(badDir, 'prompt.md'), 'Bad prompt', 'utf-8');

    const skills = await scanSkills(tmpDir);
    assert.equal(skills.length, 1);
    assert.equal(skills[0].manifest.name, 'good');
  });
});
