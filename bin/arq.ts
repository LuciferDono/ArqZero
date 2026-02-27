#!/usr/bin/env tsx
import React from 'react';
import { render } from 'ink';
import App from '../src/cli/app.js';
import { MockAdapter } from '../src/api/mock/adapter.js';
import { AnthropicAdapter } from '../src/api/anthropic/adapter.js';
import { CursorAdapter } from '../src/api/cursor/adapter.js';
import { configExists, loadConfig } from '../src/config/loader.js';
import { runInit } from '../src/config/init.js';
import { createInterface } from 'node:readline';
import type { LLMProvider } from '../src/api/provider.js';
import { ToolRegistry } from '../src/tools/registry.js';
import { builtinTools } from '../src/tools/builtins/index.js';

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
    console.log('Welcome to ArqZero! Let\'s set up your configuration.\n');
    await runInit(promptUser);
    console.log('\nConfiguration saved! Starting ArqZero...\n');
  }

  const config = loadConfig();

  let provider: LLMProvider;
  if (config.provider === 'cursor') {
    const adapter = new CursorAdapter();
    if (await adapter.isAvailable()) {
      provider = adapter;
    } else {
      console.log('Cursor not available. Falling back to mock adapter.');
      provider = new MockAdapter();
    }
  } else if (config.provider === 'anthropic' && config.anthropicApiKey) {
    provider = new AnthropicAdapter(config.anthropicApiKey);
  } else {
    provider = new MockAdapter();
  }

  const registry = new ToolRegistry();
  for (const tool of builtinTools) {
    registry.register(tool);
  }

  render(React.createElement(App, { provider, config, registry }));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
