import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { LLMProvider } from '../../api/provider.js';
import type { ChatRequest, StreamEvent } from '../../api/types.js';
import type { ToolContext } from '../types.js';
import { ToolRegistry } from '../registry.js';
import { AgentRunner } from '../../agents/runner.js';
import { taskTool, setAgentRunner } from './task.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class TestProvider implements LLMProvider {
  readonly name = 'test';
  private response: string;

  constructor(response = 'Task completed successfully') {
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

const testToolContext: ToolContext = {
  cwd: process.cwd(),
  config: { provider: 'fireworks' } as any,
  promptUser: async () => ({ allowed: true }),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Task Tool', () => {
  beforeEach(() => {
    const provider = new TestProvider('Sub-agent result');
    const registry = new ToolRegistry();
    const runner = new AgentRunner(provider, registry, testToolContext, 'test-model');
    setAgentRunner(runner);
  });

  it('should have correct name and permission level', () => {
    assert.equal(taskTool.name, 'Task');
    assert.equal(taskTool.permissionLevel, 'ask');
  });

  it('should require prompt in input schema', () => {
    const schema = taskTool.inputSchema as any;
    assert.ok(schema.properties.prompt);
    assert.ok(schema.required.includes('prompt'));
  });

  it('should execute a sub-agent and return result', async () => {
    const result = await taskTool.execute(
      { prompt: 'Do something useful' },
      testToolContext,
    );

    assert.equal(result.content, 'Sub-agent result');
    assert.equal(result.isError, undefined);
  });

  it('should return error when no agent runner is configured', async () => {
    setAgentRunner(null as any);

    const result = await taskTool.execute(
      { prompt: 'Do something' },
      testToolContext,
    );

    assert.equal(result.isError, true);
    assert.ok(result.content.includes('not configured'));
  });

  it('should handle agent execution errors gracefully', async () => {
    const badProvider: LLMProvider = {
      name: 'bad',
      async *chat(): AsyncIterable<StreamEvent> {
        throw new Error('Provider exploded');
      },
      abort() {},
      async isAvailable() { return true; },
    };

    const registry = new ToolRegistry();
    const runner = new AgentRunner(badProvider, registry, testToolContext, 'test-model');
    setAgentRunner(runner);

    const result = await taskTool.execute(
      { prompt: 'Do something' },
      testToolContext,
    );

    assert.equal(result.isError, true);
    assert.ok(result.content.includes('Provider exploded'));
  });

  it('should pass allowedTools from input', async () => {
    let capturedToolNames: string[] = [];
    const provider: LLMProvider = {
      name: 'test',
      async *chat(params: ChatRequest): AsyncIterable<StreamEvent> {
        capturedToolNames = (params.tools ?? []).map((t) => t.name);
        yield { type: 'text_delta', text: 'done' };
        yield { type: 'message_end', usage: { inputTokens: 1, outputTokens: 1 } };
      },
      abort() {},
      async isAvailable() { return true; },
    };

    const registry = new ToolRegistry();
    registry.register({
      name: 'Read',
      description: 'Read files',
      inputSchema: { type: 'object', properties: {} },
      permissionLevel: 'safe',
      execute: async () => ({ content: 'ok' }),
    });
    registry.register({
      name: 'Write',
      description: 'Write files',
      inputSchema: { type: 'object', properties: {} },
      permissionLevel: 'ask',
      execute: async () => ({ content: 'ok' }),
    });

    const runner = new AgentRunner(provider, registry, testToolContext, 'test-model');
    setAgentRunner(runner);

    await taskTool.execute(
      { prompt: 'Do it', allowedTools: 'Read' },
      testToolContext,
    );

    assert.deepEqual(capturedToolNames, ['Read']);
  });
});
