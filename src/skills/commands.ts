import type { LoadedSkill } from './parser.js';

export class SkillRegistry {
  private skills = new Map<string, LoadedSkill>();

  register(skill: LoadedSkill): void {
    const command = skill.manifest.command;
    if (this.skills.has(command)) {
      throw new Error(`Skill command "${command}" is already registered`);
    }
    this.skills.set(command, skill);
  }

  has(command: string): boolean {
    return this.skills.has(command);
  }

  get(command: string): LoadedSkill | undefined {
    return this.skills.get(command);
  }

  getAll(): LoadedSkill[] {
    return [...this.skills.values()];
  }

  getSystemPrompt(command: string): string | null {
    const skill = this.skills.get(command);
    return skill ? skill.promptContent : null;
  }

  getCommands(): string[] {
    return [...this.skills.keys()];
  }
}
