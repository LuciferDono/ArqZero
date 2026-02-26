// src/api/cursor/stream-decoder.ts
import { gunzipSync } from 'node:zlib';

export interface DecodedFrame {
  flags: number;
  isCompressed: boolean;
  isTrailer: boolean;
  payload: Buffer;
}

export class ConnectRpcDecoder {
  private buffer = Buffer.alloc(0);

  *decode(chunk: Buffer): Generator<DecodedFrame> {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 5) {
      const flags = this.buffer[0];
      const length = this.buffer.readUInt32BE(1);
      const frameSize = 5 + length;
      if (this.buffer.length < frameSize) break;
      let payload = this.buffer.subarray(5, frameSize);
      const isCompressed = (flags & 0x01) !== 0;
      const isTrailer = (flags & 0x02) !== 0;
      if (isCompressed && !isTrailer) {
        try { payload = gunzipSync(payload); } catch { /* yield raw */ }
      }
      yield { flags, isCompressed, isTrailer, payload: Buffer.from(payload) };
      this.buffer = this.buffer.subarray(frameSize);
    }
  }

  reset(): void { this.buffer = Buffer.alloc(0); }
}
