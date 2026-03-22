import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { AgentDefinition } from './types.js';

export function getDefaultAgentsDir(): string {
  return path.join(os.homedir(), '.arqzero', 'agents');
}

/**
 * Parse YAML-like frontmatter from a markdown string.
 * Returns { frontmatter, body } or null if no valid frontmatter found.
 */
function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;

  const yamlBlock = match[1];
  const body = match[2].trim();

  const frontmatter: Record<string, string> = {};
  for (const line of yamlBlock.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    if (key) {
      frontmatter[key] = value;
    }
  }

  return { frontmatter, body };
}

export async function loadAgents(baseDir: string = getDefaultAgentsDir()): Promise<AgentDefinition[]> {
  if (!fs.existsSync(baseDir)) {
    return [];
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(baseDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const agents: AgentDefinition[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      continue;
    }

    const filePath = path.join(baseDir, entry.name);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = parseFrontmatter(content);
      if (!parsed) continue;

      const { frontmatter, body } = parsed;
      if (!frontmatter.name || !frontmatter.description) continue;

      const definition: AgentDefinition = {
        name: frontmatter.name,
        description: frontmatter.description,
      };

      if (frontmatter.model) {
        definition.model = frontmatter.model;
      }

      if (frontmatter.allowedTools) {
        definition.allowedTools = frontmatter.allowedTools
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
      }

      if (body) {
        definition.systemPrompt = body;
      }

      agents.push(definition);
    } catch {
      // Skip files that can't be read or parsed
    }
  }

  return agents;
}
