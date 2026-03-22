import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { executeCommandHook } from './command-handler.js';
import type { HookDefinition, HookPayload } from './types.js';

const basePayload: HookPayload = {
  event: 'PreToolUse',
  toolName: 'Read',
  toolInput: { file_path: '/test.ts' },
  timestamp: Date.now(),
};

describe('executeCommandHook', () => {
  it('should execute command and parse JSON result from stdout', async () => {
    // Use node to echo a JSON result to stdout
    const hook: HookDefinition = {
      event: 'PreToolUse',
      type: 'command',
      command: 'node -e "process.stdout.write(JSON.stringify({action:\'allow\',message:\'ok\'}))"',
    };

    const result = await executeCommandHook(hook, basePayload);
    assert.equal(result.action, 'allow');
    assert.equal(result.message, 'ok');
  });

  it('should pass payload as JSON on stdin', async () => {
    // Read stdin and echo the event field back
    const hook: HookDefinition = {
      event: 'PreToolUse',
      type: 'command',
      command: 'node -e "let d=\'\';process.stdin.on(\'data\',c=>d+=c);process.stdin.on(\'end\',()=>{const p=JSON.parse(d);process.stdout.write(JSON.stringify({action:\'continue\',message:p.event}))})"',
    };

    const result = await executeCommandHook(hook, basePayload);
    assert.equal(result.action, 'continue');
    assert.equal(result.message, 'PreToolUse');
  });

  it('should return continue on command error (non-zero exit)', async () => {
    const hook: HookDefinition = {
      event: 'PreToolUse',
      type: 'command',
      command: 'node -e "process.exit(1)"',
    };

    const result = await executeCommandHook(hook, basePayload);
    assert.equal(result.action, 'continue');
  });

  it('should return continue on invalid JSON output', async () => {
    const hook: HookDefinition = {
      event: 'PreToolUse',
      type: 'command',
      command: 'node -e "process.stdout.write(\'not json\')"',
    };

    const result = await executeCommandHook(hook, basePayload);
    assert.equal(result.action, 'continue');
  });

  it('should return continue on timeout', async () => {
    const hook: HookDefinition = {
      event: 'PreToolUse',
      type: 'command',
      command: 'node -e "setTimeout(()=>{},60000)"',
      timeout: 200,  // 200ms timeout
    };

    const result = await executeCommandHook(hook, basePayload);
    assert.equal(result.action, 'continue');
  });

  it('should use default timeout of 10000ms', async () => {
    // Just verify it doesn't crash with no timeout specified
    const hook: HookDefinition = {
      event: 'PreToolUse',
      type: 'command',
      command: 'node -e "process.stdout.write(JSON.stringify({action:\'continue\'}))"',
    };

    const result = await executeCommandHook(hook, basePayload);
    assert.equal(result.action, 'continue');
  });
});
