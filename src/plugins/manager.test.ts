import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PluginManager } from './manager.js';
import type { LoadedPlugin } from './types.js';

function makePlugin(name: string, overrides: Partial<LoadedPlugin> = {}): LoadedPlugin {
  return {
    manifest: {
      name,
      version: '1.0.0',
      description: `Plugin ${name}`,
      ...overrides.manifest,
    },
    directory: overrides.directory ?? `/fake/${name}`,
    enabled: overrides.enabled ?? true,
  };
}

describe('PluginManager', () => {
  let manager: PluginManager;

  beforeEach(() => {
    manager = new PluginManager();
  });

  describe('register', () => {
    it('registers a plugin', () => {
      const plugin = makePlugin('test');
      manager.register(plugin);
      assert.equal(manager.getAll().length, 1);
      assert.equal(manager.getAll()[0].manifest.name, 'test');
    });

    it('throws on duplicate plugin name', () => {
      manager.register(makePlugin('dup'));
      assert.throws(() => manager.register(makePlugin('dup')), /already registered/);
    });
  });

  describe('enable / disable', () => {
    it('disables an enabled plugin', () => {
      manager.register(makePlugin('a'));
      const result = manager.disable('a');
      assert.equal(result, true);
      assert.equal(manager.getEnabled().length, 0);
    });

    it('returns false when disabling non-existent plugin', () => {
      assert.equal(manager.disable('nope'), false);
    });

    it('enables a disabled plugin', () => {
      manager.register(makePlugin('a', { enabled: false }));
      assert.equal(manager.getEnabled().length, 0);
      const result = manager.enable('a');
      assert.equal(result, true);
      assert.equal(manager.getEnabled().length, 1);
    });

    it('returns false when enabling non-existent plugin', () => {
      assert.equal(manager.enable('nope'), false);
    });
  });

  describe('getAll / getEnabled', () => {
    it('getAll returns all plugins regardless of enabled state', () => {
      manager.register(makePlugin('a'));
      manager.register(makePlugin('b', { enabled: false }));
      assert.equal(manager.getAll().length, 2);
    });

    it('getEnabled returns only enabled plugins', () => {
      manager.register(makePlugin('a'));
      manager.register(makePlugin('b', { enabled: false }));
      const enabled = manager.getEnabled();
      assert.equal(enabled.length, 1);
      assert.equal(enabled[0].manifest.name, 'a');
    });
  });

  describe('getHooks', () => {
    it('returns empty array when no plugins have hooks', () => {
      manager.register(makePlugin('a'));
      assert.deepEqual(manager.getHooks(), []);
    });

    it('collects hooks from enabled plugins only', () => {
      const hook1 = { event: 'PreToolUse' as const, type: 'command' as const, command: 'echo 1' };
      const hook2 = { event: 'Stop' as const, type: 'command' as const, command: 'echo 2' };

      manager.register(makePlugin('a', {
        manifest: { name: 'a', version: '1.0.0', description: 'a', hooks: [hook1] },
      }));
      manager.register(makePlugin('b', {
        manifest: { name: 'b', version: '1.0.0', description: 'b', hooks: [hook2] },
        enabled: false,
      }));

      const hooks = manager.getHooks();
      assert.equal(hooks.length, 1);
      assert.equal(hooks[0].event, 'PreToolUse');
    });
  });

  describe('getAgents', () => {
    it('returns empty array when no plugins have agents', () => {
      manager.register(makePlugin('a'));
      assert.deepEqual(manager.getAgents(), []);
    });

    it('collects agents from enabled plugins only', () => {
      const agent1 = { name: 'agent1', description: 'Agent 1' };
      const agent2 = { name: 'agent2', description: 'Agent 2' };

      manager.register(makePlugin('a', {
        manifest: { name: 'a', version: '1.0.0', description: 'a', agents: [agent1] },
      }));
      manager.register(makePlugin('b', {
        manifest: { name: 'b', version: '1.0.0', description: 'b', agents: [agent2] },
        enabled: false,
      }));

      const agents = manager.getAgents();
      assert.equal(agents.length, 1);
      assert.equal(agents[0].name, 'agent1');
    });
  });

  describe('getMcpServers', () => {
    it('returns empty object when no plugins have MCP servers', () => {
      manager.register(makePlugin('a'));
      assert.deepEqual(manager.getMcpServers(), {});
    });

    it('collects MCP servers from enabled plugins only', () => {
      manager.register(makePlugin('a', {
        manifest: {
          name: 'a', version: '1.0.0', description: 'a',
          mcpServers: {
            server1: { command: 'node', args: ['s1.js'], env: {} },
          },
        },
      }));
      manager.register(makePlugin('b', {
        manifest: {
          name: 'b', version: '1.0.0', description: 'b',
          mcpServers: {
            server2: { command: 'node', args: ['s2.js'], env: {} },
          },
        },
        enabled: false,
      }));

      const servers = manager.getMcpServers();
      assert.ok(servers['server1']);
      assert.equal(servers['server2'], undefined);
    });

    it('merges servers from multiple enabled plugins', () => {
      manager.register(makePlugin('a', {
        manifest: {
          name: 'a', version: '1.0.0', description: 'a',
          mcpServers: { s1: { command: 'a', args: [], env: {} } },
        },
      }));
      manager.register(makePlugin('b', {
        manifest: {
          name: 'b', version: '1.0.0', description: 'b',
          mcpServers: { s2: { command: 'b', args: [], env: {} } },
        },
      }));

      const servers = manager.getMcpServers();
      assert.ok(servers['s1']);
      assert.ok(servers['s2']);
    });
  });

  describe('reload', () => {
    it('clears and re-registers plugins from loader', async () => {
      manager.register(makePlugin('old'));
      assert.equal(manager.getAll().length, 1);

      // reload with a loader that returns different plugins
      const mockLoader = {
        scanPlugins: async () => [makePlugin('new')],
        parseManifest: () => ({ name: '', version: '', description: '' }),
      };

      await manager.reload(mockLoader as any);
      assert.equal(manager.getAll().length, 1);
      assert.equal(manager.getAll()[0].manifest.name, 'new');
    });
  });
});
