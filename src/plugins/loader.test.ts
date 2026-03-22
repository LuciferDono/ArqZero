import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { PluginLoader } from './loader.js';

describe('PluginLoader', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-loader-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('parseManifest', () => {
    it('parses a valid minimal manifest', () => {
      const loader = new PluginLoader(tmpDir);
      const manifest = loader.parseManifest(JSON.stringify({
        name: 'my-plugin',
        version: '1.0.0',
        description: 'A test plugin',
      }));
      assert.equal(manifest.name, 'my-plugin');
      assert.equal(manifest.version, '1.0.0');
      assert.equal(manifest.description, 'A test plugin');
      assert.equal(manifest.skills, undefined);
      assert.equal(manifest.agents, undefined);
      assert.equal(manifest.hooks, undefined);
      assert.equal(manifest.mcpServers, undefined);
    });

    it('parses a manifest with all optional fields', () => {
      const loader = new PluginLoader(tmpDir);
      const manifest = loader.parseManifest(JSON.stringify({
        name: 'full-plugin',
        version: '2.0.0',
        description: 'Full plugin',
        skills: ['./skills/commit', './skills/review'],
        agents: [{ name: 'reviewer', description: 'Code reviewer' }],
        hooks: [{ event: 'PreToolUse', type: 'command', command: 'echo hello' }],
        mcpServers: {
          myServer: { command: 'node', args: ['server.js'], env: {} },
        },
      }));
      assert.equal(manifest.name, 'full-plugin');
      assert.deepEqual(manifest.skills, ['./skills/commit', './skills/review']);
      assert.equal(manifest.agents!.length, 1);
      assert.equal(manifest.agents![0].name, 'reviewer');
      assert.equal(manifest.hooks!.length, 1);
      assert.equal(manifest.hooks![0].event, 'PreToolUse');
      assert.ok(manifest.mcpServers);
      assert.equal(manifest.mcpServers!['myServer'].command, 'node');
    });

    it('throws on invalid JSON', () => {
      const loader = new PluginLoader(tmpDir);
      assert.throws(() => loader.parseManifest('not json'), /Invalid JSON/);
    });

    it('throws on missing required fields', () => {
      const loader = new PluginLoader(tmpDir);
      assert.throws(
        () => loader.parseManifest(JSON.stringify({ name: 'test' })),
        /Invalid plugin manifest/,
      );
    });

    it('throws on invalid hook event', () => {
      const loader = new PluginLoader(tmpDir);
      assert.throws(
        () => loader.parseManifest(JSON.stringify({
          name: 'bad',
          version: '1.0.0',
          description: 'bad',
          hooks: [{ event: 'InvalidEvent', type: 'command' }],
        })),
        /Invalid plugin manifest/,
      );
    });
  });

  describe('scanPlugins', () => {
    it('returns empty array when directory does not exist', async () => {
      const loader = new PluginLoader(path.join(tmpDir, 'nonexistent'));
      const plugins = await loader.scanPlugins();
      assert.deepEqual(plugins, []);
    });

    it('returns empty array when directory is empty', async () => {
      const loader = new PluginLoader(tmpDir);
      const plugins = await loader.scanPlugins();
      assert.deepEqual(plugins, []);
    });

    it('loads a single plugin with valid manifest', async () => {
      const pluginDir = path.join(tmpDir, 'my-plugin');
      fs.mkdirSync(pluginDir, { recursive: true });
      fs.writeFileSync(path.join(pluginDir, 'plugin.json'), JSON.stringify({
        name: 'my-plugin',
        version: '1.0.0',
        description: 'Test plugin',
      }));

      const loader = new PluginLoader(tmpDir);
      const plugins = await loader.scanPlugins();
      assert.equal(plugins.length, 1);
      assert.equal(plugins[0].manifest.name, 'my-plugin');
      assert.equal(plugins[0].directory, pluginDir);
      assert.equal(plugins[0].enabled, true);
    });

    it('loads multiple plugins', async () => {
      for (const name of ['alpha', 'beta']) {
        const dir = path.join(tmpDir, name);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'plugin.json'), JSON.stringify({
          name,
          version: '1.0.0',
          description: `Plugin ${name}`,
        }));
      }

      const loader = new PluginLoader(tmpDir);
      const plugins = await loader.scanPlugins();
      assert.equal(plugins.length, 2);
      const names = plugins.map((p) => p.manifest.name).sort();
      assert.deepEqual(names, ['alpha', 'beta']);
    });

    it('skips directories without plugin.json', async () => {
      fs.mkdirSync(path.join(tmpDir, 'no-manifest'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'no-manifest', 'readme.txt'), 'hello');

      const loader = new PluginLoader(tmpDir);
      const plugins = await loader.scanPlugins();
      assert.equal(plugins.length, 0);
    });

    it('skips plugins with invalid manifests', async () => {
      const dir = path.join(tmpDir, 'bad-plugin');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'plugin.json'), '{ invalid json }');

      const loader = new PluginLoader(tmpDir);
      const plugins = await loader.scanPlugins();
      assert.equal(plugins.length, 0);
    });

    it('skips non-directory entries', async () => {
      fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'not a dir');

      const loader = new PluginLoader(tmpDir);
      const plugins = await loader.scanPlugins();
      assert.equal(plugins.length, 0);
    });
  });
});
