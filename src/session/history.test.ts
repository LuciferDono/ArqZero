import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Message } from '../api/types.js';
import {
  appendMessage,
  appendCompaction,
  loadSession,
  sessionExists,
  listSessions,
} from './history.js';
import type { CompactionSnapshot } from './history.js';

// ---------------------------------------------------------------------------
// Test helpers — use a temp directory as basePath
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arqcode-history-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Session History', () => {
  it('should append and load messages', () => {
    const sessionId = 'test-session-1';
    const msg1: Message = { role: 'user', content: 'Hello' };
    const msg2: Message = { role: 'assistant', content: 'Hi there!' };
    const msg3: Message = { role: 'user', content: 'How are you?' };

    appendMessage(sessionId, msg1, tmpDir);
    appendMessage(sessionId, msg2, tmpDir);
    appendMessage(sessionId, msg3, tmpDir);

    const loaded = loadSession(sessionId, tmpDir);
    assert.ok(loaded, 'loadSession should return messages');
    assert.equal(loaded!.length, 3);
    assert.equal(loaded![0].role, 'user');
    assert.equal(loaded![0].content, 'Hello');
    assert.equal(loaded![1].role, 'assistant');
    assert.equal(loaded![1].content, 'Hi there!');
    assert.equal(loaded![2].role, 'user');
    assert.equal(loaded![2].content, 'How are you?');
  });

  it('should resume from last compaction point', () => {
    const sessionId = 'test-session-compact';

    // Add 5 messages
    for (let i = 0; i < 5; i++) {
      appendMessage(
        sessionId,
        { role: i % 2 === 0 ? 'user' : 'assistant', content: `Message ${i}` },
        tmpDir,
      );
    }

    // Add compaction snapshot
    const snapshot: CompactionSnapshot = {
      summary: 'User discussed topics 0-4.',
      preservedMessages: [
        { role: 'user', content: 'Message 3' },
        { role: 'assistant', content: 'Message 4' },
      ],
      compactedCount: 3,
    };
    appendCompaction(sessionId, snapshot, tmpDir);

    // Add 2 more messages after compaction
    appendMessage(sessionId, { role: 'user', content: 'New question' }, tmpDir);
    appendMessage(sessionId, { role: 'assistant', content: 'New answer' }, tmpDir);

    const loaded = loadSession(sessionId, tmpDir);
    assert.ok(loaded, 'loadSession should return messages');

    // Should be: summary system msg + 2 preserved + 2 new = 5
    assert.equal(loaded!.length, 5);

    // First is the summary system message
    assert.equal(loaded![0].role, 'system');
    assert.ok(
      (loaded![0].content as string).includes('User discussed topics 0-4.'),
      'Summary should be present',
    );

    // Preserved messages from snapshot
    assert.equal(loaded![1].role, 'user');
    assert.equal(loaded![1].content, 'Message 3');
    assert.equal(loaded![2].role, 'assistant');
    assert.equal(loaded![2].content, 'Message 4');

    // New messages after compaction
    assert.equal(loaded![3].role, 'user');
    assert.equal(loaded![3].content, 'New question');
    assert.equal(loaded![4].role, 'assistant');
    assert.equal(loaded![4].content, 'New answer');
  });

  it('should return null for nonexistent session', () => {
    const loaded = loadSession('does-not-exist', tmpDir);
    assert.equal(loaded, null);
  });

  it('should list sessions', () => {
    appendMessage('session-a', { role: 'user', content: 'A' }, tmpDir);
    appendMessage('session-b', { role: 'user', content: 'B' }, tmpDir);

    const sessions = listSessions(tmpDir);
    assert.equal(sessions.length, 2);
    assert.ok(sessions.includes('session-a'));
    assert.ok(sessions.includes('session-b'));
  });

  it('should handle empty session file', () => {
    // Create sessions dir and an empty file
    const sessionsDir = path.join(tmpDir, 'sessions');
    fs.mkdirSync(sessionsDir, { recursive: true });
    fs.writeFileSync(path.join(sessionsDir, 'empty.jsonl'), '', 'utf-8');

    const loaded = loadSession('empty', tmpDir);
    // Empty file has no lines, should return empty array
    assert.ok(Array.isArray(loaded));
    assert.equal(loaded!.length, 0);
  });

  it('should check session existence', () => {
    assert.equal(sessionExists('nope', tmpDir), false);

    appendMessage('exists', { role: 'user', content: 'Hi' }, tmpDir);
    assert.equal(sessionExists('exists', tmpDir), true);
  });
});
