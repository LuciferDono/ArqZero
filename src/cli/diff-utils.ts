// src/cli/diff-utils.ts

export interface DiffSegment {
  text: string;
  type: 'same' | 'added' | 'removed';
}

export interface DiffLine {
  type: 'added' | 'removed' | 'context';
  lineNumber?: number;        // line number in old (removed/context) or new (added)
  oldLineNumber?: number;     // for context lines
  newLineNumber?: number;     // for context lines
  content: string;
  segments?: DiffSegment[];   // word-level diff segments (for changed line pairs)
}

export interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

/**
 * Compute LCS table for two arrays using dynamic programming.
 * Returns the DP table for backtracking.
 */
function lcsTable<T>(a: T[], b: T[], eq: (x: T, y: T) => boolean): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (eq(a[i - 1]!, b[j - 1]!)) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }

  return dp;
}

/**
 * Backtrack through the LCS table to produce a diff.
 * Returns array of { type, value } entries.
 */
interface DiffOp<T> {
  type: 'same' | 'added' | 'removed';
  value: T;
}

function backtrackDiff<T>(dp: number[][], a: T[], b: T[], eq: (x: T, y: T) => boolean): DiffOp<T>[] {
  const result: DiffOp<T>[] = [];
  let i = a.length;
  let j = b.length;

  while (i > 0 && j > 0) {
    if (eq(a[i - 1]!, b[j - 1]!)) {
      result.push({ type: 'same', value: a[i - 1]! });
      i--;
      j--;
    } else if (dp[i - 1]![j]! > dp[i]![j - 1]!) {
      result.push({ type: 'removed', value: a[i - 1]! });
      i--;
    } else if (dp[i]![j - 1]! > dp[i - 1]![j]!) {
      result.push({ type: 'added', value: b[j - 1]! });
      j--;
    } else {
      // Tied: prefer added first (in reverse order) so after reverse, removed comes before added
      result.push({ type: 'added', value: b[j - 1]! });
      j--;
    }
  }

  while (i > 0) {
    result.push({ type: 'removed', value: a[i - 1]! });
    i--;
  }
  while (j > 0) {
    result.push({ type: 'added', value: b[j - 1]! });
    j--;
  }

  return result.reverse();
}

/**
 * Word-level diff between two lines.
 * Splits on whitespace boundaries (keeping whitespace) and diffs the tokens.
 */
export function wordDiff(oldLine: string, newLine: string): DiffSegment[] {
  // Split preserving whitespace as separate tokens
  const oldTokens = oldLine.split(/(\s+)/).filter(t => t.length > 0);
  const newTokens = newLine.split(/(\s+)/).filter(t => t.length > 0);

  const dp = lcsTable(oldTokens, newTokens, (a, b) => a === b);
  const ops = backtrackDiff(dp, oldTokens, newTokens, (a, b) => a === b);

  // Merge consecutive ops of same type
  const segments: DiffSegment[] = [];
  for (const op of ops) {
    const last = segments[segments.length - 1];
    if (last && last.type === op.type) {
      last.text += op.value;
    } else {
      segments.push({ text: op.value, type: op.type });
    }
  }

  return segments;
}

/**
 * Generate diff lines from old and new content strings.
 * Uses LCS-based line diff with context lines.
 */
export function generateDiffLines(
  oldContent: string,
  newContent: string,
  contextLines: number = 3,
): DiffLine[] {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  const dp = lcsTable(oldLines, newLines, (a, b) => a === b);
  const ops = backtrackDiff(dp, oldLines, newLines, (a, b) => a === b);

  // Assign line numbers
  interface NumberedOp {
    type: 'same' | 'added' | 'removed';
    value: string;
    oldNum?: number;
    newNum?: number;
  }

  const numbered: NumberedOp[] = [];
  let oldNum = 0;
  let newNum = 0;

  for (const op of ops) {
    if (op.type === 'same') {
      oldNum++;
      newNum++;
      numbered.push({ ...op, oldNum, newNum });
    } else if (op.type === 'removed') {
      oldNum++;
      numbered.push({ ...op, oldNum });
    } else {
      newNum++;
      numbered.push({ ...op, newNum });
    }
  }

  // Pair up adjacent removed+added lines for word-level diff
  const result: DiffLine[] = [];

  for (let i = 0; i < numbered.length; i++) {
    const op = numbered[i]!;

    if (op.type === 'same') {
      result.push({
        type: 'context',
        content: op.value,
        oldLineNumber: op.oldNum,
        newLineNumber: op.newNum,
      });
    } else if (op.type === 'removed') {
      // Check if next op is 'added' — if so, pair them for word-level diff
      const next = numbered[i + 1];
      if (next && next.type === 'added') {
        const segments = wordDiff(op.value, next.value);
        result.push({
          type: 'removed',
          content: op.value,
          lineNumber: op.oldNum,
          segments: segments.filter(s => s.type !== 'added'),
        });
        result.push({
          type: 'added',
          content: next.value,
          lineNumber: next.newNum,
          segments: segments.filter(s => s.type !== 'removed'),
        });
        i++; // skip the paired 'added'
      } else {
        result.push({
          type: 'removed',
          content: op.value,
          lineNumber: op.oldNum,
        });
      }
    } else {
      result.push({
        type: 'added',
        content: op.value,
        lineNumber: op.newNum,
      });
    }
  }

  // Apply context window: only show lines near changes
  if (contextLines < 0) return result;

  const isChange = (line: DiffLine) => line.type !== 'context';
  const changeIndices = new Set<number>();

  for (let i = 0; i < result.length; i++) {
    if (isChange(result[i]!)) {
      for (let j = Math.max(0, i - contextLines); j <= Math.min(result.length - 1, i + contextLines); j++) {
        changeIndices.add(j);
      }
    }
  }

  const filtered: DiffLine[] = [];
  for (let i = 0; i < result.length; i++) {
    if (changeIndices.has(i)) {
      filtered.push(result[i]!);
    }
  }

  return filtered;
}

/**
 * Generate simple diff line strings (prefixed with +/-/space) for backward compatibility.
 */
export function generateSimpleDiffLines(oldContent: string, newContent: string): string[] {
  const lines = generateDiffLines(oldContent, newContent);
  return lines.map(line => {
    const prefix = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';
    return `${prefix} ${line.content}`;
  });
}
