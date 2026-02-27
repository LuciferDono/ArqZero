import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { LLMProvider } from '../api/provider.js';
import type { ChatRequest, StreamEvent, ContentBlock, TokenUsage } from '../api/types.js';
import type { Tool, ToolResult, ToolContext } from '../tools/types.js';
import { ToolRegistry } from '../tools/registry.js';
import { ConversationEngine } from './engine.js';
import type { EngineCallbacks, EngineOptions } from './engine.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class TestProvider implements LLMProvider {
  readonly name = 'test';
  private responses: Array<() => AsyncIterable<StreamEvent>>;
  private callIndex = 0;

  constructor(responses: Array<() => AsyncIterable<StreamEvent>>) {
    this.responses = responses;
  }

  chat(_params: ChatRequest): AsyncIterable<StreamEvent> {
    const fn = this.responses[this.callIndex++];
    if (!fn) throw new Error('No more mock responses');
    return fn();
  }

  abort(): void {}
  async isAvailable(): Promise<boolean> { return true; }
}

async function* textResponse(text: string): AsyncIterable<StreamEvent> {
  yield { type: 'text_delta', text };
  yield { type: 'message_end', usage: { inputTokens: 10, outputTokens: 5 } };
}

async function* toolUseResponse(
  id: string,
  name: string,
  input: Record<string, unknown>,
): AsyncIterable<StreamEvent> {
  yield { type: 'tool_use_start', id, name };
  yield { type: 'tool_use_delta', id, input: JSON.stringify(input) };
  yield { type: 'tool_use_end', id };
  yield { type: 'message_end', usage: { inputTokens: 10, outputTokens: 5 } };
}

function createMockTool(
  name: string,
  executeFn?: (input: unknown, ctx: ToolContext) => Promise<ToolResult>,
): Tool {
  return {
    name,
    description: `Mock ${name} tool`,
    inputSchema: { type: 'object', properties: {} },
    permissionLevel: 'safe',
    execute: executeFn || (async () => ({ content: 'mock result' })),
  };
}

const testToolContext: ToolContext = {
  cwd: process.cwd(),
  config: { provider: 'cursor' } as any,
  promptUser: async () => ({ allowed: true }),
};

function makeEngine(
  provider: LLMProvider,
  registry?: ToolRegistry,
  overrides?: Partial<EngineOptions>,
): ConversationEngine {
  const reg = registry ?? new ToolRegistry();
  return new ConversationEngine({
    provider,
    registry: reg,
    model: 'test-model',
    toolContext: testToolContext,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ConversationEngine', () => {
  it('should handle a simple text response', async () => {
    const provider = new TestProvider([() => textResponse('Hello!')]);
    const engine = makeEngine(provider);

    const textDeltas: string[] = [];
    const usages: TokenUsage[] = [];

    await engine.handleUserMessage('Hi', {
      onTextDelta: (text) => textDeltas.push(text),
      onMessageEnd: (usage) => usages.push(usage),
    });

    // onTextDelta was called
    assert.deepEqual(textDeltas, ['Hello!']);

    // Messages: user + assistant
    const msgs = engine.getMessages();
    assert.equal(msgs.length, 2);
    assert.equal(msgs[0].role, 'user');
    assert.equal(msgs[0].content, 'Hi');
    assert.equal(msgs[1].role, 'assistant');

    // Assistant content has text block
    const blocks = msgs[1].content as ContentBlock[];
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].type, 'text');
    assert.equal(blocks[0].text, 'Hello!');

    // Usage callback fired
    assert.equal(usages.length, 1);
    assert.equal(usages[0].inputTokens, 10);
    assert.equal(usages[0].outputTokens, 5);
  });

  it('should handle thinking deltas', async () => {
    async function* thinkingAndText(): AsyncIterable<StreamEvent> {
      yield { type: 'thinking_delta', text: 'Let me think...' };
      yield { type: 'text_delta', text: 'Here is my answer.' };
      yield { type: 'message_end', usage: { inputTokens: 20, outputTokens: 10 } };
    }

    const provider = new TestProvider([() => thinkingAndText()]);
    const engine = makeEngine(provider);

    const thinkingDeltas: string[] = [];
    const textDeltas: string[] = [];

    await engine.handleUserMessage('Think about this', {
      onThinkingDelta: (text) => thinkingDeltas.push(text),
      onTextDelta: (text) => textDeltas.push(text),
    });

    assert.deepEqual(thinkingDeltas, ['Let me think...']);
    assert.deepEqual(textDeltas, ['Here is my answer.']);

    const msgs = engine.getMessages();
    const blocks = msgs[1].content as ContentBlock[];

    // Should have thinking block + text block
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0].type, 'thinking');
    assert.equal(blocks[0].text, 'Let me think...');
    assert.equal(blocks[1].type, 'text');
    assert.equal(blocks[1].text, 'Here is my answer.');
  });

  it('should execute tools and recurse', async () => {
    const provider = new TestProvider([
      () => toolUseResponse('call-1', 'Read', { file_path: '/test' }),
      () => textResponse('Done'),
    ]);

    const registry = new ToolRegistry();
    registry.register(
      createMockTool('Read', async () => ({ content: 'file content' })),
    );

    const engine = makeEngine(provider, registry);

    const toolStarts: Array<{ id: string; name: string }> = [];
    const toolEnds: Array<{ id: string; name: string; result: ToolResult }> = [];

    await engine.handleUserMessage('Read the file', {
      onToolStart: (id, name) => toolStarts.push({ id, name }),
      onToolEnd: (id, name, result) => toolEnds.push({ id, name, result }),
    });

    // Verify callbacks
    assert.equal(toolStarts.length, 1);
    assert.equal(toolStarts[0].id, 'call-1');
    assert.equal(toolStarts[0].name, 'Read');

    assert.equal(toolEnds.length, 1);
    assert.equal(toolEnds[0].result.content, 'file content');

    // Verify message history: user, assistant(tool_use), tool_result, assistant(text)
    const msgs = engine.getMessages();
    assert.equal(msgs.length, 4);
    assert.equal(msgs[0].role, 'user');
    assert.equal(msgs[1].role, 'assistant');
    assert.equal(msgs[2].role, 'tool');
    assert.equal(msgs[2].toolCallId, 'call-1');
    assert.equal(msgs[2].toolName, 'Read');
    assert.equal(msgs[2].content, 'file content');
    assert.equal(msgs[3].role, 'assistant');

    // Second assistant message has text block
    const lastBlocks = msgs[3].content as ContentBlock[];
    assert.equal(lastBlocks[0].type, 'text');
    assert.equal(lastBlocks[0].text, 'Done');
  });

  it('should handle tool execution errors gracefully', async () => {
    const provider = new TestProvider([
      () => toolUseResponse('call-err', 'Nonexistent', { foo: 'bar' }),
      () => textResponse('Sorry'),
    ]);

    // Empty registry -- no tools registered, so 'Nonexistent' will fail
    const registry = new ToolRegistry();
    const engine = makeEngine(provider, registry);

    await engine.handleUserMessage('Do something', {});

    const msgs = engine.getMessages();
    // user, assistant(tool_use), tool_result(error), assistant(text "Sorry")
    assert.equal(msgs.length, 4);

    // Tool result should have error indicator
    const toolResultMsg = msgs[2];
    assert.equal(toolResultMsg.role, 'tool');
    assert.equal(toolResultMsg.toolCallId, 'call-err');
    assert.ok(
      (toolResultMsg.content as string).includes('Unknown tool'),
      'Tool result should indicate unknown tool error',
    );

    // Conversation continued after error
    assert.equal(msgs[3].role, 'assistant');
    const lastBlocks = msgs[3].content as ContentBlock[];
    assert.equal(lastBlocks[0].text, 'Sorry');
  });

  it('should respect maxToolRounds', async () => {
    // Provider always returns tool_use (infinite loop scenario)
    let callCount = 0;
    const infiniteToolProvider = new TestProvider(
      Array.from({ length: 10 }, () => () => {
        callCount++;
        return toolUseResponse(`call-${callCount}`, 'Echo', {});
      }),
    );

    const registry = new ToolRegistry();
    registry.register(
      createMockTool('Echo', async () => ({ content: 'echoed' })),
    );

    const engine = makeEngine(infiniteToolProvider, registry, {
      maxToolRounds: 2,
    });

    const errors: Error[] = [];
    await engine.handleUserMessage('Loop forever', {
      onError: (err) => errors.push(err),
    });

    // Should have hit the max rounds error
    assert.equal(errors.length, 1);
    assert.ok(errors[0].message.includes('Max tool execution rounds'));

    // Should have done exactly 2 rounds of tool execution
    // Round 0: tool call + tool result, Round 1: tool call + tool result, Round 2: error
    // So callCount should be 2 (two LLM calls that returned tools)
    assert.equal(callCount, 2);
  });

  it('should accumulate tool input from deltas', async () => {
    async function* multiDeltaToolUse(): AsyncIterable<StreamEvent> {
      yield { type: 'tool_use_start', id: 'td-1', name: 'Read' };
      yield { type: 'tool_use_delta', id: 'td-1', input: '{"file' };
      yield { type: 'tool_use_delta', id: 'td-1', input: '_path":' };
      yield { type: 'tool_use_delta', id: 'td-1', input: '"/src/index.ts"}' };
      yield { type: 'tool_use_end', id: 'td-1' };
      yield { type: 'message_end', usage: { inputTokens: 15, outputTokens: 8 } };
    }

    const provider = new TestProvider([
      () => multiDeltaToolUse(),
      () => textResponse('Got it'),
    ]);

    const registry = new ToolRegistry();
    let capturedInput: unknown;
    registry.register(
      createMockTool('Read', async (input) => {
        capturedInput = input;
        return { content: 'file content' };
      }),
    );

    const engine = makeEngine(provider, registry);

    await engine.handleUserMessage('Read a file', {});

    // Verify the accumulated input was correctly parsed from multiple deltas
    assert.deepEqual(capturedInput, { file_path: '/src/index.ts' });

    // Also verify the content block stored in the assistant message
    const msgs = engine.getMessages();
    const assistantBlocks = msgs[1].content as ContentBlock[];
    const toolBlock = assistantBlocks.find((b) => b.type === 'tool_use');
    assert.ok(toolBlock, 'Should have a tool_use content block');
    assert.deepEqual(toolBlock!.input, { file_path: '/src/index.ts' });
  });

  it('should provide messages via getMessages', async () => {
    const provider = new TestProvider([() => textResponse('Hi there')]);
    const engine = makeEngine(provider);

    await engine.handleUserMessage('Hello', {});

    const msgs1 = engine.getMessages();
    const msgs2 = engine.getMessages();

    // Should return copies (different arrays)
    assert.notEqual(msgs1, msgs2);
    assert.deepEqual(msgs1, msgs2);
    assert.equal(msgs1.length, 2);
  });

  it('should allow replacing messages with setMessages', async () => {
    const provider = new TestProvider([
      () => textResponse('First'),
      () => textResponse('Second'),
    ]);
    const engine = makeEngine(provider);

    await engine.handleUserMessage('Hello', {});
    assert.equal(engine.getMessages().length, 2);

    // Replace with a single message
    engine.setMessages([{ role: 'user', content: 'Fresh start' }]);
    assert.equal(engine.getMessages().length, 1);
    assert.equal(engine.getMessages()[0].content, 'Fresh start');

    // Continue conversation from the replaced state
    await engine.handleUserMessage('Continue', {});
    assert.equal(engine.getMessages().length, 3); // 1 old + 1 new user + 1 new assistant
  });

  it('should handle provider errors gracefully', async () => {
    const provider = new TestProvider([
      () => {
        async function* errorStream(): AsyncIterable<StreamEvent> {
          yield { type: 'text_delta', text: 'Start...' };
          throw new Error('Connection lost');
        }
        return errorStream();
      },
    ]);

    const engine = makeEngine(provider);
    const errors: Error[] = [];

    await engine.handleUserMessage('Hello', {
      onError: (err) => errors.push(err),
    });

    assert.equal(errors.length, 1);
    assert.ok(errors[0].message.includes('Connection lost'));
  });

  it('should call abort on the provider', () => {
    let abortCalled = false;
    const provider: LLMProvider = {
      name: 'test',
      chat: () => textResponse('test'),
      abort: () => { abortCalled = true; },
      isAvailable: async () => true,
    };

    const engine = makeEngine(provider);
    engine.abort();
    assert.equal(abortCalled, true);
  });
});
