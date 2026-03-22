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

  // Initialize runtime config for components
  initRuntime({
    reducedMotion: envOverrides.reducedMotion || settings.reducedMotion || false,
    syntaxHighlightingDisabled: envOverrides.syntaxHighlightingDisabled || settings.syntaxHighlightingDisabled || false,
    verbose: envOverrides.verbose || false,
    theme: settings.theme ?? 'dark',
  });

  let provider: LLMProvider;
  if (config.fireworksApiKey) {
    const adapter = new FireworksAdapter(config.fireworksApiKey);
    if (await adapter.isAvailable()) {
      provider = adapter;
    } else {
      console.log('Fireworks API key not available. Falling back to mock adapter.');
      provider = new MockAdapter();
    }
  } else {
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

  // Initialize sub-agent system
  const toolContext = {
    cwd: process.cwd(),
    config,
    promptUser: async (req: any) => ({ allowed: true } as any),
  };
  const agentRunner = new AgentRunner(provider, registry, toolContext, config.model);
  setAgentRunner(agentRunner);

  const systemPrompt = buildSystemPrompt(process.cwd());

  // Session resume
  let initialMessages: Message[] | undefined;
  let resumedSessionId: string | undefined;

  if (args.resume) {
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
    const sessions = listSessions();
    if (sessions.length === 0) {
      console.error('Error: no sessions to continue.');
      process.exit(1);
    }
    // listSessions returns file names; pick the most recent by file mtime
    const fs = await import('node:fs');
    const pathMod = await import('node:path');
    const os = await import('node:os');
    const sessDir = pathMod.default.join(os.default.homedir(), '.arqzero', 'sessions');
    let latestId = sessions[0];
    let latestTime = 0;
    for (const sid of sessions) {
      try {
        const stat = fs.default.statSync(pathMod.default.join(sessDir, `${sid}.jsonl`));
        if (stat.mtimeMs > latestTime) {
          latestTime = stat.mtimeMs;
          latestId = sid;
        }
      } catch {
        // skip
      }
    }
    const msgs = loadSession(latestId);
    if (msgs && msgs.length > 0) {
      initialMessages = msgs;
      resumedSessionId = latestId;
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
