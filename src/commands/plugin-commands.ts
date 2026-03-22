import type { SlashCommand, SlashCommandContext } from './registry.js';

export const reloadPluginsCommand: SlashCommand = {
  name: '/reload-plugins',
  description: 'Reload all plugins from disk',
  async execute(_args: string, ctx: SlashCommandContext): Promise<string> {
    const manager = ctx.pluginManager;
    if (!manager) {
      return 'Plugin manager not available.';
    }

    const loader = ctx.pluginLoader;
    if (!loader) {
      return 'Plugin loader not available.';
    }

    await manager.reload(loader);
    const count = manager.getAll().length;
    return `Reloaded ${count} plugin(s).`;
  },
};

export const pluginCommand: SlashCommand = {
  name: '/plugin',
  description: 'Manage plugins (disable/enable <name>, or list)',
  async execute(args: string, ctx: SlashCommandContext): Promise<string> {
    const manager = ctx.pluginManager;
    if (!manager) {
      return 'Plugin manager not available.';
    }

    if (!args) {
      const plugins = manager.getAll();
      if (plugins.length === 0) {
        return 'No plugins registered.';
      }
      const lines = plugins.map(
        (p) => `  ${p.enabled ? '[on] ' : '[off]'} ${p.manifest.name} v${p.manifest.version} - ${p.manifest.description}`,
      );
      return `Plugins:\n${lines.join('\n')}`;
    }

    const parts = args.trim().split(/\s+/);
    const subcommand = parts[0];
    const name = parts[1];

    if (subcommand === 'disable') {
      if (!name) return 'Usage: /plugin disable <name>';
      const result = manager.disable(name);
      return result ? `Plugin "${name}" disabled.` : `Plugin "${name}" not found.`;
    }

    if (subcommand === 'enable') {
      if (!name) return 'Usage: /plugin enable <name>';
      const result = manager.enable(name);
      return result ? `Plugin "${name}" enabled.` : `Plugin "${name}" not found.`;
    }

    return `Unknown subcommand "${subcommand}". Use: disable, enable, or no args to list.`;
  },
};

export const pluginCommands: SlashCommand[] = [
  reloadPluginsCommand,
  pluginCommand,
];
