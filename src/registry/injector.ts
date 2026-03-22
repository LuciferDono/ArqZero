import type { MatchResult } from './matcher.js';

export function buildCapabilityContext(matches: MatchResult[]): string {
  if (matches.length === 0) return '';

  const parts: string[] = [];
  parts.push('\n## Active Capabilities');
  parts.push(
    "Based on the user's request, the following capabilities are activated:",
  );

  for (const match of matches) {
    parts.push(`\n### ${match.capability.name}`);
    parts.push(`Matched: ${match.matchedKeywords.join(', ')}`);
    if (match.capability.systemPromptAddition) {
      parts.push(match.capability.systemPromptAddition);
    }
    if (match.capability.suggestedTools?.length) {
      parts.push(
        `Suggested tools: ${match.capability.suggestedTools.join(', ')}`,
      );
    }
  }

  return parts.join('\n');
}
