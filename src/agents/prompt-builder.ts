export interface SubagentTask {
  description: string;
  prompt: string;
  model?: string;
}

/**
 * Build detailed prompts for subagent dispatch based on the task.
 * Uses labs architecture to include relevant capability context.
 */
export function buildSubagentPrompt(options: {
  task: string;
  cwd: string;
  relevantFiles?: string[];
  testCommand?: string;
  additionalContext?: string;
}): string {
  const parts: string[] = [];

  parts.push('You are a sub-agent of ArqZero working on a specific task.');
  parts.push(`Working directory: ${options.cwd}`);
  parts.push('');
  parts.push('## Task');
  parts.push(options.task);

  if (options.relevantFiles?.length) {
    parts.push('');
    parts.push('## Relevant Files');
    parts.push(`Read these files first: ${options.relevantFiles.join(', ')}`);
  }

  if (options.testCommand) {
    parts.push('');
    parts.push('## Verification');
    parts.push(`After making changes, run: ${options.testCommand}`);
  }

  if (options.additionalContext) {
    parts.push('');
    parts.push('## Context');
    parts.push(options.additionalContext);
  }

  parts.push('');
  parts.push('Work autonomously. Be thorough. Report what you did and any issues found.');

  return parts.join('\n');
}
