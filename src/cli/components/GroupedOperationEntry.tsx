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
  expanded?: boolean;
}

const MAX_VISIBLE = 5;

export function GroupedOperationEntry({ group, expanded = false }: GroupedOperationEntryProps) {
  const { toolName, entries, totalElapsed } = group;
  const count = entries.length;
  const isBash = toolName === 'Bash';
  const borderColor = isBash ? THEME.bashBorder : THEME.toolBorder;
  const elapsedStr = totalElapsed > 0 ? formatElapsed(totalElapsed) : '';

  const label = toolName === 'Read' ? `${count} files`
    : toolName === 'Glob' ? `${count} patterns`
    : toolName === 'Grep' ? `${count} searches`
    : toolName === 'WebSearch' ? `${count} queries`
    : `${count} calls`;

  // Show items vertically
  const visible = expanded ? entries : entries.slice(0, MAX_VISIBLE);
  const hidden = expanded ? 0 : Math.max(0, entries.length - MAX_VISIBLE);

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Header line */}
      <Box>
        <Text color={THEME.success}>{THEME.successDot} </Text>
        <Text color={borderColor} bold>{toolName}</Text>
        <Text color={THEME.dim}> ({label})</Text>
        {elapsedStr && (
          <Text color={THEME.dim}>  {elapsedStr}</Text>
        )}
      </Box>
      {/* Stacked items */}
      {visible.map((entry, i) => (
        <Box key={i} marginLeft={2}>
          <Text color={THEME.dim}>
            {THEME.branch} {entry.content}
          </Text>
          {entry.elapsed != null && (
            <Text color={THEME.dim}>  {formatElapsed(entry.elapsed)}</Text>
          )}
        </Box>
      ))}
      {hidden > 0 && (
        <Box marginLeft={2}>
          <Text color={THEME.dim}>
            {THEME.branch} +{hidden} more </Text>
          <Text color={THEME.primary}>Ctrl+O</Text>
          <Text color={THEME.dim}> to expand</Text>
        </Box>
      )}
    </Box>
  );
}
