// src/cli/components/ToolIndicator.tsx
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

const SPINNER_FRAMES = ['\u280B', '\u2819', '\u2839', '\u2838', '\u283C', '\u2834', '\u2826', '\u2827', '\u2807', '\u280F'];

export interface ToolIndicatorProps {
  toolName: string | null;
  lastToolResult?: string | null;
}

export function ToolIndicator({ toolName, lastToolResult }: ToolIndicatorProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!toolName) {
      setFrame(0);
      return;
    }

    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % SPINNER_FRAMES.length);
    }, 80);

    return () => clearInterval(interval);
  }, [toolName]);

  if (toolName) {
    return (
      <Box marginBottom={1}>
        <Text color="yellow">
          {SPINNER_FRAMES[frame]} Running {toolName}...
        </Text>
      </Box>
    );
  }

  if (lastToolResult) {
    const display =
      lastToolResult.length > 200
        ? lastToolResult.slice(0, 200) + '...'
        : lastToolResult;
    return (
      <Box marginBottom={1}>
        <Text color="gray" dimColor>
          {'  \u2514 '}{display}
        </Text>
      </Box>
    );
  }

  return null;
}
