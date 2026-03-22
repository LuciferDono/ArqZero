import { useState, useCallback } from 'react';

export function useInputHistory() {
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedInput, setSavedInput] = useState('');

  const push = useCallback((value: string) => {
    if (value.trim()) {
      setHistory(h => [...h, value]);
    }
    setHistoryIndex(-1);
    setSavedInput('');
  }, []);

  const navigateUp = useCallback((currentInput: string): string => {
    if (history.length === 0) return currentInput;

    const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);

    if (historyIndex === -1) {
      setSavedInput(currentInput);
    }

    setHistoryIndex(newIndex);
    return history[newIndex];
  }, [history, historyIndex]);

  const navigateDown = useCallback((): string => {
    if (historyIndex === -1) return '';

    const newIndex = historyIndex + 1;

    if (newIndex >= history.length) {
      setHistoryIndex(-1);
      return savedInput;
    }

    setHistoryIndex(newIndex);
    return history[newIndex];
  }, [history, historyIndex, savedInput]);

  return { push, navigateUp, navigateDown, history };
}
