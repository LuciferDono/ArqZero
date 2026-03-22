import { z } from 'zod';

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

export const AppConfigSchema = z.object({
  provider: z.literal('fireworks'),
  model: z.string().default('accounts/fireworks/models/llama-v3p3-70b-instruct'),
  fireworksApiKey: z.string(),
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

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type McpServerConfig = z.infer<typeof McpServerSchema>;
