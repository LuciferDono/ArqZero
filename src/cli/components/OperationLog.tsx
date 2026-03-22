// src/cli/components/OperationLog.tsx
import React from 'react';
import { Box, Text } from 'ink';
import { OperationEntry } from './OperationEntry.js';
import { GroupedOperationEntry } from './GroupedOperationEntry.js';
import { ShimmerSpinner } from './Spinner.js';
import { THEME } from '../theme.js';
import { renderMarkdown } from '../markdown.js';
import type { OperationEntryData } from './OperationEntry.js';

export interface GroupedEntry {
  type: 'grouped';
  toolName: string;
  entries: OperationEntryData[];
  totalElapsed: number;
}

export type DisplayEntry = OperationEntryData | GroupedEntry;

export function groupConsecutiveTools(entries: OperationEntryData[]): DisplayEntry[] {
  const result: DisplayEntry[] = [];
  let i = 0;

  while (i < entries.length) {
    const entry = entries[i];

    if (entry.type === 'tool' && entry.toolName) {
      let j = i + 1;
      while (
        j < entries.length &&
        entries[j].type === 'tool' &&
        entries[j].toolName === entry.toolName
      ) {
        j++;
      }

      const count = j - i;
      if (count >= 2) {
        const group = entries.slice(i, j);
        const totalElapsed = group.reduce((sum, e) => sum + (e.elapsed ?? 0), 0);
        result.push({
          type: 'grouped',
          toolName: entry.toolName,
          entries: group,
          totalElapsed,
        });
        i = j;
        continue;
      }
    }

    result.push(entry);
    i++;
  }

  return result;
}

export interface OperationLogProps {
  entries: OperationEntryData[];
  activeOperation?: { name: string; startTime: number } | null;
  streamingText?: string;
  expanded?: boolean;
}

export function OperationLog({ entries, activeOperation, streamingText, expanded = false }: OperationLogProps) {
  const displayEntries = groupConsecutiveTools(entries);

  return (
    <Box flexDirection="column">
      {displayEntries.map((entry, i) => {
        if (entry.type === 'grouped') {
          return <GroupedOperationEntry key={i} group={entry} expanded={expanded} />;
        }
        return <OperationEntry key={i} entry={entry} />;
      })}

      {streamingText && (
        <Box marginBottom={1} flexDirection="column">
          <Text color={THEME.text}>{renderMarkdown(streamingText)}</Text>
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
