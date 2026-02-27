import type { Message, ContentBlock } from '../api/types.js';

export function userMessage(text: string): Message {
  return { role: 'user', content: text };
}

export function assistantMessage(content: string | ContentBlock[]): Message {
  return { role: 'assistant', content };
}

export function toolResultMessage(
  toolCallId: string,
  toolName: string,
  content: string,
  isError?: boolean,
): Message {
  return {
    role: 'tool',
    content,
    toolCallId,
    toolName,
  };
}

export function systemMessage(text: string): Message {
  return { role: 'system', content: text };
}
