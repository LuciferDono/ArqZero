import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parseManifest } from './parser.js';
import type { LoadedSkill } from './parser.js';

export function getDefaultSkillsDir(): string {
  return path.join(os.homedir(), '.arqcode', 'skills');
}

export async function scanSkills(skillsDir: string): Promise<LoadedSkill[]> {
  if (!fs.existsSync(skillsDir)) {
    return [];
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const skills: LoadedSkill[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const skillDir = path.join(skillsDir, entry.name);
    const manifestPath = path.join(skillDir, 'skill.json');
    const promptPath = path.join(skillDir, 'prompt.md');

    try {
      if (!fs.existsSync(manifestPath)) {
        console.warn(`Skipping skill "${entry.name}": missing skill.json`);
        continue;
      }

      if (!fs.existsSync(promptPath)) {
        console.warn(`Skipping skill "${entry.name}": missing prompt.md`);
        continue;
      }

      const manifestJson = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = parseManifest(manifestJson);
      const promptContent = fs.readFileSync(promptPath, 'utf-8');

      skills.push({
        manifest,
        promptContent,
        directory: skillDir,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`Skipping skill "${entry.name}": ${message}`);
    }
  }

  return skills;
}
