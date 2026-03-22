import fs from 'node:fs';
import path from 'node:path';
import type { MemoryStore } from '../memory/store.js';
import { injectMemories } from '../memory/injector.js';

/**
 * Build the system prompt by loading ARQZERO.md from the current working directory
 * (like CLAUDE.md in Claude Code).
 */
export function buildSystemPrompt(cwd: string, memoryStore?: MemoryStore): string {
  const parts: string[] = [];

  // Base identity
  parts.push(`You are ArqZero, an AI coding assistant running in the terminal.`);
  parts.push(`You have access to tools for reading, writing, editing files, running commands, searching, and more.`);
  parts.push(`Current working directory: ${cwd}`);
  parts.push(`Platform: ${process.platform}`);
  parts.push(`Date: ${new Date().toISOString().split('T')[0]}`);

  // Load ARQZERO.md if it exists
  const arqzeroMdPath = path.join(cwd, 'ARQZERO.md');
  if (fs.existsSync(arqzeroMdPath)) {
    try {
      const content = fs.readFileSync(arqzeroMdPath, 'utf-8');
      parts.push('');
      parts.push('## Project Instructions (from ARQZERO.md)');
      parts.push(content);
    } catch {
      // Ignore read errors
    }
  }

  // Also check parent directories for ARQZERO.md (up to 3 levels)
  let dir = path.dirname(cwd);
  for (let i = 0; i < 3; i++) {
    const parentMd = path.join(dir, 'ARQZERO.md');
    if (fs.existsSync(parentMd) && parentMd !== arqzeroMdPath) {
      try {
        const content = fs.readFileSync(parentMd, 'utf-8');
        parts.push('');
        parts.push(`## Project Instructions (from ${path.relative(cwd, parentMd)})`);
        parts.push(content);
      } catch {
        // Ignore
      }
      break;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  let prompt = parts.join('\n');

  if (memoryStore) {
    prompt = injectMemories(prompt, memoryStore);
  }

  return prompt;
}
