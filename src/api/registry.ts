// src/api/registry.ts
//
// Provider catalog. Single source of truth for which LLM providers ArqZero
// supports, what their default endpoint and model are, and which capabilities
// each one exposes. Used by the factory, the /provider command, and the
// setup wizard.

export type ProviderId =
  | 'fireworks'
  | 'openai'
  | 'anthropic'
  | 'groq'
  | 'together'
  | 'deepseek'
  | 'xai'
  | 'google'
  | 'mistral'
  | 'ollama'
  | 'openrouter'
  | 'custom';

export interface ProviderMeta {
  id: ProviderId;
  displayName: string;
  baseURL: string;
  defaultModel: string;
  /** Provider speaks the OpenAI Chat Completions wire format */
  isOpenAICompat: boolean;
  /** Provider supports tool/function calling */
  supportsToolUse: boolean;
  /** Provider accepts a list of API keys with auto-fallback (currently OpenRouter only) */
  supportsKeyFallback: boolean;
  /** Provider requires an API key (false for local providers like Ollama) */
  requiresKey: boolean;
  /** Standard environment variable name for the API key */
  keyEnvVar: string;
  /** URL where users can obtain a key */
  keyUrl?: string;
  /** Short blurb for the setup wizard */
  description: string;
}

export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
  fireworks: {
    id: 'fireworks',
    displayName: 'Fireworks AI',
    baseURL: 'https://api.fireworks.ai/inference/v1',
    defaultModel: 'accounts/fireworks/models/glm-4p7',
    isOpenAICompat: true,
    supportsToolUse: true,
    supportsKeyFallback: false,
    requiresKey: true,
    keyEnvVar: 'FIREWORKS_API_KEY',
    keyUrl: 'https://fireworks.ai/account/api-keys',
    description: 'Fast inference for open-source models (GLM, DeepSeek, Qwen, Llama).',
  },
  openai: {
    id: 'openai',
    displayName: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    isOpenAICompat: true,
    supportsToolUse: true,
    supportsKeyFallback: false,
    requiresKey: true,
    keyEnvVar: 'OPENAI_API_KEY',
    keyUrl: 'https://platform.openai.com/api-keys',
    description: 'GPT-4o, GPT-4 Turbo, o1 reasoning models.',
  },
  anthropic: {
    id: 'anthropic',
    displayName: 'Anthropic',
    baseURL: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4-6',
    isOpenAICompat: false,
    supportsToolUse: true,
    supportsKeyFallback: false,
    requiresKey: true,
    keyEnvVar: 'ANTHROPIC_API_KEY',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    description: 'Claude Opus, Sonnet, Haiku — native Messages API.',
  },
  groq: {
    id: 'groq',
    displayName: 'Groq',
    baseURL: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    isOpenAICompat: true,
    supportsToolUse: true,
    supportsKeyFallback: false,
    requiresKey: true,
    keyEnvVar: 'GROQ_API_KEY',
    keyUrl: 'https://console.groq.com/keys',
    description: 'Ultra-fast LPU inference for Llama, Mixtral, Gemma.',
  },
  together: {
    id: 'together',
    displayName: 'Together AI',
    baseURL: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    isOpenAICompat: true,
    supportsToolUse: true,
    supportsKeyFallback: false,
    requiresKey: true,
    keyEnvVar: 'TOGETHER_API_KEY',
    keyUrl: 'https://api.together.xyz/settings/api-keys',
    description: 'Hosted open-source models with broad selection.',
  },
  deepseek: {
    id: 'deepseek',
    displayName: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    isOpenAICompat: true,
    supportsToolUse: true,
    supportsKeyFallback: false,
    requiresKey: true,
    keyEnvVar: 'DEEPSEEK_API_KEY',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    description: 'DeepSeek-V3 chat and DeepSeek-R1 reasoning.',
  },
  xai: {
    id: 'xai',
    displayName: 'xAI',
    baseURL: 'https://api.x.ai/v1',
    defaultModel: 'grok-2-latest',
    isOpenAICompat: true,
    supportsToolUse: true,
    supportsKeyFallback: false,
    requiresKey: true,
    keyEnvVar: 'XAI_API_KEY',
    keyUrl: 'https://console.x.ai',
    description: 'Grok models from xAI.',
  },
  google: {
    id: 'google',
    displayName: 'Google Gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.0-flash',
    isOpenAICompat: true,
    supportsToolUse: true,
    supportsKeyFallback: false,
    requiresKey: true,
    keyEnvVar: 'GEMINI_API_KEY',
    keyUrl: 'https://aistudio.google.com/apikey',
    description: 'Gemini 2.0/1.5 via OpenAI-compatible endpoint.',
  },
  mistral: {
    id: 'mistral',
    displayName: 'Mistral AI',
    baseURL: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-large-latest',
    isOpenAICompat: true,
    supportsToolUse: true,
    supportsKeyFallback: false,
    requiresKey: true,
    keyEnvVar: 'MISTRAL_API_KEY',
    keyUrl: 'https://console.mistral.ai/api-keys',
    description: 'Mistral Large, Codestral, Mixtral.',
  },
  ollama: {
    id: 'ollama',
    displayName: 'Ollama (local)',
    baseURL: 'http://localhost:11434/v1',
    defaultModel: 'llama3.3',
    isOpenAICompat: true,
    supportsToolUse: true,
    supportsKeyFallback: false,
    requiresKey: false,
    keyEnvVar: 'OLLAMA_API_KEY',
    keyUrl: 'https://ollama.com',
    description: 'Local models via Ollama. No API key required.',
  },
  openrouter: {
    id: 'openrouter',
    displayName: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-sonnet-4',
    isOpenAICompat: true,
    supportsToolUse: true,
    supportsKeyFallback: true,
    requiresKey: true,
    keyEnvVar: 'OPENROUTER_API_KEY',
    keyUrl: 'https://openrouter.ai/keys',
    description: 'Unified gateway to 100+ models. Supports multi-key fallback chain.',
  },
  custom: {
    id: 'custom',
    displayName: 'Custom (OpenAI-compatible)',
    baseURL: '',
    defaultModel: '',
    isOpenAICompat: true,
    supportsToolUse: true,
    supportsKeyFallback: false,
    requiresKey: true,
    keyEnvVar: 'CUSTOM_API_KEY',
    description: 'Any OpenAI-compatible endpoint. Specify baseURL and model in config.',
  },
};

export function getProviderMeta(id: ProviderId): ProviderMeta {
  const meta = PROVIDERS[id];
  if (!meta) {
    throw new Error(`Unknown provider: ${id}`);
  }
  return meta;
}

export function listProviderIds(): ProviderId[] {
  return Object.keys(PROVIDERS) as ProviderId[];
}

export function isValidProviderId(id: string): id is ProviderId {
  return id in PROVIDERS;
}
