import type { Capability, CapabilityCategory } from './capabilities.js';

export interface MatchResult {
  capability: Capability;
  score: number;
  matchedKeywords: string[];
}

const SUFFIXES = ['ing', 'ed', 'er', 'tion', 'ment', 'ly', 'ness', 'ize', 'ise', 'ation', 'able', 'ible'];

/** Strip common English suffixes for fuzzy matching (applied iteratively) */
export function stem(word: string): string {
  let current = word;
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of SUFFIXES) {
      if (current.length > suffix.length + 2 && current.endsWith(suffix)) {
        current = current.slice(0, -suffix.length);
        changed = true;
        break;
      }
    }
  }
  return current;
}

/** Check if two stems share enough overlap to be considered the same root */
function stemsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  // One must be a prefix of the other, with the prefix at least 4 chars
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length > b.length ? a : b;
  return shorter.length >= 4 && longer.startsWith(shorter);
}

const CATEGORY_PRIORITY: Record<CapabilityCategory, number> = {
  methodology: 1,
  architecture: 2,
  domain: 3,
  guardrail: 4,
  orchestration: 5,
  tool: 6,
};

export function matchCapabilities(
  userMessage: string,
  capabilities: Capability[],
): MatchResult[] {
  const messageLower = userMessage.toLowerCase();
  const words = messageLower.split(/\s+/);
  const stemmedWords = words.map(stem);

  const results: MatchResult[] = [];

  for (const cap of capabilities) {
    const matched: string[] = [];
    let stemmedCount = 0;

    for (const trigger of cap.triggers) {
      // Support multi-word triggers
      if (trigger.includes(' ')) {
        if (messageLower.includes(trigger)) matched.push(trigger);
      } else {
        // Exact match (primary)
        if (words.includes(trigger)) {
          matched.push(trigger);
        } else {
          // Stemmed match (secondary) — compare stems with prefix overlap
          const stemmedTrigger = stem(trigger);
          if (stemmedWords.some(sw => stemsMatch(sw, stemmedTrigger))) {
            matched.push(trigger);
            stemmedCount++;
          }
        }
      }
    }

    if (matched.length > 0) {
      // Stemmed-only matches score lower (0.5 each instead of 1)
      const exactCount = matched.length - stemmedCount;
      results.push({
        capability: cap,
        score: exactCount + stemmedCount * 0.5,
        matchedKeywords: matched,
      });
    }
  }

  // Sort by: category priority, then phase (lower first, default 50), then score descending
  return results.sort((a, b) => {
    const catA = CATEGORY_PRIORITY[a.capability.category] ?? 99;
    const catB = CATEGORY_PRIORITY[b.capability.category] ?? 99;
    if (catA !== catB) return catA - catB;

    const phaseA = a.capability.phase ?? 50;
    const phaseB = b.capability.phase ?? 50;
    if (phaseA !== phaseB) return phaseA - phaseB;

    return b.score - a.score;
  });
}

/** Resolve dependency chains: hard requires, then soft recommends if under cap */
export function resolveDependencies(
  matches: MatchResult[],
  allCapabilities: Capability[],
  max: number,
): MatchResult[] {
  const byName = new Map(allCapabilities.map(c => [c.name, c]));
  const matchedNames = new Set(matches.map(m => m.capability.name));
  const result = [...matches];

  // Add hard requires
  for (const match of matches) {
    for (const req of match.capability.requires ?? []) {
      if (!matchedNames.has(req) && byName.has(req)) {
        result.push({ capability: byName.get(req)!, score: 0, matchedKeywords: ['(required)'] });
        matchedNames.add(req);
      }
    }
  }

  // Add soft recommends if under cap
  if (result.length < max) {
    for (const match of matches) {
      for (const rec of match.capability.recommends ?? []) {
        if (!matchedNames.has(rec) && byName.has(rec) && result.length < max) {
          result.push({ capability: byName.get(rec)!, score: 0, matchedKeywords: ['(recommended)'] });
          matchedNames.add(rec);
        }
      }
    }
  }

  return result;
}

/** Max 8 capabilities per message to avoid context bloat */
export function selectCapabilities(
  matches: MatchResult[],
  max = 8,
): MatchResult[] {
  return matches.slice(0, max);
}
