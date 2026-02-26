// src/api/cursor/headers.ts
import { generateChecksum } from './checksum.js';

const CURSOR_CLIENT_VERSION = '2.3.41';

export function buildHeaders(
  accessToken: string,
  machineId: string
): Record<string, string> {
  const os = process.platform === 'win32'
    ? 'windows'
    : process.platform === 'darwin' ? 'macos' : 'linux';
  const arch = process.arch === 'x64' ? 'x86_64' : process.arch;

  return {
    ':method': 'POST',
    ':path': '/aiserver.v1.ChatService/StreamUnifiedChatWithTools',
    'authorization': `Bearer ${accessToken}`,
    'content-type': 'application/connect+proto',
    'connect-protocol-version': '1',
    'x-cursor-client-version': CURSOR_CLIENT_VERSION,
    'x-cursor-client-type': 'ide',
    'x-cursor-client-os': os,
    'x-cursor-client-arch': arch,
    'x-cursor-client-device-type': 'desktop',
    'x-cursor-checksum': generateChecksum(machineId),
    'x-ghost-mode': 'true',
  };
}
