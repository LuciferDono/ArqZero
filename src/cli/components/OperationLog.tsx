// src/cli/components/OperationLog.tsx
import React from 'react';
import { Box, Text } from 'ink';
import { OperationEntry } from './OperationEntry.js';
import { ShimmerSpinner } from './Spinner.js';
import { THEME } from '../theme.js';
import type { OperationEntryData } from './OperationEntry.js';

export interface OperationLogProps {
  entries: OperationEntryData[];
  activeOperation?: { name: string; startTime: number } | null;
  streamingText?: string;
}

export function OperationLog({ entries, activeOperation, streamingText }: OperationLogProps) {
  return (
    <Box flexDirection="column">
      {entries.map((entry, i) => (
        <OperationEntry key={i} entry={entry} />
      ))}

      {streamingText && (
        <Box marginBottom={1}>
          <Text color={THEME.text}>{streamingText}</Text>
          <Text color={THEME.dim}>{'\u258C'}</Text>
        </Box>
      )}

      {activeOperation && (
        <Box marginBottom={1}>
          <ShimmerSpinner isActive={true} />
        </Box>
      )}
    </Box>
  );
}
