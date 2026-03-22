import fs from 'node:fs';
import path from 'node:path';

/**
 * Build the system prompt by loading ARQCODE.md from the current working directory
 * (like CLAUDE.md in Claude Code).
 */
export function buildSystemPrompt(cwd: string): string {
  const parts: string[] = [];

  // Base identity
  parts.push(`You are ArqCode, an AI coding assistant running in the terminal.`);
  parts.push(`You have access to tools for reading, writing, editing files, running commands, searching, and more.`);
  parts.push(`Current working directory: ${cwd}`);
  parts.push(`Platform: ${process.platform}`);
  parts.push(`Date: ${new Date().toISOString().split('T')[0]}`);

  // Load ARQCODE.md if it exists
  const arqcodeMdPath = path.join(cwd, 'ARQCODE.md');
  if (fs.existsSync(arqcodeMdPath)) {
    try {
      const content = fs.readFileSync(arqcodeMdPath, 'utf-8');
      parts.push('');
      parts.push('## Project Instructions (from ARQCODE.md)');
      parts.push(content);
    } catch {
      // Ignore read errors
    }
  }

  // Also check parent directories for ARQCODE.md (up to 3 levels)
  let dir = path.dirname(cwd);
  for (let i = 0; i < 3; i++) {
    const parentMd = path.join(dir, 'ARQCODE.md');
    if (fs.existsSync(parentMd) && parentMd !== arqcodeMdPath) {
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

  return parts.join('\n');
}
