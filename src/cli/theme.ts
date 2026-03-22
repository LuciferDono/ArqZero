// src/cli/theme.ts
export const THEME = {
  // Symbols
  diamond: '◆',
  arrow: '▸',
  pipe: '┊',
  prompt: '›',

  // Colors (Ink color names)
  primary: 'yellow',        // Amber/gold accent
  text: 'white',            // Main content
  dim: 'gray',              // Secondary info
  success: 'green',         // Successful operations
  error: 'red',             // Errors
  warning: 'yellow',        // Warnings
  info: 'cyan',             // Info/links

  // Formatting
  appName: 'ArqZero',
  promptPrefix: '◆ arq ›',
  version: '2.0.0',
} as const;
