// src/cli/components/SlashSuggestions.tsx
import React from 'react';
import { Box, Text } from 'ink';
import { THEME } from '../theme.js';

export interface SlashSuggestion {
  name: string;
  description: string;
}

export interface SlashSuggestionsProps {
  suggestions: SlashSuggestion[];
  selectedIndex: number;
  visible: boolean;
}

const WINDOW_SIZE = 8;

export function SlashSuggestions({ suggestions, selectedIndex, visible }: SlashSuggestionsProps) {
  if (!visible || suggestions.length === 0) return null;

  // Sliding window: keep selectedIndex visible
  let windowStart = 0;
  if (suggestions.length > WINDOW_SIZE) {
    // Center the selection in the window when possible
    windowStart = Math.max(0, Math.min(
      selectedIndex - Math.floor(WINDOW_SIZE / 2),
      suggestions.length - WINDOW_SIZE,
    ));
  }
  const windowEnd = Math.min(windowStart + WINDOW_SIZE, suggestions.length);
  const display = suggestions.slice(windowStart, windowEnd);

  const hasAbove = windowStart > 0;
  const hasBelow = windowEnd < suggestions.length;

  return (
    <Box flexDirection="column" marginLeft={2} marginBottom={1}>
      <Box marginBottom={0}>
        <Text color={THEME.dim}>{'─'.repeat(40)}</Text>
      </Box>
      {hasAbove && (
        <Text color={THEME.dim}>  ↑ {windowStart} more</Text>
      )}
      {display.map((s, i) => {
        const actualIndex = windowStart + i;
        const isSelected = actualIndex === selectedIndex;
        return (
          <Box key={s.name}>
            <Text color={isSelected ? THEME.primary : THEME.dim}>
              {isSelected ? THEME.arrow : ' '}{' '}
            </Text>
            <Text color={isSelected ? THEME.primary : THEME.info} bold={isSelected}>
              {s.name}
            </Text>
            <Text color={THEME.dim}>  {s.description}</Text>
          </Box>
        );
      })}
      {hasBelow && (
        <Text color={THEME.dim}>  ↓ {suggestions.length - windowEnd} more</Text>
      )}
    </Box>
  );
}

/**
 * Filter commands by prefix match.
 */
export function filterSuggestions(
  input: string,
  commands: SlashSuggestion[],
): SlashSuggestion[] {
  if (!input.startsWith('/')) return [];
  const query = input.toLowerCase();
  return commands.filter((c) => c.name.toLowerCase().startsWith(query));
}
