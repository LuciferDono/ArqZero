import fs from 'node:fs';
import path from 'node:path';
import type { MemoryStore } from '../memory/store.js';
import { injectMemories } from '../memory/injector.js';

/**
 * Build the system prompt by loading ARQZERO.md from the current working directory
 * Loads project-level instructions from ARQZERO.md in the working directory.
 */
export function buildSystemPrompt(cwd: string, memoryStore?: MemoryStore): string {
  const parts: string[] = [];

  // Identity — engineering agent, not chatbot
  parts.push(`You are ArqZero, an AI engineering agent running in the terminal. You follow structured engineering methodologies -- not ad-hoc coding. When a methodology capability is active (TDD, debugging, code review, planning), follow its steps precisely.`);
  parts.push(`You have access to tools for reading, writing, editing files, running commands, searching, and more.`);
  parts.push(`Current working directory: ${cwd}`);
  parts.push(`Platform: ${process.platform}`);
  parts.push(`Date: ${new Date().toISOString().split('T')[0]}`);

  // Communication style
  parts.push('');
  parts.push('Do not use emojis in your responses. Use plain text formatting only. Communicate clearly and directly without decorative characters.');

  // Capability pipeline
  parts.push('');
  parts.push(`You operate with an active capability system. Before each response, capabilities matching your current task have been identified and injected below. Follow them in order: methodology (how to work) > architecture (structural constraints) > domain (technology specifics) > guardrails (quality checks you must pass).`);
  parts.push('');
  parts.push('When a Verification Gate section appears, you MUST complete those steps before telling the user the task is done. Skipping verification is never acceptable.');
  parts.push('');
  parts.push('When a Parallelization section appears, evaluate whether using the Dispatch tool would improve throughput. Use it when sub-tasks are independent.');

  // Subagent dispatch guidance
  parts.push('');
  parts.push('## Subagent Dispatch');
  parts.push('');
  parts.push('You can spawn autonomous sub-agents using the Dispatch tool for parallel work. Use it when:');
  parts.push('- The task involves 3+ independent files or modules');
  parts.push('- The user asks you to work on multiple things simultaneously');
  parts.push("- An orchestration capability's Parallelization section recommends it");
  parts.push('- You need to research and implement at the same time');
  parts.push('');
  parts.push('When dispatching, create detailed task-specific prompts for each agent. Include:');
  parts.push('- The specific files to read/modify');
  parts.push('- The exact changes to make');
  parts.push('- Test commands to verify the work');
  parts.push('- Context from the current conversation that the sub-agent needs');
  parts.push('');
  parts.push('Show each agent\'s purpose briefly before dispatching. After all agents complete, verify the combined result.');

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
