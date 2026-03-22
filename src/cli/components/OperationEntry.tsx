// src/cli/components/OperationEntry.tsx
import React from 'react';
import { Box, Text } from 'ink';
import { THEME, COLORS } from '../theme.js';
import { renderMarkdown } from '../markdown.js';
import { DiffView } from './DiffView.js';

export type EntryType = 'user' | 'text' | 'tool' | 'error' | 'system';

export interface OperationEntryData {
  type: EntryType;
  content: string;
  toolName?: string;
  elapsed?: number;      // milliseconds
  diffLines?: string[];  // for edit operations, show +/- lines (legacy)
  filePath?: string;     // file path for diff display
  oldContent?: string;   // old file content for diff
  newContent?: string;   // new file content for diff
  diffOperation?: 'edit' | 'write' | 'delete';  // type of file operation
  success?: boolean;     // tool success status (default true)
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
      const isSuccess = entry.success !== false;
      const isDispatch = entry.toolName === 'Dispatch';
      const dotColor = isSuccess ? THEME.success : THEME.error;
      const dotChar = isDispatch
        ? (isSuccess ? '\u25C9' : '\u25D0')   // ◉ completed, ◐ running
        : (isSuccess ? THEME.successDot : THEME.failureMark);
      const isBash = entry.toolName === 'Bash';
      const borderColor = isDispatch ? COLORS.info : isBash ? THEME.bashBorder : THEME.toolBorder;

      return (
        <Box flexDirection="column" marginBottom={1}>
          <Box>
            <Text color={dotColor}>{dotChar} </Text>
            <Text color={borderColor} bold>{entry.toolName ?? 'tool'}</Text>
            <Text color={THEME.dim}> {summary}</Text>
            {elapsedStr && (
              <Text color={THEME.dim}>  {elapsedStr}</Text>
            )}
          </Box>
          {entry.filePath && entry.oldContent != null && entry.newContent != null && (
            <DiffView
              filePath={entry.filePath}
              oldContent={entry.oldContent}
              newContent={entry.newContent}
              operation={entry.diffOperation ?? 'edit'}
            />
          )}
          {entry.diffLines && entry.diffLines.length > 0 && !entry.filePath && (
            <Box flexDirection="column" marginLeft={2}>
              {entry.diffLines.map((line, i) => {
                const lineColor = line.startsWith('+') ? THEME.diffAdded
                  : line.startsWith('-') ? THEME.diffRemoved
                  : THEME.dim;
                return (
                  <Text key={i} color={lineColor}>
                    {THEME.branch} {line}
                  </Text>
                );
              })}
            </Box>
          )}
        </Box>
      );
    }

    case 'error':
      return (
        <Box marginBottom={1}>
          <Text color={THEME.error}>{THEME.failureMark} Error: {entry.content}</Text>
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
