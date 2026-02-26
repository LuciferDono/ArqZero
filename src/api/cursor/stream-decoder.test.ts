// src/api/cursor/stream-decoder.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ConnectRpcDecoder, type DecodedFrame } from './stream-decoder.js';

describe('ConnectRpcDecoder', () => {
  it('should decode a single complete frame', () => {
    const decoder = new ConnectRpcDecoder();
    const payload = Buffer.from('hello');
    const envelope = Buffer.alloc(5 + payload.length);
    envelope[0] = 0x00;
    envelope.writeUInt32BE(payload.length, 1);
    payload.copy(envelope, 5);
    const frames: DecodedFrame[] = [];
    for (const frame of decoder.decode(envelope)) { frames.push(frame); }
    assert.strictEqual(frames.length, 1);
    assert.strictEqual(frames[0].isCompressed, false);
    assert.strictEqual(frames[0].isTrailer, false);
    assert.deepStrictEqual(frames[0].payload, payload);
  });

  it('should handle partial frames across chunks', () => {
    const decoder = new ConnectRpcDecoder();
    const payload = Buffer.from('hello world');
    const envelope = Buffer.alloc(5 + payload.length);
    envelope[0] = 0x00;
    envelope.writeUInt32BE(payload.length, 1);
    payload.copy(envelope, 5);
    const chunk1 = envelope.subarray(0, 7);
    const chunk2 = envelope.subarray(7);
    const frames1 = [...decoder.decode(chunk1)];
    assert.strictEqual(frames1.length, 0);
    const frames2 = [...decoder.decode(chunk2)];
    assert.strictEqual(frames2.length, 1);
    assert.deepStrictEqual(frames2[0].payload, payload);
  });

  it('should handle multiple frames in one chunk', () => {
    const decoder = new ConnectRpcDecoder();
    const p1 = Buffer.from('aaa');
    const p2 = Buffer.from('bbb');
    const e1 = Buffer.alloc(5 + p1.length);
    e1[0] = 0x00; e1.writeUInt32BE(p1.length, 1); p1.copy(e1, 5);
    const e2 = Buffer.alloc(5 + p2.length);
    e2[0] = 0x00; e2.writeUInt32BE(p2.length, 1); p2.copy(e2, 5);
    const combined = Buffer.concat([e1, e2]);
    const frames = [...decoder.decode(combined)];
    assert.strictEqual(frames.length, 2);
    assert.deepStrictEqual(frames[0].payload, p1);
    assert.deepStrictEqual(frames[1].payload, p2);
  });

  it('should detect compressed frames', () => {
    const decoder = new ConnectRpcDecoder();
    const payload = Buffer.from('compressed');
    const envelope = Buffer.alloc(5 + payload.length);
    envelope[0] = 0x01;
    envelope.writeUInt32BE(payload.length, 1);
    payload.copy(envelope, 5);
    const frames = [...decoder.decode(envelope)];
    assert.strictEqual(frames[0].isCompressed, true);
  });

  it('should detect trailer frames', () => {
    const decoder = new ConnectRpcDecoder();
    const payload = Buffer.from('trailer-data');
    const envelope = Buffer.alloc(5 + payload.length);
    envelope[0] = 0x02;
    envelope.writeUInt32BE(payload.length, 1);
    payload.copy(envelope, 5);
    const frames = [...decoder.decode(envelope)];
    assert.strictEqual(frames[0].isTrailer, true);
  });
});
