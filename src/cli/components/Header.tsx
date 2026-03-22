// src/cli/components/Header.tsx
import React from 'react';
import { Box, Text } from 'ink';
import os from 'node:os';
import type { TokenUsage } from '../../api/types.js';
import { THEME, COLORS } from '../theme.js';

export interface HeaderProps {
  modelName: string;
  tokenUsage: TokenUsage | null;
  costEstimate: number;
  contextPercent: number;
}

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'accounts/fireworks/models/glm-4p7': 'PRIMUS',
  'glm-4p7': 'PRIMUS',
};

function shortModelName(name: string): string {
  if (MODEL_DISPLAY_NAMES[name]) return MODEL_DISPLAY_NAMES[name];
  const prefixes = ['accounts/fireworks/models/', 'accounts/', 'models/'];
  let short = name;
  for (const prefix of prefixes) {
    if (short.startsWith(prefix)) short = short.slice(prefix.length);
  }
  return MODEL_DISPLAY_NAMES[short] ?? short;
}

function formatTokens(usage: TokenUsage): string {
  const total = usage.inputTokens + usage.outputTokens;
  if (total >= 1000) return `${(total / 1000).toFixed(1)}k`;
  return `${total}`;
}

function formatCost(cost: number): string {
  if (cost < 0.001) return '$0.00';
  return `$${cost.toFixed(2)}`;
}

/**
 * Splash logo — shown once on startup via a system entry,
 * NOT in the persistent header. This prevents resize breakage.
 */
export const SPLASH_LOGO = [
  ' ░█████╗░██████╗░░██████╗░  ███████╗ ██████╗ ██████╗░ ░█████╗░',
  ' ██╔══██╗██╔══██╗██╔═══██╗  ╚══███╔╝ ██╔═══╝ ██╔══██╗ ██╔══██╗',
  ' ███████║██████╔╝██║██╗██║    ███╔╝  █████╗  ██████╔╝ ██║  ██║',
  ' ██╔══██║██╔══██╗╚██████╔╝   ███╔╝   ██╔══╝  ██╔══██╗ ╚█████╔╝',
  ' ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═══╝╚═╝  ███████╗ ██████╗ ╚═╝  ╚═╝  ╚════╝',
].join('\n');

/**
 * Persistent header — single line, never breaks on resize.
 * Same pattern as Claude Code: brand + model + stats on one line.
 */
export function Header({ modelName, tokenUsage, costEstimate, contextPercent }: HeaderProps) {
  const model = shortModelName(modelName);

  // Stats parts — only show what's non-zero
  const stats: React.ReactNode[] = [];

  stats.push(
    <Text key="model" color={COLORS.badgeBg} backgroundColor={COLORS.brand} bold> {model} </Text>
  );

  if (tokenUsage) {
    stats.push(
      <Text key="tokens" color={THEME.dim}>  {formatTokens(tokenUsage)} tok</Text>
    );
  }

  if (costEstimate > 0) {
    stats.push(
      <Text key="cost" color={THEME.dim}> | {formatCost(costEstimate)}</Text>
    );
  }

  if (contextPercent > 0) {
    const ctxColor = contextPercent > 80 ? COLORS.ctxCritical
      : contextPercent > 60 ? COLORS.ctxCaution
      : COLORS.ctxHealthy;
    stats.push(
      <Text key="ctx" color={ctxColor}> | ctx {contextPercent}%</Text>
    );
  }

  return (
    <Box marginBottom={1}>
      <Box flexGrow={1}>
        <Text color={COLORS.brand} bold>◆ ArqZero</Text>
        <Text color={THEME.dim}> v{THEME.version}</Text>
      </Box>
      <Box>
        {stats}
      </Box>
    </Box>
  );
}
