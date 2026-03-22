import path from 'node:path';
import os from 'node:os';

/**
 * Guards against path traversal attacks.
 * - Relative paths are resolved against cwd.
 * - Absolute paths are allowed if within cwd, homedir, or /tmp.
 * - Paths containing '..' that escape above cwd are blocked.
 */
export function guardPath(filePath: string, cwd: string): string {
  const resolved = path.resolve(cwd, filePath);
  const home = os.homedir();

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
