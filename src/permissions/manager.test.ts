import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PermissionManager } from './manager.js';
import type { PermissionRequest, PermissionResponse } from '../tools/types.js';

function createPromptSpy(response: PermissionResponse) {
  let callCount = 0;
  let lastRequest: PermissionRequest | null = null;
  const fn = async (req: PermissionRequest) => {
    callCount++;
    lastRequest = req;
    return response;
  };
  return { fn, getCalls: () => callCount, getLastRequest: () => lastRequest };
}

const defaultPermissions = {
  defaultMode: 'ask' as const,
  alwaysAllow: ['Read', 'Glob', 'Grep'],
  alwaysDeny: ['DangerTool'],
  trustedPatterns: { Bash: ['npm test', 'npm run *', 'git status', 'git diff'] },
};

describe('PermissionManager', () => {
  it('should allow safe tools without prompting', async () => {
    const manager = new PermissionManager(defaultPermissions);
    const spy = createPromptSpy({ allowed: true });

    const result = await manager.check('Read', 'safe', { file_path: '/tmp/test.txt' }, spy.fn);

    assert.equal(result.allowed, true);
    assert.equal(spy.getCalls(), 0);
  });

  it('should deny tools in alwaysDeny', async () => {
    const manager = new PermissionManager(defaultPermissions);
    const spy = createPromptSpy({ allowed: true });

    const result = await manager.check('DangerTool', 'ask', {}, spy.fn);

    assert.equal(result.allowed, false);
    assert.ok(result.denial?.includes('DangerTool'));
    assert.ok(result.denial?.includes('denied by configuration'));
    assert.equal(spy.getCalls(), 0);
  });

  it('should allow non-ALWAYS_ASK tools in alwaysAllow without prompting', async () => {
    const manager = new PermissionManager(defaultPermissions);
    const spy = createPromptSpy({ allowed: true });

    const result = await manager.check('Glob', 'ask', { pattern: '**/*.ts' }, spy.fn);

    assert.equal(result.allowed, true);
    assert.equal(spy.getCalls(), 0);
  });

  it('should prompt ALWAYS_ASK tools even when in alwaysAllow', async () => {
    const perms = {
      ...defaultPermissions,
      alwaysAllow: ['Read', 'Glob', 'Grep', 'Write', 'Edit', 'MultiEdit', 'Bash'],
    };
    const manager = new PermissionManager(perms);
    const spy = createPromptSpy({ allowed: true });

    // Write is in alwaysAllow but is an ALWAYS_ASK tool — must still prompt
    const result = await manager.check('Write', 'ask', { file_path: '/tmp/test.txt' }, spy.fn);
    assert.equal(result.allowed, true);
    assert.equal(spy.getCalls(), 1);
  });

  it('should prompt ALWAYS_ASK tools even in trust mode', async () => {
    const manager = new PermissionManager({ ...defaultPermissions, defaultMode: 'trust' });
    const spy = createPromptSpy({ allowed: true });

    const result = await manager.check('Edit', 'ask', { file_path: '/tmp/test.txt' }, spy.fn);
    assert.equal(result.allowed, true);
    assert.equal(spy.getCalls(), 1);
  });

  it('should deny ALWAYS_ASK tools in locked mode without prompting', async () => {
    const manager = new PermissionManager({ ...defaultPermissions, defaultMode: 'locked' });
    const spy = createPromptSpy({ allowed: true });

    const result = await manager.check('Bash', 'ask', { command: 'ls' }, spy.fn);
    assert.equal(result.allowed, false);
    assert.ok(result.denial?.includes('locked mode'));
    assert.equal(spy.getCalls(), 0);
  });

  it('should prompt user for ask-level tools', async () => {
    const manager = new PermissionManager(defaultPermissions);
    const spy = createPromptSpy({ allowed: true });

    const result = await manager.check('Write', 'ask', { file_path: '/tmp/test.txt' }, spy.fn);

    assert.equal(result.allowed, true);
    assert.equal(spy.getCalls(), 1);
    assert.equal(spy.getLastRequest()?.tool, 'Write');
  });

  it('should remember session allow for ALWAYS_ASK tools', async () => {
    const manager = new PermissionManager(defaultPermissions);
    const spy = createPromptSpy({ allowed: true, remember: 'session' });

    // First call prompts user
    await manager.check('Write', 'ask', { file_path: '/tmp/a.txt' }, spy.fn);
    assert.equal(spy.getCalls(), 1);

    // Second call should NOT prompt (session remember works)
    const result = await manager.check('Write', 'ask', { file_path: '/tmp/b.txt' }, spy.fn);
    assert.equal(result.allowed, true);
    assert.equal(spy.getCalls(), 1); // still 1, not 2
  });

  it('should deny when user says no', async () => {
    const manager = new PermissionManager(defaultPermissions);
    const spy = createPromptSpy({ allowed: false });

    const result = await manager.check('Write', 'ask', { file_path: '/tmp/test.txt' }, spy.fn);

    assert.equal(result.allowed, false);
    assert.ok(result.denial?.includes('denied by user'));
  });

  it('should auto-approve non-ALWAYS_ASK tools in trust mode', async () => {
    const manager = new PermissionManager({ ...defaultPermissions, defaultMode: 'trust' });
    const spy = createPromptSpy({ allowed: true });

    const result = await manager.check('WebSearch', 'ask', { query: 'test' }, spy.fn);

    assert.equal(result.allowed, true);
    assert.equal(spy.getCalls(), 0);
  });

  it('should deny non-ALWAYS_ASK tools without prompting in locked mode', async () => {
    const manager = new PermissionManager({ ...defaultPermissions, defaultMode: 'locked' });
    const spy = createPromptSpy({ allowed: true });

    const result = await manager.check('WebSearch', 'ask', { query: 'test' }, spy.fn);

    assert.equal(result.allowed, false);
    assert.ok(result.denial?.includes('locked mode'));
    assert.equal(spy.getCalls(), 0);
  });

  it('should prompt Bash even with matching trusted patterns (ALWAYS_ASK)', async () => {
    const manager = new PermissionManager(defaultPermissions);
    const spy = createPromptSpy({ allowed: true });

    // Bash is ALWAYS_ASK — trusted patterns are skipped, user is prompted
    const result = await manager.check('Bash', 'ask', { command: 'npm test' }, spy.fn);

    assert.equal(result.allowed, true);
    assert.equal(spy.getCalls(), 1);
  });

  it('should allow non-ALWAYS_ASK tools via config trusted patterns', async () => {
    const perms = {
      ...defaultPermissions,
      trustedPatterns: { WebFetch: ['https://example.com/*'] },
    };
    const manager = new PermissionManager(perms);
    const spy = createPromptSpy({ allowed: true });

    const result = await manager.check('WebFetch', 'ask', { command: 'https://example.com/api' }, spy.fn);

    assert.equal(result.allowed, true);
    assert.equal(spy.getCalls(), 0);
  });

  it('should escalate Bash to dangerous and still prompt', async () => {
    const manager = new PermissionManager(defaultPermissions);
    const spy = createPromptSpy({ allowed: true });

    const result = await manager.check('Bash', 'ask', { command: 'rm -rf /tmp/stuff' }, spy.fn);

    assert.equal(result.allowed, true);
    assert.equal(spy.getCalls(), 1);
    assert.equal(spy.getLastRequest()?.level, 'dangerous');
  });

  it('should reset session state', async () => {
    const manager = new PermissionManager(defaultPermissions);
    const spy = createPromptSpy({ allowed: true, remember: 'session' });

    // First call: prompt and remember
    await manager.check('Write', 'ask', { file_path: '/tmp/a.txt' }, spy.fn);
    assert.equal(spy.getCalls(), 1);

    // Verify session rule is stored
    assert.ok(manager.getSessionAlwaysAllow().includes('Write'));

    // Reset
    manager.resetSession();

    // Verify rule is gone
    assert.equal(manager.getSessionAlwaysAllow().length, 0);

    // Next call should prompt again
    await manager.check('Write', 'ask', { file_path: '/tmp/b.txt' }, spy.fn);
    assert.equal(spy.getCalls(), 2);
  });
});
