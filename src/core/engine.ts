import type { LLMProvider } from '../api/provider.js';
import type { Message, ContentBlock, TokenUsage } from '../api/types.js';
import type { ToolContext, ToolResult } from '../tools/types.js';
import type { ToolRegistry } from '../tools/registry.js';
import type { PermissionManager } from '../permissions/manager.js';
import type { ContextWindow } from '../session/context.js';
import type { Session } from '../session/session.js';
import type { CompactionResult } from './compaction.js';
import type { HookRegistry } from '../hooks/registry.js';
import { compactMessages, buildCompactedMessages } from './compaction.js';
import { ToolExecutor } from '../tools/executor.js';
import { userMessage, assistantMessage, toolResultMessage } from './message.js';

export interface EngineCallbacks {
  onTextDelta?: (text: string) => void;
  onThinkingDelta?: (text: string) => void;
  onToolStart?: (id: string, name: string) => void;
  onToolEnd?: (id: string, name: string, result: ToolResult) => void;
  onMessageEnd?: (usage: TokenUsage) => void;
  onCompaction?: (result: CompactionResult) => void;
  onError?: (error: Error) => void;
}

export interface EngineOptions {
  provider: LLMProvider;
  registry: ToolRegistry;
  model: string;
  systemPrompt?: string;
  maxTokens?: number;
  toolContext: ToolContext;
  maxToolRounds?: number;
  permissions?: PermissionManager;
  hooks?: HookRegistry;
  contextWindow?: ContextWindow;
  session?: Session;
}

export class ConversationEngine {
  private messages: Message[] = [];
  private executor: ToolExecutor;
  private options: EngineOptions;

  constructor(options: EngineOptions) {
    this.options = options;
    this.executor = new ToolExecutor(options.registry, options.permissions);
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  async handleUserMessage(
    text: string,
    callbacks: EngineCallbacks = {},
  ): Promise<void> {
    this.options.session?.touch();
    this.messages.push(userMessage(text));
    await this.runConversationLoop(callbacks);

    // Check if compaction is needed after conversation completes
    const { contextWindow } = this.options;
    if (contextWindow?.needsCompaction()) {
      const preserveCount = contextWindow.getPreserveCount(this.messages.length);
      const result = await compactMessages(
        this.messages,
        preserveCount,
        this.options.provider,
        this.options.model,
      );
      if (result.compactedMessageCount > 0) {
        const preserved = this.messages.slice(
          this.messages.length - result.preservedMessageCount,
        );
        this.messages = buildCompactedMessages(result.summary, preserved);
        this.options.session?.recordCompaction();
        callbacks.onCompaction?.(result);
      }
    }
  }

  private async runConversationLoop(
    callbacks: EngineCallbacks,
    round = 0,
  ): Promise<void> {
    const maxRounds = this.options.maxToolRounds ?? 25;
    if (round >= maxRounds) {
      callbacks.onError?.(new Error('Max tool execution rounds reached'));
      return;
    }

    // 1. Build ChatRequest
    const definitions = this.options.registry.getDefinitions();
    const request = {
      messages: this.messages,
      model: this.options.model,
      tools: definitions.length > 0 ? definitions : undefined,
      maxTokens: this.options.maxTokens,
      systemPrompt: this.options.systemPrompt,
      intent: 'chat' as const,
    };

    // 2. Stream response, accumulate assistant message
    const contentBlocks: ContentBlock[] = [];
    let currentText = '';
    let currentThinking = '';
    const toolInputBuffers = new Map<
      string,
      { name: string; jsonParts: string[] }
    >();

    try {
      for await (const event of this.options.provider.chat(request)) {
        switch (event.type) {
          case 'text_delta':
            currentText += event.text;
            callbacks.onTextDelta?.(event.text);
            break;

          case 'thinking_delta':
            currentThinking += event.text;
            callbacks.onThinkingDelta?.(event.text);
            break;

          case 'tool_use_start':
            // Flush accumulated text/thinking into content blocks
            if (currentText) {
              contentBlocks.push({ type: 'text', text: currentText });
              currentText = '';
            }
            if (currentThinking) {
              contentBlocks.push({ type: 'thinking', text: currentThinking });
              currentThinking = '';
            }
            toolInputBuffers.set(event.id, {
              name: event.name,
              jsonParts: [],
            });
            callbacks.onToolStart?.(event.id, event.name);
            break;

          case 'tool_use_delta':
            toolInputBuffers.get(event.id)?.jsonParts.push(event.input);
            break;

          case 'tool_use_end': {
            const buffer = toolInputBuffers.get(event.id);
            if (buffer) {
              const jsonStr = buffer.jsonParts.join('');
              let input: Record<string, unknown> = {};
              try {
                input = jsonStr ? JSON.parse(jsonStr) : {};
              } catch {
                input = { _raw: jsonStr };
              }
              contentBlocks.push({
                type: 'tool_use',
                id: event.id,
                name: buffer.name,
                input,
              });
              toolInputBuffers.delete(event.id);
            }
            break;
          }

          case 'message_end':
            this.options.contextWindow?.trackUsage(event.usage);
            callbacks.onMessageEnd?.(event.usage);
            break;

          case 'error':
            callbacks.onError?.(event.error);
            break;
        }
      }
    } catch (err) {
      callbacks.onError?.(
        err instanceof Error ? err : new Error(String(err)),
      );
      return;
    }

    // 3. Flush any remaining thinking/text (thinking first to preserve order)
    if (currentThinking) {
      contentBlocks.push({ type: 'thinking', text: currentThinking });
    }
    if (currentText) {
      contentBlocks.push({ type: 'text', text: currentText });
    }

    // 4. Add assistant message to history
    this.messages.push(assistantMessage(contentBlocks));

    // 5. Check if there are tool_use blocks to execute
    const toolUseBlocks = contentBlocks.filter((b) => b.type === 'tool_use');
    if (toolUseBlocks.length === 0) {
      // No tools -- conversation turn is complete
      await this.options.hooks?.fire('Stop', {
        event: 'Stop',
        timestamp: Date.now(),
      });
      return;
    }

    // 6. Execute tools and add results
    for (const block of toolUseBlocks) {
      // Pre-tool hook: may deny execution
      if (this.options.hooks) {
        const preResult = await this.options.hooks.fire('PreToolUse', {
          event: 'PreToolUse',
          toolName: block.name!,
          toolInput: block.input,
          timestamp: Date.now(),
        });

        if (preResult.action === 'deny') {
          const errorResult: ToolResult = {
            content: preResult.message ?? 'Blocked by hook',
            isError: true,
          };
          callbacks.onToolEnd?.(block.id!, block.name!, errorResult);
          this.messages.push(
            toolResultMessage(block.id!, block.name!, errorResult.content, true),
          );
          continue;
        }

        // Apply modified input if provided
        if (preResult.modifiedInput !== undefined) {
          block.input = preResult.modifiedInput;
        }
      }

      const result = await this.executor.execute(
        block.name!,
        block.input,
        this.options.toolContext,
      );

      // Post-tool hook
      await this.options.hooks?.fire('PostToolUse', {
        event: 'PostToolUse',
        toolName: block.name!,
        toolInput: block.input,
        toolResult: result,
        timestamp: Date.now(),
      });

      // Notify UI
      callbacks.onToolEnd?.(block.id!, block.name!, result);

      // Add tool result to messages
      this.messages.push(
        toolResultMessage(block.id!, block.name!, result.content, result.isError),
      );
    }

    // 7. Recurse -- send tool results back to LLM
    await this.runConversationLoop(callbacks, round + 1);
  }

  setMessages(messages: Message[]): void {
    this.messages = [...messages];
  }

  abort(): void {
    this.options.provider.abort();
  }
}
