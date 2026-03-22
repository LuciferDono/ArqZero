import type { LLMProvider } from '../api/provider.js';
import type { AppConfig } from '../config/schema.js';
import type { ToolRegistry } from '../tools/registry.js';
import type { TokenUsage } from '../api/types.js';
import { ConversationEngine } from '../core/engine.js';

export interface HeadlessOptions {
  prompt: string;
  provider: LLMProvider;
  config: AppConfig;
  registry: ToolRegistry;
  systemPrompt: string;
  outputFormat: 'text' | 'json' | 'stream-json';
}

export async function runHeadless(options: HeadlessOptions): Promise<void> {
  const { prompt, provider, config, registry, systemPrompt, outputFormat } = options;

  const engine = new ConversationEngine({
    provider,
    registry,
    model: config.model,
    systemPrompt,
    maxTokens: config.maxTokens,
    toolContext: {
      cwd: process.cwd(),
      config,
      promptUser: async () => ({ allowed: true }),
    },
  });

  let resultText = '';
  let totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

  if (outputFormat === 'stream-json') {
    await engine.handleUserMessage(prompt, {
      onTextDelta(text) {
        const line = JSON.stringify({ type: 'text_delta', text });
        process.stdout.write(line + '\n');
      },
      onToolStart(id, name) {
        const line = JSON.stringify({ type: 'tool_start', id, name });
        process.stdout.write(line + '\n');
      },
      onToolEnd(id, name, result) {
        const line = JSON.stringify({ type: 'tool_end', id, name, result: result.content });
        process.stdout.write(line + '\n');
      },
      onMessageEnd(usage) {
        totalUsage.inputTokens += usage.inputTokens;
        totalUsage.outputTokens += usage.outputTokens;
        const line = JSON.stringify({
          type: 'message_end',
          usage: { input_tokens: usage.inputTokens, output_tokens: usage.outputTokens },
        });
        process.stdout.write(line + '\n');
      },
      onError(error) {
        const line = JSON.stringify({ type: 'error', message: error.message });
        process.stdout.write(line + '\n');
      },
    });
  } else {
    // text or json — accumulate full response
    await engine.handleUserMessage(prompt, {
      onTextDelta(text) {
        resultText += text;
      },
      onMessageEnd(usage) {
        totalUsage.inputTokens += usage.inputTokens;
        totalUsage.outputTokens += usage.outputTokens;
      },
      onError(error) {
        process.stderr.write(`Error: ${error.message}\n`);
      },
    });

    if (outputFormat === 'json') {
      const output = JSON.stringify({
        result: resultText,
        usage: {
          input_tokens: totalUsage.inputTokens,
          output_tokens: totalUsage.outputTokens,
        },
        cost: 0,
      });
      process.stdout.write(output);
    } else {
      process.stdout.write(resultText + '\n');
    }
  }
}
