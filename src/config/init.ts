import { writeConfig, configExists } from './loader.js';
import type { AppConfig } from './schema.js';

const DEFAULT_MODEL = 'accounts/fireworks/models/llama-v3p3-70b-instruct';

export function createDefaultConfig(fireworksApiKey: string): AppConfig {
  return {
    provider: 'fireworks',
    model: DEFAULT_MODEL,
    fireworksApiKey,
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

  const apiKey = await promptFn('Enter your Fireworks AI API key: ');
  if (!apiKey.trim()) {
    throw new Error('Fireworks API key is required');
  }

  const config = createDefaultConfig(apiKey.trim());
  writeConfig(config);
  return config;
}
