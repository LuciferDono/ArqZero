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

// ARQ + ZERO side by side, proper spacing for Z and E
const LOGO_ARQ = [
  ' ░█████╗░██████╗░░██████╗░',
  ' ██╔══██╗██╔══██╗██╔═══██╗',
  ' ███████║██████╔╝██║██╗██║',
  ' ██╔══██║██╔══██╗╚██████╔╝',
  ' ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═══╝╚═╝',
];

const LOGO_ZERO = [
  '███████╗ ██████╗ ██████╗░ ░█████╗░',
  '╚══███╔╝ ██╔═══╝ ██╔══██╗ ██╔══██╗',
  '  ███╔╝  █████╗  ██████╔╝ ██║  ██║',
  ' ███╔╝   ██╔══╝  ██╔══██╗ ╚█████╔╝',
  '███████╗ ██████╗ ╚═╝  ╚═╝  ╚════╝ ',
];

function LogoBlock() {
  const lines = LOGO_ARQ.length;
  return (
    <Box flexDirection="column">
      {Array.from({ length: lines }, (_, i) => (
        <Box key={i}>
          <Text color={COLORS.brand} bold>{LOGO_ARQ[i]}</Text>
          <Text color={COLORS.info} bold>  {LOGO_ZERO[i] ?? ''}</Text>
        </Box>
      ))}
      <Box>
        <Text color={COLORS.brand}> ─────── </Text>
        <Text color={COLORS.info} bold>v{THEME.version}</Text>
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
  const color = percent > 80 ? COLORS.ctxCritical : percent > 60 ? COLORS.ctxCaution : COLORS.ctxHealthy;
  return (
    <Box>
      <Text color={THEME.dim}>ctx </Text>
      <Text color={color}>{'█'.repeat(filled)}</Text>
      <Text color={COLORS.ctxTrack}>{'░'.repeat(empty)}</Text>
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
          <Text color={COLORS.username}>{user}</Text>
          <Text color={COLORS.brand}> ◈ </Text>
          <Text color={THEME.text}>{cwd}</Text>
        </Box>
        <Box>
          <Text color={COLORS.structural}>▐</Text>
          <Text color={COLORS.badgeBg} backgroundColor={COLORS.brand} bold> {model} </Text>
          <Text color={COLORS.structural}>▌</Text>
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
        <Text color={COLORS.brand}>{'─'}</Text>
        <Text color={COLORS.structural}>{'─'.repeat(Math.max(0, Math.min(process.stdout.columns || 80, 120) - 1))}</Text>
      </Box>
    </Box>
  );
}
