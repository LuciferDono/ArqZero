import { writeConfig, configExists } from './loader.js';
import type { AppConfig } from './schema.js';
import { PROVIDERS, getProviderMeta, listProviderIds, type ProviderId } from '../api/registry.js';

export function createDefaultConfig(
  providerId: ProviderId,
  apiKeys: string | string[],
  baseURL?: string,
  modelOverride?: string,
): AppConfig {
  const meta = getProviderMeta(providerId);
  const keys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];
  const apiKeysRecord: Record<string, string | string[]> = {};
  if (keys.length > 0 && keys.some((k) => k.length > 0)) {
    apiKeysRecord[providerId] = meta.supportsKeyFallback ? keys : keys[0];
  }

  const baseURLs: Record<string, string> = {};
  if (baseURL) baseURLs[providerId] = baseURL;

  const fireworksKey = providerId === 'fireworks' ? keys[0] : undefined;

  return {
    provider: providerId,
    model: modelOverride || meta.defaultModel,
    apiKeys: apiKeysRecord,
    baseURLs,
    fireworksApiKey: fireworksKey,
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

  console.log('\n  Choose a provider:\n');
  const ids = listProviderIds();
  ids.forEach((id, i) => {
    const m = PROVIDERS[id];
    console.log(`  ${(i + 1).toString().padStart(2, ' ')}. ${m.displayName.padEnd(28)} ${m.description}`);
  });
  console.log('');

  let providerId: ProviderId = 'fireworks';
  while (true) {
    const choice = await promptFn(`  Provider (1-${ids.length}, default 1): `);
    const trimmed = choice.trim();
    if (!trimmed) {
      providerId = ids[0];
      break;
    }
    const n = parseInt(trimmed, 10);
    if (Number.isFinite(n) && n >= 1 && n <= ids.length) {
      providerId = ids[n - 1];
      break;
    }
    console.log('  Invalid selection. Try again.');
  }

  const meta = getProviderMeta(providerId);
  console.log(`\n  Selected: ${meta.displayName}`);
  if (meta.keyUrl) console.log(`  Get a key: ${meta.keyUrl}`);

  let baseURL: string | undefined;
  if (providerId === 'custom') {
    baseURL = (await promptFn('  Base URL (e.g. https://api.example.com/v1): ')).trim();
    if (!baseURL) {
      throw new Error('Custom provider requires a base URL');
    }
  }

  let apiKeys: string[] = [];
  if (meta.requiresKey) {
    const first = (await promptFn(`  ${meta.displayName} API key: `)).trim();
    if (!first) throw new Error(`${meta.displayName} API key is required`);
    apiKeys.push(first);

    if (meta.supportsKeyFallback) {
      console.log('\n  OpenRouter supports a fallback key chain. Add backup keys for auto-rotation on rate-limit/credit/auth errors.');
      while (true) {
        const more = (await promptFn('  Add another key? (paste key or empty to finish): ')).trim();
        if (!more) break;
        apiKeys.push(more);
      }
    }
  } else {
    apiKeys = [''];
  }

  let modelOverride: string | undefined;
  if (providerId === 'custom') {
    modelOverride = (await promptFn(`  Default model (required for custom): `)).trim();
    if (!modelOverride) throw new Error('Custom provider requires a default model');
  }

  const config = createDefaultConfig(providerId, apiKeys, baseURL, modelOverride);
  writeConfig(config);
  return config;
}
