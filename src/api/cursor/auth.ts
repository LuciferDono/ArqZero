import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface CursorAuth {
  accessToken: string;
  machineId: string;
}

export function getCursorDbPath(): string {
  const platform = process.platform;
  if (platform === 'win32') {
    return path.join(process.env.APPDATA || '', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
  } else if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
  }
  return path.join(os.homedir(), '.config', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
}

function queryValue(db: Database.Database, key: string): string | null {
  try {
    const stmt = db.prepare('SELECT value FROM ItemTable WHERE key = ?');
    const row = stmt.get(key) as { value: Buffer } | undefined;
    if (row) return row.value.toString('utf-8');
  } catch { /* table may not exist */ }
  try {
    const stmt = db.prepare('SELECT value FROM cursorDiskKV WHERE key = ?');
    const row = stmt.get(key) as { value: Buffer } | undefined;
    if (row) return row.value.toString('utf-8');
  } catch { /* table may not exist */ }
  return null;
}

export function readCursorAuth(): CursorAuth {
  const dbPath = getCursorDbPath();
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Cursor database not found at ${dbPath}. Is Cursor installed?`);
  }
  const db = new Database(dbPath, { readonly: true });
  try {
    const accessToken = queryValue(db, 'cursorAuth/accessToken');
    const machineId = queryValue(db, 'storage.serviceMachineId');
    if (!accessToken) throw new Error('Could not read access token from Cursor database. Are you logged in?');
    if (!machineId) throw new Error('Could not read machine ID from Cursor database.');
    return { accessToken, machineId };
  } finally {
    db.close();
  }
}

let cachedAuth: CursorAuth | null = null;

export function getCursorAuth(forceRefresh = false): CursorAuth {
  if (!cachedAuth || forceRefresh) {
    cachedAuth = readCursorAuth();
  }
  return cachedAuth;
}
