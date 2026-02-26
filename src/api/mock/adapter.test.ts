// src/api/mock/adapter.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MockAdapter } from './adapter.js';

describe('MockAdapter', () => {
  it('should be available', async () => {
    const adapter = new MockAdapter();
    assert.strictEqual(await adapter.isAvailable(), true);
  });

  it('should stream a text response', async () => {
    const adapter = new MockAdapter('Hello from mock!');
    const events: string[] = [];
    for await (const event of adapter.chat({
      messages: [{ role: 'user', content: 'hi' }],
      model: 'mock',
      intent: 'chat',
    })) {
      if (event.type === 'text_delta') events.push(event.text);
    }
    assert.strictEqual(events.join(''), 'Hello from mock!');
  });

  it('should emit message_end with usage', async () => {
    const adapter = new MockAdapter('test');
    let gotEnd = false;
    for await (const event of adapter.chat({
      messages: [{ role: 'user', content: 'hi' }],
      model: 'mock',
      intent: 'chat',
    })) {
      if (event.type === 'message_end') {
        gotEnd = true;
        assert.ok(event.usage.inputTokens >= 0);
        assert.ok(event.usage.outputTokens >= 0);
      }
    }
    assert.strictEqual(gotEnd, true);
  });
});
