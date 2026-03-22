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

interface Shortcut {
  key: string;
  label: string;
}

export function Footer({ isStreaming, transcriptMode, expandedView, sessionId }: FooterProps) {
  const viewLabel = transcriptMode ? 'grid' : expandedView ? 'transcript' : 'expand';

  const shortcuts: Shortcut[] = isStreaming
    ? [
        { key: 'Esc', label: 'interrupt' },
        { key: 'Ctrl+O', label: viewLabel },
      ]
    : [
        { key: '/', label: 'commands' },
        { key: 'Ctrl+J', label: 'newline' },
        { key: 'Ctrl+L', label: 'clear' },
        { key: 'Ctrl+O', label: viewLabel },
        { key: 'Esc', label: expandedView ? 'collapse' : transcriptMode ? 'back' : 'clear' },
        { key: '↑↓', label: 'history' },
      ];

  return (
    <Box>
      <Box flexGrow={1}>
        {shortcuts.map((s, i) => (
          <Box key={s.key} marginRight={2}>
            <Text color={THEME.primary} bold>{s.key}</Text>
            <Text color={THEME.dim}> {s.label}</Text>
          </Box>
        ))}
      </Box>
      {sessionId && (
        <Box>
          <Text color={THEME.dim}>◈ {sessionId.slice(0, 8)}</Text>
        </Box>
      )}
    </Box>
  );
}
