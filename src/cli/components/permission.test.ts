// src/cli/components/permission.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { PermissionRequest } from '../../tools/types.js';
import { getOptionsForTool, getToolLabel, formatInput } from './PermissionInline.js';

describe('getOptionsForTool', () => {
  it('returns Bash-specific options with command prefix', () => {
    const request: PermissionRequest = {
      tool: 'Bash',
      input: { command: 'npm install --save ink' },
      level: 'ask',
    };
    const options = getOptionsForTool(request);
    assert.equal(options.length, 3);
    assert.ok(options[0].label.includes('allow this command'));
    assert.ok(options[1].label.includes('"npm"'));
    assert.deepEqual(options[0].value, { allowed: true });
    assert.deepEqual(options[1].value, { allowed: true, remember: 'session' });
    assert.deepEqual(options[2].value, { allowed: false });
  });

  it('returns Edit-specific options with directory', () => {
    const request: PermissionRequest = {
      tool: 'Edit',
      input: { file_path: 'src/cli/components/Foo.tsx' },
      level: 'ask',
    };
    const options = getOptionsForTool(request);
    assert.equal(options.length, 3);
    assert.ok(options[0].label.includes('allow this edit'));
    assert.ok(options[1].label.includes('src/cli/components/'));
    assert.deepEqual(options[1].value, { allowed: true, remember: 'session' });
  });

  it('returns Write-specific options', () => {
    const request: PermissionRequest = {
      tool: 'Write',
      input: { file_path: '/tmp/out.txt' },
      level: 'dangerous',
    };
    const options = getOptionsForTool(request);
    assert.ok(options[0].label.includes('allow this edit'));
    assert.ok(options[1].label.includes('/tmp/'));
  });

  it('returns MultiEdit options same as Edit', () => {
    const request: PermissionRequest = {
      tool: 'MultiEdit',
      input: { file_path: 'a/b.ts' },
      level: 'ask',
    };
    const options = getOptionsForTool(request);
    assert.ok(options[0].label.includes('allow this edit'));
  });

  it('returns default options for unknown tools', () => {
    const request: PermissionRequest = {
      tool: 'WebSearch',
      input: { query: 'hello' },
      level: 'ask',
    };
    const options = getOptionsForTool(request);
    assert.equal(options.length, 3);
    assert.equal(options[0].label, 'Yes');
    assert.equal(options[1].label, 'Yes, always this session');
    assert.equal(options[2].label, 'No');
  });

  it('extracts empty command prefix when input is not an object', () => {
    const request: PermissionRequest = {
      tool: 'Bash',
      input: 'echo hello',
      level: 'ask',
    };
    const options = getOptionsForTool(request);
    // Should still have 3 options with empty cmd in label
    assert.equal(options.length, 3);
    assert.ok(options[1].label.includes('""'));
  });
});

describe('getToolLabel', () => {
  it('returns "Bash command" for Bash', () => {
    assert.equal(getToolLabel('Bash'), 'Bash command');
  });

  it('returns "Bash command" for lowercase bash', () => {
    assert.equal(getToolLabel('bash'), 'Bash command');
  });

  it('returns "Edit file" for Edit', () => {
    assert.equal(getToolLabel('Edit'), 'Edit file');
  });

  it('returns "Edit file" for MultiEdit', () => {
    assert.equal(getToolLabel('MultiEdit'), 'Edit file');
  });

  it('returns "Write file" for Write', () => {
    assert.equal(getToolLabel('Write'), 'Write file');
  });

  it('returns "<Name> operation" for unknown tools', () => {
    assert.equal(getToolLabel('WebFetch'), 'WebFetch operation');
  });
});

describe('formatInput', () => {
  it('returns empty string for null/undefined', () => {
    assert.equal(formatInput(null), '');
    assert.equal(formatInput(undefined), '');
  });

  it('returns string input directly', () => {
    assert.equal(formatInput('hello'), 'hello');
  });

  it('truncates long strings', () => {
    const long = 'x'.repeat(200);
    const result = formatInput(long);
    assert.equal(result.length, 103); // 100 + '...'
    assert.ok(result.endsWith('...'));
  });

  it('extracts command from object with command field', () => {
    assert.equal(formatInput({ command: 'npm test' }), 'npm test');
  });

  it('extracts path from object with path field', () => {
    assert.equal(formatInput({ path: '/tmp/foo' }), '/tmp/foo');
  });

  it('extracts file_path from object with file_path field', () => {
    assert.equal(formatInput({ file_path: 'src/index.ts' }), 'src/index.ts');
  });

  it('falls back to JSON for other objects', () => {
    assert.equal(formatInput({ foo: 1 }), '{"foo":1}');
  });

  it('truncates long JSON', () => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < 50; i++) obj[`key${i}`] = 'value';
    const result = formatInput(obj);
    assert.ok(result.length <= 103);
    assert.ok(result.endsWith('...'));
  });

  it('handles number input', () => {
    assert.equal(formatInput(42), '42');
  });
});
