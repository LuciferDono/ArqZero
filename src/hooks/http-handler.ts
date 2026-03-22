import type { HookDefinition, HookPayload, HookResult } from './types.js';

const DEFAULT_TIMEOUT = 10_000;

export async function executeHttpHook(
  hook: HookDefinition,
  payload: HookPayload,
): Promise<HookResult> {
  if (!hook.url) {
    return { action: 'continue' };
  }

  const timeout = hook.timeout ?? DEFAULT_TIMEOUT;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(hook.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      return { action: 'continue' };
    }

    const body = await response.text();
    const parsed = JSON.parse(body) as HookResult;
    return parsed;
  } catch {
    return { action: 'continue' };
  }
}
