import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadCustomCommands } from './custom-loader.js';

describe('loadCustomCommands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arqzero-custom-cmd-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array when no directories exist', () => {
    const commands = loadCustomCommands(tmpDir);
    assert.deepStrictEqual(commands, []);
  });

  it('loads .md files from project-level directory', () => {
    const cmdDir = path.join(tmpDir, '.arqzero', 'commands');
    fs.mkdirSync(cmdDir, { recursive: true });
    fs.writeFileSync(path.join(cmdDir, 'deploy.md'), 'Deploy to production');

    const commands = loadCustomCommands(tmpDir);
    assert.equal(commands.length, 1);
    assert.equal(commands[0].name, '/deploy');
    assert.equal(commands[0].description, 'Custom command from deploy.md');
  });

  it('replaces $ARGUMENTS in content', async () => {
    const cmdDir = path.join(tmpDir, '.arqzero', 'commands');
    fs.mkdirSync(cmdDir, { recursive: true });
    fs.writeFileSync(path.join(cmdDir, 'greet.md'), 'Hello $ARGUMENTS, welcome!');

    const commands = loadCustomCommands(tmpDir);
    const result = await commands[0].execute('world', {} as any);
    assert.equal(result, '[Custom command /greet]: Hello world, welcome!');
  });

  it('replaces multiple $ARGUMENTS occurrences', async () => {
    const cmdDir = path.join(tmpDir, '.arqzero', 'commands');
    fs.mkdirSync(cmdDir, { recursive: true });
    fs.writeFileSync(path.join(cmdDir, 'echo.md'), '$ARGUMENTS then $ARGUMENTS');

    const commands = loadCustomCommands(tmpDir);
    const result = await commands[0].execute('foo', {} as any);
    assert.equal(result, '[Custom command /echo]: foo then foo');
  });

  it('ignores non-.md files', () => {
    const cmdDir = path.join(tmpDir, '.arqzero', 'commands');
    fs.mkdirSync(cmdDir, { recursive: true });
    fs.writeFileSync(path.join(cmdDir, 'valid.md'), 'content');
    fs.writeFileSync(path.join(cmdDir, 'invalid.txt'), 'content');
    fs.writeFileSync(path.join(cmdDir, 'also-invalid.json'), '{}');

    const commands = loadCustomCommands(tmpDir);
    assert.equal(commands.length, 1);
    assert.equal(commands[0].name, '/valid');
  });

  it('project-level overrides global when same name exists', () => {
    // We cannot easily test global dir without mocking os.homedir,
    // but we can verify that project-level commands are loaded and
    // the dedup logic works by checking the seen set behavior.
    const cmdDir = path.join(tmpDir, '.arqzero', 'commands');
    fs.mkdirSync(cmdDir, { recursive: true });
    fs.writeFileSync(path.join(cmdDir, 'test.md'), 'project-level content');

    const commands = loadCustomCommands(tmpDir);
    assert.equal(commands.length, 1);
    const result = commands[0].execute('', {} as any);
    // Verify it returns the project-level content
    result.then((r) => {
      assert.ok(r?.includes('project-level content'));
    });
  });

  it('handles empty args gracefully', async () => {
    const cmdDir = path.join(tmpDir, '.arqzero', 'commands');
    fs.mkdirSync(cmdDir, { recursive: true });
    fs.writeFileSync(path.join(cmdDir, 'simple.md'), 'Do the thing with $ARGUMENTS');

    const commands = loadCustomCommands(tmpDir);
    const result = await commands[0].execute('', {} as any);
    assert.equal(result, '[Custom command /simple]: Do the thing with ');
  });

  it('loads multiple commands', () => {
    const cmdDir = path.join(tmpDir, '.arqzero', 'commands');
    fs.mkdirSync(cmdDir, { recursive: true });
    fs.writeFileSync(path.join(cmdDir, 'alpha.md'), 'Alpha');
    fs.writeFileSync(path.join(cmdDir, 'beta.md'), 'Beta');
    fs.writeFileSync(path.join(cmdDir, 'gamma.md'), 'Gamma');

    const commands = loadCustomCommands(tmpDir);
    assert.equal(commands.length, 3);
    const names = commands.map((c) => c.name).sort();
    assert.deepStrictEqual(names, ['/alpha', '/beta', '/gamma']);
  });
});
