// src/api/fireworks/adapter.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { FireworksAdapter } from './adapter.js';
import type { Message, ToolDefinition, ChatRequest } from '../types.js';

function makeRequest(overrides: Partial<ChatRequest> = {}): ChatRequest {
  return {
    messages: [],
    model: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    intent: 'chat',
    ...overrides,
  };
}

describe('FireworksAdapter', () => {
  describe('constructor', () => {
    it('should set name to fireworks', () => {
      const adapter = new FireworksAdapter('test-key');
      assert.strictEqual(adapter.name, 'fireworks');
    });
  });

  describe('isAvailable', () => {
    it('should return true when API key is provided', async () => {
      const adapter = new FireworksAdapter('test-key');
      assert.strictEqual(await adapter.isAvailable(), true);
    });

    it('should return false when API key is empty', async () => {
      const adapter = new FireworksAdapter('');
      assert.strictEqual(await adapter.isAvailable(), false);
    });
  });

  describe('abort', () => {
    it('should not throw when called before chat', () => {
      const adapter = new FireworksAdapter('test-key');
      assert.doesNotThrow(() => adapter.abort());
    });
  });

  describe('convertMessages', () => {
    it('should prepend system prompt', () => {
      const adapter = new FireworksAdapter('test-key');
      const result = adapter.convertMessages(makeRequest({
        systemPrompt: 'You are helpful.',
        messages: [{ role: 'user', content: 'Hello' }],
      }));
      assert.strictEqual(result.length, 2);
      assert.deepStrictEqual(result[0], { role: 'system', content: 'You are helpful.' });
    });

    it('should convert user message with string content', () => {
      const adapter = new FireworksAdapter('test-key');
      const result = adapter.convertMessages(makeRequest({
        messages: [{ role: 'user', content: 'Hello' }],
      }));
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0], { role: 'user', content: 'Hello' });
    });

    it('should convert system message', () => {
      const adapter = new FireworksAdapter('test-key');
      const result = adapter.convertMessages(makeRequest({
        messages: [{ role: 'system', content: 'Be brief' }],
      }));
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0], { role: 'system', content: 'Be brief' });
    });

    it('should convert assistant message with string content', () => {
      const adapter = new FireworksAdapter('test-key');
      const result = adapter.convertMessages(makeRequest({
        messages: [{ role: 'assistant', content: 'Hi there' }],
      }));
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0], { role: 'assistant', content: 'Hi there' });
    });

    it('should convert assistant message with text blocks', () => {
      const adapter = new FireworksAdapter('test-key');
      const msg: Message = {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Hello ' },
          { type: 'text', text: 'world' },
        ],
      };
      const result = adapter.convertMessages(makeRequest({ messages: [msg] }));
      assert.strictEqual(result.length, 1);
      assert.strictEqual((result[0] as any).content, 'Hello world');
    });

    it('should convert assistant message with tool_use blocks', () => {
      const adapter = new FireworksAdapter('test-key');
      const msg: Message = {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Let me check.' },
          {
            type: 'tool_use',
            id: 'call_1',
            name: 'Read',
            input: { file_path: '/tmp/test.txt' },
          },
        ],
      };
      const result = adapter.convertMessages(makeRequest({ messages: [msg] }));
      assert.strictEqual(result.length, 1);
      const asst = result[0] as any;
      assert.strictEqual(asst.role, 'assistant');
      assert.strictEqual(asst.content, 'Let me check.');
      assert.strictEqual(asst.tool_calls.length, 1);
      assert.strictEqual(asst.tool_calls[0].id, 'call_1');
      assert.strictEqual(asst.tool_calls[0].function.name, 'Read');
      assert.deepStrictEqual(
        JSON.parse(asst.tool_calls[0].function.arguments),
        { file_path: '/tmp/test.txt' },
      );
    });

    it('should convert tool result message', () => {
      const adapter = new FireworksAdapter('test-key');
      const msg: Message = {
        role: 'tool',
        content: 'file contents here',
        toolCallId: 'call_1',
        toolName: 'Read',
      };
      const result = adapter.convertMessages(makeRequest({ messages: [msg] }));
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0], {
        role: 'tool',
        tool_call_id: 'call_1',
        content: 'file contents here',
      });
    });

    it('should convert user message with content blocks', () => {
      const adapter = new FireworksAdapter('test-key');
      const msg: Message = {
        role: 'user',
        content: [{ type: 'text', text: 'hello from blocks' }],
      };
      const result = adapter.convertMessages(makeRequest({ messages: [msg] }));
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0], { role: 'user', content: 'hello from blocks' });
    });
  });

  describe('convertTools', () => {
    it('should convert tool definitions to OpenAI format', () => {
      const adapter = new FireworksAdapter('test-key');
      const tools: ToolDefinition[] = [
        {
          name: 'Read',
          description: 'Read a file',
          input_schema: {
            type: 'object',
            properties: {
              file_path: { type: 'string' },
            },
            required: ['file_path'],
          },
        },
      ];
      const result = adapter.convertTools(tools);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].type, 'function');
      assert.strictEqual(result[0].function.name, 'Read');
      assert.strictEqual(result[0].function.description, 'Read a file');
      assert.deepStrictEqual(result[0].function.parameters, tools[0].input_schema);
    });

    it('should convert multiple tool definitions', () => {
      const adapter = new FireworksAdapter('test-key');
      const tools: ToolDefinition[] = [
        { name: 'Read', description: 'Read', input_schema: {} },
        { name: 'Write', description: 'Write', input_schema: {} },
      ];
      const result = adapter.convertTools(tools);
      assert.strictEqual(result.length, 2);
      assert.strictEqual((result[0] as any).function.name, 'Read');
      assert.strictEqual((result[1] as any).function.name, 'Write');
    });
  });

  describe('streaming', () => {
    it('should yield error event on network failure', async () => {
      // Use an adapter with an invalid key against real endpoint
      // This tests the error handling path
      const adapter = new FireworksAdapter('invalid-key');
      const events: any[] = [];

      for await (const event of adapter.chat(makeRequest({
        messages: [{ role: 'user', content: 'test' }],
      }))) {
        events.push(event);
      }

      // Should get an error event since the key is invalid
      assert.ok(events.length > 0);
      const lastEvent = events[events.length - 1];
      assert.strictEqual(lastEvent.type, 'error');
      assert.ok(lastEvent.error instanceof Error);
    });
  });
});
