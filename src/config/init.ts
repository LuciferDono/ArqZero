import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { writeConfig, configExists } from './loader.js';
import type { AppConfig } from './schema.js';

function getCursorDbPath(): string {
  const platform = process.platform;
  if (platform === 'win32') {
    return path.join(
      process.env.APPDATA || '',
      'Cursor', 'User', 'globalStorage', 'state.vscdb'
    );
  } else if (platform === 'darwin') {
    return path.join(
      os.homedir(),
      'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'state.vscdb'
    );
  }
  return path.join(
    os.homedir(),
    '.config', 'Cursor', 'User', 'globalStorage', 'state.vscdb'
  );
}

export function detectCursorInstallation(): boolean {
  return fs.existsSync(getCursorDbPath());
}

export { getCursorDbPath };

export function createDefaultConfig(
  provider: 'cursor' | 'anthropic',
  anthropicApiKey?: string
): AppConfig {
  return {
    provider,
    model: 'claude-4-sonnet',
    anthropicApiKey,
    maxTokens: 8192,
    permissions: {
      defaultMode: 'ask',
      alwaysAllow: ['Read', 'Glob', 'Grep'],
      alwaysDeny: [],
      trustedPatterns: {
        Bash: ['npm test', 'npm run *', 'git status', 'git diff', 'git log'],
      },
    },
    mcpServers: {},
    bash: {
      defaultTimeout: 30000,
      maxTimeout: 600000,
    },
  };
}

export async function runInit(
  promptFn: (question: string) => Promise<string>
): Promise<AppConfig> {
  if (configExists()) {
    throw new Error('Config already exists');
  }

  const hasCursor = detectCursorInstallation();

  let provider: 'cursor' | 'anthropic';
  let apiKey: string | undefined;

  if (hasCursor) {
    const answer = await promptFn(
      'Cursor installation detected. Use Cursor as LLM provider? (y/n): '
    );
    provider = answer.toLowerCase().startsWith('y') ? 'cursor' : 'anthropic';
  } else {
    provider = 'anthropic';
  }

  if (provider === 'anthropic') {
    apiKey = await promptFn('Enter your Anthropic API key: ');
    if (!apiKey.trim()) {
      throw new Error('Anthropic API key is required');
    }
  }

  const config = createDefaultConfig(provider, apiKey);
  writeConfig(config);
  return config;
}
