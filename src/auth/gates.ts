import type { Tier } from './license.js';

const PRO_FEATURES = new Set([
  'session-resume',
  'checkpoints',
  'memory',
  'plugins',
  'mcp',
  'hooks',
  'worktrees',
  'custom-commands',
  'shimmer-spinner',
  'diff-preview',
  'capabilities-full',
  'subagents',
  'verification-gates',
  'syntax-highlighting',
]);

const TEAM_FEATURES = new Set([
  'team-memory',
  'team-settings',
  'usage-dashboard',
  'shared-arqzero-md',
]);

// Tools that require Pro
export const PRO_TOOLS = new Set([
  'MultiEdit', 'NotebookRead', 'NotebookEdit',
  'TodoWrite', 'TodoRead', 'BashOutput', 'KillShell', 'Dispatch', 'Prompt',
]);

// Commands that require Pro
export const PRO_COMMANDS = new Set([
  '/memory', '/undo', '/think', '/agents', '/loop',
  '/vim', '/reload-plugins', '/plugin', '/session',
  '/export', '/context', '/cost', '/compress', '/skill',
  '/permissions', '/tools', '/check', '/setup',
]);

// Free tier gets 10 capabilities, Pro gets all 42
export const FREE_CAPABILITY_LIMIT = 10;

export function isFeatureAllowed(feature: string, tier: Tier): boolean {
  if (TEAM_FEATURES.has(feature)) return tier === 'team';
  if (PRO_FEATURES.has(feature)) return tier === 'pro' || tier === 'team';
  return true;
}

export function isToolAllowed(toolName: string, tier: Tier): boolean {
  if (PRO_TOOLS.has(toolName)) return tier === 'pro' || tier === 'team';
  return true;
}

export function isCommandAllowed(commandName: string, tier: Tier): boolean {
  if (PRO_COMMANDS.has(commandName)) return tier === 'pro' || tier === 'team';
  return true;
}

export function getCapabilityLimit(tier: Tier): number {
  if (tier === 'pro' || tier === 'team') return 42;
  return FREE_CAPABILITY_LIMIT;
}

export function getUpgradeMessage(feature: string): string {
  if (TEAM_FEATURES.has(feature)) {
    return `${feature} requires ArqZero Team ($30/user/mo). Visit https://arqzero.dev/pricing`;
  }
  return `${feature} requires ArqZero Pro ($12/mo). Run /upgrade or visit https://arqzero.dev/pricing`;
}
