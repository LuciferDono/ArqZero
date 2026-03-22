// src/cli/components/Header.tsx
import React from 'react';
import { Box, Text } from 'ink';
import os from 'node:os';
import type { TokenUsage } from '../../api/types.js';
import { THEME } from '../theme.js';

export interface HeaderProps {
  modelName: string;
  tokenUsage: TokenUsage | null;
  costEstimate: number;
  contextPercent: number;
  sessionId?: string;
}

function shortModelName(name: string): string {
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
    return `${(total / 1000).toFixed(1)}k`;
  }
  return `${total}`;
}

function formatCost(cost: number): string {
  if (cost < 0.001) return '$0.00';
  return `$${cost.toFixed(2)}`;
}

function getUsername(): string {
  try {
    return os.userInfo().username;
  } catch {
    return 'user';
  }
}

function getCwd(): string {
  const cwd = process.cwd();
  const home = os.homedir();
  if (cwd.startsWith(home)) {
    return '~' + cwd.slice(home.length).replace(/\\/g, '/');
  }
  return cwd.replace(/\\/g, '/');
}

export function Header({ modelName, tokenUsage, costEstimate, contextPercent, sessionId }: HeaderProps) {
  const user = getUsername();
  const model = shortModelName(modelName);
  const cwd = getCwd();

  // Right side stats
  const stats: string[] = [];
  if (tokenUsage) {
    stats.push(`${formatTokens(tokenUsage)} tok`);
  }
  if (costEstimate > 0) {
    stats.push(formatCost(costEstimate));
  }
  if (contextPercent > 0) {
    const ctxColor = contextPercent > 80 ? 'red' : contextPercent > 60 ? 'yellow' : 'green';
    stats.push(`ctx ${contextPercent}%`);
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Top bar: brand + model + stats */}
      <Box>
        <Box flexGrow={1}>
          <Text color={THEME.primary} bold>{THEME.diamond} {THEME.appName}</Text>
          <Text color={THEME.dim}> v{THEME.version}</Text>
          <Text color={THEME.dim}>  {THEME.pipe} </Text>
          <Text color={THEME.info}>{model}</Text>
          <Text color={THEME.dim}>  {THEME.pipe} </Text>
          <Text color={THEME.dim}>{user}@</Text>
          <Text color={THEME.text}>{cwd}</Text>
        </Box>
        {stats.length > 0 && (
          <Box>
            <Text color={THEME.dim}>{stats.join(' │ ')}</Text>
          </Box>
        )}
      </Box>

      {/* Separator */}
      <Box>
        <Text color={THEME.dim}>{'━'.repeat(Math.min(process.stdout.columns || 80, 120))}</Text>
      </Box>
    </Box>
  );
}
