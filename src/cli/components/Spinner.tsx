// src/cli/components/Spinner.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Text, Box } from 'ink';
import { THEME, SPINNER_VERBS } from '../theme.js';
import { runtime } from '../../config/runtime.js';

export interface SpinnerProps {
  label?: string;
  startTime?: number;
  isActive?: boolean;
}

export const TIPS = [
  'Tip: Use /clear to start fresh when switching topics',
  'Tip: Use /compress to free up context space',
  'Tip: Use /undo to restore files to a checkpoint',
  'Tip: Use /think to adjust reasoning depth',
  'Tip: Use /export to save this conversation',
];

/** Stalled thresholds in seconds */
export const STALLED_THRESHOLD_WIDEN = 10;
export const STALLED_THRESHOLD_FULL = 30;

export function ShimmerSpinner({ isActive = true }: { isActive: boolean }) {
  const [verb] = useState(() => SPINNER_VERBS[Math.floor(Math.random() * SPINNER_VERBS.length)]);
  const [glimmerIndex, setGlimmerIndex] = useState(0);
  const [dotVisible, setDotVisible] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const startTime = useRef(Date.now());
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);

  // Shimmer animation at 50ms
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setGlimmerIndex(i => (i + 1) % (verb.length + 6));
    }, 50);
    return () => clearInterval(interval);
  }, [isActive, verb]);

  // Dot blink at 600ms
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setDotVisible(v => !v);
    }, 600);
    return () => clearInterval(interval);
  }, [isActive]);

  // Elapsed time at 1s
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive) return null;

  const fullText = `${verb}...`;

  // Determine shimmer width based on elapsed time (stalled indicator)
  const shimmerWidth = elapsed >= STALLED_THRESHOLD_FULL
    ? fullText.length
    : elapsed >= STALLED_THRESHOLD_WIDEN
      ? 6
      : 3;

  // Reduced motion: static text, no animation
  if (runtime.reducedMotion) {
    const elapsedStr = elapsed > 0 ? ` ${elapsed}s` : '';
    return (
      <Box flexDirection="column">
        <Box>
          <Text color={THEME.primary}>{THEME.dot} {fullText}</Text>
          <Text color={THEME.dim}>{elapsedStr}</Text>
        </Box>
        {elapsed >= STALLED_THRESHOLD_FULL && (
          <Box marginLeft={2}>
            <Text color={THEME.dim}>{tip}</Text>
          </Box>
        )}
      </Box>
    );
  }

  // Render each character with shimmer color
  const chars = fullText.split('').map((char, i) => {
    const distance = Math.abs(i - glimmerIndex);
    const isShimmer = distance < shimmerWidth;
    return (
      <Text key={i} color={isShimmer ? THEME.primaryShimmer : THEME.primary}>
        {char}
      </Text>
    );
  });

  const elapsedStr = elapsed > 0 ? ` ${elapsed}s` : '';

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={THEME.primary}>{dotVisible ? THEME.dot : ' '} </Text>
        {chars}
        <Text color={THEME.dim}>{elapsedStr}</Text>
      </Box>
      {elapsed >= STALLED_THRESHOLD_FULL && (
        <Box marginLeft={2}>
          <Text color={THEME.dim}>{tip}</Text>
        </Box>
      )}
    </Box>
  );
}

// Backward-compatible Spinner wrapper
export function Spinner({ label, startTime }: SpinnerProps) {
  return <ShimmerSpinner isActive={true} />;
}
