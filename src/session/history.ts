import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { Message } from '../api/types.js';

export interface HistoryEntry {
  type: 'message' | 'compaction';
  timestamp: string;
  data: Message | CompactionSnapshot;
}

export interface CompactionSnapshot {
  summary: string;
  preservedMessages: Message[];
  compactedCount: number;
}

function getSessionDir(basePath?: string): string {
  const base = basePath ?? path.join(os.homedir(), '.arqzero');
  return path.join(base, 'sessions');
}

function getSessionPath(sessionId: string, basePath?: string): string {
  return path.join(getSessionDir(basePath), `${sessionId}.jsonl`);
}

/**
 * Append a message to the session history file.
 */
export function appendMessage(
  sessionId: string,
  message: Message,
  basePath?: string,
): void {
  const entry: HistoryEntry = {
    type: 'message',
    timestamp: new Date().toISOString(),
    data: message,
  };
  const dir = getSessionDir(basePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(getSessionPath(sessionId, basePath), JSON.stringify(entry) + '\n', 'utf-8');
}

/**
 * Append a compaction snapshot to the session history file.
 */
export function appendCompaction(
  sessionId: string,
  snapshot: CompactionSnapshot,
  basePath?: string,
): void {
  const entry: HistoryEntry = {
    type: 'compaction',
    timestamp: new Date().toISOString(),
    data: snapshot,
  };
  const dir = getSessionDir(basePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(getSessionPath(sessionId, basePath), JSON.stringify(entry) + '\n', 'utf-8');
}

/**
 * Load session for resume. Returns messages starting from last compaction point.
 * 1. Find last compaction entry
 * 2. Return summary as system message + preserved messages + messages after compaction
 */
export function loadSession(sessionId: string, basePath?: string): Message[] | null {
  const filePath = getSessionPath(sessionId, basePath);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf-8').trim();
  if (!raw) return [];

  const lines = raw.split('\n').filter(l => l);
  const entries: HistoryEntry[] = lines.flatMap(line => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });

  // Find last compaction
  let lastCompactionIdx = -1;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].type === 'compaction') {
      lastCompactionIdx = i;
      break;
    }
  }

  if (lastCompactionIdx === -1) {
    // No compaction — return all messages
    return entries
      .filter(e => e.type === 'message')
      .map(e => e.data as Message);
  }

  // Resume from compaction point
  const snapshot = entries[lastCompactionIdx].data as CompactionSnapshot;
  const result: Message[] = [];

  // Add summary as system message
  if (snapshot.summary) {
    result.push({
      role: 'system',
      content: `[Previous conversation summary]\n${snapshot.summary}`,
    });
  }

  // Add preserved messages from snapshot
  result.push(...snapshot.preservedMessages);

  // Add any messages after the compaction
  for (let i = lastCompactionIdx + 1; i < entries.length; i++) {
    if (entries[i].type === 'message') {
      result.push(entries[i].data as Message);
    }
  }

  return result;
}

/**
 * Check if a session file exists.
 */
export function sessionExists(sessionId: string, basePath?: string): boolean {
  return fs.existsSync(getSessionPath(sessionId, basePath));
}

/**
 * List all session IDs.
 */
export function listSessions(basePath?: string): string[] {
  const dir = getSessionDir(basePath);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.jsonl'))
    .map(f => f.replace('.jsonl', ''));
}

/**
 * Delete a session file. Returns true if deleted, false if not found.
 */
export function deleteSession(sessionId: string, basePath?: string): boolean {
  const filePath = getSessionPath(sessionId, basePath);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

export interface SessionSummary {
  id: string;
  messageCount: number;
  lastModified: Date;
  sizeBytes: number;
  hasCompaction: boolean;
}

/**
 * Get detailed info about a single session.
 */
export function getSessionInfo(sessionId: string, basePath?: string): SessionSummary | null {
  const filePath = getSessionPath(sessionId, basePath);
  if (!fs.existsSync(filePath)) return null;

  const stat = fs.statSync(filePath);
  const raw = fs.readFileSync(filePath, 'utf-8').trim();
  const lines = raw.split('\n').filter(l => l);

  let messageCount = 0;
  let hasCompaction = false;
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.type === 'message') messageCount++;
      if (entry.type === 'compaction') hasCompaction = true;
    } catch {}
  }

  return {
    id: sessionId,
    messageCount,
    lastModified: stat.mtime,
    sizeBytes: stat.size,
    hasCompaction,
  };
}

/**
 * List all sessions with detailed info, sorted by last modified (newest first).
 */
export function listSessionsWithInfo(basePath?: string): SessionSummary[] {
  const ids = listSessions(basePath);
  const summaries: SessionSummary[] = [];
  for (const id of ids) {
    const info = getSessionInfo(id, basePath);
    if (info) summaries.push(info);
  }
  return summaries.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
}
