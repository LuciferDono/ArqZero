import type { SlashCommand, SlashCommandContext } from './registry.js';
import { MemoryStore } from '../memory/store.js';

export const helpCommand: SlashCommand = {
  name: '/help',
  description: 'List all available commands',
  async execute(_args: string, ctx: SlashCommandContext): Promise<string> {
    const commands = ctx.commandRegistry?.getAll() ?? [];
    if (commands.length === 0) {
      return 'No commands available.';
    }
    const lines = commands.map((cmd) => `  ${cmd.name}  ${cmd.description}`);
    return `Available commands:\n${lines.join('\n')}`;
  },
};

export const modelCommand: SlashCommand = {
  name: '/model',
  description: 'Show or change current model',
  async execute(args: string, ctx: SlashCommandContext): Promise<string> {
    if (!args) {
      return `Current model: ${ctx.config.model}`;
    }
    ctx.onModelChange?.(args);
    return `Model set to: ${args}`;
  },
};

export const clearCommand: SlashCommand = {
  name: '/clear',
  description: 'Clear conversation history',
  async execute(_args: string, ctx: SlashCommandContext): Promise<string> {
    ctx.onClear?.();
    return 'Conversation cleared.';
  },
};

export const compactCommand: SlashCommand = {
  name: '/compact',
  description: 'Trigger manual compaction',
  async execute(_args: string, ctx: SlashCommandContext): Promise<string> {
    ctx.onCompact?.();
    return 'Compaction triggered.';
  },
};

export const configCommand: SlashCommand = {
  name: '/config',
  description: 'Show current configuration',
  async execute(_args: string, ctx: SlashCommandContext): Promise<string> {
    const { config } = ctx;
    const lines = [
      `Provider:     ${config.provider}`,
      `Model:        ${config.model}`,
      `Permissions:  ${config.permissions.defaultMode}`,
      `Max tokens:   ${config.maxTokens}`,
    ];
    return lines.join('\n');
  },
};

export const quitCommand: SlashCommand = {
  name: '/quit',
  description: 'Exit the CLI',
  async execute(_args: string, ctx: SlashCommandContext): Promise<string | null> {
    ctx.onQuit?.();
    return null;
  },
};

export const skillCommand: SlashCommand = {
  name: '/skill',
  description: 'List skills or show skill details',
  async execute(args: string, ctx: SlashCommandContext): Promise<string> {
    const registry = ctx.skillRegistry;

    if (!registry) {
      return 'No skills available (skill registry not configured).';
    }

    if (!args) {
      const skills = registry.getAll();
      if (skills.length === 0) {
        return 'No skills registered.';
      }
      const lines = skills.map(
        (s) => `  ${s.manifest.command}  ${s.manifest.description}`,
      );
      return `Available skills:\n${lines.join('\n')}`;
    }

    // Normalize: accept both "commit" and "/commit"
    const query = args.startsWith('/') ? args : `/${args}`;
    const skill = registry.get(query);

    if (!skill) {
      return `Skill "${args}" not found.`;
    }

    const lines = [
      `Name:        ${skill.manifest.name}`,
      `Command:     ${skill.manifest.command}`,
      `Description: ${skill.manifest.description}`,
      `Version:     ${skill.manifest.version}`,
      `Triggers:    ${skill.manifest.triggers.join(', ')}`,
    ];
    return lines.join('\n');
  },
};

export const memoryCommand: SlashCommand = {
  name: '/memory',
  description: 'List memories or show a specific memory',
  async execute(args: string, _ctx: SlashCommandContext): Promise<string> {
    const store = new MemoryStore();

    if (!args) {
      const all = store.loadAll();
      if (all.length === 0) {
        return 'No memories stored.';
      }
      const lines = all.map((m) => `  ${m.name} (${m.type}): ${m.description}`);
      return `Stored memories:\n${lines.join('\n')}`;
    }

    const mem = store.load(args.trim());
    if (!mem) {
      return `Memory "${args.trim()}" not found.`;
    }

    return [
      `Name:        ${mem.name}`,
      `Type:        ${mem.type}`,
      `Description: ${mem.description}`,
      ``,
      mem.content,
    ].join('\n');
  },
};

export const builtinCommands: SlashCommand[] = [
  helpCommand,
  modelCommand,
  clearCommand,
  compactCommand,
  configCommand,
  quitCommand,
  skillCommand,
  memoryCommand,
];
