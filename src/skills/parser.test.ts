import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseManifest, SkillManifestSchema } from './parser.js';

describe('SkillManifestSchema', () => {
  it('should validate a valid manifest', () => {
    const result = SkillManifestSchema.safeParse({
      name: 'commit',
      description: 'Generate a git commit message',
      version: '1.0.0',
      command: '/commit',
      triggers: ['/commit'],
      prompt: 'prompt.md',
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.name, 'commit');
      assert.equal(result.data.command, '/commit');
      assert.deepEqual(result.data.triggers, ['/commit']);
    }
  });

  it('should reject manifest missing required name', () => {
    const result = SkillManifestSchema.safeParse({
      description: 'A skill',
      version: '1.0.0',
      command: '/test',
      triggers: ['/test'],
      prompt: 'prompt.md',
    });
    assert.equal(result.success, false);
  });

  it('should reject manifest missing required description', () => {
    const result = SkillManifestSchema.safeParse({
      name: 'test',
      version: '1.0.0',
      command: '/test',
      triggers: ['/test'],
      prompt: 'prompt.md',
    });
    assert.equal(result.success, false);
  });

  it('should reject manifest missing required version', () => {
    const result = SkillManifestSchema.safeParse({
      name: 'test',
      description: 'A skill',
      command: '/test',
      triggers: ['/test'],
      prompt: 'prompt.md',
    });
    assert.equal(result.success, false);
  });

  it('should reject manifest missing required command', () => {
    const result = SkillManifestSchema.safeParse({
      name: 'test',
      description: 'A skill',
      version: '1.0.0',
      triggers: ['/test'],
      prompt: 'prompt.md',
    });
    assert.equal(result.success, false);
  });

  it('should reject manifest missing required triggers', () => {
    const result = SkillManifestSchema.safeParse({
      name: 'test',
      description: 'A skill',
      version: '1.0.0',
      command: '/test',
      prompt: 'prompt.md',
    });
    assert.equal(result.success, false);
  });

  it('should reject manifest missing required prompt', () => {
    const result = SkillManifestSchema.safeParse({
      name: 'test',
      description: 'A skill',
      version: '1.0.0',
      command: '/test',
      triggers: ['/test'],
    });
    assert.equal(result.success, false);
  });

  it('should reject empty triggers array', () => {
    const result = SkillManifestSchema.safeParse({
      name: 'test',
      description: 'A skill',
      version: '1.0.0',
      command: '/test',
      triggers: [],
      prompt: 'prompt.md',
    });
    assert.equal(result.success, false);
  });

  it('should accept manifest with multiple triggers', () => {
    const result = SkillManifestSchema.safeParse({
      name: 'review',
      description: 'Code review',
      version: '2.0.0',
      command: '/review',
      triggers: ['/review', '/code-review', '/cr'],
      prompt: 'prompt.md',
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.triggers.length, 3);
    }
  });
});

describe('parseManifest', () => {
  it('should parse valid JSON string into SkillManifest', () => {
    const json = JSON.stringify({
      name: 'commit',
      description: 'Generate a git commit message',
      version: '1.0.0',
      command: '/commit',
      triggers: ['/commit'],
      prompt: 'prompt.md',
    });
    const manifest = parseManifest(json);
    assert.equal(manifest.name, 'commit');
    assert.equal(manifest.description, 'Generate a git commit message');
    assert.equal(manifest.version, '1.0.0');
    assert.equal(manifest.command, '/commit');
    assert.deepEqual(manifest.triggers, ['/commit']);
    assert.equal(manifest.prompt, 'prompt.md');
  });

  it('should throw on invalid JSON', () => {
    assert.throws(
      () => parseManifest('not valid json {{{'),
      { message: /Invalid JSON/ },
    );
  });

  it('should throw on valid JSON but invalid manifest schema', () => {
    const json = JSON.stringify({ name: 'test' });
    assert.throws(
      () => parseManifest(json),
      { message: /Invalid skill manifest/ },
    );
  });

  it('should throw on empty string', () => {
    assert.throws(
      () => parseManifest(''),
      { message: /Invalid JSON/ },
    );
  });

  it('should strip unknown extra fields', () => {
    const json = JSON.stringify({
      name: 'commit',
      description: 'Generate a git commit message',
      version: '1.0.0',
      command: '/commit',
      triggers: ['/commit'],
      prompt: 'prompt.md',
      unknownField: 'should be stripped',
    });
    const manifest = parseManifest(json);
    assert.equal(manifest.name, 'commit');
    assert.equal((manifest as Record<string, unknown>)['unknownField'], undefined);
  });
});
