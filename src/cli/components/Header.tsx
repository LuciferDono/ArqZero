// src/cli/components/Header.tsx
import React, { useState, useEffect } from 'react';
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

// Display name mapping
const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'accounts/fireworks/models/glm-4p7': 'PRIMUS',
  'glm-4p7': 'PRIMUS',
  'accounts/fireworks/models/glm-5': 'PRIMUS Edge',
  'glm-5': 'PRIMUS Edge',
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
  if (total >= 1000) return `${(total / 1000).toFixed(1)}k`;
  return `${total}`;
}

function formatCost(cost: number): string {
  if (cost < 0.001) return '$0.00';
  return `$${cost.toFixed(2)}`;
}

function getUsername(): string {
  try { return os.userInfo().username; } catch { return 'user'; }
}

function getCwd(): string {
  const cwd = process.cwd();
  const home = os.homedir();
  if (cwd.startsWith(home)) return '~' + cwd.slice(home.length).replace(/\\/g, '/');
  return cwd.replace(/\\/g, '/');
}

function getTermWidth(): number {
  return process.stdout.columns || 80;
}

// ─── Logo variants by terminal width ──────────────────────────

// Full: 62 chars wide — for terminals >= 80 cols
const LOGO_FULL_ARQ = [
  ' ░█████╗░██████╗░░██████╗░',
  ' ██╔══██╗██╔══██╗██╔═══██╗',
  ' ███████║██████╔╝██║██╗██║',
  ' ██╔══██║██╔══██╗╚██████╔╝',
  ' ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═══╝╚═╝',
];
const LOGO_FULL_ZERO = [
  '███████╗ ██████╗ ██████╗░ ░█████╗░',
  '╚══███╔╝ ██╔═══╝ ██╔══██╗ ██╔══██╗',
  '  ███╔╝  █████╗  ██████╔╝ ██║  ██║',
  ' ███╔╝   ██╔══╝  ██╔══██╗ ╚█████╔╝',
  '███████╗ ██████╗ ╚═╝  ╚═╝  ╚════╝ ',
];

// Compact: 31 chars — for terminals 40-79 cols
const LOGO_COMPACT = [
  ' ▄▀█ █▀█ █▀█ ▀█ █▀▀ █▀█ █▀█',
  ' █▀█ █▀▄ ▀▀█ █▄ ██▄ █▀▄ █▄█',
];

// Minimal: plain text — for terminals < 40 cols
// (no constant needed, just render text)

function Logo() {
  const width = getTermWidth();

  // Full block logo — wide terminal
  if (width >= 80) {
    const lines = LOGO_FULL_ARQ.length;
    return (
      <Box flexDirection="column">
        {Array.from({ length: lines }, (_, i) => (
          <Box key={i}>
            <Text color={COLORS.brand} bold>{LOGO_FULL_ARQ[i]}</Text>
            <Text color="#8BBBD4" bold>  {LOGO_FULL_ZERO[i] ?? ''}</Text>
          </Box>
        ))}
        <Box>
          <Text color={COLORS.brand}> ─────── </Text>
          <Text color={COLORS.info} bold>v{THEME.version}</Text>
        </Box>
      </Box>
    );
  }

  // Compact half-block logo — medium terminal
  if (width >= 40) {
    return (
      <Box flexDirection="column">
        {LOGO_COMPACT.map((line, i) => (
          <Box key={i}>
            <Text color={COLORS.brand} bold>{line}</Text>
          </Box>
        ))}
        <Box>
          <Text color={COLORS.brand}>── </Text>
          <Text color={COLORS.info} bold>v{THEME.version}</Text>
        </Box>
      </Box>
    );
  }

  // Minimal text — very narrow terminal
  return (
    <Box>
      <Text color={COLORS.brand} bold>◆ ArqZero</Text>
      <Text color={COLORS.info}> v{THEME.version}</Text>
    </Box>
  );
}

// Context meter — adapts width to terminal
function ContextMeter({ percent }: { percent: number }) {
  if (percent <= 0) return null;
  const termWidth = getTermWidth();
  const barWidth = termWidth >= 80 ? 12 : termWidth >= 50 ? 8 : 4;
  const filled = Math.round(barWidth * percent / 100);
  const empty = barWidth - filled;
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
  const [termWidth, setTermWidth] = useState(getTermWidth());

  // Listen for terminal resize
  useEffect(() => {
    const onResize = () => setTermWidth(getTermWidth());
    process.stdout.on('resize', onResize);
    return () => { process.stdout.off('resize', onResize); };
  }, []);

  const user = getUsername();
  const model = shortModelName(modelName);
  const cwd = getCwd();

  // Truncate cwd if too long for terminal
  const maxCwdLen = Math.max(10, termWidth - 40);
  const displayCwd = cwd.length > maxCwdLen
    ? '...' + cwd.slice(cwd.length - maxCwdLen + 3)
    : cwd;

  // Separator adapts to actual terminal width
  const sepWidth = Math.max(10, Math.min(termWidth, 120));

  // Narrow terminal: stack info vertically
  const isNarrow = termWidth < 60;

  return (
    <Box flexDirection="column" marginBottom={0}>
      <Logo />

      {isNarrow ? (
        // Narrow: stack user, model, stats vertically
        <Box flexDirection="column">
          <Box>
            <Text color={COLORS.username}>{user}</Text>
            <Text color={COLORS.brand}> ◈ </Text>
            <Text color={THEME.text}>{displayCwd}</Text>
          </Box>
          <Box>
            <Text color={COLORS.structural}>▐</Text>
            <Text color={COLORS.badgeBg} backgroundColor={COLORS.brand} bold> {model} </Text>
            <Text color={COLORS.structural}>▌</Text>
            {tokenUsage && <Text color={THEME.dim}> {formatTokens(tokenUsage)}t</Text>}
            {contextPercent > 0 && <Text color={THEME.dim}> {contextPercent}%</Text>}
          </Box>
        </Box>
      ) : (
        // Wide: horizontal layout
        <Box>
          <Box flexGrow={1}>
            <Text color={COLORS.username}>{user}</Text>
            <Text color={COLORS.brand}> ◈ </Text>
            <Text color={THEME.text}>{displayCwd}</Text>
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
      )}

      {/* Separator — always fits terminal width */}
      <Box>
        <Text color={COLORS.brand}>{'─'}</Text>
        <Text color={COLORS.structural}>{'─'.repeat(Math.max(0, sepWidth - 1))}</Text>
      </Box>
    </Box>
  );
}
