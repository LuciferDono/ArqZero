import type { MemoryStore } from './store.js';

/**
 * Inject persistent memories into the system prompt.
 * Appends a "## Persistent Memory" section with the MEMORY.md index.
 * Keeps injected content under maxTokenEstimate (rough: 4 chars per token).
 */
export function injectMemories(
  systemPrompt: string,
  store: MemoryStore,
  maxTokenEstimate?: number,
): string {
  const index = store.getIndex();
  if (!index) {
    return systemPrompt;
  }

  const maxChars = (maxTokenEstimate ?? 2000) * 4;
  let memorySection = `\n\n## Persistent Memory\n\n${index}`;

  if (memorySection.length > maxChars) {
    memorySection = memorySection.slice(0, maxChars);
  }

  return systemPrompt + memorySection;
}
