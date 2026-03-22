// src/cli/components/transcript.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatTranscriptMessage } from './TranscriptView.js';
import type { Message } from '../../api/types.js';

describe('formatTranscriptMessage', () => {
  it('formats user messages with "you:" prefix', () => {
    const msg: Message = { role: 'user', content: 'hello world' };
    assert.equal(formatTranscriptMessage(msg), 'you: hello world');
  });

  it('formats assistant messages as plain text', () => {
    const msg: Message = { role: 'assistant', content: 'I can help with that.' };
    assert.equal(formatTranscriptMessage(msg), 'I can help with that.');
  });

  it('formats tool messages with tool name', () => {
    const msg: Message = {
      role: 'tool',
      content: 'file contents here',
      toolName: 'Read',
    };
    assert.equal(formatTranscriptMessage(msg), '[tool: Read] file contents here');
  });

  it('formats tool messages with unknown when no toolName', () => {
    const msg: Message = { role: 'tool', content: 'result' };
    assert.equal(formatTranscriptMessage(msg), '[tool: unknown] result');
  });

  it('formats system messages as plain text', () => {
    const msg: Message = { role: 'system', content: 'System prompt text' };
    assert.equal(formatTranscriptMessage(msg), 'System prompt text');
  });

  it('handles content block arrays', () => {
    const msg: Message = {
      role: 'assistant',
      content: [
        { type: 'text', text: 'First part' },
        { type: 'text', text: 'Second part' },
      ],
    };
    assert.equal(formatTranscriptMessage(msg), 'First part\nSecond part');
  });

  it('filters out non-text blocks', () => {
    const msg: Message = {
      role: 'assistant',
      content: [
        { type: 'thinking', text: 'internal thinking' },
        { type: 'text', text: 'visible output' },
        { type: 'tool_use', name: 'Read', input: {} },
      ],
    };
    assert.equal(formatTranscriptMessage(msg), 'visible output');
  });

  it('handles empty content blocks', () => {
    const msg: Message = {
      role: 'assistant',
      content: [],
    };
    assert.equal(formatTranscriptMessage(msg), '');
  });

  it('handles tool_result content blocks', () => {
    const msg: Message = {
      role: 'tool',
      content: [
        { type: 'tool_result', content: 'file data here' },
      ],
      toolName: 'Read',
    };
    assert.equal(formatTranscriptMessage(msg), '[tool: Read] file data here');
  });
});
