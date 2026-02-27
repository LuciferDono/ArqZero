import crypto from 'node:crypto';

export interface SessionInfo {
  id: string;
  startedAt: Date;
  lastActiveAt: Date;
  messageCount: number;
  compactionCount: number;
}

export class Session {
  readonly id: string;
  readonly startedAt: Date;
  private lastActiveAt: Date;
  private messageCount = 0;
  private compactionCount = 0;

  constructor(id?: string) {
    this.id = id ?? crypto.randomUUID();
    this.startedAt = new Date();
    this.lastActiveAt = new Date();
  }

  touch(): void {
    this.lastActiveAt = new Date();
    this.messageCount++;
  }

  recordCompaction(): void {
    this.compactionCount++;
  }

  getInfo(): SessionInfo {
    return {
      id: this.id,
      startedAt: this.startedAt,
      lastActiveAt: this.lastActiveAt,
      messageCount: this.messageCount,
      compactionCount: this.compactionCount,
    };
  }
}
