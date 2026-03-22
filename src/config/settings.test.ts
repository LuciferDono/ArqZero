import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadSettings, type Settings } from './settings.js';

describe('loadSettings', () => {
  let tmpDir: string;
  let userDir: string;
  let projectDir: string;
  let origHome: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arq-settings-'));
    userDir = path.join(tmpDir, 'home', '.arqzero');
    projectDir = path.join(tmpDir, 'project', '.arqzero');
    origHome = os.homedir();
    // Override homedir
    (os as { homedir: () => string }).homedir = () => path.join(tmpDir, 'home');
  });

  afterEach(() => {
    (os as { homedir: () => string }).homedir = () => origHome;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty settings when no files exist', () => {
    const cwd = path.join(tmpDir, 'project');
    const settings = loadSettings(cwd);
    assert.deepEqual(settings.permissions, undefined);
    assert.deepEqual(settings.env, undefined);
    assert.deepEqual(settings.mcpServers, undefined);
  });

  it('loads user-level settings', () => {
    fs.mkdirSync(userDir, { recursive: true });
    const userSettings: Settings = {
      permissions: { allow: ['Read', 'Glob'], deny: [], ask: ['Bash'] },
      env: { FOO: 'bar' },
    };
    fs.writeFileSync(path.join(userDir, 'settings.json'), JSON.stringify(userSettings));

    const cwd = path.join(tmpDir, 'project');
    const settings = loadSettings(cwd);
    assert.deepEqual(settings.permissions?.allow, ['Read', 'Glob']);
    assert.equal(settings.env?.FOO, 'bar');
  });

  it('loads project-level settings', () => {
    fs.mkdirSync(projectDir, { recursive: true });
    const projSettings: Settings = {
      permissions: { allow: ['Bash'], deny: ['Write'], ask: [] },
      env: { BAZ: 'qux' },
    };
    fs.writeFileSync(path.join(projectDir, 'settings.json'), JSON.stringify(projSettings));

    const cwd = path.join(tmpDir, 'project');
    const settings = loadSettings(cwd);
    assert.deepEqual(settings.permissions?.allow, ['Bash']);
    assert.deepEqual(settings.permissions?.deny, ['Write']);
    assert.equal(settings.env?.BAZ, 'qux');
  });

  it('merges project over user settings', () => {
    fs.mkdirSync(userDir, { recursive: true });
    fs.mkdirSync(projectDir, { recursive: true });

    const userSettings: Settings = {
      permissions: { allow: ['Read', 'Glob'], deny: [], ask: ['Bash'] },
      env: { FOO: 'bar', SHARED: 'user' },
    };
    const projSettings: Settings = {
      permissions: { allow: ['Bash'], deny: ['Write'], ask: [] },
      env: { SHARED: 'project', NEW: 'val' },
    };

    fs.writeFileSync(path.join(userDir, 'settings.json'), JSON.stringify(userSettings));
    fs.writeFileSync(path.join(projectDir, 'settings.json'), JSON.stringify(projSettings));

    const cwd = path.join(tmpDir, 'project');
    const settings = loadSettings(cwd);

    // Project allow overrides user allow
    assert.deepEqual(settings.permissions?.allow, ['Bash']);
    // Deny always wins — merged from both
    assert.deepEqual(settings.permissions?.deny, ['Write']);
    // Env merged with project winning
    assert.equal(settings.env?.FOO, 'bar');
    assert.equal(settings.env?.SHARED, 'project');
    assert.equal(settings.env?.NEW, 'val');
  });

  it('deny from user settings is preserved even when project does not have deny', () => {
    fs.mkdirSync(userDir, { recursive: true });
    fs.mkdirSync(projectDir, { recursive: true });

    const userSettings: Settings = {
      permissions: { allow: [], deny: ['DangerousTool'], ask: [] },
    };
    const projSettings: Settings = {
      permissions: { allow: ['Read'], deny: [], ask: [] },
    };

    fs.writeFileSync(path.join(userDir, 'settings.json'), JSON.stringify(userSettings));
    fs.writeFileSync(path.join(projectDir, 'settings.json'), JSON.stringify(projSettings));

    const cwd = path.join(tmpDir, 'project');
    const settings = loadSettings(cwd);

    // Deny from user is preserved (deny always wins)
    assert.ok(settings.permissions?.deny?.includes('DangerousTool'));
  });
});
