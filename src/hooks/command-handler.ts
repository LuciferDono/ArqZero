import { spawn } from 'node:child_process';
import type { HookDefinition, HookPayload, HookResult } from './types.js';

const DEFAULT_TIMEOUT = 10_000;

export async function executeCommandHook(
  hook: HookDefinition,
  payload: HookPayload,
): Promise<HookResult> {
  if (!hook.command) {
    return { action: 'continue' };
  }

  const timeout = hook.timeout ?? DEFAULT_TIMEOUT;

  return new Promise<HookResult>((resolve) => {
    const child = spawn(hook.command!, [], {
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let settled = false;

    const finish = (result: HookResult) => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };

    const timer = setTimeout(() => {
      child.kill();
      finish({ action: 'continue' });
    }, timeout);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.on('error', () => {
      clearTimeout(timer);
      finish({ action: 'continue' });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        finish({ action: 'continue' });
        return;
      }
      try {
        const parsed = JSON.parse(stdout) as HookResult;
        finish(parsed);
      } catch {
        finish({ action: 'continue' });
      }
    });

    // Write payload to stdin
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}
