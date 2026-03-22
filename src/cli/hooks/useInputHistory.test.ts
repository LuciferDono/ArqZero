import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Since useInputHistory is a React hook, we test the pure logic it implements.
// We simulate the state management without React.

describe('useInputHistory logic', () => {
  // Simulate the hook's state and logic
  function createHistory() {
    let history: string[] = [];
    let historyIndex = -1;
    let savedInput = '';

    return {
      push(value: string) {
        if (value.trim()) {
          history = [...history, value];
        }
        historyIndex = -1;
        savedInput = '';
      },

      navigateUp(currentInput: string): string {
        if (history.length === 0) return currentInput;

        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);

        if (historyIndex === -1) {
          savedInput = currentInput;
        }

        historyIndex = newIndex;
        return history[newIndex];
      },

      navigateDown(): string {
        if (historyIndex === -1) return '';

        const newIndex = historyIndex + 1;

        if (newIndex >= history.length) {
          historyIndex = -1;
          return savedInput;
        }

        historyIndex = newIndex;
        return history[newIndex];
      },

      get historyItems() { return history; },
      get index() { return historyIndex; },
    };
  }

  describe('push', () => {
    it('adds non-empty input to history', () => {
      const h = createHistory();
      h.push('hello');
      assert.deepEqual(h.historyItems, ['hello']);
    });

    it('does not add empty input', () => {
      const h = createHistory();
      h.push('');
      assert.deepEqual(h.historyItems, []);
    });

    it('does not add whitespace-only input', () => {
      const h = createHistory();
      h.push('   ');
      assert.deepEqual(h.historyItems, []);
    });

    it('adds multiple items', () => {
      const h = createHistory();
      h.push('first');
      h.push('second');
      h.push('third');
      assert.deepEqual(h.historyItems, ['first', 'second', 'third']);
    });

    it('resets history index after push', () => {
      const h = createHistory();
      h.push('first');
      h.push('second');
      h.navigateUp('');
      h.push('third');
      assert.equal(h.index, -1);
    });
  });

  describe('navigateUp', () => {
    it('returns current input when history is empty', () => {
      const h = createHistory();
      const result = h.navigateUp('typing');
      assert.equal(result, 'typing');
    });

    it('returns last item on first up', () => {
      const h = createHistory();
      h.push('first');
      h.push('second');
      const result = h.navigateUp('');
      assert.equal(result, 'second');
    });

    it('navigates to earlier items', () => {
      const h = createHistory();
      h.push('first');
      h.push('second');
      h.push('third');
      h.navigateUp('');
      const result = h.navigateUp('');
      assert.equal(result, 'second');
    });

    it('stops at first item', () => {
      const h = createHistory();
      h.push('first');
      h.push('second');
      h.navigateUp('');
      h.navigateUp('');
      const result = h.navigateUp('');
      assert.equal(result, 'first');
    });

    it('saves current input on first navigate', () => {
      const h = createHistory();
      h.push('old');
      h.navigateUp('current typing');
      // Navigate back down should restore
      const result = h.navigateDown();
      assert.equal(result, 'current typing');
    });
  });

  describe('navigateDown', () => {
    it('returns empty string when not navigating', () => {
      const h = createHistory();
      const result = h.navigateDown();
      assert.equal(result, '');
    });

    it('moves forward through history', () => {
      const h = createHistory();
      h.push('first');
      h.push('second');
      h.push('third');
      h.navigateUp('');
      h.navigateUp('');
      h.navigateUp('');
      const result = h.navigateDown();
      assert.equal(result, 'second');
    });

    it('restores saved input past end of history', () => {
      const h = createHistory();
      h.push('first');
      h.navigateUp('my typing');
      const result = h.navigateDown();
      assert.equal(result, 'my typing');
    });

    it('resets index when past end', () => {
      const h = createHistory();
      h.push('first');
      h.navigateUp('');
      h.navigateDown();
      assert.equal(h.index, -1);
    });
  });

  describe('full cycle', () => {
    it('push, navigate up, down, and back', () => {
      const h = createHistory();
      h.push('alpha');
      h.push('beta');
      h.push('gamma');

      // Navigate up through all
      assert.equal(h.navigateUp('current'), 'gamma');
      assert.equal(h.navigateUp('current'), 'beta');
      assert.equal(h.navigateUp('current'), 'alpha');

      // Navigate back down
      assert.equal(h.navigateDown(), 'beta');
      assert.equal(h.navigateDown(), 'gamma');
      assert.equal(h.navigateDown(), 'current');

      // Index should be reset
      assert.equal(h.index, -1);
    });
  });
});
