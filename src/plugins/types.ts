import type { HookDefinition } from '../hooks/types.js';
import type { McpServerConfig } from '../config/schema.js';
import type { AgentDefinition } from '../agents/types.js';

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  skills?: string[];                    // relative paths to skill dirs
  agents?: AgentDefinition[];           // inline agent definitions
  hooks?: HookDefinition[];             // inline hook definitions
  mcpServers?: Record<string, McpServerConfig>;
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  directory: string;
  enabled: boolean;
}
