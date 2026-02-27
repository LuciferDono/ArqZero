import type { PermissionLevel, PermissionRequest, PermissionResponse } from '../tools/types.js';
import type { AppConfig } from '../config/schema.js';
import { getEffectiveLevel } from './escalation.js';

export class PermissionManager {
  private sessionAlwaysAllow = new Set<string>();
  private sessionTrustedPatterns = new Map<string, string[]>();
  private config: AppConfig['permissions'];

  constructor(permissionsConfig: AppConfig['permissions']) {
    this.config = permissionsConfig;
  }

  /**
   * Check whether a tool invocation is permitted.
   * Returns a ToolResult-compatible denial or null if allowed.
   */
  async check(
    toolName: string,
    baseLevel: PermissionLevel,
    input: unknown,
    promptUser: (request: PermissionRequest) => Promise<PermissionResponse>,
  ): Promise<{ allowed: boolean; denial?: string }> {
    // 1. Config deny list
    if (this.config.alwaysDeny.includes(toolName)) {
      return { allowed: false, denial: `Tool "${toolName}" is denied by configuration` };
    }

    // 2. Determine effective level (with escalation)
    const level = getEffectiveLevel(toolName, baseLevel, input);

    // 3. Safe tools always allowed
    if (level === 'safe') {
      return { allowed: true };
    }

    // 4. Config allow list
    if (this.config.alwaysAllow.includes(toolName)) {
      return { allowed: true };
    }

    // 5. Session-level always allow
    if (this.sessionAlwaysAllow.has(toolName)) {
      return { allowed: true };
    }

    // 6. Trust mode: auto-approve everything not denied
    if (this.config.defaultMode === 'trust') {
      return { allowed: true };
    }

    // 7. Locked mode: deny without prompting
    if (this.config.defaultMode === 'locked') {
      return { allowed: false, denial: `Tool "${toolName}" denied: locked mode` };
    }

    // 8. Check config trusted patterns
    if (this.matchesTrustedPattern(toolName, input, this.config.trustedPatterns)) {
      return { allowed: true };
    }

    // 9. Check session trusted patterns
    const sessionPatterns = this.sessionTrustedPatterns.get(toolName);
    if (sessionPatterns && this.matchesPatternList(input, sessionPatterns)) {
      return { allowed: true };
    }

    // 10. Prompt user
    const response = await promptUser({ tool: toolName, input, level });

    if (response.allowed) {
      // Handle remember preference
      if (response.remember === 'session') {
        this.sessionAlwaysAllow.add(toolName);
      }
      return { allowed: true };
    }

    return { allowed: false, denial: `Tool "${toolName}" denied by user` };
  }

  private matchesTrustedPattern(
    toolName: string,
    input: unknown,
    patterns: Record<string, string[]>,
  ): boolean {
    const toolPatterns = patterns[toolName];
    if (!toolPatterns) return false;
    return this.matchesPatternList(input, toolPatterns);
  }

  private matchesPatternList(input: unknown, patterns: string[]): boolean {
    // For Bash tool, match against the command string
    const command = (input as { command?: string })?.command;
    if (!command) return false;

    for (const pattern of patterns) {
      if (this.globMatch(command, pattern)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Simple glob matching: `*` matches any sequence of characters.
   * "npm run *" matches "npm run dev", "npm run build", etc.
   */
  private globMatch(text: string, pattern: string): boolean {
    // Escape regex special chars except *, then convert * to .*
    const regexStr = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(text);
  }

  // For testing/debugging
  getSessionAlwaysAllow(): string[] {
    return [...this.sessionAlwaysAllow];
  }

  resetSession(): void {
    this.sessionAlwaysAllow.clear();
    this.sessionTrustedPatterns.clear();
  }
}
