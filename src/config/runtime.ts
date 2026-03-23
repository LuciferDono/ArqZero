// Runtime configuration — set once at startup, read by components
export const runtime = {
  reducedMotion: false,
  syntaxHighlightingDisabled: false,
  verbose: false,
  theme: 'dark' as 'dark' | 'light',
  // NOTE: runtime.tier is set once at startup. If subscription changes mid-session,
  // the user needs to restart ArqZero. A periodic re-evaluation is a v2 enhancement.
  tier: 'free' as 'free' | 'pro' | 'team',
};

export function initRuntime(overrides: Partial<typeof runtime>): void {
  Object.assign(runtime, overrides);
}
