export interface EnvOverrides {
  model?: string;
  maxTokens?: number;
  reducedMotion?: boolean;
  syntaxHighlightingDisabled?: boolean;
  verbose?: boolean;
  apiKey?: string;
}

export function loadEnvOverrides(): EnvOverrides {
  return {
    model: process.env.ARQZERO_MODEL,
    maxTokens: process.env.ARQZERO_MAX_TOKENS ? parseInt(process.env.ARQZERO_MAX_TOKENS, 10) : undefined,
    reducedMotion: process.env.ARQZERO_REDUCED_MOTION === '1',
    syntaxHighlightingDisabled: process.env.ARQZERO_NO_HIGHLIGHT === '1',
    verbose: process.env.ARQZERO_VERBOSE === '1',
    apiKey: process.env.FIREWORKS_API_KEY,
  };
}
