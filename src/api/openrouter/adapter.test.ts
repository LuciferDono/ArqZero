import { describe, it } from 'node:test';
import assert from 'node:assert';
import { OpenRouterAdapter, RETRIABLE_STATUSES, type RotationEvent } from './adapter.js';
import type { ChatRequest, StreamEvent } from '../types.js';

function req(): ChatRequest {
  return { messages: [{ role: 'user', content: 'hi' }], model: 'x', intent: 'chat' };
}

class StubError extends Error {
  status: number;
  constructor(msg: string, status: number) {
    super(msg);
    this.name = 'StubError';
    this.status = status;
  }
}

/**
 * Build an OpenRouter adapter whose internal delegate emits a programmable
 * sequence of events per attempt. Lets us exercise rotation deterministically
 * without touching the network.
 */
function buildAdapter(
  scripts: Array<() => AsyncIterable<StreamEvent>>,
  apiKeys: string[],
  onRotate?: (e: RotationEvent) => void,
): OpenRouterAdapter {
  const adapter = new OpenRouterAdapter({ apiKeys, onRotate });
  let attempt = 0;
  // Override buildDelegate via the prototype escape hatch.
  (adapter as unknown as { buildDelegate: (i: number) => unknown }).buildDelegate = () => {
    const script = scripts[attempt++];
    return {
      chat: () => script(),
      abort: () => {},
    };
  };
  return adapter;
}

async function collect(it: AsyncIterable<StreamEvent>): Promise<StreamEvent[]> {
  const out: StreamEvent[] = [];
  for await (const e of it) out.push(e);
  return out;
}

describe('OpenRouterAdapter', () => {
  describe('config', () => {
    it('rejects empty key list', () => {
      assert.throws(() => new OpenRouterAdapter({ apiKeys: [] }));
    });

    it('reports correct key count', () => {
      const a = new OpenRouterAdapter({ apiKeys: ['a', 'b', 'c'] });
      assert.strictEqual(a.getKeyCount(), 3);
      assert.strictEqual(a.getCurrentIndex(), 0);
    });

    it('isAvailable true if any key non-empty', async () => {
      const a = new OpenRouterAdapter({ apiKeys: ['', 'x'] });
      assert.strictEqual(await a.isAvailable(), true);
    });
  });

  describe('rotation', () => {
    it('rotates on 401 to second key, then succeeds', async () => {
      const rotations: RotationEvent[] = [];
      const adapter = buildAdapter(
        [
          async function* () { yield { type: 'error', error: new StubError('unauthorized', 401) }; },
          async function* () {
            yield { type: 'text_delta', text: 'ok' };
            yield { type: 'message_end', usage: { inputTokens: 1, outputTokens: 1 } };
          },
        ],
        ['bad', 'good'],
        (e) => rotations.push(e),
      );
      const events = await collect(adapter.chat(req()));
      assert.strictEqual(rotations.length, 1);
      assert.strictEqual(rotations[0].fromIndex, 0);
      assert.strictEqual(rotations[0].toIndex, 1);
      assert.strictEqual(rotations[0].status, 401);
      assert.strictEqual(events[0].type, 'text_delta');
      assert.strictEqual(events[1].type, 'message_end');
    });

    it('rotates through 429 and 500, succeeds on third key', async () => {
      const rotations: RotationEvent[] = [];
      const adapter = buildAdapter(
        [
          async function* () { yield { type: 'error', error: new StubError('rate', 429) }; },
          async function* () { yield { type: 'error', error: new StubError('boom', 500) }; },
          async function* () {
            yield { type: 'text_delta', text: 'done' };
          },
        ],
        ['k1', 'k2', 'k3'],
        (e) => rotations.push(e),
      );
      const events = await collect(adapter.chat(req()));
      assert.strictEqual(rotations.length, 2);
      assert.strictEqual(rotations[0].status, 429);
      assert.strictEqual(rotations[1].status, 500);
      assert.deepStrictEqual(events.map((e) => e.type), ['text_delta']);
    });

    it('does NOT rotate on 400 (bad request — config error)', async () => {
      const rotations: RotationEvent[] = [];
      const adapter = buildAdapter(
        [
          async function* () { yield { type: 'error', error: new StubError('bad model', 400) }; },
        ],
        ['k1', 'k2'],
        (e) => rotations.push(e),
      );
      const events = await collect(adapter.chat(req()));
      assert.strictEqual(rotations.length, 0);
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].type, 'error');
    });

    it('does NOT rotate on 404 (model not found)', async () => {
      const adapter = buildAdapter(
        [
          async function* () { yield { type: 'error', error: new StubError('no such model', 404) }; },
        ],
        ['k1', 'k2'],
      );
      const events = await collect(adapter.chat(req()));
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].type, 'error');
    });

    it('does NOT rotate after streaming has begun (mid-stream failure)', async () => {
      // Once tokens have been emitted, retrying would replay them.
      const rotations: RotationEvent[] = [];
      const adapter = buildAdapter(
        [
          async function* () {
            yield { type: 'text_delta', text: 'partial' };
            yield { type: 'error', error: new StubError('unauthorized', 401) };
          },
        ],
        ['k1', 'k2'],
        (e) => rotations.push(e),
      );
      const events = await collect(adapter.chat(req()));
      assert.strictEqual(rotations.length, 0);
      assert.strictEqual(events.length, 2);
      assert.strictEqual(events[0].type, 'text_delta');
      assert.strictEqual(events[1].type, 'error');
    });

    it('rotates on network error (no status)', async () => {
      const rotations: RotationEvent[] = [];
      const adapter = buildAdapter(
        [
          async function* () { yield { type: 'error', error: new Error('network failed') }; },
          async function* () { yield { type: 'text_delta', text: 'recovered' }; },
        ],
        ['k1', 'k2'],
        (e) => rotations.push(e),
      );
      const events = await collect(adapter.chat(req()));
      assert.strictEqual(rotations.length, 1);
      assert.strictEqual(events[0].type, 'text_delta');
    });

    it('stops with last error when all keys exhausted', async () => {
      const rotations: RotationEvent[] = [];
      const adapter = buildAdapter(
        [
          async function* () { yield { type: 'error', error: new StubError('a', 401) }; },
          async function* () { yield { type: 'error', error: new StubError('b', 429) }; },
        ],
        ['k1', 'k2'],
        (e) => rotations.push(e),
      );
      const events = await collect(adapter.chat(req()));
      assert.strictEqual(rotations.length, 1);
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].type, 'error');
    });

    it('extracts status from error message when no .status property', async () => {
      const rotations: RotationEvent[] = [];
      const adapter = buildAdapter(
        [
          async function* () { yield { type: 'error', error: new Error('Got 503 from upstream') }; },
          async function* () { yield { type: 'text_delta', text: 'ok' }; },
        ],
        ['k1', 'k2'],
        (e) => rotations.push(e),
      );
      const events = await collect(adapter.chat(req()));
      assert.strictEqual(rotations.length, 1);
      assert.strictEqual(rotations[0].status, 503);
      assert.strictEqual(events[0].type, 'text_delta');
    });
  });

  describe('RETRIABLE_STATUSES', () => {
    it('contains expected codes', () => {
      for (const s of [401, 402, 403, 429, 500, 502, 503, 504]) {
        assert.ok(RETRIABLE_STATUSES.has(s), `${s} should be retriable`);
      }
    });

    it('excludes 400 and 404', () => {
      assert.ok(!RETRIABLE_STATUSES.has(400));
      assert.ok(!RETRIABLE_STATUSES.has(404));
    });
  });
});
