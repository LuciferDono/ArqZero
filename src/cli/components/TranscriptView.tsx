// src/cli/components/TranscriptView.tsx
import React from 'react';
import { Box, Text } from 'ink';
import type { Message, ContentBlock } from '../../api/types.js';
import { THEME } from '../theme.js';

export interface TranscriptViewProps {
  messages: Message[];
}

function extractText(content: string | ContentBlock[]): string {
  if (typeof content === 'string') return content;
  return content
    .filter((b): b is ContentBlock & { text: string } =>
      (b.type === 'text' && !!b.text) || (b.type === 'tool_result' && !!b.content),
    )
    .map((b) => b.text ?? b.content ?? '')
    .join('\n');
}

export function formatTranscriptMessage(msg: Message): string {
  const text = extractText(msg.content);
  switch (msg.role) {
    case 'user':
      return `you: ${text}`;
    case 'assistant':
      return text;
    case 'tool':
      return `[tool: ${msg.toolName ?? 'unknown'}] ${text}`;
    case 'system':
      return text;
    default:
      return text;
  }
}

export function TranscriptView({ messages }: TranscriptViewProps) {
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={THEME.primary} bold>Transcript (Ctrl+O to exit)</Text>
      </Box>
      {messages.map((msg, i) => {
        const text = formatTranscriptMessage(msg);
        const color = msg.role === 'system' ? THEME.dim :
          msg.role === 'user' ? THEME.primary :
          msg.role === 'tool' ? THEME.success :
          THEME.text;
        return (
          <Box key={i} marginBottom={0}>
            <Text color={color}>{text}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
