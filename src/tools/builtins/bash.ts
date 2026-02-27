import { spawnSync } from 'node:child_process';
import type { Tool, ToolContext, ToolResult } from '../types.js';

interface BashInput {
  command: string;
  timeout?: number;
  cwd?: string;
}

const INTERACTIVE_PATTERNS = [
  /^vim\b/, /^vi\b/, /^nano\b/, /^emacs\b/,
  /^ssh\b(?!.*\s-[A-Za-z]*[Tt])/,
  /^python3?\s*$/,
  /^node\s*$/,
  /^irb\b/, /^pry\b/,
  /^mysql\s*$/,
  /^psql\s*$/,
];

function isInteractive(command: string): boolean {
  const trimmed = command.trim();
  return INTERACTIVE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function resolveTimeout(input: BashInput, ctx: ToolContext): number {
  const { defaultTimeout, maxTimeout } = ctx.config.bash;
  if (input.timeout !== undefined) {
    return Math.min(input.timeout, maxTimeout);
  }
  return defaultTimeout;
}

function formatOutput(stdout: string, stderr: string, exitCode: number | null): ToolResult {
  const hasStdout = stdout.length > 0;
  const hasStderr = stderr.length > 0;

  let content: string;
  if (hasStdout && hasStderr) {
    content = `stdout:\n${stdout}\n\nstderr:\n${stderr}`;
  } else if (hasStdout) {
    content = stdout;
  } else if (hasStderr) {
    content = `stderr:\n${stderr}`;
  } else {
    content = '(no output)';
  }

  if (exitCode !== null && exitCode !== 0) {
    content += `\n\nExit code: ${exitCode}`;
  }

  const isError = exitCode !== null && exitCode !== 0 ? true : undefined;

  return { content, isError };
}

export const bashTool: Tool = {
  name: 'Bash',
  description: 'Executes a shell command and returns the output.',
  inputSchema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'The shell command to execute' },
      timeout: { type: 'number', description: 'Timeout in milliseconds' },
      cwd: { type: 'string', description: 'Working directory override' },
    },
    required: ['command'],
  },
  permissionLevel: 'ask',

  async execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
    const { command, cwd } = input as BashInput;

    if (isInteractive(command)) {
      return {
        content: 'Interactive processes are not supported. Use non-interactive alternatives.',
        isError: true,
      };
    }

    const timeout = resolveTimeout(input as BashInput, ctx);
    const workingDir = cwd ?? ctx.cwd;

    try {
      const result = spawnSync(command, [], {
        cwd: workingDir,
        timeout,
        encoding: 'utf-8',
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (result.error) {
        return {
          content: `Error: ${result.error.message}`,
          isError: true,
        };
      }

      const stdout = (result.stdout ?? '').trimEnd();
      const stderr = (result.stderr ?? '').trimEnd();
      const exitCode = result.status;

      return formatOutput(stdout, stderr, exitCode);
    } catch (err: any) {
      return {
        content: `Error: ${err.message}`,
        isError: true,
      };
    }
  },
};
