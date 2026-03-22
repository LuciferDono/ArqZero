// src/cli/components/CommandInput.tsx
import React, { useCallback } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { THEME } from '../theme.js';

export interface CommandInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled: boolean;
}

export function CommandInput({ value, onChange, onSubmit, disabled }: CommandInputProps) {
  const handleSubmit = useCallback((_val: string) => {
    onSubmit(value);
  }, [value, onSubmit]);

  if (disabled) {
    return (
      <Box flexDirection="column">
        <Box>
          <Text color={THEME.dim}>&gt; </Text>
        </Box>
        <Box>
          <Text color={THEME.dim}>{'─'.repeat(Math.min(process.stdout.columns || 80, 80))}</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={THEME.primary} bold>&gt; </Text>
        <TextInput
          value={value}
          onChange={onChange}
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
