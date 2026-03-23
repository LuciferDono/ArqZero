import path from 'node:path';
import os from 'node:os';

// Sensitive directories that should never be read/written by tools
const SENSITIVE_DIRS = ['.ssh', '.gnupg', '.aws', '.gpg-keys'];
const SENSITIVE_FILES = ['.env', '.env.local', '.env.production'];

function isSensitivePath(resolved: string): boolean {
  const norm = resolved.replace(/\\/g, '/');
  const segments = norm.split('/');
  for (const dir of SENSITIVE_DIRS) {
    if (segments.includes(dir)) return true;
  }
  const basename = segments[segments.length - 1];
  for (const file of SENSITIVE_FILES) {
    if (basename === file) return true;
  }
  return false;
}

/**
 * Guards against path traversal attacks.
 * - Relative paths are resolved against cwd.
 * - Absolute paths are allowed if within cwd, homedir, or /tmp.
 * - Paths containing '..' that escape above cwd are blocked.
 * - Sensitive directories (.ssh, .gnupg, .aws) are always blocked.
 */
export function guardPath(filePath: string, cwd: string): string {
  const resolved = path.resolve(cwd, filePath);
  const home = os.homedir();

  // Block sensitive paths regardless of directory allowance
  if (isSensitivePath(resolved)) {
    throw new Error(`Access denied: ${filePath} is in a sensitive location`);
  }

  // Normalise for comparison (handles trailing slashes, etc.)
  const normResolved = path.normalize(resolved);
  const normCwd = path.normalize(cwd);
  const normHome = path.normalize(home);

  // Allow paths within cwd
  if (normResolved.startsWith(normCwd + path.sep) || normResolved === normCwd) {
    return resolved;
  }

  // Allow paths within home directory
  if (normResolved.startsWith(normHome + path.sep) || normResolved === normHome) {
    return resolved;
  }

  // Allow /tmp (unix) or OS temp dir
  const tmpDir = path.normalize(os.tmpdir());
  if (normResolved.startsWith(tmpDir + path.sep) || normResolved === tmpDir) {
    return resolved;
  }

  throw new Error(`Path traversal blocked: ${filePath} resolves outside allowed directories`);
}
