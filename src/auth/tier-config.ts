// src/auth/tier-config.ts
// Single source of truth for what each tier gets.
// When doing the open-core split:
//   FREE stays in the public package (arqzero)
//   PRO/TEAM moves to @arqzero/pro

export const TIER_CONFIG = {
  free: {
    tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'LS', 'WebSearch', 'WebFetch'],
    commands: ['/help', '/clear', '/config', '/quit', '/status', '/model'],
    capabilityLimit: 10,
    dailyMessageCap: 50,
    features: ['headless-mode'],
  },
  pro: {
    tools: [
      'Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'LS', 'WebSearch', 'WebFetch',
      'MultiEdit', 'NotebookRead', 'NotebookEdit', 'TodoWrite', 'TodoRead',
      'BashOutput', 'KillShell', 'Dispatch', 'Prompt',
    ],
    commands: [
      '/help', '/clear', '/config', '/quit', '/status', '/model',
      '/memory', '/undo', '/think', '/agents', '/loop', '/vim',
      '/context', '/cost', '/export', '/permissions', '/tools',
      '/check', '/setup', '/session', '/reload-plugins', '/plugin',
      '/compress', '/skill',
      '/login', '/logout', '/upgrade',
    ],
    capabilityLimit: 42,
    dailyMessageCap: 0, // unlimited
    features: [
      'headless-mode', 'session-resume', 'checkpoints', 'memory',
      'plugins', 'mcp', 'hooks', 'worktrees', 'custom-commands',
      'shimmer-spinner', 'diff-preview', 'capabilities-full',
      'subagents', 'verification-gates', 'syntax-highlighting',
    ],
  },
  team: {
    // Everything in pro, plus:
    extraFeatures: ['team-memory', 'team-settings', 'usage-dashboard', 'shared-arqzero-md'],
  },
} as const;

export type TierName = keyof typeof TIER_CONFIG;
