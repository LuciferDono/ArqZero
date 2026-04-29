// src/api/openai-compat/adapter.ts
//
// Provider-agnostic adapter for any service speaking the OpenAI Chat
// Completions wire format. Configurable baseURL, model, key, headers,
// and provider name. Used directly for OpenAI/Groq/Together/DeepSeek/xAI/
// Mistral/Gemini/Ollama/custom, and as the transport for OpenRouter (which
// adds a key-fallback chain on top).
import OpenAI from 'openai';
import type { LLMProvider } from '../provider.js';
import type {
  ChatRequest,
  StreamEvent,
  Message,
  ContentBlock,
  ToolDefinition,
} from '../types.js';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';

export interface OpenAICompatOptions {
  /** Provider identifier (e.g. 'fireworks', 'openai') — used as `name` */
  providerName: string;
  /** API key. Empty string allowed for keyless providers like Ollama. */
  apiKey: string;
  /** Base URL for the provider's OpenAI-compatible endpoint */
  baseURL: string;
  /** Default model when ChatRequest.model is missing */
  defaultModel: string;
  /** Optional extra headers (e.g. OpenRouter referer/title) */
  defaultHeaders?: Record<string, string>;
  /** Default max tokens when ChatRequest.maxTokens is missing */
  defaultMaxTokens?: number;
}

const DEFAULT_MAX_TOKENS = 8192;

export class OpenAICompatAdapter implements LLMProvider {
  readonly name: string;
  protected client: OpenAI;
  protected abortController: AbortController | null = null;
  protected readonly opts: OpenAICompatOptions;

  constructor(opts: OpenAICompatOptions) {
    this.opts = opts;
    this.name = opts.providerName;
    this.client = new OpenAI({
      apiKey: opts.apiKey || 'no-key',
      baseURL: opts.baseURL,
      defaultHeaders: opts.defaultHeaders,
    });
  }

  async *chat(params: ChatRequest): AsyncIterable<StreamEvent> {
    this.abortController = new AbortController();

    const messages = this.convertMessages(params);
    const tools = params.tools ? this.convertTools(params.tools) : undefined;

    try {
      const stream = await this.client.chat.completions.create(
        {
          model: params.model || this.opts.defaultModel,
          messages,
          tools: tools && tools.length > 0 ? tools : undefined,
          max_tokens: params.maxTokens ?? this.opts.defaultMaxTokens ?? DEFAULT_MAX_TOKENS,
          stream: true,
          stream_options: { include_usage: true },
        },
        { signal: this.abortController.signal },
      );

      const activeToolCalls = new Map<number, string>();

      for await (const chunk of stream) {
        const choice = chunk.choices?.[0];

        if (choice?.delta?.content) {
          yield { type: 'text_delta', text: choice.delta.content };
        }

        if (choice?.delta?.tool_calls) {
          for (const tc of choice.delta.tool_calls) {
            const idx = tc.index;
            if (tc.function?.name) {
              const id = tc.id || `call_${idx}_${Date.now()}`;
              activeToolCalls.set(idx, id);
              yield { type: 'tool_use_start', id, name: tc.function.name };
            }
            if (tc.function?.arguments) {
              const id = activeToolCalls.get(idx) || `call_${idx}`;
              yield { type: 'tool_use_delta', id, input: tc.function.arguments };
            }
          }
        }

        if (choice?.finish_reason) {
          for (const [, id] of activeToolCalls) {
            yield { type: 'tool_use_end', id };
          }
          activeToolCalls.clear();
        }

        if (chunk.usage) {
          yield {
            type: 'message_end',
            usage: {
              inputTokens: chunk.usage.prompt_tokens ?? 0,
              outputTokens: chunk.usage.completion_tokens ?? 0,
            },
          };
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      yield { type: 'error', error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  abort(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  async isAvailable(): Promise<boolean> {
    // Keyless providers (Ollama) are always considered available — actual
    // reachability is verified at first request.
    if (this.opts.apiKey) return true;
    return this.opts.apiKey === '' && this.opts.baseURL.startsWith('http://localhost');
  }

  convertMessages(params: ChatRequest): ChatCompletionMessageParam[] {
    const result: ChatCompletionMessageParam[] = [];
    if (params.systemPrompt) {
      result.push({ role: 'system', content: params.systemPrompt });
    }
    for (const msg of params.messages) {
      const converted = this.convertMessage(msg);
      if (converted) result.push(converted);
    }
    return result;
  }

  protected convertMessage(msg: Message): ChatCompletionMessageParam | null {
    if (msg.role === 'system') {
      const content = typeof msg.content === 'string'
        ? msg.content
        : msg.content.map((b) => b.text || '').join('');
      return { role: 'system', content };
    }
    if (msg.role === 'user') {
      const content = typeof msg.content === 'string'
        ? msg.content
        : msg.content.map((b) => b.text || '').join('');
      return { role: 'user', content };
    }
    if (msg.role === 'tool') {
      const content = typeof msg.content === 'string'
        ? msg.content
        : msg.content.map((b) => b.content || b.text || '').join('');
      return { role: 'tool', tool_call_id: msg.toolCallId || '', content };
    }
    if (msg.role === 'assistant') {
      return this.convertAssistantMessage(msg);
    }
    return null;
  }

  protected convertAssistantMessage(msg: Message): ChatCompletionMessageParam {
    if (typeof msg.content === 'string') {
      return { role: 'assistant', content: msg.content };
    }
    const blocks = msg.content as ContentBlock[];
    const textParts: string[] = [];
    const toolCalls: Array<{
      id: string;
      type: 'function';
      function: { name: string; arguments: string };
    }> = [];
    for (const block of blocks) {
      if (block.type === 'text' && block.text) {
        textParts.push(block.text);
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id || '',
          type: 'function',
          function: {
            name: block.name || '',
            arguments: JSON.stringify(block.input ?? {}),
          },
        });
      }
    }
    const content = textParts.length > 0 ? textParts.join('') : null;
    if (toolCalls.length > 0) {
      return { role: 'assistant' as const, content, tool_calls: toolCalls };
    }
    return { role: 'assistant' as const, content };
  }

  convertTools(tools: ToolDefinition[]): ChatCompletionTool[] {
    return tools.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      },
    }));
  }
}
