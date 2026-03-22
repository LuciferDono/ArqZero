import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { LLMProvider } from '../api/provider.js';
import type { ChatRequest, StreamEvent } from '../api/types.js';
import type { Tool, ToolContext } from '../tools/types.js';
import { ToolRegistry } from '../tools/registry.js';
import { AgentRunner } from './runner.js';
import type { AgentDefinition } from './types.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class TestProvider implements LLMProvider {
  readonly name = 'test';
  private response: string;

  constructor(response = 'Agent response text') {
    this.response = response;
  }

  async *chat(_params: ChatRequest): AsyncIterable<StreamEvent> {
    yield { type: 'text_delta', text: this.response };
    yield {
      type: 'message_end',
      usage: { inputTokens: 10, outputTokens: 5 },
    };
  }

  abort(): void {}
  async isAvailable(): Promise<boolean> { return true; }
}

function createMockTool(name: string): Tool {
  return {
    name,
    description: `Mock ${name}`,
    inputSchema: { type: 'object', properties: {} },
    permissionLevel: 'safe',
    execute: async () => ({ content: `${name} result` }),
  };
}

const testToolContext: ToolContext = {
  cwd: process.cwd(),
  config: { provider: 'fireworks' } as any,
  promptUser: async () => ({ allowed: true }),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AgentRunner', () => {
  it('should run a sub-agent and return text response', async () => {
    const provider = new TestProvider('Hello from sub-agent');
    const registry = new ToolRegistry();
    const runner = new AgentRunner(provider, registry, testToolContext, 'test-model');

    const result = await runner.run({ prompt: 'Do something' });
    assert.equal(result, 'Hello from sub-agent');
  });

  it('should track active agent count', async () => {
    const provider = new TestProvider('Done');
    const registry = new ToolRegistry();
    const runner = new AgentRunner(provider, registry, testToolContext, 'test-model');

    assert.equal(runner.getActiveCount(), 0);
    const result = await runner.run({ prompt: 'Work' });
    assert.equal(result, 'Done');
    // After completion, active count should be back to 0
    assert.equal(runner.getActiveCount(), 0);
  });

  it('should enforce maximum concurrent agents', async () => {
    // Create a slow provider to keep agents active
    class SlowProvider implements LLMProvider {
      readonly name = 'slow';
      async *chat(_params: ChatRequest): AsyncIterable<StreamEvent> {
        await new Promise((r) => setTimeout(r, 500));
        yield { type: 'text_delta', text: 'slow response' };
        yield { type: 'message_end', usage: { inputTokens: 1, outputTokens: 1 } };
      }
      abort(): void {}
      async isAvailable(): Promise<boolean> { return true; }
    }

    const provider = new SlowProvider();
    const registry = new ToolRegistry();
    const runner = new AgentRunner(provider, registry, testToolContext, 'test-model');

    // Launch 7 agents concurrently (don't await them)
    const promises: Promise<string>[] = [];
    for (let i = 0; i < 7; i++) {
      promises.push(runner.run({ prompt: `Task ${i}` }));
    }

    // 8th should throw
    await assert.rejects(
      () => runner.run({ prompt: 'Task 8' }),
      { message: 'Maximum concurrent agents reached (7)' },
    );

    // Wait for all to complete
    await Promise.all(promises);
  });

  it('should use agent definition model override', async () => {
    let capturedModel = '';
    const provider: LLMProvider = {
      name: 'test',
      async *chat(params: ChatRequest): AsyncIterable<StreamEvent> {
        capturedModel = params.model;
        yield { type: 'text_delta', text: 'ok' };
        yield { type: 'message_end', usage: { inputTokens: 1, outputTokens: 1 } };
      },
      abort() {},
      async isAvailable() { return true; },
    };

    const registry = new ToolRegistry();
    const runner = new AgentRunner(provider, registry, testToolContext, 'default-model');

    const definition: AgentDefinition = {
      name: 'custom',
      description: 'Custom agent',
      model: 'custom-model',
    };

    await runner.run({ prompt: 'Test', definition });
    assert.equal(capturedModel, 'custom-model');
  });

  it('should use prompt-level model override over definition', async () => {
    let capturedModel = '';
    const provider: LLMProvider = {
      name: 'test',
      async *chat(params: ChatRequest): AsyncIterable<StreamEvent> {
        capturedModel = params.model;
        yield { type: 'text_delta', text: 'ok' };
        yield { type: 'message_end', usage: { inputTokens: 1, outputTokens: 1 } };
      },
      abort() {},
      async isAvailable() { return true; },
    };

    const registry = new ToolRegistry();
    const runner = new AgentRunner(provider, registry, testToolContext, 'default-model');

    const definition: AgentDefinition = {
      name: 'custom',
      description: 'Custom agent',
      model: 'def-model',
    };

    await runner.run({ prompt: 'Test', definition, model: 'prompt-model' });
    assert.equal(capturedModel, 'prompt-model');
  });

  it('should filter tools when allowedTools is specified', async () => {
    let capturedToolNames: string[] = [];
    const provider: LLMProvider = {
      name: 'test',
      async *chat(params: ChatRequest): AsyncIterable<StreamEvent> {
        capturedToolNames = (params.tools ?? []).map((t) => t.name);
        yield { type: 'text_delta', text: 'ok' };
        yield { type: 'message_end', usage: { inputTokens: 1, outputTokens: 1 } };
      },
      abort() {},
      async isAvailable() { return true; },
    };

    const registry = new ToolRegistry();
    registry.register(createMockTool('Read'));
    registry.register(createMockTool('Write'));
    registry.register(createMockTool('Bash'));

    const runner = new AgentRunner(provider, registry, testToolContext, 'test-model');

    const definition: AgentDefinition = {
      name: 'limited',
      description: 'Limited tools',
      allowedTools: ['Read', 'Write'],
    };

    await runner.run({ prompt: 'Test', definition });
    assert.deepEqual(capturedToolNames.sort(), ['Read', 'Write']);
  });

  it('should use system prompt from agent definition', async () => {
    let capturedSystemPrompt = '';
    const provider: LLMProvider = {
      name: 'test',
      async *chat(params: ChatRequest): AsyncIterable<StreamEvent> {
        capturedSystemPrompt = params.systemPrompt ?? '';
        yield { type: 'text_delta', text: 'ok' };
        yield { type: 'message_end', usage: { inputTokens: 1, outputTokens: 1 } };
      },
      abort() {},
      async isAvailable() { return true; },
    };

    const registry = new ToolRegistry();
    const runner = new AgentRunner(provider, registry, testToolContext, 'test-model');

    const definition: AgentDefinition = {
      name: 'custom',
      description: 'Custom',
      systemPrompt: 'You are a specialized agent.',
    };

    await runner.run({ prompt: 'Test', definition });
    assert.equal(capturedSystemPrompt, 'You are a specialized agent.');
  });

  it('should have isolated message history per sub-agent', async () => {
    let callCount = 0;
    let lastMessageCount = 0;
    const provider: LLMProvider = {
      name: 'test',
      async *chat(params: ChatRequest): AsyncIterable<StreamEvent> {
        callCount++;
        lastMessageCount = params.messages.length;
        yield { type: 'text_delta', text: `response-${callCount}` };
        yield { type: 'message_end', usage: { inputTokens: 1, outputTokens: 1 } };
      },
      abort() {},
      async isAvailable() { return true; },
    };

    const registry = new ToolRegistry();
    const runner = new AgentRunner(provider, registry, testToolContext, 'test-model');

    await runner.run({ prompt: 'First task' });
    assert.equal(lastMessageCount, 1); // Only the user message

    await runner.run({ prompt: 'Second task' });
    assert.equal(lastMessageCount, 1); // Fresh history, only user message
  });
});
