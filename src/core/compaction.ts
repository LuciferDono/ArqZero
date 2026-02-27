import type { LLMProvider } from '../api/provider.js';
import type { Message } from '../api/types.js';
import { systemMessage, userMessage } from './message.js';

const COMPACTION_SYSTEM_PROMPT = `You are a conversation summarizer. Summarize the following conversation concisely, preserving:
1. Key decisions and outcomes
2. Important file paths, code snippets, and technical details
3. Current task state and what was being worked on
4. Any errors encountered and their resolutions
Be concise but don't lose critical context. Output only the summary, no preamble.`;

export interface CompactionResult {
  summary: string;
  compactedMessageCount: number;
  preservedMessageCount: number;
}

/**
 * Compacts old messages into a summary using the LLM provider.
 *
 * @param messages - The full message history
 * @param preserveCount - Number of recent messages to keep verbatim
 * @param provider - LLM provider for summarization
 * @param model - Model to use for summarization
 */
export async function compactMessages(
  messages: Message[],
  preserveCount: number,
  provider: LLMProvider,
  model: string,
): Promise<CompactionResult> {
  if (messages.length <= preserveCount) {
    // Nothing to compact
    return {
      summary: '',
      compactedMessageCount: 0,
      preservedMessageCount: messages.length,
    };
  }

  const toCompact = messages.slice(0, messages.length - preserveCount);
  const toPreserve = messages.slice(messages.length - preserveCount);

  // Build the conversation text for summarization
  const conversationText = toCompact.map((msg) => {
    const content = typeof msg.content === 'string'
      ? msg.content
      : msg.content.map(b => b.text || b.content || `[${b.type}]`).join(' ');
    return `${msg.role}: ${content}`;
  }).join('\n\n');

  // Summarize via LLM
  const summaryMessages: Message[] = [
    userMessage(`Summarize this conversation:\n\n${conversationText}`),
  ];

  let summary = '';
  try {
    for await (const event of provider.chat({
      messages: summaryMessages,
      model,
      intent: 'summarize',
      systemPrompt: COMPACTION_SYSTEM_PROMPT,
    })) {
      if (event.type === 'text_delta') {
        summary += event.text;
      }
    }
  } catch (err) {
    // If summarization fails, use a basic truncation fallback
    summary = `[Compaction failed: ${err instanceof Error ? err.message : String(err)}. Previous ${toCompact.length} messages were removed to free context space.]`;
  }

  return {
    summary,
    compactedMessageCount: toCompact.length,
    preservedMessageCount: toPreserve.length,
  };
}

/**
 * Builds the new message array after compaction.
 * The summary becomes a system message at the start, followed by preserved messages.
 */
export function buildCompactedMessages(
  summary: string,
  preservedMessages: Message[],
): Message[] {
  const result: Message[] = [];
  if (summary) {
    result.push(systemMessage(`[Previous conversation summary]\n${summary}`));
  }
  result.push(...preservedMessages);
  return result;
}
