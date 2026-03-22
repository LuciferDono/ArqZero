// src/cli/components/settings-display.ts
import type { AppConfig } from '../../config/schema.js';
import { runtime } from '../../config/runtime.js';

export function shortModel(model: string): string {
  return model.replace('accounts/fireworks/models/', '');
}

export function pad(str: string, width: number): string {
  return str + ' '.repeat(Math.max(0, width - str.length));
}

export function formatSettingsDisplay(config: AppConfig): string {
  const col = 30;
  const border = 46;
  const top = `\u256D\u2500 ArqZero Settings ${'─'.repeat(border - 20)}\u256E`;
  const bot = `\u2570${'─'.repeat(border)}\u256F`;
  const blank = `\u2502${' '.repeat(border)}\u2502`;

  const row = (label: string, value: string): string => {
    const inner = `  ${label}  ${pad(value, col - label.length - 2)}`;
    return `\u2502${pad(inner, border)}\u2502`;
  };

  const alwaysAllow = config.permissions.alwaysAllow.length > 0
    ? config.permissions.alwaysAllow.join(', ')
    : '(none)';
  const alwaysDeny = config.permissions.alwaysDeny.length > 0
    ? config.permissions.alwaysDeny.join(', ')
    : '(none)';

  const lines = [
    top,
    blank,
    row('Provider', config.provider),
    row('Model', shortModel(config.model)),
    row('Max Tokens', String(config.maxTokens)),
    row('Mode', config.permissions.defaultMode),
    blank,
    row('Always Allow', alwaysAllow),
    row('Always Deny', alwaysDeny),
    blank,
    `\u2502  Accessibility${' '.repeat(border - 16)}\u2502`,
    `\u2502  \u251C Reduced Motion     ${pad(runtime.reducedMotion ? 'on' : 'off', border - 24)}\u2502`,
    `\u2502  \u2514 Syntax Highlight   ${pad(runtime.syntaxHighlightingDisabled ? 'off' : 'on', border - 24)}\u2502`,
    blank,
    bot,
  ];
  return lines.join('\n');
}
