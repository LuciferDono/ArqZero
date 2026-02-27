// src/cli/components/StatusBar.tsx
import React from 'react';
import { Box, Text } from 'ink';
import type { TokenUsage } from '../../api/types.js';

export interface StatusBarProps {
  modelName: string;
  providerName: string;
  messageCount: number;
  tokenUsage: TokenUsage | null;
  contextPercent: number;
}

export function StatusBar({
  modelName,
  providerName,
  messageCount,
  tokenUsage,
  contextPercent,
}: StatusBarProps) {
  const parts: string[] = [];

  parts.push(`model: ${modelName}`);
  parts.push(`provider: ${providerName}`);

  if (messageCount > 0) {
    parts.push(`msgs: ${messageCount}`);
  }

  if (tokenUsage) {
    parts.push(`tokens: ${tokenUsage.inputTokens}in/${tokenUsage.outputTokens}out`);
  }

  if (contextPercent > 0) {
    parts.push(`ctx: ${contextPercent}%`);
  }

  return (
    <Box marginBottom={1}>
      <Text bold color="cyan">ArqZero</Text>
      <Text color="gray"> v0.1.0 | {parts.join(' | ')} | /quit to exit</Text>
    </Box>
  );
}
