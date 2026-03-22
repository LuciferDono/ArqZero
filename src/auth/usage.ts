import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadAuth } from './store.js';
import { syncUsage } from './client.js';

interface UsageData {
  date: string;
  count: number;
  lastSyncedCount: number;
}

const USAGE_PATH = path.join(os.homedir(), '.arqzero', 'usage.json');
const SYNC_INTERVAL = 10; // sync every 10 messages

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadUsage(): UsageData {
  try {
    if (!fs.existsSync(USAGE_PATH)) return { date: today(), count: 0, lastSyncedCount: 0 };
    const data = JSON.parse(fs.readFileSync(USAGE_PATH, 'utf-8'));
    if (data.date !== today()) return { date: today(), count: 0, lastSyncedCount: 0 };
    return data;
  } catch {
    return { date: today(), count: 0, lastSyncedCount: 0 };
  }
}

function saveUsage(data: UsageData): void {
  fs.mkdirSync(path.dirname(USAGE_PATH), { recursive: true });
  fs.writeFileSync(USAGE_PATH, JSON.stringify(data), 'utf-8');
}

export function isUsageCapped(dailyCap: number): boolean {
  if (dailyCap === 0) return false; // unlimited
  const usage = loadUsage();
  return usage.count >= dailyCap;
}

export function incrementUsage(): void {
  const usage = loadUsage();
  usage.count++;
  saveUsage(usage);

  // Fire-and-forget sync every SYNC_INTERVAL messages
  if (usage.count - usage.lastSyncedCount >= SYNC_INTERVAL) {
    const countToSync = usage.count;
    usage.lastSyncedCount = countToSync;
    saveUsage(usage);
    const auth = loadAuth();
    if (auth) {
      (async () => {
        try {
          await syncUsage(auth.accessToken, usage.date, countToSync);
        } catch {}
      })();
    }
  }
}

export function getUsageCount(): number {
  return loadUsage().count;
}
