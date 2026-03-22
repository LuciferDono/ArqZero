// src/cli/components/GroupedOperationEntry.tsx
import React from 'react';
import { Box, Text } from 'ink';
import { THEME } from '../theme.js';
import type { GroupedEntry } from './OperationLog.js';

function formatElapsed(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export interface GroupedOperationEntryProps {
  group: GroupedEntry;
}

export function GroupedOperationEntry({ group }: GroupedOperationEntryProps) {
  const { toolName, entries, totalElapsed } = group;
  const count = entries.length;
  const isBash = toolName === 'Bash';
  const borderColor = isBash ? THEME.bashBorder : THEME.toolBorder;
  const elapsedStr = totalElapsed > 0 ? formatElapsed(totalElapsed) : '';

  // Build summary of contents
  const summaries = entries.map((e) => e.content).join(', ');
  const label = toolName === 'Read'
    ? `${count} files`
    : toolName === 'Glob'
      ? `${count} patterns`
      : toolName === 'Grep'
        ? `${count} searches`
        : `${count} calls`;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color={THEME.success}>{THEME.successDot} </Text>
        <Text color={borderColor} bold>{toolName}</Text>
        <Text color={THEME.dim}> ({label})</Text>
        {elapsedStr && (
          <Text color={THEME.dim}>  {elapsedStr}</Text>
        )}
      </Box>
      <Box marginLeft={2}>
        <Text color={THEME.dim}>
          {THEME.branch} {summaries.length > 120 ? summaries.slice(0, 117) + '...' : summaries}
        </Text>
      </Box>
    </Box>
  );
}
