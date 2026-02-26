// src/api/anthropic/adapter.ts
import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider } from '../provider.js';
import type {
  ChatRequest,
  Message,
  StreamEvent,
  ToolDefinition,
} from '../types.js';
import type {
  MessageParam,
  ContentBlockParam,
  ToolResultBlockParam,
  RawMessageStreamEvent,
  Tool,
} from '@anthropic-ai/sdk/resources/messages/messages.js';

export class AnthropicAdapter implements LLMProvider {
  readonly name = 'anthropic';
  private client: Anthropic;
  private controller: AbortController | null = null;

  constructor(apiKey?: string) {
    this.client = new Anthropic({ apiKey });
  }

  async *chat(params: ChatRequest): AsyncIterable<StreamEvent> {
    this.controller = new AbortController();

    const { systemPrompt, messages, tools } = this.convertRequest(params);

    const stream = this.client.messages.stream(
      {
        model: params.model,
        max_tokens: params.maxTokens ?? 4096,
        system: systemPrompt,
        messages,
        tools,
      },
      { signal: this.controller.signal },
    );

    let currentBlockId: string | null = null;

    try {
      for await (const event of stream as AsyncIterable<RawMessageStreamEvent>) {
        const mapped = this.mapEvent(event, currentBlockId);

        // Track current block ID for tool_use correlation
        if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
          currentBlockId = event.content_block.id;
        }
        if (event.type === 'content_block_stop') {
          currentBlockId = null;
        }

        if (mapped) {
          yield mapped;
        }
      }

      // Emit final usage from the accumulated message
      const finalMessage = await stream.finalMessage();
      yield {
        type: 'message_end',
        usage: {
          inputTokens: finalMessage.usage.input_tokens,
          outputTokens: finalMessage.usage.output_tokens,
        },
      };
    } catch (err) {
      if (this.controller.signal.aborted) return;
      yield { type: 'error', error: err instanceof Error ? err : new Error(String(err)) };
    } finally {
      this.controller = null;
    }
  }

  abort(): void {
    this.controller?.abort();
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list({ limit: 1 });
      return true;
    } catch {
      return false;
    }
  }

  // ---- private helpers ----

  private convertRequest(params: ChatRequest): {
    systemPrompt: string | undefined;
    messages: MessageParam[];
    tools: Tool[] | undefined;
  } {
    const systemPrompt = params.systemPrompt || undefined;
    const messages = this.convertMessages(params.messages);
    const tools = params.tools?.map((t) => this.convertTool(t));
    return { systemPrompt, messages, tools };
  }

  /**
   * Convert ArqZero messages to Anthropic MessageParam[].
   * Key conversion: role 'tool' messages become role 'user' with tool_result content blocks.
   */
  private convertMessages(messages: Message[]): MessageParam[] {
    const result: MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        // System messages are handled via the top-level `system` param; skip here
        continue;
      }

      if (msg.role === 'tool') {
        // Anthropic expects tool results as a user message with tool_result content blocks
        const toolResult: ToolResultBlockParam = {
          type: 'tool_result',
          tool_use_id: msg.toolCallId ?? '',
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        };

        // Merge consecutive tool results into the same user message
        const last = result[result.length - 1];
        if (last && last.role === 'user' && Array.isArray(last.content)) {
          (last.content as ContentBlockParam[]).push(toolResult);
        } else {
          result.push({ role: 'user', content: [toolResult] });
        }
        continue;
      }

      if (msg.role === 'user' || msg.role === 'assistant') {
        const content = typeof msg.content === 'string'
          ? msg.content
          : msg.content.map((block): ContentBlockParam => {
              if (block.type === 'text') {
                return { type: 'text', text: block.text ?? '' };
              }
              if (block.type === 'tool_use') {
                return {
                  type: 'tool_use',
                  id: block.id ?? '',
                  name: block.name ?? '',
                  input: block.input ?? {},
                };
              }
              if (block.type === 'tool_result') {
                return {
                  type: 'tool_result',
                  tool_use_id: block.id ?? '',
                  content: block.content,
                };
              }
              if (block.type === 'thinking') {
                return {
                  type: 'thinking',
                  thinking: block.text ?? '',
                  // Anthropic requires a signature field on thinking blocks for round-trips
                  signature: '',
                };
              }
              // Fallback: treat as text
              return { type: 'text', text: block.text ?? '' };
            });

        result.push({ role: msg.role, content });
        continue;
      }
    }

    return result;
  }

  private convertTool(tool: ToolDefinition): Tool {
    return {
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema as Tool.InputSchema,
    };
  }

  /**
   * Map a single Anthropic stream event to an ArqZero StreamEvent.
   * Returns null for events we don't map.
   */
  private mapEvent(
    event: RawMessageStreamEvent,
    currentBlockId: string | null,
  ): StreamEvent | null {
    switch (event.type) {
      case 'content_block_start': {
        if (event.content_block.type === 'tool_use') {
          return {
            type: 'tool_use_start',
            id: event.content_block.id,
            name: event.content_block.name,
          };
        }
        return null;
      }

      case 'content_block_delta': {
        const delta = event.delta;
        if (delta.type === 'text_delta') {
          return { type: 'text_delta', text: delta.text };
        }
        if (delta.type === 'thinking_delta') {
          return { type: 'thinking_delta', text: delta.thinking };
        }
        if (delta.type === 'input_json_delta') {
          return {
            type: 'tool_use_delta',
            id: currentBlockId ?? '',
            input: delta.partial_json,
          };
        }
        return null;
      }

      case 'content_block_stop': {
        // Only emit tool_use_end if we were tracking a tool block
        if (currentBlockId) {
          return { type: 'tool_use_end', id: currentBlockId };
        }
        return null;
      }

      default:
        return null;
    }
  }
}
