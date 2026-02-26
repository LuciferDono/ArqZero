import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';

let cachedId: string | null = null;

export async function getMachineId(): Promise<string> {
  if (cachedId) return cachedId;

  try {
    const platform = process.platform;
    let raw: string;

    if (platform === 'win32') {
      raw = execFileSync('wmic', ['csproduct', 'get', 'UUID'], { encoding: 'utf-8' })
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && l !== 'UUID')[0] || '';
    } else if (platform === 'darwin') {
      const output = execFileSync('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'], { encoding: 'utf-8' });
      const match = output.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
      raw = match ? match[1] : '';
    } else {
      raw = execFileSync('cat', ['/etc/machine-id'], { encoding: 'utf-8' }).trim();
    }

    cachedId = raw || crypto.randomUUID();
  } catch {
    // Fallback: generate a stable ID from hostname + username
    const hostname = process.env.COMPUTERNAME || process.env.HOSTNAME || 'unknown';
    const user = process.env.USERNAME || process.env.USER || 'unknown';
    cachedId = crypto
      .createHash('sha256')
      .update(`${hostname}-${user}`)
      .digest('hex');
  }

  return cachedId;
}
