// src/api/openrouter/adapter.ts
//
// OpenRouter adapter with multi-key fallback chain. Wraps the generic
// OpenAI-compat adapter and, on retriable errors, rotates to the next
// configured API key.
//
// Failure taxonomy:
//   - 401 / 402 / 403  → key invalid, no credit, or forbidden  → rotate
//   - 429              → rate-limited                          → rotate
//   - 5xx              → upstream/proxy issue                  → rotate
//   - network / fetch  → connectivity                          → rotate
//   - 400 / 404        → bad request / model not found         → DO NOT rotate
//                        (these are config errors; trying another key
//                         won't help and just wastes credits)
import type { LLMProvider } from '../provider.js';
import type { ChatRequest, StreamEvent } from '../types.js';
import { OpenAICompatAdapter } from '../openai-compat/adapter.js';
import { getProviderMeta } from '../registry.js';

export interface OpenRouterOptions {
  /** Ordered list of API keys. First is tried first; on failure, falls through. */
  apiKeys: string[];
  /** Optional override for OpenRouter base URL */
  baseURL?: string;
  /** Override default model */
  defaultModel?: string;
  /** Optional referer header (recommended by OpenRouter for analytics) */
  referer?: string;
  /** Optional X-Title header (app name shown in OpenRouter dashboard) */
  appTitle?: string;
  /** Logger called when a key is rotated. Test seam. */
  onRotate?: (event: RotationEvent) => void;
}

export interface RotationEvent {
  fromIndex: number;
  toIndex: number;
  reason: string;
  status?: number;
}

/** Status codes that indicate a key-level problem and warrant rotation. */
export const RETRIABLE_STATUSES = new Set([401, 402, 403, 429, 500, 502, 503, 504]);

export class OpenRouterAdapter implements LLMProvider {
  readonly name = 'openrouter';
  private apiKeys: string[];
  private baseURL: string;
  private defaultModel: string;
  private headers: Record<string, string>;
  private currentIndex = 0;
  private currentDelegate: OpenAICompatAdapter | null = null;
  private onRotate?: (event: RotationEvent) => void;

  constructor(opts: OpenRouterOptions) {
    if (!opts.apiKeys || opts.apiKeys.length === 0) {
      throw new Error('OpenRouterAdapter requires at least one API key');
    }
    const meta = getProviderMeta('openrouter');
    this.apiKeys = [...opts.apiKeys];
    this.baseURL = opts.baseURL || meta.baseURL;
    this.defaultModel = opts.defaultModel || meta.defaultModel;
    this.onRotate = opts.onRotate;
    this.headers = {};
    if (opts.referer) this.headers['HTTP-Referer'] = opts.referer;
    if (opts.appTitle) this.headers['X-Title'] = opts.appTitle;
  }

  private buildDelegate(index: number): OpenAICompatAdapter {
    return new OpenAICompatAdapter({
      providerName: 'openrouter',
      apiKey: this.apiKeys[index],
      baseURL: this.baseURL,
      defaultModel: this.defaultModel,
      defaultHeaders: this.headers,
    });
  }

  /**
   * Stream a chat. On retriable error from key N, rotate to N+1 and retry.
   * Non-retriable errors propagate immediately. Once any text/tool_use has
   * been emitted, no further rotation occurs (the failure is mid-stream and
   * retrying would replay tokens to the user).
   */
  async *chat(params: ChatRequest): AsyncIterable<StreamEvent> {
    let attempt = this.currentIndex;
    let emittedAnything = false;

    while (attempt < this.apiKeys.length) {
      this.currentIndex = attempt;
      this.currentDelegate = this.buildDelegate(attempt);

      let sawError: { event: Extract<StreamEvent, { type: 'error' }>; status?: number } | null = null;

      for await (const event of this.currentDelegate.chat(params)) {
        if (event.type === 'error') {
          sawError = { event, status: extractStatus(event.error) };
          break;
        }
        emittedAnything = true;
        yield event;
      }

      if (!sawError) return;

      const { event, status } = sawError;
      if (emittedAnything || !isRetriable(status)) {
        yield event;
        return;
      }

      const next = attempt + 1;
      if (next >= this.apiKeys.length) {
        yield event;
        return;
      }

      this.onRotate?.({
        fromIndex: attempt,
        toIndex: next,
        reason: event.error.message,
        status,
      });
      attempt = next;
    }
  }

  abort(): void {
    this.currentDelegate?.abort();
  }

  async isAvailable(): Promise<boolean> {
    return this.apiKeys.some((k) => k.length > 0);
  }

  /** Test seam: read current key index */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /** Test seam: number of keys in the chain */
  getKeyCount(): number {
    return this.apiKeys.length;
  }
}

function isRetriable(status: number | undefined): boolean {
  if (status === undefined) return true; // network/fetch error, no status
  return RETRIABLE_STATUSES.has(status);
}

function extractStatus(err: Error): number | undefined {
  // OpenAI SDK throws errors with `.status` set
  const anyErr = err as Error & { status?: number; statusCode?: number };
  if (typeof anyErr.status === 'number') return anyErr.status;
  if (typeof anyErr.statusCode === 'number') return anyErr.statusCode;
  // Try to parse "401 Unauthorized" or similar from the message
  const m = err.message.match(/\b(4\d{2}|5\d{2})\b/);
  if (m) return Number(m[1]);
  return undefined;
}
