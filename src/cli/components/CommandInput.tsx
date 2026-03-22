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
      <Box>
        <Text color={THEME.dim}>&gt; </Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text color={THEME.primary} bold>&gt; </Text>
      <TextInput
        value={value}
        onChange={onChange}
        onSubmit={handleSubmit}
        placeholder=""
      />
    </Box>
  );
}
