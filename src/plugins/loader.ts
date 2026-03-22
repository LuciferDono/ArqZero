import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { PluginManifest, LoadedPlugin } from './types.js';

const HookDefinitionSchema = z.object({
  event: z.enum([
    'PreToolUse', 'PostToolUse', 'PostToolUseFailure',
    'UserPromptSubmit', 'Stop', 'DispatchStop',
    'SessionStart', 'SessionEnd',
    'PreCompact', 'PostCompact',
    'Notification',
  ]),
  type: z.enum(['command', 'http']),
  command: z.string().optional(),
  url: z.string().optional(),
  timeout: z.number().optional(),
  matchTools: z.array(z.string()).optional(),
});

const AgentDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  systemPrompt: z.string().optional(),
  allowedTools: z.array(z.string()).optional(),
  model: z.string().optional(),
});

const McpServerConfigSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).default([]),
  env: z.record(z.string(), z.string()).default({}),
});

const PluginManifestSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  skills: z.array(z.string()).optional(),
  agents: z.array(AgentDefinitionSchema).optional(),
  hooks: z.array(HookDefinitionSchema).optional(),
  mcpServers: z.record(z.string(), McpServerConfigSchema).optional(),
});

export class PluginLoader {
  constructor(private baseDir: string) {}

  async scanPlugins(): Promise<LoadedPlugin[]> {
    if (!fs.existsSync(this.baseDir)) {
      return [];
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(this.baseDir, { withFileTypes: true });
    } catch {
      return [];
    }

    const plugins: LoadedPlugin[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const pluginDir = path.join(this.baseDir, entry.name);
      const manifestPath = path.join(pluginDir, 'plugin.json');

      if (!fs.existsSync(manifestPath)) {
        continue;
      }

      try {
        const manifestJson = fs.readFileSync(manifestPath, 'utf-8');
        const manifest = this.parseManifest(manifestJson);
        plugins.push({
          manifest,
          directory: pluginDir,
          enabled: true,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`Skipping plugin "${entry.name}": ${message}`);
      }
    }

    return plugins;
  }

  parseManifest(jsonString: string): PluginManifest {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new Error('Invalid JSON in plugin manifest');
    }

    const result = PluginManifestSchema.safeParse(parsed);
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `  ${i.path.join('.')}: ${i.message}`)
        .join('\n');
      throw new Error(`Invalid plugin manifest:\n${issues}`);
    }

    return result.data;
  }
}
