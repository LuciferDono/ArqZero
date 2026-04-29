// src/api/factory.ts
//
// Single entry point that turns an AppConfig into a live LLMProvider.
// Dispatches by provider id to the correct adapter and resolves keys via
// the registry's standard env var as a fallback when the config doesn't
// supply one.
import type { LLMProvider } from './provider.js';
import type { AppConfig } from '../config/schema.js';
import { getProviderKeys } from '../config/schema.js';
import { getProviderMeta, isValidProviderId } from './registry.js';
import { OpenAICompatAdapter } from './openai-compat/adapter.js';
import { AnthropicAdapter } from './anthropic/adapter.js';
import { OpenRouterAdapter } from './openrouter/adapter.js';

export class ProviderConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderConfigError';
  }
}

export interface BuildProviderOptions {
  /** Override which provider to build, ignoring config.provider */
  providerOverride?: string;
}

/**
 * Resolve API key(s) for a provider, with environment-variable fallback.
 * For OpenRouter, returns the entire fallback chain. For others, returns
 * a single-element array.
 */
export function resolveKeys(config: AppConfig, providerId: string): string[] {
  const fromConfig = getProviderKeys(config, providerId);
  if (fromConfig.length > 0 && fromConfig.some((k) => k.length > 0)) {
    return fromConfig.filter((k) => k.length > 0);
  }
  if (!isValidProviderId(providerId)) return [];
  const meta = getProviderMeta(providerId);
  const envValue = process.env[meta.keyEnvVar];
  if (envValue) {
    // Allow a comma-delimited list in the env var for OpenRouter convenience.
    if (meta.supportsKeyFallback && envValue.includes(',')) {
      return envValue.split(',').map((k) => k.trim()).filter(Boolean);
    }
    return [envValue];
  }
  return [];
}

export function buildProvider(
  config: AppConfig,
  opts: BuildProviderOptions = {},
): LLMProvider {
  const providerId = opts.providerOverride || config.provider || 'fireworks';

  if (!isValidProviderId(providerId)) {
    throw new ProviderConfigError(
      `Unknown provider "${providerId}". Run /provider to switch, or edit ~/.arqzero/config.json.`,
    );
  }

  const meta = getProviderMeta(providerId);
  const keys = resolveKeys(config, providerId);
  const baseURL = config.baseURLs?.[providerId] || meta.baseURL;

  if (meta.requiresKey && keys.length === 0) {
    throw new ProviderConfigError(
      `No API key found for ${meta.displayName}. ` +
      `Set ${meta.keyEnvVar} or run /provider to configure one.`,
    );
  }

  if (providerId === 'openrouter') {
    return new OpenRouterAdapter({
      apiKeys: keys,
      baseURL,
      defaultModel: config.model || meta.defaultModel,
      appTitle: 'ArqZero',
    });
  }

  if (providerId === 'anthropic') {
    return new AnthropicAdapter(keys[0] || '', baseURL);
  }

  if (providerId === 'custom' && !baseURL) {
    throw new ProviderConfigError(
      'Custom provider requires baseURLs.custom in config. ' +
      'Run /provider or edit ~/.arqzero/config.json.',
    );
  }

  return new OpenAICompatAdapter({
    providerName: providerId,
    apiKey: keys[0] || '',
    baseURL,
    defaultModel: config.model || meta.defaultModel,
    defaultMaxTokens: config.maxTokens,
  });
}
