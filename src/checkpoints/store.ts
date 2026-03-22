export interface Checkpoint {
  id: number;
  timestamp: number;
  toolName: string;
  filePath: string;
  beforeContent: string | null;
  afterContent: string;
  promptText?: string;
}

export class CheckpointStore {
  private checkpoints: Checkpoint[] = [];
  private nextId = 1;

  capture(
    toolName: string,
    filePath: string,
    beforeContent: string | null,
    afterContent: string,
    promptText?: string,
  ): Checkpoint {
    const cp: Checkpoint = {
      id: this.nextId++,
      timestamp: Date.now(),
      toolName,
      filePath,
      beforeContent,
      afterContent,
      promptText,
    };
    this.checkpoints.push(cp);
    return cp;
  }

  getAll(): Checkpoint[] {
    return [...this.checkpoints];
  }

  getById(id: number): Checkpoint | undefined {
    return this.checkpoints.find((c) => c.id === id);
  }

  getAfter(id: number): Checkpoint[] {
    const idx = this.checkpoints.findIndex((c) => c.id === id);
    return idx >= 0 ? this.checkpoints.slice(idx) : [];
  }

  clear(): void {
    this.checkpoints = [];
    this.nextId = 1;
  }
}
