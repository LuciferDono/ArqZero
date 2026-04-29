import { z } from 'zod';
import { listProviderIds } from '../api/registry.js';

export const McpServerSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).default([]),
  env: z.record(z.string(), z.string()).default({}),
});

export const PermissionsSchema = z.object({
  defaultMode: z.enum(['ask', 'trust', 'locked']).default('ask'),
  alwaysAllow: z.array(z.string()).default(['Read', 'Glob', 'Grep']),
  alwaysDeny: z.array(z.string()).default([]),
  trustedPatterns: z.record(z.string(), z.array(z.string())).default({}),
});

const PROVIDER_IDS = listProviderIds() as [string, ...string[]];

/**
 * apiKeys: per-provider key storage. A string for single-key providers,
 * an array of strings for OpenRouter (fallback chain).
 */
export const ApiKeysSchema = z.record(
  z.string(),
  z.union([z.string(), z.array(z.string()).min(1)]),
);

export const RawAppConfigSchema = z.object({
  provider: z.enum(PROVIDER_IDS).default('fireworks'),
  model: z.string().default('accounts/fireworks/models/glm-4p7'),
  apiKeys: ApiKeysSchema.default({}),
  /** Optional per-provider baseURL override (used by `custom`, or anyone running a proxy) */
  baseURLs: z.record(z.string(), z.string()).default({}),
  /** Legacy field; auto-migrated into apiKeys.fireworks on load */
  fireworksApiKey: z.string().optional(),
  tavilyApiKey: z.string().optional(),
  maxTokens: z.number().default(8192),
  permissions: PermissionsSchema.default({
    defaultMode: 'ask',
    alwaysAllow: ['Read', 'Glob', 'Grep'],
    alwaysDeny: [],
    trustedPatterns: {},
  }),
  mcpServers: z.record(z.string(), McpServerSchema).default({}),
  bash: z.object({
    defaultTimeout: z.number().default(30000),
    maxTimeout: z.number().default(600000),
  }).default({
    defaultTimeout: 30000,
    maxTimeout: 600000,
  }),
});

export type RawAppConfig = z.infer<typeof RawAppConfigSchema>;

/**
 * Migrate a parsed raw config into its canonical shape:
 *   - hoist legacy `fireworksApiKey` into `apiKeys.fireworks`
 *   - guarantee `apiKeys` exists
 */
export function migrateConfig(raw: RawAppConfig): AppConfig {
  const apiKeys = { ...(raw.apiKeys ?? {}) } as Record<string, string | string[]>;
  if (raw.fireworksApiKey && !apiKeys.fireworks) {
    apiKeys.fireworks = raw.fireworksApiKey;
  }
  // Maintain legacy alias so existing code paths still work.
  const fireworksKey = apiKeys.fireworks;
  const fireworksApiKey = typeof fireworksKey === 'string'
    ? fireworksKey
    : Array.isArray(fireworksKey) ? fireworksKey[0] : undefined;
  return {
    provider: raw.provider,
    model: raw.model,
    apiKeys,
    baseURLs: raw.baseURLs ?? {},
    fireworksApiKey,
    tavilyApiKey: raw.tavilyApiKey,
    maxTokens: raw.maxTokens,
    permissions: raw.permissions,
    mcpServers: raw.mcpServers,
    bash: raw.bash,
  };
}

export interface AppConfig {
  provider: string;
  model: string;
  apiKeys: Record<string, string | string[]>;
  baseURLs: Record<string, string>;
  tavilyApiKey?: string;
  maxTokens: number;
  permissions: z.infer<typeof PermissionsSchema>;
  mcpServers: Record<string, z.infer<typeof McpServerSchema>>;
  bash: { defaultTimeout: number; maxTimeout: number };
  /**
   * @deprecated Read from apiKeys.fireworks instead. Kept for legacy code paths
   * during migration; will be removed in a future release.
   */
  fireworksApiKey?: string;
}

export const AppConfigSchema = RawAppConfigSchema.transform(migrateConfig);

export type McpServerConfig = z.infer<typeof McpServerSchema>;

/** Helper: read first key for a provider, normalising single-string to array */
export function getProviderKeys(config: AppConfig, providerId: string): string[] {
  const entry = config.apiKeys?.[providerId];
  if (!entry) return [];
  return Array.isArray(entry) ? entry : [entry];
}
