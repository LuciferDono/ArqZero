// src/cli/components/CommandInput.tsx
import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { THEME } from '../theme.js';

export interface CommandInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled: boolean;
}

export function CommandInput({ value, onChange, onSubmit, disabled }: CommandInputProps) {
  // Multi-line: Ctrl+J inserts a newline, Enter submits
  useInput((_input, key) => {
    if (disabled) return;

    // Ctrl+J: insert newline
    if (key.ctrl && _input === 'j') {
      onChange(value + '\n');
      return;
    }
  });

  const lines = value.split('\n');
  const isMultiLine = lines.length > 1;

  const handleSubmit = useCallback((val: string) => {
    onSubmit(value);
  }, [value, onSubmit]);

  const handleChange = useCallback((val: string) => {
    // ink-text-input strips newlines, so we handle multi-line via Ctrl+J
    // Only update the last line when ink-text-input reports changes
    if (isMultiLine) {
      const prefix = lines.slice(0, -1).join('\n') + '\n';
      onChange(prefix + val);
    } else {
      onChange(val);
    }
  }, [isMultiLine, lines, onChange]);

  if (disabled) {
    return (
      <Box flexDirection="column">
        <Box>
          <Text color={THEME.dim}>{THEME.diamond} arq {THEME.prompt} </Text>
        </Box>
        <Box>
          <Text color={THEME.dim}>{'─'.repeat(Math.min(process.stdout.columns || 80, 80))}</Text>
        </Box>
      </Box>
    );
  }

  // Current line for TextInput is always the last line
  const currentLine = lines[lines.length - 1];

  return (
    <Box flexDirection="column">
      {/* Render previous lines (read-only) */}
      {lines.slice(0, -1).map((line, i) => (
        <Box key={i}>
          <Text color={THEME.primary}>
            {i === 0 ? `${THEME.diamond} arq ${THEME.prompt} ` : '       '}
          </Text>
          <Text color={THEME.text}>{line}</Text>
        </Box>
      ))}

      {/* Active line with TextInput */}
      <Box>
        <Text color={THEME.primary} bold>
          {lines.length === 1 ? THEME.diamond : ' '}
        </Text>
        <Text color={THEME.primary}>
          {lines.length === 1 ? ' arq ' : '      '}
        </Text>
        <Text color={THEME.primary} bold>
          {lines.length === 1 ? `${THEME.prompt} ` : ' '}
        </Text>
        <TextInput
          value={currentLine}
          onChange={handleChange}
          onSubmit={handleSubmit}
          placeholder=""
        />
      </Box>

      {/* Bottom border */}
      <Box>
        <Text color={THEME.dim}>{'─'.repeat(Math.min(process.stdout.columns || 80, 80))}</Text>
      </Box>
    </Box>
  );
}
