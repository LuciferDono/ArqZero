import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { parseDuration, CronManager, type CronJob } from './cron.js';

describe('parseDuration', () => {
  it('should parse seconds', () => {
    assert.equal(parseDuration('10s'), 10_000);
  });

  it('should parse minutes', () => {
    assert.equal(parseDuration('5m'), 300_000);
  });

  it('should parse hours', () => {
    assert.equal(parseDuration('2h'), 7_200_000);
  });

  it('should return null for invalid input', () => {
    assert.equal(parseDuration('abc'), null);
    assert.equal(parseDuration(''), null);
    assert.equal(parseDuration('10x'), null);
  });

  it('should return null for zero duration', () => {
    assert.equal(parseDuration('0s'), null);
  });

  it('should return null for negative duration', () => {
    assert.equal(parseDuration('-5m'), null);
  });
});

describe('CronManager', () => {
  let manager: CronManager;

  beforeEach(() => {
    manager = new CronManager();
  });

  afterEach(() => {
    manager.stopAll();
  });

  describe('add', () => {
    it('should add a job and return its id', () => {
      const id = manager.add(60_000, 'check build', async () => {});
      assert.equal(typeof id, 'number');
      assert.ok(id >= 1);
    });

    it('should assign incrementing ids', () => {
      const id1 = manager.add(60_000, 'job 1', async () => {});
      const id2 = manager.add(60_000, 'job 2', async () => {});
      assert.equal(id2, id1 + 1);
    });
  });

  describe('list', () => {
    it('should return empty array when no jobs', () => {
      assert.deepEqual(manager.list(), []);
    });

    it('should return active jobs', () => {
      manager.add(60_000, 'check build', async () => {});
      manager.add(120_000, 'run tests', async () => {});

      const jobs = manager.list();
      assert.equal(jobs.length, 2);
      assert.equal(jobs[0].prompt, 'check build');
      assert.equal(jobs[0].intervalMs, 60_000);
      assert.equal(jobs[1].prompt, 'run tests');
    });
  });

  describe('stopAll', () => {
    it('should clear all jobs', () => {
      manager.add(60_000, 'job 1', async () => {});
      manager.add(60_000, 'job 2', async () => {});
      assert.equal(manager.list().length, 2);

      manager.stopAll();
      assert.equal(manager.list().length, 0);
    });
  });

  describe('stop', () => {
    it('should stop a specific job by id', () => {
      const id1 = manager.add(60_000, 'job 1', async () => {});
      const id2 = manager.add(60_000, 'job 2', async () => {});

      const removed = manager.stop(id1);
      assert.equal(removed, true);
      assert.equal(manager.list().length, 1);
      assert.equal(manager.list()[0].prompt, 'job 2');
    });

    it('should return false for nonexistent id', () => {
      assert.equal(manager.stop(999), false);
    });
  });

  describe('execution', () => {
    it('should call the callback', async () => {
      let called = false;
      // Use a very short interval for testing
      manager.add(50, 'test', async () => { called = true; });

      // Wait for at least one tick
      await new Promise((resolve) => setTimeout(resolve, 120));
      manager.stopAll();
      assert.equal(called, true);
    });
  });
});
