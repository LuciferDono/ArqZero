export type MemoryType = 'user' | 'feedback' | 'project' | 'reference';

export interface MemoryEntry {
  name: string;
  description: string;
  type: MemoryType;
  content: string;
}

export interface StoredMemory extends MemoryEntry {
  filePath: string;
}
