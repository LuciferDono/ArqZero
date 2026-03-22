import type { AppConfig } from '../config/schema.js';
import type { SkillRegistry } from '../skills/commands.js';
import type { CheckpointStore } from '../checkpoints/store.js';

export interface SlashCommandContext {
  config: AppConfig;
  skillRegistry?: SkillRegistry;
  commandRegistry?: SlashCommandRegistry;
  checkpointStore?: CheckpointStore;
  onModelChange?: (model: string) => void;
  onClear?: () => void;
  onCompact?: () => void;
  onQuit?: () => void;
}

export interface SlashCommand {
  name: string;
  description: string;
  execute(args: string, ctx: SlashCommandContext): Promise<string | null>;
}

export class SlashCommandRegistry {
  private commands = new Map<string, SlashCommand>();

  register(cmd: SlashCommand): void {
    this.commands.set(cmd.name, cmd);
  }

  has(name: string): boolean {
    return this.commands.has(name);
  }

  get(name: string): SlashCommand | undefined {
    return this.commands.get(name);
  }

  getAll(): SlashCommand[] {
    return [...this.commands.values()];
  }

  isSlashCommand(input: string): boolean {
    return input.startsWith('/');
  }

  parse(input: string): { name: string; args: string } {
    const trimmed = input.trim();
    const spaceIndex = trimmed.indexOf(' ');
    if (spaceIndex === -1) {
      return { name: trimmed, args: '' };
    }
    const name = trimmed.slice(0, spaceIndex);
    const args = trimmed.slice(spaceIndex + 1).trim();
    return { name, args };
  }
}
