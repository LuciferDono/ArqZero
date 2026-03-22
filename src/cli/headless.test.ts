import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runHeadless } from './headless.js';
import type { LLMProvider } from '../api/provider.js';
import type { AppConfig } from '../config/schema.js';
import { ToolRegistry } from '../tools/registry.js';

function createMockProvider(responseText: string): LLMProvider {
  return {
    name: 'mock',
    async *chat() {
      yield { type: 'text_delta' as const, text: responseText };
      yield {
        type: 'message_end' as const,
        usage: { inputTokens: 10, outputTokens: 5 },
      };
    },
    abort() {},
    async isAvailable() { return true; },
  };
}

function createMockConfig(): AppConfig {
  return {
    provider: 'fireworks',
    model: 'test-model',
    fireworksApiKey: 'test-key',
    maxTokens: 1024,
    permissions: {
      defaultMode: 'ask',
      alwaysAllow: [],
      alwaysDeny: [],
      trustedPatterns: {},
    },
    mcpServers: {},
    bash: { defaultTimeout: 30000, maxTimeout: 600000 },
  };
}

describe('runHeadless', () => {
  it('runs prompt and produces text output', async () => {
    const output: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      output.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;

    try {
      await runHeadless({
        prompt: 'hello',
        provider: createMockProvider('Hello back!'),
        config: createMockConfig(),
        registry: new ToolRegistry(),
        systemPrompt: 'You are a test.',
        outputFormat: 'text',
      });
    } finally {
      process.stdout.write = originalWrite;
    }

    const combined = output.join('');
    assert.ok(combined.includes('Hello back!'), `Expected "Hello back!" in output, got: ${combined}`);
  });

  it('runs prompt and produces json output', async () => {
    const output: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      output.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;

    try {
      await runHeadless({
        prompt: 'hello',
        provider: createMockProvider('JSON response'),
        config: createMockConfig(),
        registry: new ToolRegistry(),
        systemPrompt: 'You are a test.',
        outputFormat: 'json',
      });
    } finally {
      process.stdout.write = originalWrite;
    }

    const combined = output.join('');
    const parsed = JSON.parse(combined);
    assert.equal(parsed.result, 'JSON response');
    assert.equal(parsed.usage.input_tokens, 10);
    assert.equal(parsed.usage.output_tokens, 5);
    assert.equal(typeof parsed.cost, 'number');
  });

  it('runs prompt and produces stream-json output', async () => {
    const output: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      output.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;

    try {
      await runHeadless({
        prompt: 'hello',
        provider: createMockProvider('Streamed'),
        config: createMockConfig(),
        registry: new ToolRegistry(),
        systemPrompt: 'You are a test.',
        outputFormat: 'stream-json',
      });
    } finally {
      process.stdout.write = originalWrite;
    }

    const combined = output.join('');
    const lines = combined.trim().split('\n').filter(Boolean);
    assert.ok(lines.length >= 1, 'Should have at least one JSON line');

    // Each line should be valid JSON
    for (const line of lines) {
      const parsed = JSON.parse(line);
      assert.ok(parsed.type, 'Each line should have a type');
    }
  });
});
