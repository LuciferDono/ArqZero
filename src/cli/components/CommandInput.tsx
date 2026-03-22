// src/cli/components/CommandInput.tsx
import React from 'react';
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
  if (disabled) {
    return (
      <Box>
        <Text color={THEME.dim}>{THEME.diamond} arq {THEME.prompt} </Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text color={THEME.primary} bold>{THEME.diamond}</Text>
      <Text color={THEME.primary}> arq </Text>
      <Text color={THEME.primary} bold>{THEME.prompt} </Text>
      <TextInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder=""
      />
    </Box>
  );
}
