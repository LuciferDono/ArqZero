// src/cli/components/DiffView.tsx
import React from 'react';
import { Box, Text } from 'ink';
import { THEME, COLORS } from '../theme.js';
import { generateDiffLines } from '../diff-utils.js';
import type { DiffLine, DiffSegment } from '../diff-utils.js';

export interface DiffViewProps {
  filePath: string;
  oldContent: string;
  newContent: string;
  operation: 'edit' | 'write' | 'delete';
}

// Brighter variants for word-level highlights within changed lines
const WORD_ADDED = COLORS.diffWordAdd;
const WORD_REMOVED = COLORS.diffWordRemove;

function LineNumber({ num, width }: { num?: number; width: number }) {
  const str = num != null ? String(num).padStart(width, ' ') : ' '.repeat(width);
  return <Text color={THEME.dim}>{str} </Text>;
}

function renderSegments(segments: DiffSegment[], lineType: 'added' | 'removed') {
  const baseColor = lineType === 'added' ? THEME.diffAdded : THEME.diffRemoved;
  const highlightColor = lineType === 'added' ? WORD_ADDED : WORD_REMOVED;

  return segments.map((seg, i) => {
    if (seg.type === 'same') {
      return <Text key={i} color={baseColor}>{seg.text}</Text>;
    }
    // Changed word — bold + brighter color
    return <Text key={i} color={highlightColor} bold>{seg.text}</Text>;
  });
}

function DiffLineRow({ line, lineNumWidth }: { line: DiffLine; lineNumWidth: number }) {
  if (line.type === 'context') {
    return (
      <Box>
        <LineNumber num={line.oldLineNumber} width={lineNumWidth} />
        <Text color={THEME.dim}>  {line.content}</Text>
      </Box>
    );
  }

  const prefix = line.type === 'added' ? '+' : '-';
  const baseColor = line.type === 'added' ? THEME.diffAdded : THEME.diffRemoved;

  return (
    <Box>
      <LineNumber num={line.lineNumber} width={lineNumWidth} />
      <Text color={baseColor}>{prefix} </Text>
      {line.segments ? (
        renderSegments(line.segments, line.type)
      ) : (
        <Text color={baseColor}>{line.content}</Text>
      )}
    </Box>
  );
}

export function DiffView({ filePath, oldContent, newContent, operation }: DiffViewProps) {
  const lines = generateDiffLines(oldContent, newContent);

  if (lines.length === 0) {
    return null;
  }

  // Calculate line number width
  const maxLine = lines.reduce((max, l) => {
    const nums = [l.lineNumber, l.oldLineNumber, l.newLineNumber].filter((n): n is number => n != null);
    return Math.max(max, ...nums);
  }, 0);
  const lineNumWidth = Math.max(String(maxLine).length, 3);

  // Count additions and removals for summary
  const added = lines.filter(l => l.type === 'added').length;
  const removed = lines.filter(l => l.type === 'removed').length;

  const operationLabel = operation === 'delete' ? 'deleted' : operation === 'write' ? 'wrote' : 'edited';

  return (
    <Box flexDirection="column" marginLeft={2}>
      <Box>
        <Text color={THEME.dim}>{THEME.branch} </Text>
        <Text color={THEME.dim} dimColor>{filePath}</Text>
        {added > 0 && <Text color={THEME.diffAdded}> +{added}</Text>}
        {removed > 0 && <Text color={THEME.diffRemoved}> -{removed}</Text>}
      </Box>
      <Box flexDirection="column" marginLeft={2}>
        {lines.map((line, i) => (
          <DiffLineRow key={i} line={line} lineNumWidth={lineNumWidth} />
        ))}
      </Box>
    </Box>
  );
}
