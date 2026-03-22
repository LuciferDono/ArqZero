// src/cli/components/OperationEntry.tsx
import React from 'react';
import { Box, Text } from 'ink';
import { THEME } from '../theme.js';
import { renderMarkdown } from '../markdown.js';

export type EntryType = 'user' | 'text' | 'tool' | 'error' | 'system';

export interface OperationEntryData {
  type: EntryType;
  content: string;
  toolName?: string;
  elapsed?: number;      // milliseconds
  diffLines?: string[];  // for edit operations, show +/- lines
}

export interface OperationEntryProps {
  entry: OperationEntryData;
}

function formatElapsed(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function OperationEntry({ entry }: OperationEntryProps) {
  switch (entry.type) {
    case 'user':
      return (
        <Box marginBottom={1}>
          <Text color={THEME.primary} bold>you: </Text>
          <Text color={THEME.primary}>{entry.content}</Text>
        </Box>
      );

    case 'text':
      return (
        <Box marginBottom={1} flexDirection="column">
          <Text color={THEME.text}>{renderMarkdown(entry.content)}</Text>
        </Box>
      );

    case 'tool': {
      const summary = entry.content;
      const elapsedStr = entry.elapsed != null ? formatElapsed(entry.elapsed) : '';

      return (
        <Box flexDirection="column" marginBottom={1}>
          <Box>
            <Box flexGrow={1}>
              <Text color={THEME.dim}>
                {THEME.arrow} {entry.toolName ?? 'tool'} {summary}
              </Text>
            </Box>
            {elapsedStr && (
              <Box>
                <Text color={THEME.dim}>{elapsedStr}</Text>
              </Box>
            )}
          </Box>
          {entry.diffLines && entry.diffLines.length > 0 && (
            <Box flexDirection="column" marginLeft={2}>
              {entry.diffLines.map((line, i) => (
                <Text
                  key={i}
                  color={line.startsWith('+') ? THEME.success : line.startsWith('-') ? THEME.error : THEME.dim}
                >
                  {THEME.pipe} {line}
                </Text>
              ))}
            </Box>
          )}
        </Box>
      );
    }

    case 'error':
      return (
        <Box marginBottom={1}>
          <Text color={THEME.error}>Error: {entry.content}</Text>
        </Box>
      );

    case 'system':
      return (
        <Box marginBottom={1}>
          <Text color={THEME.dim}>{entry.content}</Text>
        </Box>
      );
  }
}
