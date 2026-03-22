// src/cli/components/PermissionInline.tsx
import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import type { PermissionRequest, PermissionResponse, PermissionLevel } from '../../tools/types.js';
import { THEME } from '../theme.js';

export interface PermissionInlineProps {
  request: PermissionRequest;
  onRespond: (response: PermissionResponse) => void;
}

function levelTag(level: PermissionLevel): string {
  switch (level) {
    case 'safe':
      return '';
    case 'ask':
      return '[ask]';
    case 'dangerous':
      return '[dangerous]';
  }
}

function levelColor(level: PermissionLevel): string {
  switch (level) {
    case 'safe':
      return THEME.success;
    case 'ask':
      return THEME.warning;
    case 'dangerous':
      return THEME.error;
  }
}

function formatInput(input: unknown): string {
  if (input === null || input === undefined) return '';

  if (typeof input === 'string') {
    return input.length > 100 ? input.slice(0, 100) + '...' : input;
  }

  if (typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    if ('command' in obj && typeof obj.command === 'string') {
      const cmd = obj.command;
      return cmd.length > 100 ? cmd.slice(0, 100) + '...' : cmd;
    }
    if ('path' in obj && typeof obj.path === 'string') {
      return obj.path;
    }
    if ('file_path' in obj && typeof obj.file_path === 'string') {
      return obj.file_path as string;
    }
    const str = JSON.stringify(input);
    return str.length > 100 ? str.slice(0, 100) + '...' : str;
  }

  return String(input);
}

export function PermissionInline({ request, onRespond }: PermissionInlineProps) {
  const [answered, setAnswered] = useState(false);

  const respond = useCallback(
    (response: PermissionResponse) => {
      if (answered) return;
      setAnswered(true);
      onRespond(response);
    },
    [answered, onRespond],
  );

  useInput((input, _key) => {
    if (answered) return;

    switch (input.toLowerCase()) {
      case 'y':
        respond({ allowed: true });
        break;
      case 'n':
        respond({ allowed: false });
        break;
      case 'a':
        respond({ allowed: true, remember: 'session' });
        break;
    }
  });

  if (answered) {
    return null;
  }

  const inputDisplay = formatInput(request.input);
  const tag = levelTag(request.level);

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color={THEME.dim}>{THEME.arrow} </Text>
        <Text color={THEME.text} bold>{request.tool}</Text>
        <Text color={THEME.dim}> {inputDisplay}</Text>
        {tag && (
          <Text color={levelColor(request.level)}> {tag}</Text>
        )}
      </Box>
      <Box marginLeft={2}>
        <Text color={THEME.dim}>Allow? </Text>
        <Text color={THEME.success} bold>[y]</Text>
        <Text color={THEME.dim}>es </Text>
        <Text color={THEME.error} bold>[n]</Text>
        <Text color={THEME.dim}>o </Text>
        <Text color={THEME.info} bold>[a]</Text>
        <Text color={THEME.dim}>lways</Text>
      </Box>
    </Box>
  );
}
