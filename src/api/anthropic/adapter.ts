// src/api/anthropic/adapter.ts
//
// Native Anthropic Messages API adapter. Uses fetch directly (no SDK
// dependency) and parses Server-Sent Events into ArqZero StreamEvents.
//
// Anthropic's wire format differs from OpenAI's: messages have content
// blocks (text/tool_use/tool_result), tools live in a top-level field,
// and the system prompt is a top-level string. Stream events are typed
// (message_start, content_block_start, content_block_delta, ...).
import type { LLMProvider } from '../provider.js';
import type {
  ChatRequest,
  StreamEvent,
  Message,
  ContentBlock,
  ToolDefinition,
} from '../types.js';
import { getProviderMeta } from '../registry.js';

const API_VERSION = '2023-06-01';
const DEFAULT_MAX_TOKENS = 8192;

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: AnthropicContentBlock[] | string;
}

type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export class AnthropicAdapter implements LLMProvider {
  readonly name = 'anthropic';
  private apiKey: string;
  private baseURL: string;
  private defaultModel: string;
  private abortController: AbortController | null = null;

  constructor(apiKey: string, baseURL?: string) {
    const meta = getProviderMeta('anthropic');
    this.apiKey = apiKey;
    this.baseURL = baseURL || meta.baseURL;
    this.defaultModel = meta.defaultModel;
  }

  async *chat(params: ChatRequest): AsyncIterable<StreamEvent> {
    this.abortController = new AbortController();

    const body = {
      model: params.model || this.defaultModel,
      max_tokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
      messages: this.convertMessages(params.messages),
      system: params.systemPrompt,
      tools: params.tools ? this.convertTools(params.tools) : undefined,
      stream: true,
    };

    let response: Response;
    try {
      response = await fetch(`${this.baseURL}/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': API_VERSION,
        },
        body: JSON.stringify(body),
        signal: this.abortController.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      yield { type: 'error', error: err instanceof Error ? err : new Error(String(err)) };
      return;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      yield {
        type: 'error',
        error: new AnthropicError(
          `Anthropic API error ${response.status}: ${text || response.statusText}`,
          response.status,
        ),
      };
      return;
    }

    if (!response.body) {
      yield { type: 'error', error: new Error('Anthropic API returned no body') };
      return;
    }

    yield* this.parseStream(response.body);
  }

  abort(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  convertMessages(messages: Message[]): AnthropicMessage[] {
    const out: AnthropicMessage[] = [];

    for (const msg of messages) {
      // System messages are passed via the top-level `system` field, not
      // inline. Skip any that slip into the messages array.
      if (msg.role === 'system') continue;

      if (msg.role === 'user') {
        out.push({
          role: 'user',
          content: typeof msg.content === 'string'
            ? msg.content
            : msg.content.map(this.userBlockToAnthropic).filter(Boolean) as AnthropicContentBlock[],
        });
        continue;
      }

      if (msg.role === 'tool') {
        // ArqZero "tool" role becomes a user message with a tool_result block.
        const content: string = typeof msg.content === 'string'
          ? msg.content
          : msg.content.map((b) => b.content || b.text || '').join('');
        out.push({
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: msg.toolCallId || '',
            content,
          }],
        });
        continue;
      }

      if (msg.role === 'assistant') {
        if (typeof msg.content === 'string') {
          out.push({ role: 'assistant', content: msg.content });
        } else {
          const blocks: AnthropicContentBlock[] = [];
          for (const b of msg.content) {
            if (b.type === 'text' && b.text) {
              blocks.push({ type: 'text', text: b.text });
            } else if (b.type === 'tool_use') {
              blocks.push({
                type: 'tool_use',
                id: b.id || '',
                name: b.name || '',
                input: b.input ?? {},
              });
            }
          }
          out.push({ role: 'assistant', content: blocks });
        }
      }
    }

    return out;
  }

  private userBlockToAnthropic = (b: ContentBlock): AnthropicContentBlock | null => {
    if (b.type === 'text' && b.text) return { type: 'text', text: b.text };
    if (b.type === 'tool_result') {
      return {
        type: 'tool_result',
        tool_use_id: b.id || '',
        content: b.content || b.text || '',
        is_error: b.isError,
      };
    }
    return null;
  };

  convertTools(tools: ToolDefinition[]): AnthropicTool[] {
    return tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    }));
  }

  /**
   * Parse Anthropic's SSE stream into ArqZero StreamEvents.
   * Each event is `event: <type>\ndata: <json>\n\n`.
   */
  private async *parseStream(body: ReadableStream<Uint8Array>): AsyncIterable<StreamEvent> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // Track block-index → tool_use id so we can emit tool_use_end correctly.
    const toolBlocks = new Map<number, string>();
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE messages are delimited by \n\n
        let sep: number;
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const raw = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const evt = parseSseEvent(raw);
          if (!evt) continue;
          yield* this.handleAnthropicEvent(evt, toolBlocks, (i, o) => {
            inputTokens += i;
            outputTokens += o;
          });
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      yield { type: 'error', error: err instanceof Error ? err : new Error(String(err)) };
      return;
    }

    yield { type: 'message_end', usage: { inputTokens, outputTokens } };
  }

  private *handleAnthropicEvent(
    evt: { type: string; data: AnthropicEventData },
    toolBlocks: Map<number, string>,
    addUsage: (input: number, output: number) => void,
  ): Iterable<StreamEvent> {
    const data = evt.data;

    if (evt.type === 'message_start') {
      const usage = data.message?.usage;
      if (usage) {
        addUsage(usage.input_tokens ?? 0, 0);
      }
      return;
    }

    if (evt.type === 'content_block_start') {
      const block = data.content_block;
      const idx = data.index ?? 0;
      if (block?.type === 'tool_use') {
        toolBlocks.set(idx, block.id || `block_${idx}`);
        yield { type: 'tool_use_start', id: block.id || `block_${idx}`, name: block.name || '' };
      }
      return;
    }

    if (evt.type === 'content_block_delta') {
      const delta = data.delta;
      const idx = data.index ?? 0;
      if (delta?.type === 'text_delta' && delta.text) {
        yield { type: 'text_delta', text: delta.text };
      } else if (delta?.type === 'thinking_delta' && delta.thinking) {
        yield { type: 'thinking_delta', text: delta.thinking };
      } else if (delta?.type === 'input_json_delta' && delta.partial_json !== undefined) {
        const id = toolBlocks.get(idx);
        if (id) yield { type: 'tool_use_delta', id, input: delta.partial_json };
      }
      return;
    }

    if (evt.type === 'content_block_stop') {
      const idx = data.index ?? 0;
      const id = toolBlocks.get(idx);
      if (id) {
        yield { type: 'tool_use_end', id };
        toolBlocks.delete(idx);
      }
      return;
    }

    if (evt.type === 'message_delta') {
      const usage = data.usage;
      if (usage) addUsage(0, usage.output_tokens ?? 0);
      return;
    }

    if (evt.type === 'error') {
      const message = data.error?.message || 'Anthropic stream error';
      yield { type: 'error', error: new Error(message) };
    }
  }
}

interface AnthropicEventData {
  message?: { usage?: { input_tokens?: number; output_tokens?: number } };
  content_block?: { type?: string; id?: string; name?: string };
  delta?: {
    type?: string;
    text?: string;
    thinking?: string;
    partial_json?: string;
  };
  index?: number;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string };
}

export class AnthropicError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AnthropicError';
    this.status = status;
  }
}

function parseSseEvent(raw: string): { type: string; data: AnthropicEventData } | null {
  let type = 'message';
  let dataStr = '';
  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) type = line.slice(6).trim();
    else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
  }
  if (!dataStr || dataStr === '[DONE]') return null;
  try {
    return { type, data: JSON.parse(dataStr) as AnthropicEventData };
  } catch {
    return null;
  }
}
