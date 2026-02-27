// src/cli/components/PermissionPrompt.tsx
import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import type { PermissionRequest, PermissionResponse, PermissionLevel } from '../../tools/types.js';

export interface PermissionPromptProps {
  request: PermissionRequest;
  onRespond: (response: PermissionResponse) => void;
}

function levelColor(level: PermissionLevel): string {
  switch (level) {
    case 'safe':
      return 'green';
    case 'ask':
      return 'yellow';
    case 'dangerous':
      return 'red';
  }
}

function formatInput(input: unknown): string {
  if (input === null || input === undefined) return '';

  if (typeof input === 'string') {
    return input.length > 100 ? input.slice(0, 100) + '...' : input;
  }

  if (typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    // For Bash tool, show the command
    if ('command' in obj && typeof obj.command === 'string') {
      const cmd = obj.command;
      return cmd.length > 100 ? cmd.slice(0, 100) + '...' : cmd;
    }
    // For file tools, show the path
    if ('path' in obj && typeof obj.path === 'string') {
      return obj.path;
    }
    if ('file_path' in obj && typeof obj.file_path === 'string') {
      return obj.file_path as string;
    }
    // Fallback: stringify
    const str = JSON.stringify(input);
    return str.length > 100 ? str.slice(0, 100) + '...' : str;
  }

  return String(input);
}

export function PermissionPrompt({ request, onRespond }: PermissionPromptProps) {
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

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      paddingX={1}
      marginBottom={1}
    >
      <Box>
        <Text bold color="yellow">Permission required</Text>
      </Box>

      <Box marginTop={1}>
        <Text>Tool: </Text>
        <Text bold>{request.tool}</Text>
        <Text> </Text>
        <Text color={levelColor(request.level)}>[{request.level}]</Text>
      </Box>

      {inputDisplay && (
        <Box>
          <Text color="gray">{inputDisplay}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="green" bold>[y]</Text>
        <Text>es  </Text>
        <Text color="red" bold>[n]</Text>
        <Text>o  </Text>
        <Text color="cyan" bold>[a]</Text>
        <Text>lways allow this tool</Text>
      </Box>
    </Box>
  );
}
