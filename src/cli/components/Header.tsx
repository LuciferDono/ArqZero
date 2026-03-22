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

// ARQ + ZERO side by side, ZERO scaled to match ARQ's 5-row height
const LOGO_ARQ = [
  ' ░█████╗░██████╗░░██████╗░',
  ' ██╔══██╗██╔══██╗██╔═══██╗',
  ' ███████║██████╔╝██║██╗██║',
  ' ██╔══██║██╔══██╗╚██████╔╝',
  ' ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═══╝╚═╝',
];

const LOGO_ZERO = [
  '░████╗░███╗░██████╗░█████╗░',
  '╚══██║██╔═╝ ██╔══██╗██╔══██╗',
  '  ██╔╝████╗ ██████╔╝██║  ██║',
  ' ██╔╝ ██╔═╝ ██╔══██╗╚█████╔╝',
  '████║ ████╗ ╚═╝  ╚═╝ ╚════╝',
];

const COLOR_CYAN = '#00e5c0';
const COLOR_PURPLE = '#a78bfa';
const COLOR_MUTED = '#2d3a55';

function LogoBlock() {
  const lines = LOGO_ARQ.length;
  return (
    <Box flexDirection="column">
      {Array.from({ length: lines }, (_, i) => (
        <Box key={i}>
          <Text color={COLOR_CYAN} bold>{LOGO_ARQ[i]}</Text>
          <Text color={COLOR_CYAN} bold>  {LOGO_ZERO[i] ?? ''}</Text>
        </Box>
      ))}
      <Box>
        <Text color={COLOR_CYAN}> ─────── </Text>
        <Text color={COLOR_PURPLE}>ArqZero</Text>
        <Text color={COLOR_MUTED}> v{THEME.version}</Text>
      </Box>
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
      {/* Logo — full width */}
      <LogoBlock />

      {/* Info bar */}
      <Box>
        <Box flexGrow={1}>
          <Text color="#888888">{user}</Text>
          <Text color={COLOR_CYAN}> ◈ </Text>
          <Text color={THEME.text}>{cwd}</Text>
        </Box>
        <Box>
          <Text color="#444444">▐</Text>
          <Text color="#1a1a1a" backgroundColor={COLOR_CYAN} bold> {model} </Text>
          <Text color="#444444">▌</Text>
          {tokenUsage && (
            <Text color={THEME.dim}>  {formatTokens(tokenUsage)} tok</Text>
          )}
          {costEstimate > 0 && (
            <Text color={THEME.dim}> │ {formatCost(costEstimate)}</Text>
          )}
          {contextPercent > 0 && (
            <Text color={THEME.dim}> │ ctx {contextPercent}%</Text>
          )}
        </Box>
      </Box>

      {/* Separator */}
      <Box>
        <Text color={COLOR_CYAN}>{'─'}</Text>
        <Text color={COLOR_MUTED}>{'─'.repeat(Math.max(0, Math.min(process.stdout.columns || 80, 120) - 1))}</Text>
      </Box>
    </Box>
  );
}
