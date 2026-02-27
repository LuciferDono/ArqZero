import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SlashCommandRegistry } from './registry.js';
import type { SlashCommand, SlashCommandContext } from './registry.js';
import {
  helpCommand,
  modelCommand,
  clearCommand,
  compactCommand,
  configCommand,
  quitCommand,
  skillCommand,
  builtinCommands,
} from './builtins.js';
import { SkillRegistry } from '../skills/commands.js';
import type { LoadedSkill } from '../skills/parser.js';
import type { AppConfig } from '../config/schema.js';

function createMockCommand(overrides: Partial<SlashCommand> = {}): SlashCommand {
  return {
    name: overrides.name ?? '/test',
    description: overrides.description ?? 'A test command',
    execute: overrides.execute ?? (async () => 'test output'),
  };
}

function createMockConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    provider: 'anthropic',
    model: 'claude-4-sonnet',
    maxTokens: 8192,
    permissions: {
      defaultMode: 'ask',
      alwaysAllow: ['Read', 'Glob', 'Grep'],
      alwaysDeny: [],
      trustedPatterns: {},
    },
    mcpServers: {},
    bash: {
      defaultTimeout: 30000,
      maxTimeout: 600000,
    },
    ...overrides,
  };
}

function createMockContext(overrides: Partial<SlashCommandContext> = {}): SlashCommandContext {
  return {
    config: createMockConfig(),
    ...overrides,
  };
}

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
    directory: overrides.directory ?? '/home/user/.arqzero/skills/commit',
  };
}

// ─── SlashCommandRegistry ────────────────────────────────────────────────

describe('SlashCommandRegistry', () => {
  let registry: SlashCommandRegistry;

  beforeEach(() => {
    registry = new SlashCommandRegistry();
  });

  describe('register', () => {
    it('should register a command', () => {
      const cmd = createMockCommand();
      registry.register(cmd);
      assert.equal(registry.has('/test'), true);
    });

    it('should register multiple commands', () => {
      registry.register(createMockCommand({ name: '/foo' }));
      registry.register(createMockCommand({ name: '/bar' }));
      assert.equal(registry.has('/foo'), true);
      assert.equal(registry.has('/bar'), true);
    });

    it('should overwrite a command with the same name', () => {
      registry.register(createMockCommand({ name: '/test', description: 'first' }));
      registry.register(createMockCommand({ name: '/test', description: 'second' }));
      const cmd = registry.get('/test');
      assert.equal(cmd?.description, 'second');
    });
  });

  describe('has', () => {
    it('should return true for a registered command', () => {
      registry.register(createMockCommand({ name: '/help' }));
      assert.equal(registry.has('/help'), true);
    });

    it('should return false for an unregistered command', () => {
      assert.equal(registry.has('/nonexistent'), false);
    });
  });

  describe('get', () => {
    it('should return the command for a registered name', () => {
      const cmd = createMockCommand({ name: '/help', description: 'Show help' });
      registry.register(cmd);

      const retrieved = registry.get('/help');
      assert.ok(retrieved);
      assert.equal(retrieved.name, '/help');
      assert.equal(retrieved.description, 'Show help');
    });

    it('should return undefined for an unregistered name', () => {
      assert.equal(registry.get('/nonexistent'), undefined);
    });
  });

  describe('getAll', () => {
    it('should return empty array when no commands registered', () => {
      assert.deepEqual(registry.getAll(), []);
    });

    it('should return all registered commands', () => {
      registry.register(createMockCommand({ name: '/foo' }));
      registry.register(createMockCommand({ name: '/bar' }));

      const all = registry.getAll();
      assert.equal(all.length, 2);
      const names = all.map((c) => c.name);
      assert.ok(names.includes('/foo'));
      assert.ok(names.includes('/bar'));
    });
  });

  describe('isSlashCommand', () => {
    it('should return true for input starting with /', () => {
      assert.equal(registry.isSlashCommand('/help'), true);
    });

    it('should return true for slash command with args', () => {
      assert.equal(registry.isSlashCommand('/model sonnet'), true);
    });

    it('should return false for regular text', () => {
      assert.equal(registry.isSlashCommand('hello world'), false);
    });

    it('should return false for empty string', () => {
      assert.equal(registry.isSlashCommand(''), false);
    });

    it('should return false for slash in middle of text', () => {
      assert.equal(registry.isSlashCommand('use /help for info'), false);
    });
  });

  describe('parse', () => {
    it('should parse a command without args', () => {
      const result = registry.parse('/help');
      assert.deepEqual(result, { name: '/help', args: '' });
    });

    it('should parse a command with args', () => {
      const result = registry.parse('/model sonnet');
      assert.deepEqual(result, { name: '/model', args: 'sonnet' });
    });

    it('should parse a command with multiple args', () => {
      const result = registry.parse('/skill commit details');
      assert.deepEqual(result, { name: '/skill', args: 'commit details' });
    });

    it('should trim whitespace from args', () => {
      const result = registry.parse('/model   sonnet  ');
      assert.deepEqual(result, { name: '/model', args: 'sonnet' });
    });

    it('should handle command with trailing whitespace', () => {
      const result = registry.parse('/help  ');
      assert.deepEqual(result, { name: '/help', args: '' });
    });
  });
});

// ─── Built-in Commands ───────────────────────────────────────────────────

describe('Built-in commands', () => {
  describe('/help', () => {
    it('should list all registered commands', async () => {
      const registry = new SlashCommandRegistry();
      for (const cmd of builtinCommands) {
        registry.register(cmd);
      }

      const ctx = createMockContext({ commandRegistry: registry });
      const output = await helpCommand.execute('', ctx);

      assert.ok(output);
      assert.ok(output.includes('/help'));
      assert.ok(output.includes('/model'));
      assert.ok(output.includes('/clear'));
      assert.ok(output.includes('/compact'));
      assert.ok(output.includes('/config'));
      assert.ok(output.includes('/quit'));
      assert.ok(output.includes('/skill'));
    });

    it('should show descriptions', async () => {
      const registry = new SlashCommandRegistry();
      registry.register(helpCommand);
      const ctx = createMockContext({ commandRegistry: registry });

      const output = await helpCommand.execute('', ctx);
      assert.ok(output);
      assert.ok(output.includes(helpCommand.description));
    });
  });

  describe('/model', () => {
    it('should show current model when no args given', async () => {
      const ctx = createMockContext();
      const output = await modelCommand.execute('', ctx);

      assert.ok(output);
      assert.ok(output.includes('claude-4-sonnet'));
    });

    it('should call onModelChange when args given', async () => {
      let changedTo = '';
      const ctx = createMockContext({
        onModelChange: (model: string) => { changedTo = model; },
      });

      const output = await modelCommand.execute('claude-4-opus', ctx);

      assert.equal(changedTo, 'claude-4-opus');
      assert.ok(output);
      assert.ok(output.includes('claude-4-opus'));
    });

    it('should indicate no callback when onModelChange not provided', async () => {
      const ctx = createMockContext();
      const output = await modelCommand.execute('claude-4-opus', ctx);

      assert.ok(output);
      // Should still report the model name even without callback
      assert.ok(output.includes('claude-4-opus'));
    });
  });

  describe('/clear', () => {
    it('should call onClear callback', async () => {
      let cleared = false;
      const ctx = createMockContext({
        onClear: () => { cleared = true; },
      });

      const output = await clearCommand.execute('', ctx);
      assert.equal(cleared, true);
      assert.ok(output);
      assert.ok(output.toLowerCase().includes('clear'));
    });

    it('should handle missing onClear callback', async () => {
      const ctx = createMockContext();
      const output = await clearCommand.execute('', ctx);
      // Should not throw, should return a message
      assert.ok(output);
    });
  });

  describe('/compact', () => {
    it('should call onCompact callback', async () => {
      let compacted = false;
      const ctx = createMockContext({
        onCompact: () => { compacted = true; },
      });

      const output = await compactCommand.execute('', ctx);
      assert.equal(compacted, true);
      assert.ok(output);
      assert.ok(output.toLowerCase().includes('compact'));
    });

    it('should handle missing onCompact callback', async () => {
      const ctx = createMockContext();
      const output = await compactCommand.execute('', ctx);
      assert.ok(output);
    });
  });

  describe('/config', () => {
    it('should show provider and model', async () => {
      const ctx = createMockContext();
      const output = await configCommand.execute('', ctx);

      assert.ok(output);
      assert.ok(output.includes('anthropic'));
      assert.ok(output.includes('claude-4-sonnet'));
    });

    it('should show permissions mode', async () => {
      const ctx = createMockContext();
      const output = await configCommand.execute('', ctx);

      assert.ok(output);
      assert.ok(output.includes('ask'));
    });
  });

  describe('/quit', () => {
    it('should call onQuit callback', async () => {
      let quit = false;
      const ctx = createMockContext({
        onQuit: () => { quit = true; },
      });

      const output = await quitCommand.execute('', ctx);
      assert.equal(quit, true);
      // quit may return null or a message
      if (output) {
        assert.equal(typeof output, 'string');
      }
    });

    it('should handle missing onQuit callback', async () => {
      const ctx = createMockContext();
      // Should not throw
      const output = await quitCommand.execute('', ctx);
      assert.ok(output === null || typeof output === 'string');
    });
  });

  describe('/skill', () => {
    it('should list all skills when no args given', async () => {
      const skillRegistry = new SkillRegistry();
      skillRegistry.register(createMockSkill());
      skillRegistry.register(createMockSkill({
        manifest: {
          name: 'review',
          description: 'Code review',
          version: '1.0.0',
          command: '/review',
          triggers: ['/review'],
          prompt: 'prompt.md',
        },
        promptContent: 'You are a code reviewer.',
        directory: '/home/user/.arqzero/skills/review',
      }));

      const ctx = createMockContext({ skillRegistry });
      const output = await skillCommand.execute('', ctx);

      assert.ok(output);
      assert.ok(output.includes('/commit'));
      assert.ok(output.includes('/review'));
    });

    it('should show skill details when name given', async () => {
      const skillRegistry = new SkillRegistry();
      skillRegistry.register(createMockSkill());

      const ctx = createMockContext({ skillRegistry });
      const output = await skillCommand.execute('/commit', ctx);

      assert.ok(output);
      assert.ok(output.includes('commit'));
      assert.ok(output.includes('Generate a git commit message'));
    });

    it('should handle skill lookup without leading slash', async () => {
      const skillRegistry = new SkillRegistry();
      skillRegistry.register(createMockSkill());

      const ctx = createMockContext({ skillRegistry });
      const output = await skillCommand.execute('commit', ctx);

      assert.ok(output);
      assert.ok(output.includes('commit'));
    });

    it('should report when no skills are registered', async () => {
      const skillRegistry = new SkillRegistry();
      const ctx = createMockContext({ skillRegistry });
      const output = await skillCommand.execute('', ctx);

      assert.ok(output);
      assert.ok(output.toLowerCase().includes('no skill'));
    });

    it('should report when skill registry is not available', async () => {
      const ctx = createMockContext();
      const output = await skillCommand.execute('', ctx);

      assert.ok(output);
      assert.ok(output.toLowerCase().includes('no skill'));
    });

    it('should report when skill is not found', async () => {
      const skillRegistry = new SkillRegistry();
      skillRegistry.register(createMockSkill());

      const ctx = createMockContext({ skillRegistry });
      const output = await skillCommand.execute('nonexistent', ctx);

      assert.ok(output);
      assert.ok(output.toLowerCase().includes('not found'));
    });
  });

  describe('builtinCommands array', () => {
    it('should contain all 7 built-in commands', () => {
      assert.equal(builtinCommands.length, 7);
    });

    it('should have unique names', () => {
      const names = builtinCommands.map((c) => c.name);
      const uniqueNames = new Set(names);
      assert.equal(uniqueNames.size, builtinCommands.length);
    });

    it('should all start with /', () => {
      for (const cmd of builtinCommands) {
        assert.ok(cmd.name.startsWith('/'), `${cmd.name} should start with /`);
      }
    });
  });
});
