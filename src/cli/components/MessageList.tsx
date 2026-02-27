// src/cli/components/MessageList.tsx
import React from 'react';
import { Box, Text } from 'ink';

export interface ChatEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface MessageListProps {
  messages: ChatEntry[];
  streamingText: string;
  thinkingText: string;
  isStreaming: boolean;
}

export function MessageList({
  messages,
  streamingText,
  thinkingText,
  isStreaming,
}: MessageListProps) {
  return (
    <Box flexDirection="column">
      {messages.map((entry, i) => (
        <Box key={i} flexDirection="column" marginBottom={1}>
          <Text
            color={
              entry.role === 'user'
                ? 'green'
                : entry.role === 'system'
                  ? 'gray'
                  : 'white'
            }
            bold={entry.role === 'user'}
          >
            {entry.role === 'user' ? '> ' : ''}
            {entry.content}
          </Text>
        </Box>
      ))}

      {isStreaming && thinkingText && !streamingText && (
        <Box marginBottom={1}>
          <Text color="magenta" dimColor>
            {'[thinking] '}
            {thinkingText.length > 120
              ? thinkingText.slice(0, 120) + '...'
              : thinkingText}
          </Text>
        </Box>
      )}

      {isStreaming && streamingText && (
        <Box marginBottom={1}>
          <Text color="white">{streamingText}</Text>
          <Text color="gray">{'\u258C'}</Text>
        </Box>
      )}
    </Box>
  );
}
