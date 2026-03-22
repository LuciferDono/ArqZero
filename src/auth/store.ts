import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface AuthData {
  accessToken: string;
  refreshToken: string;
  tier: 'free' | 'pro' | 'team';
  email: string;
  expiresAt: number;       // ms timestamp when access token expires
  lastValidated: number;   // ms timestamp of last server validation
}

const AUTH_PATH = path.join(os.homedir(), '.arqzero', 'auth.json');
const GRACE_DAYS = 7;

export function loadAuth(): AuthData | null {
  try {
    if (!fs.existsSync(AUTH_PATH)) return null;
    return JSON.parse(fs.readFileSync(AUTH_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

export function saveAuth(data: AuthData): void {
  const dir = path.dirname(AUTH_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(AUTH_PATH, JSON.stringify(data, null, 2), { mode: 0o600 });
}

export function clearAuth(): void {
  try { fs.unlinkSync(AUTH_PATH); } catch {}
}

export function isAccessTokenExpired(auth: AuthData): boolean {
  return Date.now() >= auth.expiresAt;
}

export function isOfflineGraceExpired(auth: AuthData): boolean {
  const gracePeriod = GRACE_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - auth.lastValidated > gracePeriod;
}
