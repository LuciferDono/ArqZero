// src/cli/components/Header.tsx
import React from 'react';
import { Box, Text } from 'ink';
import type { TokenUsage } from '../../api/types.js';
import { THEME } from '../theme.js';

export interface HeaderProps {
  modelName: string;
  tokenUsage: TokenUsage | null;
  costEstimate: number;
  contextPercent: number;
}

function shortModelName(name: string): string {
  // Strip common prefixes like accounts/fireworks/models/
  const prefixes = ['accounts/fireworks/models/', 'accounts/', 'models/'];
  let short = name;
  for (const prefix of prefixes) {
    if (short.startsWith(prefix)) {
      short = short.slice(prefix.length);
    }
  }
  return short;
}

function formatTokens(usage: TokenUsage): string {
  const total = usage.inputTokens + usage.outputTokens;
  if (total >= 1000) {
    return `${(total / 1000).toFixed(1)}k tok`;
  }
  return `${total} tok`;
}

function formatCost(cost: number): string {
  if (cost < 0.001) return '$0.000';
  return `$${cost.toFixed(3)}`;
}

export function Header({ modelName, tokenUsage, costEstimate, contextPercent }: HeaderProps) {
  const parts: string[] = [];

  parts.push(shortModelName(modelName));

  if (tokenUsage) {
    parts.push(formatTokens(tokenUsage));
  }

  if (costEstimate > 0) {
    parts.push(formatCost(costEstimate));
  }

  if (contextPercent > 0) {
    parts.push(`ctx ${contextPercent}%`);
  }

  return (
    <Box marginBottom={1}>
      <Box flexGrow={1}>
        <Text bold color={THEME.primary}>{THEME.diamond} {THEME.appName}</Text>
      </Box>
      <Box>
        <Text color={THEME.dim}>{parts.join(' │ ')}</Text>
      </Box>
    </Box>
  );
}
