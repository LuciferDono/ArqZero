import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { LLMProvider } from '../api/provider.js';
import type { ChatRequest, StreamEvent } from '../api/types.js';
import { userMessage, assistantMessage } from './message.js';
import { compactMessages, buildCompactedMessages } from './compaction.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class TestProvider implements LLMProvider {
  readonly name = 'test';
  private summaryText: string;
  public lastIntent: string | null = null;

  constructor(summaryText: string) {
    this.summaryText = summaryText;
  }

  async *chat(params: ChatRequest): AsyncIterable<StreamEvent> {
    this.lastIntent = params.intent;
    yield { type: 'text_delta', text: this.summaryText };
    yield { type: 'message_end', usage: { inputTokens: 100, outputTokens: 50 } };
  }

  abort(): void {}
  async isAvailable(): Promise<boolean> { return true; }
}

class FailingProvider implements LLMProvider {
  readonly name = 'failing';

  async *chat(_params: ChatRequest): AsyncIterable<StreamEvent> {
    throw new Error('LLM service unavailable');
  }

  abort(): void {}
  async isAvailable(): Promise<boolean> { return false; }
}

function makeMessages(count: number) {
  const messages = [];
  for (let i = 0; i < count; i++) {
    if (i % 2 === 0) {
      messages.push(userMessage(`User message ${i}`));
    } else {
      messages.push(assistantMessage(`Assistant message ${i}`));
    }
  }
  return messages;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('compactMessages', () => {
  it('should summarize old messages and preserve recent ones', async () => {
    const provider = new TestProvider('Summary of old conversation');
    const messages = makeMessages(10);

    const result = await compactMessages(messages, 3, provider, 'test-model');

    assert.equal(result.summary, 'Summary of old conversation');
    assert.equal(result.compactedMessageCount, 7);
    assert.equal(result.preservedMessageCount, 3);
  });

  it('should skip compaction when not enough messages', async () => {
    const provider = new TestProvider('Should not be called');
    const messages = makeMessages(2);

    const result = await compactMessages(messages, 3, provider, 'test-model');

    assert.equal(result.summary, '');
    assert.equal(result.compactedMessageCount, 0);
    assert.equal(result.preservedMessageCount, 2);
  });

  it('should handle summarization failure gracefully', async () => {
    const provider = new FailingProvider();
    const messages = makeMessages(10);

    const result = await compactMessages(messages, 3, provider, 'test-model');

    assert.ok(result.summary.includes('Compaction failed'));
    assert.ok(result.summary.includes('LLM service unavailable'));
    assert.equal(result.compactedMessageCount, 7);
    assert.equal(result.preservedMessageCount, 3);
  });

  it('should use intent summarize in ChatRequest', async () => {
    const provider = new TestProvider('Summary text');
    const messages = makeMessages(10);

    await compactMessages(messages, 3, provider, 'test-model');

    assert.equal(provider.lastIntent, 'summarize');
  });
});

describe('buildCompactedMessages', () => {
  it('should build compacted messages correctly', () => {
    const preserved = [
      userMessage('Recent question'),
      assistantMessage('Recent answer'),
    ];

    const result = buildCompactedMessages('This is the summary', preserved);

    assert.equal(result.length, 3);
    assert.equal(result[0].role, 'system');
    assert.ok((result[0].content as string).includes('[Previous conversation summary]'));
    assert.ok((result[0].content as string).includes('This is the summary'));
    assert.equal(result[1].role, 'user');
    assert.equal(result[1].content, 'Recent question');
    assert.equal(result[2].role, 'assistant');
    assert.equal(result[2].content, 'Recent answer');
  });
});
