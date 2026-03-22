import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { HookRegistry } from './registry.js';
import type { HookDefinition, HookPayload } from './types.js';

describe('HookRegistry', () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  it('should register and retrieve hooks', () => {
    const hook: HookDefinition = {
      event: 'PreToolUse',
      type: 'command',
      command: 'echo test',
    };
    registry.register(hook);
    const hooks = registry.getHooks('PreToolUse');
    assert.equal(hooks.length, 1);
    assert.equal(hooks[0].command, 'echo test');
  });

  it('should register multiple hooks via registerAll', () => {
    const hooks: HookDefinition[] = [
      { event: 'PreToolUse', type: 'command', command: 'echo 1' },
      { event: 'PreToolUse', type: 'command', command: 'echo 2' },
      { event: 'Stop', type: 'http', url: 'http://localhost:3000' },
    ];
    registry.registerAll(hooks);
    assert.equal(registry.getHooks('PreToolUse').length, 2);
    assert.equal(registry.getHooks('Stop').length, 1);
  });

  it('should return empty array for unregistered events', () => {
    assert.deepEqual(registry.getHooks('Stop'), []);
  });

  it('should clear all hooks', () => {
    registry.register({ event: 'PreToolUse', type: 'command', command: 'echo' });
    registry.register({ event: 'Stop', type: 'command', command: 'echo' });
    registry.clear();
    assert.deepEqual(registry.getHooks('PreToolUse'), []);
    assert.deepEqual(registry.getHooks('Stop'), []);
  });

  describe('fire', () => {
    it('should return continue when no hooks registered', async () => {
      const payload: HookPayload = {
        event: 'PreToolUse',
        toolName: 'Read',
        timestamp: Date.now(),
      };
      const result = await registry.fire('PreToolUse', payload);
      assert.equal(result.action, 'continue');
    });

    it('should run hooks sequentially and return deny if any denies', async () => {
      const order: number[] = [];
      // We'll use a custom registry with injectable handler for testing
      // Instead, we test via command hooks with mocked executeHook
      // For unit testing the registry logic, we use a subclass approach

      const reg = new HookRegistry({
        executeHook: async (_hook, _payload) => {
          order.push(order.length + 1);
          if (order.length === 2) {
            return { action: 'deny', message: 'blocked' };
          }
          return { action: 'continue' };
        },
      });

      reg.registerAll([
        { event: 'PreToolUse', type: 'command', command: 'check1' },
        { event: 'PreToolUse', type: 'command', command: 'check2' },
        { event: 'PreToolUse', type: 'command', command: 'check3' },
      ]);

      const payload: HookPayload = {
        event: 'PreToolUse',
        toolName: 'Bash',
        timestamp: Date.now(),
      };

      const result = await reg.fire('PreToolUse', payload);
      assert.equal(result.action, 'deny');
      assert.equal(result.message, 'blocked');
      // Third hook should NOT have run
      assert.equal(order.length, 2);
    });

    it('should return allow if any hook returns allow', async () => {
      const reg = new HookRegistry({
        executeHook: async () => ({ action: 'allow' }),
      });

      reg.register({ event: 'PreToolUse', type: 'command', command: 'ok' });

      const result = await reg.fire('PreToolUse', {
        event: 'PreToolUse',
        toolName: 'Read',
        timestamp: Date.now(),
      });
      assert.equal(result.action, 'allow');
    });

    it('should filter by matchTools when specified', async () => {
      let called = false;
      const reg = new HookRegistry({
        executeHook: async () => {
          called = true;
          return { action: 'deny', message: 'no' };
        },
      });

      reg.register({
        event: 'PreToolUse',
        type: 'command',
        command: 'check',
        matchTools: ['Bash', 'Write'],
      });

      // Fire for Read -- should NOT match
      const result = await reg.fire('PreToolUse', {
        event: 'PreToolUse',
        toolName: 'Read',
        timestamp: Date.now(),
      });
      assert.equal(called, false);
      assert.equal(result.action, 'continue');

      // Fire for Bash -- should match
      const result2 = await reg.fire('PreToolUse', {
        event: 'PreToolUse',
        toolName: 'Bash',
        timestamp: Date.now(),
      });
      assert.equal(called, true);
      assert.equal(result2.action, 'deny');
    });

    it('should pass modifiedInput from hook result', async () => {
      const reg = new HookRegistry({
        executeHook: async () => ({
          action: 'continue',
          modifiedInput: { file_path: '/safe/path' },
        }),
      });

      reg.register({ event: 'PreToolUse', type: 'command', command: 'sanitize' });

      const result = await reg.fire('PreToolUse', {
        event: 'PreToolUse',
        toolName: 'Read',
        toolInput: { file_path: '/etc/passwd' },
        timestamp: Date.now(),
      });
      assert.equal(result.action, 'continue');
      assert.deepEqual(result.modifiedInput, { file_path: '/safe/path' });
    });
  });
});
