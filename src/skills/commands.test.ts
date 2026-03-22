import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SkillRegistry } from './commands.js';
import type { LoadedSkill } from './parser.js';

function createMockSkill(overrides: Partial<LoadedSkill> = {}): LoadedSkill {
  return {
    manifest: {
      name: 'commit',
      description: 'Generate a git commit message',
      version: '1.0.0',
      command: '/commit',
      triggers: ['/commit'],
      prompt: 'prompt.md',
      ...overrides.manifest,
    },
    promptContent: overrides.promptContent ?? 'You are a commit message generator.',
    directory: overrides.directory ?? '/home/user/.arqcode/skills/commit',
  };
}

describe('SkillRegistry', () => {
  let registry: SkillRegistry;

  beforeEach(() => {
    registry = new SkillRegistry();
  });

  describe('register', () => {
    it('should register a skill', () => {
      const skill = createMockSkill();
      registry.register(skill);
      assert.equal(registry.has('/commit'), true);
    });

    it('should register multiple skills', () => {
      registry.register(createMockSkill());
      registry.register(createMockSkill({
        manifest: {
          name: 'review',
          description: 'Code review',
          version: '1.0.0',
          command: '/review',
          triggers: ['/review'],
          prompt: 'prompt.md',
        },
        promptContent: 'You are a code reviewer.',
        directory: '/home/user/.arqcode/skills/review',
      }));
      assert.equal(registry.has('/commit'), true);
      assert.equal(registry.has('/review'), true);
    });

    it('should throw when registering duplicate command', () => {
      registry.register(createMockSkill());
      assert.throws(
        () => registry.register(createMockSkill()),
        { message: /already registered/ },
      );
    });
  });

  describe('has', () => {
    it('should return true for registered command', () => {
      registry.register(createMockSkill());
      assert.equal(registry.has('/commit'), true);
    });

    it('should return false for unregistered command', () => {
      assert.equal(registry.has('/nonexistent'), false);
    });
  });

  describe('get', () => {
    it('should return skill for registered command', () => {
      const skill = createMockSkill();
      registry.register(skill);

      const retrieved = registry.get('/commit');
      assert.ok(retrieved);
      assert.equal(retrieved.manifest.name, 'commit');
      assert.equal(retrieved.promptContent, 'You are a commit message generator.');
    });

    it('should return undefined for unregistered command', () => {
      const result = registry.get('/nonexistent');
      assert.equal(result, undefined);
    });
  });

  describe('getAll', () => {
    it('should return empty array when no skills registered', () => {
      const all = registry.getAll();
      assert.equal(all.length, 0);
    });

    it('should return all registered skills', () => {
      registry.register(createMockSkill());
      registry.register(createMockSkill({
        manifest: {
          name: 'review',
          description: 'Code review',
          version: '1.0.0',
          command: '/review',
          triggers: ['/review'],
          prompt: 'prompt.md',
        },
        promptContent: 'Review prompt',
        directory: '/home/user/.arqcode/skills/review',
      }));

      const all = registry.getAll();
      assert.equal(all.length, 2);
    });
  });

  describe('getSystemPrompt', () => {
    it('should return prompt content for registered command', () => {
      registry.register(createMockSkill());

      const prompt = registry.getSystemPrompt('/commit');
      assert.equal(prompt, 'You are a commit message generator.');
    });

    it('should return null for unregistered command', () => {
      const prompt = registry.getSystemPrompt('/nonexistent');
      assert.equal(prompt, null);
    });
  });

  describe('getCommands', () => {
    it('should return empty array when no skills registered', () => {
      const commands = registry.getCommands();
      assert.equal(commands.length, 0);
    });

    it('should return all registered commands', () => {
      registry.register(createMockSkill());
      registry.register(createMockSkill({
        manifest: {
          name: 'review',
          description: 'Code review',
          version: '1.0.0',
          command: '/review',
          triggers: ['/review'],
          prompt: 'prompt.md',
        },
        promptContent: 'Review prompt',
        directory: '/home/user/.arqcode/skills/review',
      }));

      const commands = registry.getCommands();
      assert.equal(commands.length, 2);
      assert.ok(commands.includes('/commit'));
      assert.ok(commands.includes('/review'));
    });
  });
});
