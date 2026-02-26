import type { ChatRequest, StreamEvent } from './types.js';

export interface LLMProvider {
  readonly name: string;
  chat(params: ChatRequest): AsyncIterable<StreamEvent>;
  abort(): void;
  isAvailable(): Promise<boolean>;
}
