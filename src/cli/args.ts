import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export interface CliArgs {
  version?: boolean;
  print?: string;
  continue?: boolean;
  resume?: string;
  model?: string;
  verbose?: boolean;
  allowedTools?: string;
  outputFormat?: 'text' | 'json' | 'stream-json';
  autoApprove?: boolean;
  worktree?: string;
}

function getVersion(): string {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const pkgPath = path.resolve(__dirname, '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export function parseArgs(argv?: string[]): CliArgs {
  const program = new Command();

  program
    .name('arqzero')
    .description('AI-powered coding assistant CLI')
    .version(getVersion())
    .option('-p, --print <prompt>', 'Run in headless mode with the given prompt')
    .option('-c, --continue', 'Continue the last session')
    .option('--resume <session-id>', 'Resume a specific session')
    .option('--model <model>', 'Override the model')
    .option('--verbose', 'Enable verbose output')
    .option('--allowedTools <tools>', 'Comma-separated list of allowed tools')
    .option('--output-format <format>', 'Output format: text, json, or stream-json')
    .option('--auto-approve', 'Skip all permission checks')
    .option('--worktree <name>', 'Use a named worktree')
    .exitOverride()
    .configureOutput({
      writeOut: (str: string) => { process.stdout.write(str); },
      writeErr: () => {},
    });

  try {
    program.parse(argv ?? [], { from: 'user' });
  } catch (err: any) {
    // Commander throws on --help/--version with exitOverride
    if (err?.code === 'commander.version' || err?.code === 'commander.helpDisplayed') {
      process.exit(0);
    }
    return {};
  }

  const opts = program.opts();

  const result: CliArgs = {};

  if (opts.print !== undefined) result.print = opts.print;
  if (opts.continue !== undefined) result.continue = opts.continue;
  if (opts.resume !== undefined) result.resume = opts.resume;
  if (opts.model !== undefined) result.model = opts.model;
  if (opts.verbose !== undefined) result.verbose = opts.verbose;
  if (opts.allowedTools !== undefined) result.allowedTools = opts.allowedTools;
  if (opts.outputFormat !== undefined) {
    result.outputFormat = opts.outputFormat as CliArgs['outputFormat'];
  }
  if (opts.autoApprove !== undefined) {
    result.autoApprove = opts.autoApprove;
  }
  if (opts.worktree !== undefined) result.worktree = opts.worktree;

  return result;
}
