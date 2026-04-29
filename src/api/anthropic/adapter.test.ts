import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AnthropicAdapter } from './adapter.js';

describe('AnthropicAdapter', () => {
  describe('basics', () => {
    it('has correct name', () => {
      const a = new AnthropicAdapter('test');
      assert.strictEqual(a.name, 'anthropic');
    });

    it('isAvailable reflects key presence', async () => {
      assert.strictEqual(await new AnthropicAdapter('k').isAvailable(), true);
      assert.strictEqual(await new AnthropicAdapter('').isAvailable(), false);
    });

    it('abort is safe before chat', () => {
      const a = new AnthropicAdapter('k');
      assert.doesNotThrow(() => a.abort());
    });
  });

  describe('convertMessages', () => {
    it('drops system messages (passed via top-level system field)', () => {
      const a = new AnthropicAdapter('k');
      const r = a.convertMessages([
        { role: 'system', content: 'system stuff' },
        { role: 'user', content: 'hi' },
      ]);
      assert.strictEqual(r.length, 1);
      assert.strictEqual(r[0].role, 'user');
    });

    it('converts assistant tool_use blocks', () => {
      const a = new AnthropicAdapter('k');
      const r = a.convertMessages([{
        role: 'assistant',
        content: [
          { type: 'text', text: 'will read' },
          { type: 'tool_use', id: 'b1', name: 'Read', input: { path: '/a' } },
        ],
      }]);
      assert.strictEqual(r.length, 1);
      const blocks = r[0].content as Array<{ type: string; id?: string }>;
      assert.strictEqual(blocks.length, 2);
      assert.strictEqual(blocks[0].type, 'text');
      assert.strictEqual(blocks[1].type, 'tool_use');
      assert.strictEqual(blocks[1].id, 'b1');
    });

    it('converts tool result message into user/tool_result block', () => {
      const a = new AnthropicAdapter('k');
      const r = a.convertMessages([{
        role: 'tool',
        content: 'result text',
        toolCallId: 'b1',
      }]);
      assert.strictEqual(r.length, 1);
      assert.strictEqual(r[0].role, 'user');
      const blocks = r[0].content as Array<{ type: string; tool_use_id?: string; content?: string }>;
      assert.strictEqual(blocks[0].type, 'tool_result');
      assert.strictEqual(blocks[0].tool_use_id, 'b1');
      assert.strictEqual(blocks[0].content, 'result text');
    });
  });

  describe('convertTools', () => {
    it('forwards name/description/schema verbatim', () => {
      const a = new AnthropicAdapter('k');
      const r = a.convertTools([{
        name: 'X',
        description: 'd',
        input_schema: { type: 'object', properties: { p: { type: 'string' } } },
      }]);
      assert.strictEqual(r.length, 1);
      assert.strictEqual(r[0].name, 'X');
      assert.deepStrictEqual(r[0].input_schema, { type: 'object', properties: { p: { type: 'string' } } });
    });
  });
});
