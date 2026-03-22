import type { Capability } from './capabilities.js';

export interface MatchResult {
  capability: Capability;
  score: number;
  matchedKeywords: string[];
}

export function matchCapabilities(
  userMessage: string,
  capabilities: Capability[],
): MatchResult[] {
  const messageLower = userMessage.toLowerCase();
  const words = messageLower.split(/\s+/);

  const results: MatchResult[] = [];

  for (const cap of capabilities) {
    const matched: string[] = [];
    for (const trigger of cap.triggers) {
      // Support multi-word triggers
      if (trigger.includes(' ')) {
        if (messageLower.includes(trigger)) matched.push(trigger);
      } else {
        if (words.includes(trigger)) matched.push(trigger);
      }
    }

    if (matched.length > 0) {
      results.push({
        capability: cap,
        score: matched.length,
        matchedKeywords: matched,
      });
    }
  }

  // Sort: process first, then by score descending
  return results.sort((a, b) => {
    if (
      a.capability.category === 'process' &&
      b.capability.category !== 'process'
    )
      return -1;
    if (
      a.capability.category !== 'process' &&
      b.capability.category === 'process'
    )
      return 1;
    return b.score - a.score;
  });
}

/** Max 5 capabilities per message to avoid context bloat */
export function selectCapabilities(
  matches: MatchResult[],
  max = 5,
): MatchResult[] {
  return matches.slice(0, max);
}
