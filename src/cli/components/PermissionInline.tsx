// src/cli/components/PermissionInline.tsx
import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import type { PermissionRequest, PermissionResponse, PermissionLevel } from '../../tools/types.js';
import { THEME } from '../theme.js';

export interface PermissionInlineProps {
  request: PermissionRequest;
  onRespond: (response: PermissionResponse) => void;
}

function isBashTool(name: string): boolean {
  return name === 'Bash' || name === 'bash';
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

function borderColor(level: PermissionLevel): string {
  switch (level) {
    case 'safe':
      return THEME.success;
    case 'ask':
      return THEME.warning;
    case 'dangerous':
      return THEME.error;
  }
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
  const bash = isBashTool(request.tool);
  const bColor = borderColor(request.level);
  const toolLabel = bash ? 'Bash command' : request.tool;

  return (
    <Box flexDirection="column" marginBottom={1}
      borderStyle="round" borderColor={bColor}
      paddingLeft={1} paddingRight={1}
    >
      <Text color={THEME.text} bold>{toolLabel}</Text>
      <Box marginTop={0}>
        {bash ? (
          <Text color={THEME.bashBorder}>{'! '}{inputDisplay}</Text>
        ) : (
          <Text color={THEME.dim}>{inputDisplay}</Text>
        )}
      </Box>
      <Box marginTop={0}>
        <Text color={THEME.dim}>Allow? </Text>
        <Text color={THEME.success} bold>[y]</Text>
        <Text color={THEME.dim}>es </Text>
        <Text color={THEME.error} bold>[n]</Text>
        <Text color={THEME.dim}>o </Text>
        <Text color={THEME.info} bold>[a]</Text>
        <Text color={THEME.dim}>lways this session</Text>
      </Box>
    </Box>
  );
}
