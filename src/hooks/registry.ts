import type { HookEvent, HookDefinition, HookPayload, HookResult } from './types.js';
import { executeCommandHook } from './command-handler.js';
import { executeHttpHook } from './http-handler.js';

export interface HookRegistryOptions {
  /** Override hook execution for testing */
  executeHook?: (hook: HookDefinition, payload: HookPayload) => Promise<HookResult>;
}

export class HookRegistry {
  private hooks: Map<HookEvent, HookDefinition[]> = new Map();
  private executeHookFn: (hook: HookDefinition, payload: HookPayload) => Promise<HookResult>;

  constructor(options?: HookRegistryOptions) {
    this.executeHookFn = options?.executeHook ?? defaultExecuteHook;
  }

  register(hook: HookDefinition): void {
    const list = this.hooks.get(hook.event) ?? [];
    list.push(hook);
    this.hooks.set(hook.event, list);
  }

  registerAll(hooks: HookDefinition[]): void {
    for (const hook of hooks) {
      this.register(hook);
    }
  }

  async fire(event: HookEvent, payload: HookPayload): Promise<HookResult> {
    const hooks = this.hooks.get(event) ?? [];
    let finalResult: HookResult = { action: 'continue' };

    for (const hook of hooks) {
      // matchTools filtering: only fire if payload.toolName matches
      if (hook.matchTools && hook.matchTools.length > 0) {
        if (!payload.toolName || !hook.matchTools.includes(payload.toolName)) {
          continue;
        }
      }

      const result = await this.executeHookFn(hook, payload);

      if (result.action === 'deny') {
        return result;
      }

      if (result.action === 'allow') {
        finalResult = result;
      } else if (result.modifiedInput !== undefined) {
        finalResult = { ...finalResult, modifiedInput: result.modifiedInput };
      }
    }

    return finalResult;
  }

  getHooks(event: HookEvent): HookDefinition[] {
    return this.hooks.get(event) ?? [];
  }

  clear(): void {
    this.hooks.clear();
  }
}

async function defaultExecuteHook(
  hook: HookDefinition,
  payload: HookPayload,
): Promise<HookResult> {
  if (hook.type === 'command') {
    return executeCommandHook(hook, payload);
  }
  if (hook.type === 'http') {
    return executeHttpHook(hook, payload);
  }
  return { action: 'continue' };
}
