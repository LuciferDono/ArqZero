// src/cli/components/Spinner.tsx
import React, { useState, useEffect } from 'react';
import { Text } from 'ink';
import { THEME } from '../theme.js';

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export interface SpinnerProps {
  label: string;
  startTime: number;
}

export function Spinner({ label, startTime }: SpinnerProps) {
  const [frame, setFrame] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % FRAMES.length);
      setElapsed(Date.now() - startTime);
    }, 80);

    return () => clearInterval(interval);
  }, [startTime]);

  const seconds = (elapsed / 1000).toFixed(1);

  return (
    <Text color={THEME.primary}>
      {FRAMES[frame]} Running {label}... {seconds}s
    </Text>
  );
}
