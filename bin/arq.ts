#!/usr/bin/env tsx
import React from 'react';
import { render } from 'ink';
import App from '../src/cli/app.js';
import { MockAdapter } from '../src/api/mock/adapter.js';
import { FireworksAdapter } from '../src/api/fireworks/adapter.js';
import { configExists, loadConfig } from '../src/config/loader.js';
import { runInit } from '../src/config/init.js';
import { createInterface } from 'node:readline';
import type { LLMProvider } from '../src/api/provider.js';
import { ToolRegistry } from '../src/tools/registry.js';
import type { ToolContext, PermissionRequest, PermissionResponse } from '../src/tools/types.js';
import { builtinTools } from '../src/tools/builtins/index.js';
import { McpClientManager } from '../src/mcp/client.js';
import { registerMcpTools } from '../src/mcp/bridge.js';
import { buildSystemPrompt } from '../src/core/system-prompt.js';
import { SlashCommandRegistry } from '../src/commands/registry.js';
import { builtinCommands } from '../src/commands/builtins.js';
import { parseArgs } from '../src/cli/args.js';
import { runHeadless } from '../src/cli/headless.js';
import { AgentRunner } from '../src/agents/runner.js';
import { setAgentRunner } from '../src/tools/builtins/task.js';
import { WorktreeManager } from '../src/worktrees/manager.js';
import { loadCustomCommands } from '../src/commands/custom-loader.js';
import { listSessions, loadSession, sessionExists } from '../src/session/history.js';
import type { Message } from '../src/api/types.js';
import { loadSettings } from '../src/config/settings.js';
import { loadEnvOverrides } from '../src/config/env.js';
import { initRuntime } from '../src/config/runtime.js';
import { resolveAuthState } from '../src/auth/license.js';

async function promptUser(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Handle --worktree: create/reuse worktree and switch cwd
  if (args.worktree) {
    const { spawnSync } = await import('node:child_process');
    const repoRoot = spawnSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: process.cwd(),
      encoding: 'utf-8',
    });
    if (repoRoot.status !== 0) {
      console.error('Error: --worktree requires a git repository');
      process.exit(1);
    }
    const root = repoRoot.stdout.trim();
    const manager = new WorktreeManager(root);
    if (!manager.exists(args.worktree)) {
      const info = manager.create(args.worktree);
      console.log(`Worktree created: ${info.path} (branch: ${info.branch})`);
    } else {
      console.log(`Using existing worktree: ${manager.getPath(args.worktree)}`);
    }
    process.chdir(manager.getPath(args.worktree));
  }

  if (!configExists()) {
    console.log('Welcome to ArqZero! Let\'s set up your configuration.\n');
    await runInit(promptUser);
    console.log('\nConfiguration saved! Starting ArqZero...\n');
  }

  const config = loadConfig();

  // Load settings (user + project) and env overrides
  const settings = loadSettings(process.cwd());
  const envOverrides = loadEnvOverrides();

  // Apply settings env vars to process.env
  if (settings.env) {
    Object.assign(process.env, settings.env);
  }

  // Apply settings to config (settings override config defaults)
  if (settings.model) config.model = settings.model;
  if (settings.maxTokens) config.maxTokens = settings.maxTokens;

  // Apply env overrides (env vars override settings)
  if (envOverrides.model) config.model = envOverrides.model;
  if (envOverrides.maxTokens) config.maxTokens = envOverrides.maxTokens;
  if (envOverrides.apiKey && !config.fireworksApiKey) {
    config.fireworksApiKey = envOverrides.apiKey;
  }

  // Apply CLI overrides (highest priority)
  if (args.model) {
    config.model = args.model;
  }

  // Resolve auth state (tier + email)
  const { tier: authTier } = await resolveAuthState();

  // Initialize runtime config for components
  initRuntime({
    reducedMotion: envOverrides.reducedMotion || settings.reducedMotion || false,
    syntaxHighlightingDisabled: envOverrides.syntaxHighlightingDisabled || settings.syntaxHighlightingDisabled || false,
    verbose: envOverrides.verbose || false,
    theme: settings.theme ?? 'dark',
    tier: authTier,
  });

  let provider: LLMProvider;
  if (config.fireworksApiKey) {
    try {
      const adapter = new FireworksAdapter(config.fireworksApiKey);
      if (await adapter.isAvailable()) {
        provider = adapter;
      } else {
        console.error('Warning: Fireworks API key is invalid or the API is unreachable.');
        console.error('Falling back to mock adapter. Run "arqzero --help" or edit ~/.arqzero/config.json to fix.\n');
        provider = new MockAdapter();
      }
    } catch (err) {
      console.error(`Error connecting to Fireworks API: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Falling back to mock adapter.\n');
      provider = new MockAdapter();
    }
  } else {
    console.error('Note: No API key configured. Using mock adapter. Set FIREWORKS_API_KEY or run setup.\n');
    provider = new MockAdapter();
  }

  const registry = new ToolRegistry();
  for (const tool of builtinTools) {
    registry.register(tool);
  }

  // Connect to configured MCP servers
  const mcpManager = new McpClientManager();
  if (config.mcpServers && Object.keys(config.mcpServers).length > 0) {
    for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
      try {
        const tools = await mcpManager.connect(name, serverConfig);
        console.log(`MCP: Connected to ${name} (${tools.length} tools)`);
      } catch (err) {
        console.error(
          `MCP: Failed to connect to ${name}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    const mcpToolCount = registerMcpTools(mcpManager, registry);
    if (mcpToolCount > 0) {
      console.log(`MCP: Registered ${mcpToolCount} tools`);
    }
  }

  // Cleanup MCP connections on exit
  process.on('exit', () => {
    mcpManager.disconnectAll().catch(() => {});
  });

  // Handle SIGINT gracefully (suppress error output on Ctrl+C)
  process.on('SIGINT', () => {
    mcpManager.disconnectAll().catch(() => {});
    process.exit(0);
  });

  // Wire --auto-approve flag
  if (args.autoApprove) {
    config.permissions.defaultMode = 'trust';
    process.stderr.write('⚠ Auto-approve enabled: all tool permissions bypassed\n');
  }

  // Initialize sub-agent system.
  // Sub-agents auto-approve all tool permissions intentionally: they operate
  // within the scope already approved by the parent conversation.
  const toolContext: ToolContext = {
    cwd: process.cwd(),
    config,
    promptUser: async (_req: PermissionRequest): Promise<PermissionResponse> => ({ allowed: true }),
  };
  const agentRunnerInstance = new AgentRunner(provider, registry, toolContext, config.model);
  toolContext.agentRunner = agentRunnerInstance;
  setAgentRunner(agentRunnerInstance);

  const systemPrompt = buildSystemPrompt(process.cwd());

  // Session resume
  let initialMessages: Message[] | undefined;
  let resumedSessionId: string | undefined;

  if (args.resume) {
    // Explicit --resume <id>
    if (!sessionExists(args.resume)) {
      console.error(`Error: session "${args.resume}" not found.`);
      process.exit(1);
    }
    const msgs = loadSession(args.resume);
    if (msgs && msgs.length > 0) {
      initialMessages = msgs;
      resumedSessionId = args.resume;
    }
  } else if (args.continue) {
    // -c: auto-resume latest session
    const { listSessionsWithInfo } = await import('../src/session/history.js');
    const sessions = listSessionsWithInfo();
    if (sessions.length === 0) {
      console.error('Error: no sessions to continue.');
      process.exit(1);
    }
    const latest = sessions[0]; // already sorted newest first
    const msgs = loadSession(latest.id);
    if (msgs && msgs.length > 0) {
      initialMessages = msgs;
      resumedSessionId = latest.id;
    }
  } else if (!args.print) {
    // Interactive mode — show session picker if sessions exist
    const { listSessionsWithInfo } = await import('../src/session/history.js');
    const sessions = listSessionsWithInfo();

    if (sessions.length > 0) {
      console.log('\n  \x1b[36m◆ ArqZero\x1b[0m\n');
      console.log('  \x1b[90mExisting sessions:\x1b[0m\n');

      const display = sessions.slice(0, 10);
      display.forEach((s, i) => {
        const date = s.lastModified.toLocaleDateString();
        const time = s.lastModified.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        const compacted = s.hasCompaction ? ' [compacted]' : '';
        console.log(`  \x1b[36m${i + 1}.\x1b[0m ${s.id.slice(0, 8)}  \x1b[90m${date} ${time}  ${s.messageCount} msgs${compacted}\x1b[0m`);
      });

      console.log(`\n  \x1b[36m0.\x1b[0m Start new session\n`);

      const answer = await promptUser('  Choose (0-' + display.length + '): ');
      const choice = parseInt(answer.trim());

      if (choice > 0 && choice <= display.length) {
        const chosen = display[choice - 1];
        const msgs = loadSession(chosen.id);
        if (msgs && msgs.length > 0) {
          initialMessages = msgs;
          resumedSessionId = chosen.id;
          console.log(`\n  Resuming session ${chosen.id.slice(0, 8)}...\n`);
        }
      } else {
        console.log('\n  Starting new session...\n');
      }
    }
  }

  // Headless mode: -p / --print
  if (args.print) {
    const outputFormat = args.outputFormat ?? 'text';
    await runHeadless({
      prompt: args.print,
      provider,
      config,
      registry,
      systemPrompt,
      outputFormat,
    });
    process.exit(0);
  }

  // Interactive mode
  const commandRegistry = new SlashCommandRegistry();
  for (const cmd of builtinCommands) {
    commandRegistry.register(cmd);
  }

  // Register custom commands
  const customCommands = loadCustomCommands(process.cwd());
  for (const cmd of customCommands) {
    commandRegistry.register(cmd);
  }

  render(React.createElement(App, {
    provider,
    config,
    registry,
    systemPrompt,
    commandRegistry,
    initialMessages,
    resumedSessionId,
  }));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
