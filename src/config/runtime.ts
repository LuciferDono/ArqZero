// Runtime configuration — set once at startup, read by components
export const runtime = {
  reducedMotion: false,
  syntaxHighlightingDisabled: false,
  verbose: false,
  theme: 'dark' as 'dark' | 'light',
};

export function initRuntime(overrides: Partial<typeof runtime>): void {
  Object.assign(runtime, overrides);
}
