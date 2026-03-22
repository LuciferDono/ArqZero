import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface HookDefinition {
  event: string;
  command: string;
}

export interface Settings {
  permissions?: {
    allow?: string[];
    deny?: string[];
    ask?: string[];
  };
  env?: Record<string, string>;
  hooks?: HookDefinition[];
  mcpServers?: Record<string, unknown>;
}

function loadSettingsFile(filePath: string): Settings | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as Settings;
  } catch {
    return null;
  }
}

function mergeSettings(user: Settings, project: Settings): Settings {
  const merged: Settings = {};

  // Merge permissions: project overrides user, but deny is always merged (union)
  if (user.permissions || project.permissions) {
    const userPerms = user.permissions ?? {};
    const projPerms = project.permissions ?? {};

    merged.permissions = {
      allow: projPerms.allow ?? userPerms.allow,
      // Deny always wins: union of both
      deny: [...new Set([...(userPerms.deny ?? []), ...(projPerms.deny ?? [])])],
      ask: projPerms.ask ?? userPerms.ask,
    };
  }

  // Merge env: project overrides user
  if (user.env || project.env) {
    merged.env = { ...(user.env ?? {}), ...(project.env ?? {}) };
  }

  // Hooks: project overrides user
  if (project.hooks ?? user.hooks) {
    merged.hooks = project.hooks ?? user.hooks;
  }

  // MCP servers: project overrides user
  if (user.mcpServers || project.mcpServers) {
    merged.mcpServers = { ...(user.mcpServers ?? {}), ...(project.mcpServers ?? {}) };
  }

  return merged;
}

export function loadSettings(cwd: string): Settings {
  const userPath = path.join(os.homedir(), '.arqzero', 'settings.json');
  const projectPath = path.join(cwd, '.arqzero', 'settings.json');

  const userSettings = loadSettingsFile(userPath);
  const projectSettings = loadSettingsFile(projectPath);

  if (!userSettings && !projectSettings) return {};
  if (!userSettings) return projectSettings!;
  if (!projectSettings) return userSettings;

  return mergeSettings(userSettings, projectSettings);
}
