import type { LoadedPlugin } from './types.js';
import type { HookDefinition } from '../hooks/types.js';
import type { AgentDefinition } from '../agents/types.js';
import type { McpServerConfig } from '../config/schema.js';
import type { PluginLoader } from './loader.js';

export class PluginManager {
  private plugins: Map<string, LoadedPlugin> = new Map();

  register(plugin: LoadedPlugin): void {
    const name = plugin.manifest.name;
    if (this.plugins.has(name)) {
      throw new Error(`Plugin "${name}" is already registered`);
    }
    this.plugins.set(name, plugin);
  }

  disable(name: string): boolean {
    const plugin = this.plugins.get(name);
    if (!plugin) return false;
    plugin.enabled = false;
    return true;
  }

  enable(name: string): boolean {
    const plugin = this.plugins.get(name);
    if (!plugin) return false;
    plugin.enabled = true;
    return true;
  }

  getAll(): LoadedPlugin[] {
    return [...this.plugins.values()];
  }

  getEnabled(): LoadedPlugin[] {
    return [...this.plugins.values()].filter((p) => p.enabled);
  }

  getHooks(): HookDefinition[] {
    const hooks: HookDefinition[] = [];
    for (const plugin of this.getEnabled()) {
      if (plugin.manifest.hooks) {
        hooks.push(...plugin.manifest.hooks);
      }
    }
    return hooks;
  }

  getAgents(): AgentDefinition[] {
    const agents: AgentDefinition[] = [];
    for (const plugin of this.getEnabled()) {
      if (plugin.manifest.agents) {
        agents.push(...plugin.manifest.agents);
      }
    }
    return agents;
  }

  getMcpServers(): Record<string, McpServerConfig> {
    const servers: Record<string, McpServerConfig> = {};
    for (const plugin of this.getEnabled()) {
      if (plugin.manifest.mcpServers) {
        Object.assign(servers, plugin.manifest.mcpServers);
      }
    }
    return servers;
  }

  async reload(loader: PluginLoader): Promise<void> {
    this.plugins.clear();
    const plugins = await loader.scanPlugins();
    for (const plugin of plugins) {
      this.register(plugin);
    }
  }
}
