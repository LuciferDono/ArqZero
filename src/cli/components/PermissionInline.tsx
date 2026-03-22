// src/cli/components/PermissionInline.tsx
import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import type { PermissionRequest, PermissionResponse, PermissionLevel } from '../../tools/types.js';
import { THEME } from '../theme.js';

export interface PermissionInlineProps {
  request: PermissionRequest;
  onRespond: (response: PermissionResponse) => void;
}

export interface PermissionOption {
  label: string;
  value: PermissionResponse;
  hotkey?: string;
}

export function getOptionsForTool(request: PermissionRequest): PermissionOption[] {
  const toolName = request.tool;

  if (toolName === 'Bash' || toolName === 'bash') {
    const cmd =
      typeof request.input === 'object' &&
      request.input !== null &&
      'command' in (request.input as Record<string, unknown>)
        ? String((request.input as Record<string, unknown>).command).split(' ')[0]
        : '';
    return [
      { label: 'Yes, allow this command', value: { allowed: true }, hotkey: 'y' },
      {
        label: `Yes, always allow "${cmd}" commands this session`,
        value: { allowed: true, remember: 'session' },
        hotkey: 'a',
      },
      { label: 'No', value: { allowed: false }, hotkey: 'n' },
    ];
  }

  if (toolName === 'Edit' || toolName === 'MultiEdit' || toolName === 'Write') {
    const path =
      typeof request.input === 'object' &&
      request.input !== null &&
      'file_path' in (request.input as Record<string, unknown>)
        ? String((request.input as Record<string, unknown>).file_path)
        : '';
    const dir = path ? path.split('/').slice(0, -1).join('/') + '/' : '';
    return [
      { label: 'Yes, allow this edit', value: { allowed: true }, hotkey: 'y' },
      {
        label: `Yes, allow all edits${dir ? ` in ${dir}` : ''} this session`,
        value: { allowed: true, remember: 'session' },
        hotkey: 'a',
      },
      { label: 'No', value: { allowed: false }, hotkey: 'n' },
    ];
  }

  // Default for any other tool
  return [
    { label: 'Yes', value: { allowed: true }, hotkey: 'y' },
    { label: 'Yes, always this session', value: { allowed: true, remember: 'session' }, hotkey: 'a' },
    { label: 'No', value: { allowed: false }, hotkey: 'n' },
  ];
}

export function getToolLabel(toolName: string): string {
  switch (toolName) {
    case 'Bash':
    case 'bash':
      return 'Bash command';
    case 'Edit':
      return 'Edit file';
    case 'MultiEdit':
      return 'Edit file';
    case 'Write':
      return 'Write file';
    default:
      return `${toolName} operation`;
  }
}

export function formatInput(input: unknown): string {
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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [answered, setAnswered] = useState(false);

  const options = getOptionsForTool(request);

  const respond = useCallback(
    (response: PermissionResponse) => {
      if (answered) return;
      setAnswered(true);
      onRespond(response);
    },
    [answered, onRespond],
  );

  useInput((input, key) => {
    if (answered) return;

    // Arrow-key navigation
    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((i) => Math.min(options.length - 1, i + 1));
      return;
    }
    if (key.return) {
      respond(options[selectedIndex].value);
      return;
    }

    // Hotkeys still work
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
  const isBash = request.tool === 'Bash' || request.tool === 'bash';
  const bColor = borderColor(request.level);
  const toolLabel = getToolLabel(request.tool);

  return (
    <Box
      flexDirection="column"
      marginBottom={1}
      borderStyle="round"
      borderColor={bColor}
      paddingLeft={1}
      paddingRight={1}
    >
      {/* Header */}
      <Text color={bColor} bold>
        {toolLabel}
      </Text>

      {/* Input preview */}
      {inputDisplay && (
        <Box marginTop={1}>
          {isBash && (
            <Text color={THEME.bashBorder} bold>
              {'! '}
            </Text>
          )}
          <Text color={THEME.dim}>{inputDisplay}</Text>
        </Box>
      )}

      {/* Arrow-key options */}
      <Box flexDirection="column" marginTop={1}>
        {options.map((opt, i) => (
          <Box key={i}>
            <Text color={i === selectedIndex ? THEME.primary : THEME.dim}>
              {i === selectedIndex ? '\u203A ' : '  '}
            </Text>
            <Text color={i === selectedIndex ? THEME.text : THEME.dim} bold={i === selectedIndex}>
              {opt.label}
            </Text>
            {opt.hotkey && <Text color={THEME.dim}> ({opt.hotkey})</Text>}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
