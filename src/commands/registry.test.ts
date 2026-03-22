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
  contextCommand,
  costCommand,
  effortCommand,
  permissionsCommand,
  toolsCommand,
  statusCommand,
  exportCommand,
  doctorCommand,
  initCommand,
  agentsCommand,
  loopCommand,
  vimCommand,
  builtinCommands,
} from './builtins.js';
import { SkillRegistry } from '../skills/commands.js';
import type { LoadedSkill } from '../skills/parser.js';
import type { AppConfig } from '../config/schema.js';
import { ContextWindow } from '../session/context.js';
import { ToolRegistry } from '../tools/registry.js';
import { CronManager } from '../cli/cron.js';
import type { Tool } from '../tools/types.js';
import fs from 'node:fs';
import path from 'node:path';

function createMockCommand(overrides: Partial<SlashCommand> = {}): SlashCommand {
  return {
    name: overrides.name ?? '/test',
    description: overrides.description ?? 'A test command',
    execute: overrides.execute ?? (async () => 'test output'),
  };
}

function createMockConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    provider: 'fireworks',
    model: 'accounts/fireworks/models/glm-4p7',
    fireworksApiKey: 'test-key',
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
      assert.ok(output.includes('/compress'));
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
      assert.ok(output.includes('accounts/fireworks/models/glm-4p7'));
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

  describe('/compress', () => {
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
      assert.ok(output.includes('fireworks'));
      assert.ok(output.includes('accounts/fireworks/models/glm-4p7'));
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
    it('should contain all 23 built-in commands', () => {
      assert.equal(builtinCommands.length, 23);
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

  describe('/context', () => {
    it('should show context window usage', async () => {
      const cw = new ContextWindow({ maxContextTokens: 200000 });
      cw.trackUsage({ inputTokens: 96000, outputTokens: 4000 });
      const ctx = createMockContext({ contextWindow: cw });
      const output = await contextCommand.execute('', ctx);
      assert.ok(output);
      assert.ok(output.includes('48%'));
      assert.ok(output.includes('96k'));
      assert.ok(output.includes('200k'));
    });

    it('should handle missing context window', async () => {
      const ctx = createMockContext();
      const output = await contextCommand.execute('', ctx);
      assert.ok(output);
      assert.ok(output.includes('not available'));
    });
  });

  describe('/cost', () => {
    it('should show cost and token usage', async () => {
      const ctx = createMockContext({
        tokenUsage: { inputTokens: 4200, outputTokens: 1800 },
        costEstimate: 0.012,
      });
      const output = await costCommand.execute('', ctx);
      assert.ok(output);
      assert.ok(output.includes('$0.012'));
      assert.ok(output.includes('input'));
      assert.ok(output.includes('output'));
    });

    it('should show zeros when no usage', async () => {
      const ctx = createMockContext();
      const output = await costCommand.execute('', ctx);
      assert.ok(output);
      assert.ok(output.includes('$0.000'));
    });
  });

  describe('/think', () => {
    it('should set effort level', async () => {
      let setTo = '';
      const ctx = createMockContext({ onEffortChange: (l) => { setTo = l; } });
      const output = await effortCommand.execute('high', ctx);
      assert.ok(output);
      assert.ok(output.includes('high'));
      assert.equal(setTo, 'high');
    });

    it('should reject invalid level', async () => {
      const ctx = createMockContext();
      const output = await effortCommand.execute('turbo', ctx);
      assert.ok(output);
      assert.ok(output.includes('Invalid'));
    });

    it('should show current level when no args', async () => {
      const ctx = createMockContext({ effort: 'low' });
      const output = await effortCommand.execute('', ctx);
      assert.ok(output);
      assert.ok(output.includes('low'));
    });
  });

  describe('/permissions', () => {
    it('should show permission rules', async () => {
      const ctx = createMockContext();
      const output = await permissionsCommand.execute('', ctx);
      assert.ok(output);
      assert.ok(output.includes('ask'));
      assert.ok(output.includes('Read'));
      assert.ok(output.includes('Glob'));
      assert.ok(output.includes('Grep'));
    });
  });

  describe('/tools', () => {
    it('should list tools from registry', async () => {
      const toolRegistry = new ToolRegistry();
      const mockTool: Tool = {
        name: 'Read',
        description: 'Read a file',
        inputSchema: {},
        permissionLevel: 'safe',
        execute: async () => ({ content: '' }),
      };
      toolRegistry.register(mockTool);

      const ctx = createMockContext({ toolRegistry });
      const output = await toolsCommand.execute('', ctx);
      assert.ok(output);
      assert.ok(output.includes('Read'));
      assert.ok(output.includes('safe'));
    });

    it('should handle missing tool registry', async () => {
      const ctx = createMockContext();
      const output = await toolsCommand.execute('', ctx);
      assert.ok(output);
      assert.ok(output.includes('not available'));
    });
  });

  describe('/status', () => {
    it('should show provider and model', async () => {
      const ctx = createMockContext();
      const output = await statusCommand.execute('', ctx);
      assert.ok(output);
      assert.ok(output.includes('ArqZero'));
      assert.ok(output.includes('fireworks'));
      assert.ok(output.includes('connected'));
    });
  });

  describe('/export', () => {
    it('should export messages to file', async () => {
      const messages = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there' },
      ];
      const ctx = createMockContext({ messages });
      const filename = `test-export-${Date.now()}.md`;
      try {
        const output = await exportCommand.execute(filename, ctx);
        assert.ok(output);
        assert.ok(output.includes(filename));
        const content = fs.readFileSync(filename, 'utf-8');
        assert.ok(content.includes('Hello'));
        assert.ok(content.includes('Hi there'));
      } finally {
        try { fs.unlinkSync(filename); } catch {}
      }
    });

    it('should report when no messages', async () => {
      const ctx = createMockContext({ messages: [] });
      const output = await exportCommand.execute('', ctx);
      assert.ok(output);
      assert.ok(output.includes('No messages'));
    });
  });

  describe('/check', () => {
    it('should show health check info', async () => {
      const ctx = createMockContext();
      const output = await doctorCommand.execute('', ctx);
      assert.ok(output);
      assert.ok(output.includes('Health Check'));
      assert.ok(output.includes('Provider'));
      assert.ok(output.includes('API key'));
    });
  });

  describe('/setup', () => {
    it('should not overwrite existing file', async () => {
      const testPath = path.join(process.cwd(), 'ARQZERO.md');
      const existed = fs.existsSync(testPath);
      if (!existed) {
        fs.writeFileSync(testPath, 'existing', 'utf-8');
      }
      try {
        const ctx = createMockContext();
        const output = await initCommand.execute('', ctx);
        assert.ok(output);
        assert.ok(output.includes('already exists'));
      } finally {
        if (!existed) {
          try { fs.unlinkSync(testPath); } catch {}
        }
      }
    });
  });

  describe('/agents', () => {
    it('should handle missing agents directory', async () => {
      const ctx = createMockContext();
      const output = await agentsCommand.execute('', ctx);
      assert.ok(output);
      assert.equal(typeof output, 'string');
    });
  });

  describe('/loop', () => {
    it('should create a loop', async () => {
      const manager = new CronManager();
      const ctx = createMockContext({ cronManager: manager });
      try {
        const output = await loopCommand.execute('5m check build', ctx);
        assert.ok(output);
        assert.ok(output.includes('Loop #'));
        assert.ok(output.includes('check build'));
        assert.equal(manager.list().length, 1);
      } finally {
        manager.stopAll();
      }
    });

    it('should list loops', async () => {
      const manager = new CronManager();
      manager.add(60000, 'test job', async () => {});
      const ctx = createMockContext({ cronManager: manager });
      try {
        const output = await loopCommand.execute('list', ctx);
        assert.ok(output);
        assert.ok(output.includes('test job'));
      } finally {
        manager.stopAll();
      }
    });

    it('should stop all loops', async () => {
      const manager = new CronManager();
      manager.add(60000, 'test job', async () => {});
      const ctx = createMockContext({ cronManager: manager });
      const output = await loopCommand.execute('stop', ctx);
      assert.ok(output);
      assert.ok(output.includes('stopped'));
      assert.equal(manager.list().length, 0);
    });

    it('should reject invalid interval', async () => {
      const manager = new CronManager();
      const ctx = createMockContext({ cronManager: manager });
      const output = await loopCommand.execute('xyz check build', ctx);
      assert.ok(output);
      assert.ok(output.includes('Invalid'));
    });

    it('should handle missing manager', async () => {
      const ctx = createMockContext();
      const output = await loopCommand.execute('5m test', ctx);
      assert.ok(output);
      assert.ok(output.includes('not available'));
    });
  });

  describe('/vim', () => {
    it('should toggle vim mode', async () => {
      let toggled = false;
      const ctx = createMockContext({
        vimMode: false,
        onVimToggle: (v) => { toggled = v; },
      });
      const output = await vimCommand.execute('', ctx);
      assert.ok(output);
      assert.ok(output.includes('enabled'));
      assert.equal(toggled, true);
    });

    it('should toggle off when already on', async () => {
      let toggled = true;
      const ctx = createMockContext({
        vimMode: true,
        onVimToggle: (v) => { toggled = v; },
      });
      const output = await vimCommand.execute('', ctx);
      assert.ok(output);
      assert.ok(output.includes('disabled'));
      assert.equal(toggled, false);
    });
  });
});
