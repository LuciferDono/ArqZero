// src/api/fireworks/adapter.ts
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

const DEFAULT_MODEL = 'accounts/fireworks/models/llama-v3p3-70b-instruct';
const BASE_URL = 'https://api.fireworks.ai/inference/v1';

export class FireworksAdapter implements LLMProvider {
  readonly name = 'fireworks';
  private client: OpenAI;
  private abortController: AbortController | null = null;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = new OpenAI({
      apiKey,
      baseURL: BASE_URL,
    });
  }

  async *chat(params: ChatRequest): AsyncIterable<StreamEvent> {
    this.abortController = new AbortController();

    const messages = this.convertMessages(params);
    const tools = params.tools ? this.convertTools(params.tools) : undefined;

    try {
      const stream = await this.client.chat.completions.create(
        {
          model: params.model || DEFAULT_MODEL,
          messages,
          tools: tools && tools.length > 0 ? tools : undefined,
          max_tokens: params.maxTokens ?? 8192,
          stream: true,
          stream_options: { include_usage: true },
        },
        { signal: this.abortController.signal },
      );

      // Track active tool calls to emit tool_use_end events
      const activeToolCalls = new Map<number, string>(); // index -> id

      for await (const chunk of stream) {
        const choice = chunk.choices?.[0];

        if (choice?.delta?.content) {
          yield { type: 'text_delta', text: choice.delta.content };
        }

        if (choice?.delta?.tool_calls) {
          for (const tc of choice.delta.tool_calls) {
            const idx = tc.index;

            // New tool call starting
            if (tc.function?.name) {
              // End any previous tool call at a different index
              // (though typically one at a time)
              const id = tc.id || `call_${idx}_${Date.now()}`;
              activeToolCalls.set(idx, id);
              yield { type: 'tool_use_start', id, name: tc.function.name };
            }

            // Argument chunks
            if (tc.function?.arguments) {
              const id = activeToolCalls.get(idx) || `call_${idx}`;
              yield { type: 'tool_use_delta', id, input: tc.function.arguments };
            }
          }
        }

        // When the choice finishes, close all active tool calls
        if (choice?.finish_reason) {
          for (const [, id] of activeToolCalls) {
            yield { type: 'tool_use_end', id };
          }
          activeToolCalls.clear();
        }

        // Usage info in final chunk
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
    return !!this.apiKey;
  }

  /** Convert ArqCode messages to OpenAI format */
  convertMessages(params: ChatRequest): ChatCompletionMessageParam[] {
    const result: ChatCompletionMessageParam[] = [];

    if (params.systemPrompt) {
      result.push({ role: 'system', content: params.systemPrompt });
    }

    for (const msg of params.messages) {
      const converted = this.convertMessage(msg);
      if (converted) {
        result.push(converted);
      }
    }

    return result;
  }

  private convertMessage(msg: Message): ChatCompletionMessageParam | null {
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
      return {
        role: 'tool',
        tool_call_id: msg.toolCallId || '',
        content,
      };
    }

    if (msg.role === 'assistant') {
      return this.convertAssistantMessage(msg);
    }

    return null;
  }

  private convertAssistantMessage(msg: Message): ChatCompletionMessageParam {
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

    const result: any = { role: 'assistant' };
    if (textParts.length > 0) {
      result.content = textParts.join('');
    } else {
      result.content = null;
    }
    if (toolCalls.length > 0) {
      result.tool_calls = toolCalls;
    }

    return result;
  }

  /** Convert ArqCode tool definitions to OpenAI format */
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
