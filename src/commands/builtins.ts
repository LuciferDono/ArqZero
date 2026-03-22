import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { SlashCommand, SlashCommandContext } from './registry.js';
import { MemoryStore } from '../memory/store.js';
import { rewindToCheckpoint, formatCheckpointList } from '../checkpoints/rewind.js';
import { parseDuration } from '../cli/cron.js';
import { pluginCommands } from './plugin-commands.js';

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

export const rewindCommand: SlashCommand = {
  name: '/rewind',
  description: 'List checkpoints or rewind to a checkpoint',
  async execute(args: string, ctx: SlashCommandContext): Promise<string> {
    const store = ctx.checkpointStore;
    if (!store) {
      return 'Checkpoint store not available.';
    }

    if (!args) {
      return formatCheckpointList(store.getAll());
    }

    const targetId = parseInt(args.trim(), 10);
    if (isNaN(targetId)) {
      return `Invalid checkpoint id: "${args.trim()}". Usage: /rewind <id>`;
    }

    const cp = store.getById(targetId);
    if (!cp) {
      return `Checkpoint ${targetId} not found.`;
    }

    const result = rewindToCheckpoint(store, targetId);
    const fileList = result.restoredFiles.map((f) => `  • ${f}`).join('\n');
    return `Rewound ${result.checkpointsRewound} checkpoint(s). Restored files:\n${fileList}`;
  },
};

export const contextCommand: SlashCommand = {
  name: '/context',
  description: 'Show context window usage',
  async execute(_args: string, ctx: SlashCommandContext): Promise<string> {
    const cw = ctx.contextWindow;
    if (!cw) {
      return 'Context window not available.';
    }
    const summary = cw.getUsageSummary();
    const barLen = 20;
    const filled = Math.round((summary.percent / 100) * barLen);
    const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barLen - filled);
    const inputK = Math.round(summary.input / 1000);
    const maxK = Math.round(summary.max / 1000);
    return `Context: [${bar}] ${summary.percent}% (${inputK}k / ${maxK}k tokens)`;
  },
};

export const costCommand: SlashCommand = {
  name: '/cost',
  description: 'Show session cost estimate',
  async execute(_args: string, ctx: SlashCommandContext): Promise<string> {
    const usage = ctx.tokenUsage ?? { inputTokens: 0, outputTokens: 0 };
    const cost = ctx.costEstimate ?? 0;
    const inputFmt = usage.inputTokens.toLocaleString();
    const outputFmt = usage.outputTokens.toLocaleString();
    return `Session cost: $${cost.toFixed(3)}\nTokens: ${inputFmt} input / ${outputFmt} output`;
  },
};

export const effortCommand: SlashCommand = {
  name: '/effort',
  description: 'Set reasoning effort (low/medium/high)',
  async execute(args: string, ctx: SlashCommandContext): Promise<string> {
    const valid = ['low', 'medium', 'high'];
    const level = args.trim().toLowerCase();
    if (!level) {
      const current = ctx.effort ?? 'medium';
      return `Current effort: ${current}`;
    }
    if (!valid.includes(level)) {
      return `Invalid effort level: "${level}". Use: low, medium, high`;
    }
    ctx.onEffortChange?.(level);
    return `Effort set to: ${level}`;
  },
};

export const permissionsCommand: SlashCommand = {
  name: '/permissions',
  description: 'Show current permission rules',
  async execute(_args: string, ctx: SlashCommandContext): Promise<string> {
    const perms = ctx.config.permissions;
    const lines = [
      `Default mode: ${perms.defaultMode}`,
      `Always allow: ${perms.alwaysAllow.length > 0 ? perms.alwaysAllow.join(', ') : '(none)'}`,
      `Always deny:  ${perms.alwaysDeny.length > 0 ? perms.alwaysDeny.join(', ') : '(none)'}`,
    ];
    const patternKeys = Object.keys(perms.trustedPatterns);
    if (patternKeys.length > 0) {
      lines.push('Trusted patterns:');
      for (const key of patternKeys) {
        lines.push(`  ${key}: ${perms.trustedPatterns[key].join(', ')}`);
      }
    } else {
      lines.push('Trusted patterns: (none)');
    }
    return lines.join('\n');
  },
};

export const toolsCommand: SlashCommand = {
  name: '/tools',
  description: 'List all available tools',
  async execute(_args: string, ctx: SlashCommandContext): Promise<string> {
    const registry = ctx.toolRegistry;
    if (!registry) {
      return 'Tool registry not available.';
    }
    const tools = registry.getAll();
    if (tools.length === 0) {
      return 'No tools registered.';
    }
    const lines = tools.map(
      (t) => `  ${t.name}  [${t.permissionLevel}]  ${t.description}`,
    );
    return `Available tools (${tools.length}):\n${lines.join('\n')}`;
  },
};

export const statusCommand: SlashCommand = {
  name: '/status',
  description: 'Show version, provider, and model info',
  async execute(_args: string, ctx: SlashCommandContext): Promise<string> {
    let version = '0.1.0';
    try {
      const pkgPath = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..', '..', 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      version = pkg.version ?? version;
    } catch {
      // Use default version
    }
    const lines = [
      `ArqZero v${version}`,
      `Provider: ${ctx.config.provider}`,
      `Model: ${ctx.config.model}`,
      `Status: connected`,
    ];
    return lines.join('\n');
  },
};

export const exportCommand: SlashCommand = {
  name: '/export',
  description: 'Export conversation to a markdown file',
  async execute(args: string, ctx: SlashCommandContext): Promise<string> {
    const messages = ctx.messages ?? [];
    if (messages.length === 0) {
      return 'No messages to export.';
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = args.trim() || `arqzero-export-${timestamp}.md`;

    const lines: string[] = [`# ArqZero Conversation Export`, ``, `Exported: ${new Date().toISOString()}`, ``];

    for (const msg of messages) {
      const role = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : msg.role;
      const content = typeof msg.content === 'string'
        ? msg.content
        : msg.content
            .filter((b) => b.type === 'text' && b.text)
            .map((b) => b.text)
            .join('\n');
      if (content) {
        lines.push(`## ${role}`, ``, content, ``);
      }
    }

    fs.writeFileSync(filename, lines.join('\n'), 'utf-8');
    return `Conversation exported to: ${filename}`;
  },
};

export const doctorCommand: SlashCommand = {
  name: '/doctor',
  description: 'Check installation health',
  async execute(_args: string, ctx: SlashCommandContext): Promise<string> {
    const lines: string[] = ['ArqZero Health Check', ''];

    // Config file
    const configDir = path.join(os.homedir(), '.arqzero');
    const configFile = path.join(configDir, 'config.json');
    lines.push(`Config dir:    ${fs.existsSync(configDir) ? 'OK' : 'MISSING'} (${configDir})`);
    lines.push(`Config file:   ${fs.existsSync(configFile) ? 'OK' : 'MISSING'}`);

    // Provider
    lines.push(`Provider:      ${ctx.config.provider}`);
    lines.push(`API key:       ${ctx.config.fireworksApiKey ? 'set' : 'MISSING'}`);

    // Tools
    const toolCount = ctx.toolRegistry?.getAll().length ?? 0;
    lines.push(`Tools:         ${toolCount} registered`);

    // MCP servers
    const mcpCount = Object.keys(ctx.config.mcpServers).length;
    lines.push(`MCP servers:   ${mcpCount} configured`);

    return lines.join('\n');
  },
};

export const initCommand: SlashCommand = {
  name: '/init',
  description: 'Generate ARQZERO.md in current directory',
  async execute(_args: string, _ctx: SlashCommandContext): Promise<string> {
    const filePath = path.join(process.cwd(), 'ARQZERO.md');
    if (fs.existsSync(filePath)) {
      return `ARQZERO.md already exists in ${process.cwd()}. Not overwriting.`;
    }

    const template = [
      '# Project Instructions',
      '',
      '## Overview',
      'Describe your project here.',
      '',
      '## Conventions',
      '- Add coding conventions and patterns',
      '',
      '## Important Files',
      '- List key files and their purposes',
      '',
      '## Notes',
      '- Additional context for the AI assistant',
      '',
    ].join('\n');

    fs.writeFileSync(filePath, template, 'utf-8');
    return `Created ARQZERO.md in ${process.cwd()}`;
  },
};

export const agentsCommand: SlashCommand = {
  name: '/agents',
  description: 'List custom agents',
  async execute(_args: string, _ctx: SlashCommandContext): Promise<string> {
    const agentsDir = path.join(os.homedir(), '.arqzero', 'agents');
    if (!fs.existsSync(agentsDir)) {
      return 'No agents directory found. Create ~/.arqzero/agents/ to add custom agents.';
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(agentsDir, { withFileTypes: true });
    } catch {
      return 'Could not read agents directory.';
    }

    const dirs = entries.filter((e) => e.isDirectory());
    if (dirs.length === 0) {
      return 'No agents found in ~/.arqzero/agents/';
    }

    const lines = dirs.map((d) => `  ${d.name}`);
    return `Available agents (${dirs.length}):\n${lines.join('\n')}`;
  },
};

export const loopCommand: SlashCommand = {
  name: '/loop',
  description: 'Create recurring prompt execution',
  async execute(args: string, ctx: SlashCommandContext): Promise<string> {
    const manager = ctx.cronManager;
    if (!manager) {
      return 'Loop manager not available.';
    }

    const trimmed = args.trim();

    if (!trimmed || trimmed === 'list') {
      const jobs = manager.list();
      if (jobs.length === 0) {
        return 'No active loops.';
      }
      const lines = jobs.map((j) => `  #${j.id}  every ${j.intervalMs / 1000}s  "${j.prompt}"`);
      return `Active loops (${jobs.length}):\n${lines.join('\n')}`;
    }

    if (trimmed === 'stop') {
      manager.stopAll();
      return 'All loops stopped.';
    }

    // Parse: /loop <interval> <prompt>
    const spaceIdx = trimmed.indexOf(' ');
    if (spaceIdx === -1) {
      return 'Usage: /loop <interval> <prompt>  (e.g., /loop 5m check build)';
    }

    const intervalStr = trimmed.slice(0, spaceIdx);
    const prompt = trimmed.slice(spaceIdx + 1).trim();

    const ms = parseDuration(intervalStr);
    if (ms === null) {
      return `Invalid interval: "${intervalStr}". Use format like 30s, 5m, 2h`;
    }

    if (!prompt) {
      return 'Usage: /loop <interval> <prompt>';
    }

    const id = manager.add(ms, prompt, async () => {
      // In a real implementation, this would send the prompt to the engine
    });

    return `Loop #${id} created: "${prompt}" every ${intervalStr}`;
  },
};

export const vimCommand: SlashCommand = {
  name: '/vim',
  description: 'Toggle vim mode',
  async execute(_args: string, ctx: SlashCommandContext): Promise<string> {
    const newState = !(ctx.vimMode ?? false);
    ctx.onVimToggle?.(newState);
    return `Vim mode: ${newState ? 'enabled' : 'disabled'}`;
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
  rewindCommand,
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
  ...pluginCommands,
];
