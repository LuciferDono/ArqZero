import { describe, it } from 'node:test';
import assert from 'node:assert';
import { OpenAICompatAdapter } from './adapter.js';
import type { ChatRequest } from '../types.js';

function makeRequest(overrides: Partial<ChatRequest> = {}): ChatRequest {
  return {
    messages: [],
    model: 'test-model',
    intent: 'chat',
    ...overrides,
  };
}

function makeAdapter(overrides: Partial<ConstructorParameters<typeof OpenAICompatAdapter>[0]> = {}) {
  return new OpenAICompatAdapter({
    providerName: 'test',
    apiKey: 'test-key',
    baseURL: 'https://example.com/v1',
    defaultModel: 'test-model',
    ...overrides,
  });
}

describe('OpenAICompatAdapter', () => {
  describe('constructor', () => {
    it('uses providerName as adapter name', () => {
      const a = makeAdapter({ providerName: 'groq' });
      assert.strictEqual(a.name, 'groq');
    });
  });

  describe('isAvailable', () => {
    it('returns true when key is set', async () => {
      const a = makeAdapter({ apiKey: 'k' });
      assert.strictEqual(await a.isAvailable(), true);
    });

    it('returns true for keyless localhost ollama', async () => {
      const a = makeAdapter({ apiKey: '', baseURL: 'http://localhost:11434/v1' });
      assert.strictEqual(await a.isAvailable(), true);
    });

    it('returns false for keyless non-local', async () => {
      const a = makeAdapter({ apiKey: '', baseURL: 'https://example.com/v1' });
      assert.strictEqual(await a.isAvailable(), false);
    });
  });

  describe('convertMessages', () => {
    it('prepends system prompt', () => {
      const a = makeAdapter();
      const r = a.convertMessages(makeRequest({
        systemPrompt: 'be brief',
        messages: [{ role: 'user', content: 'hi' }],
      }));
      assert.strictEqual(r.length, 2);
      assert.deepStrictEqual(r[0], { role: 'system', content: 'be brief' });
    });

    it('converts assistant tool_use blocks', () => {
      const a = makeAdapter();
      const r = a.convertMessages(makeRequest({
        messages: [{
          role: 'assistant',
          content: [
            { type: 'text', text: 'thinking' },
            { type: 'tool_use', id: 'c1', name: 'Read', input: { p: 1 } },
          ],
        }],
      }));
      const asst = r[0] as { tool_calls?: Array<{ id: string }> };
      assert.strictEqual(asst.tool_calls?.length, 1);
      assert.strictEqual(asst.tool_calls?.[0].id, 'c1');
    });
  });

  describe('convertTools', () => {
    it('converts to OpenAI function format', () => {
      const a = makeAdapter();
      const r = a.convertTools([{
        name: 'X',
        description: 'd',
        input_schema: { type: 'object' },
      }]);
      assert.strictEqual(r[0].type, 'function');
      assert.strictEqual(r[0].function.name, 'X');
    });
  });

  describe('abort', () => {
    it('does not throw before chat', () => {
      const a = makeAdapter();
      assert.doesNotThrow(() => a.abort());
    });
  });
});
