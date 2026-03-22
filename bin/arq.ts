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
  if (!configExists()) {
    console.log('Welcome to ArqCode! Let\'s set up your configuration.\n');
    await runInit(promptUser);
    console.log('\nConfiguration saved! Starting ArqCode...\n');
  }

  const config = loadConfig();

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

  render(React.createElement(App, { provider, config, registry }));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
