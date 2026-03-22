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

// Gradient ASCII art logo — each line is a single string for alignment
const LOGO_LINES = [
  '   ▄▀▀▄ █▀▀▄ █▀▀█ ▀▀█ █▀▀ █▀▀▄ █▀▀█',
  '   █▀▀█ █▄▄▀ █ ▄▀  ▄▀ █▀▀ █▄▄▀ █  █',
  '   ▀  ▀ ▀ ▀▀  ▀▀▀ █▄▄ ▀▀▀ ▀ ▀▀ ▀▀▀▀',
];

// Color each character with a gradient sweep
function Logo() {
  const colors = ['#FF6B00', '#FF8C00', '#FFB800', '#FFD54F', '#FFF176', '#FFD54F', '#FFB800', '#FF8C00'];

  return (
    <Box flexDirection="column">
      {LOGO_LINES.map((line, lineIdx) => (
        <Box key={lineIdx}>
          {line.split('').map((char, i) => {
            const colorIdx = Math.floor((i / line.length) * colors.length);
            return (
              <Text key={i} color={colors[colorIdx]} bold>
                {char}
              </Text>
            );
          })}
        </Box>
      ))}
    </Box>
  );
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
    stats.push(`ctx ${contextPercent}%`);
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Logo */}
      <Box>
        <Box flexGrow={1}>
          <Logo />
        </Box>
        {/* Right-aligned info panel next to logo */}
        <Box flexDirection="column" alignItems="flex-end" justifyContent="flex-end">
          <Box>
            <Text color={THEME.dim}>{user}</Text>
            <Text color={THEME.primary}> @ </Text>
            <Text color={THEME.text}>{cwd}</Text>
          </Box>
          <Box>
            <Text color={THEME.dim}>model </Text>
            <Text color={THEME.info} bold>{model}</Text>
          </Box>
          {stats.length > 0 && (
            <Box>
              <Text color={THEME.dim}>{stats.join('  │  ')}</Text>
            </Box>
          )}
        </Box>
      </Box>

      {/* Separator */}
      <Box>
        <Text color="#FF8C00">{'━'}</Text>
        <Text color="#FFB800">{'━━'}</Text>
        <Text color="#FFD54F">{'━━━'}</Text>
        <Text color="#FFF176">{'━━━━'}</Text>
        <Text color={THEME.dim}>{'━'.repeat(Math.max(0, Math.min(process.stdout.columns || 80, 120) - 10))}</Text>
      </Box>
    </Box>
  );
}
