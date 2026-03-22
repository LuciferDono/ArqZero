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

// Display name mapping — visual alias for models
const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'accounts/fireworks/models/glm-4p7': 'PRIMUS',
  'glm-4p7': 'PRIMUS',
};

function shortModelName(name: string): string {
  if (MODEL_DISPLAY_NAMES[name]) return MODEL_DISPLAY_NAMES[name];
  const prefixes = ['accounts/fireworks/models/', 'accounts/', 'models/'];
  let short = name;
  for (const prefix of prefixes) {
    if (short.startsWith(prefix)) {
      short = short.slice(prefix.length);
    }
  }
  return MODEL_DISPLAY_NAMES[short] ?? short;
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

// Gradient ASCII art logo
const LOGO_LINES = [
  '   ▄▀▀▄ █▀▀▄ █▀▀█ ▀▀█ █▀▀ █▀▀▄ █▀▀█',
  '   █▀▀█ █▄▄▀ █ ▄▀  ▄▀ █▀▀ █▄▄▀ █  █',
  '   ▀  ▀ ▀ ▀▀  ▀▀▀ █▄▄ ▀▀▀ ▀ ▀▀ ▀▀▀▀',
];

const GRADIENT = ['#FF6B00', '#FF8C00', '#FFB800', '#FFD54F', '#FFF176', '#FFD54F', '#FFB800', '#FF8C00'];

function Logo() {
  return (
    <Box flexDirection="column">
      {LOGO_LINES.map((line, lineIdx) => (
        <Box key={lineIdx}>
          {line.split('').map((char, i) => {
            const colorIdx = Math.floor((i / line.length) * GRADIENT.length);
            return (
              <Text key={i} color={GRADIENT[colorIdx]} bold>
                {char}
              </Text>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}

// Context meter — visual bar
function ContextMeter({ percent }: { percent: number }) {
  if (percent <= 0) return null;
  const width = 12;
  const filled = Math.round(width * percent / 100);
  const empty = width - filled;
  const color = percent > 80 ? '#FF4444' : percent > 60 ? '#FFB800' : '#69DB7C';
  return (
    <Box>
      <Text color={THEME.dim}>ctx </Text>
      <Text color={color}>{'█'.repeat(filled)}</Text>
      <Text color="#333333">{'░'.repeat(empty)}</Text>
      <Text color={THEME.dim}> {percent}%</Text>
    </Box>
  );
}

export function Header({ modelName, tokenUsage, costEstimate, contextPercent }: HeaderProps) {
  const user = getUsername();
  const model = shortModelName(modelName);
  const cwd = getCwd();

  return (
    <Box flexDirection="column" marginBottom={0}>
      {/* Main header: Logo left, info right */}
      <Box>
        <Box flexGrow={1}>
          <Logo />
        </Box>
        <Box flexDirection="column" alignItems="flex-end" justifyContent="flex-end">
          {/* User + path */}
          <Box>
            <Text color="#888888">{user}</Text>
            <Text color={THEME.primary}> ◈ </Text>
            <Text color={THEME.text}>{cwd}</Text>
          </Box>
          {/* Model badge */}
          <Box>
            <Text color="#444444">▐</Text>
            <Text color="#1a1a1a" backgroundColor={THEME.primary} bold> {model} </Text>
            <Text color="#444444">▌</Text>
          </Box>
          {/* Stats row */}
          <Box>
            {tokenUsage && (
              <>
                <Text color={THEME.dim}>{formatTokens(tokenUsage)} tok</Text>
                <Text color="#444444"> │ </Text>
              </>
            )}
            {costEstimate > 0 && (
              <>
                <Text color={THEME.dim}>{formatCost(costEstimate)}</Text>
                <Text color="#444444"> │ </Text>
              </>
            )}
            <ContextMeter percent={contextPercent} />
          </Box>
        </Box>
      </Box>

      {/* Gradient separator */}
      <Box>
        <Text color="#FF6B00">{'━━'}</Text>
        <Text color="#FF8C00">{'━━━'}</Text>
        <Text color="#FFB800">{'━━━━'}</Text>
        <Text color="#FFD54F">{'━━━━━'}</Text>
        <Text color="#444444">{'━'.repeat(Math.max(0, Math.min(process.stdout.columns || 80, 120) - 14))}</Text>
      </Box>
    </Box>
  );
}
