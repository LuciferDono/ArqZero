/**
 * Generates the x-cursor-checksum header using the jyh cipher.
 * Timestamp-based XOR cipher combined with the machine ID.
 */
export function generateChecksum(machineId: string, timestampMs?: number): string {
  const ts = timestampMs ?? Date.now();
  const timestamp = Math.floor(ts / 1000000);

  const bytes = new Uint8Array(6);
  bytes[0] = (timestamp >> 40) & 0xff;
  bytes[1] = (timestamp >> 32) & 0xff;
  bytes[2] = (timestamp >> 24) & 0xff;
  bytes[3] = (timestamp >> 16) & 0xff;
  bytes[4] = (timestamp >> 8) & 0xff;
  bytes[5] = timestamp & 0xff;

  let key = 165;
  for (let i = 0; i < 6; i++) {
    bytes[i] = ((bytes[i] ^ key) + i) % 256;
    key = bytes[i];
  }

  const encoded = Buffer.from(bytes)
    .toString('base64url')
    .replace(/=+$/, '');

  return encoded + machineId;
}
