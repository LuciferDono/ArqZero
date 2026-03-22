import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { SlashCommand, SlashCommandContext } from './registry.js';

export function loadCustomCommands(cwd: string): SlashCommand[] {
  const commands: SlashCommand[] = [];

  // Project-level: <cwd>/.arqzero/commands/
  const projectDir = path.join(cwd, '.arqzero', 'commands');
  // Global: ~/.arqzero/commands/
  const globalDir = path.join(os.homedir(), '.arqzero', 'commands');

  // Track names so project-level overrides global
  const seen = new Set<string>();

  // Load project-level first (higher priority)
  for (const dir of [projectDir, globalDir]) {
    if (!fs.existsSync(dir)) continue;

    let files: string[];
    try {
      files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    } catch {
      continue;
    }

    for (const file of files) {
      const name = '/' + file.replace(/\.md$/, '');
      if (seen.has(name)) continue;
      seen.add(name);

      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      commands.push({
        name,
        description: `Custom command from ${file}`,
        async execute(args: string, _ctx: SlashCommandContext): Promise<string | null> {
          // Replace $ARGUMENTS with actual args
          const prompt = content.replace(/\$ARGUMENTS/g, args);
          return `[Custom command ${name}]: ${prompt}`;
        },
      });
    }
  }

  return commands;
}
