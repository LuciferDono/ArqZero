import type { PermissionLevel } from '../tools/types.js';

// Patterns that escalate Bash from 'ask' to 'dangerous'
const DANGEROUS_PATTERNS: RegExp[] = [
  /rm\s+(-rf|--recursive)/,
  /rm\s+-[a-zA-Z]*f[a-zA-Z]*\s/,       // rm with -f flag anywhere
  /git\s+push\s+--force/,
  /git\s+push\s+-f\b/,
  /git\s+reset\s+--hard/,
  /git\s+clean\s+-[a-zA-Z]*f/,
  /DROP\s+(TABLE|DATABASE)/i,
  /TRUNCATE\s+TABLE/i,
  /DELETE\s+FROM\s+\w+\s*$/i,           // DELETE without WHERE
  /mkfs\b/,
  /fdisk\b/,
  /dd\s+if=.*\s+of=(?!\/dev\/null)/,    // dd writing to real devices, NOT /dev/null
  /chmod\s+777/,
  /curl\s+.*\|\s*(ba)?sh/,              // pipe curl to shell
  /wget\s+.*\|\s*(ba)?sh/,
  />\s*\/etc\//,                         // writing to /etc/
  /npm\s+publish/,
  /npx\s+.*--yes/,                       // auto-yes npx
];

/**
 * Determines the effective permission level for a tool invocation.
 * Only Bash commands can escalate from 'ask' to 'dangerous'.
 * 'safe' tools never escalate. 'dangerous' tools stay dangerous.
 */
export function getEffectiveLevel(
  toolName: string,
  baseLevel: PermissionLevel,
  input: unknown,
): PermissionLevel {
  // Safe tools never escalate
  if (baseLevel === 'safe') return 'safe';

  // Already dangerous
  if (baseLevel === 'dangerous') return 'dangerous';

  // Only Bash escalates based on input
  if (toolName !== 'Bash') return baseLevel;

  const command = (input as { command?: string })?.command;
  if (!command) return baseLevel;

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return 'dangerous';
    }
  }

  return baseLevel;
}

// Expose for testing
export { DANGEROUS_PATTERNS };
