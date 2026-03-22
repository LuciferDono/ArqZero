// src/cli/components/Footer.tsx
import React from 'react';
import { Box, Text } from 'ink';
import { THEME } from '../theme.js';

export interface FooterProps {
  isStreaming: boolean;
  transcriptMode: boolean;
  expandedView?: boolean;
  sessionId?: string;
}

export function Footer({ isStreaming, transcriptMode, expandedView, sessionId }: FooterProps) {
  const viewLabel = transcriptMode ? 'grid' : expandedView ? 'transcript' : 'expand';

  // Fewer shortcuts when streaming — less to render, less to break
  const parts: Array<[string, string]> = isStreaming
    ? [['Esc', 'stop'], ['Ctrl+O', viewLabel]]
    : [['/', 'cmd'], ['Ctrl+O', viewLabel], ['Esc', 'clear'], ['↑↓', 'hist']];

  return (
    <Box>
      <Box flexGrow={1} flexWrap="wrap">
        {parts.map(([key, label]) => (
          <Box key={key} marginRight={1}>
            <Text color={THEME.primary} bold>{key}</Text>
            <Text color={THEME.dim}> {label}</Text>
          </Box>
        ))}
      </Box>
      {sessionId && (
        <Box>
          <Text color={THEME.dim}>{sessionId.slice(0, 8)}</Text>
        </Box>
      )}
    </Box>
  );
}
