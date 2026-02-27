import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from './session.js';

describe('Session', () => {
  it('should generate a UUID by default', () => {
    const session = new Session();
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    assert.match(session.id, uuidRegex);
  });

  it('should accept a custom ID', () => {
    const session = new Session('custom-session-id');
    assert.equal(session.id, 'custom-session-id');
  });

  it('should track message count', () => {
    const session = new Session();
    session.touch();
    session.touch();
    session.touch();
    const info = session.getInfo();
    assert.equal(info.messageCount, 3);
  });

  it('should record compaction count', () => {
    const session = new Session();
    session.recordCompaction();
    session.recordCompaction();
    const info = session.getInfo();
    assert.equal(info.compactionCount, 2);
  });

  it('should provide session info', () => {
    const session = new Session('test-id');
    session.touch();
    session.recordCompaction();

    const info = session.getInfo();
    assert.equal(info.id, 'test-id');
    assert.ok(info.startedAt instanceof Date);
    assert.ok(info.lastActiveAt instanceof Date);
    assert.equal(info.messageCount, 1);
    assert.equal(info.compactionCount, 1);
  });
});
