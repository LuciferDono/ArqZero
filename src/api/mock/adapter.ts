// src/api/mock/adapter.ts
import type { LLMProvider } from '../provider.js';
import type { ChatRequest, StreamEvent } from '../types.js';

export class MockAdapter implements LLMProvider {
  readonly name = 'mock';
  private response: string;
  private aborted = false;

  constructor(response = 'This is a mock response from ArqCode.') {
    this.response = response;
  }

  async *chat(params: ChatRequest): AsyncIterable<StreamEvent> {
    this.aborted = false;
    const words = this.response.split(' ');
    for (let i = 0; i < words.length; i++) {
      if (this.aborted) return;
      const text = i === 0 ? words[i] : ' ' + words[i];
      yield { type: 'text_delta', text };
      await new Promise((r) => setTimeout(r, 10));
    }
    yield {
      type: 'message_end',
      usage: {
        inputTokens: params.messages.reduce(
          (acc, m) => acc + (typeof m.content === 'string' ? m.content.length : 0), 0
        ),
        outputTokens: this.response.length,
      },
    };
  }

  abort(): void { this.aborted = true; }
  async isAvailable(): Promise<boolean> { return true; }
}
