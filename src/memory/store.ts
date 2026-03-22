import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { MemoryEntry, StoredMemory } from './types.js';

export class MemoryStore {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir ?? path.join(os.homedir(), '.arqzero', 'memory');
  }

  save(entry: MemoryEntry): string {
    this.ensureDir();
    const slug = this.slugify(entry.name);
    const filename = `${entry.type}_${slug}.md`;
    const filePath = path.join(this.baseDir, filename);

    const frontmatter = [
      '---',
      `name: ${entry.name}`,
      `description: ${entry.description}`,
      `type: ${entry.type}`,
      '---',
    ].join('\n');

    fs.writeFileSync(filePath, `${frontmatter}\n\n${entry.content}`, 'utf-8');
    this.updateIndex();
    return filePath;
  }

  load(name: string): StoredMemory | null {
    const all = this.loadAll();
    return all.find((m) => m.name === name) ?? null;
  }

  loadAll(): StoredMemory[] {
    if (!fs.existsSync(this.baseDir)) {
      return [];
    }

    const files = fs.readdirSync(this.baseDir).filter(
      (f) => f.endsWith('.md') && f !== 'MEMORY.md',
    );

    const memories: StoredMemory[] = [];
    for (const file of files) {
      const filePath = path.join(this.baseDir, file);
      const parsed = this.parseFile(filePath);
      if (parsed) {
        memories.push(parsed);
      }
    }
    return memories;
  }

  remove(name: string): boolean {
    const mem = this.load(name);
    if (!mem) {
      return false;
    }
    fs.unlinkSync(mem.filePath);
    this.updateIndex();
    return true;
  }

  search(query: string): StoredMemory[] {
    const lower = query.toLowerCase();
    return this.loadAll().filter(
      (m) =>
        m.name.toLowerCase().includes(lower) ||
        m.description.toLowerCase().includes(lower),
    );
  }

  getIndex(): string {
    const indexPath = path.join(this.baseDir, 'MEMORY.md');
    if (!fs.existsSync(indexPath)) {
      return '';
    }
    return fs.readFileSync(indexPath, 'utf-8');
  }

  private updateIndex(): void {
    this.ensureDir();
    const memories = this.loadAll();
    if (memories.length === 0) {
      const indexPath = path.join(this.baseDir, 'MEMORY.md');
      if (fs.existsSync(indexPath)) {
        fs.unlinkSync(indexPath);
      }
      return;
    }

    const lines = ['# ArqZero Memory Index', ''];
    for (const m of memories) {
      lines.push(`- **${m.name}** (${m.type}): ${m.description}`);
    }
    lines.push('');

    fs.writeFileSync(
      path.join(this.baseDir, 'MEMORY.md'),
      lines.join('\n'),
      'utf-8',
    );
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private parseFile(filePath: string): StoredMemory | null {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/);
      if (!fmMatch) {
        return null;
      }

      const frontmatter = fmMatch[1];
      const content = fmMatch[2].trimEnd();

      const name = this.extractField(frontmatter, 'name');
      const description = this.extractField(frontmatter, 'description');
      const type = this.extractField(frontmatter, 'type');

      if (!name || !description || !type) {
        return null;
      }

      return {
        name,
        description,
        type: type as StoredMemory['type'],
        content,
        filePath,
      };
    } catch {
      return null;
    }
  }

  private extractField(frontmatter: string, field: string): string | null {
    const match = frontmatter.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
    return match ? match[1].trim() : null;
  }
}
