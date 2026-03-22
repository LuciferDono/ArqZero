// src/config/model-router.ts — Multi-model routing system

export type ModelTier = 'fast' | 'default' | 'strong';

export interface ModelConfig {
  id: string;
  displayName: string;
  tier: ModelTier;
  description: string;
  costPerMInput: number;   // $ per 1M input tokens
  costPerMOutput: number;  // $ per 1M output tokens
  contextWindow: number;   // max tokens
}

export const MODELS: ModelConfig[] = [
  {
    id: 'accounts/fireworks/models/glm-4p7',
    displayName: 'Enso',
    tier: 'default',
    description: 'GLM-4.7 (400B MoE, 200K ctx)',
    costPerMInput: 0.60,
    costPerMOutput: 2.20,
    contextWindow: 200000,
  },
  {
    id: 'accounts/fireworks/models/glm-5',
    displayName: 'PRIMUS',
    tier: 'strong',
    description: 'GLM-5 (latest, enhanced reasoning)',
    costPerMInput: 1.00,
    costPerMOutput: 3.00,
    contextWindow: 200000,
  },
];

/**
 * Lookup a model by display name, full ID, or short name (last segment of ID).
 */
export function getModelByName(name: string): ModelConfig | undefined {
  const lower = name.toLowerCase();
  return MODELS.find(m =>
    m.displayName.toLowerCase() === lower ||
    m.id === name ||
    m.id.endsWith('/' + lower)
  );
}

/**
 * Get the first model matching the given tier.
 * Falls back to MODELS[0] if no match.
 */
export function getModelByTier(tier: ModelTier): ModelConfig {
  return MODELS.find(m => m.tier === tier) ?? MODELS[0];
}

/**
 * Get a model's cost rates. Returns the matching model's rates,
 * or the default model's rates if not found.
 */
export function getModelCost(modelId: string): { costPerMInput: number; costPerMOutput: number } {
  const model = MODELS.find(m => m.id === modelId);
  if (model) return { costPerMInput: model.costPerMInput, costPerMOutput: model.costPerMOutput };
  const def = getModelByTier('default');
  return { costPerMInput: def.costPerMInput, costPerMOutput: def.costPerMOutput };
}

// Capabilities that benefit from the strongest available model
const STRONG_TASKS = [
  'planning',
  'code-review',
  'security-review',
  'incident-response',
  'migration',
  'backend-patterns',
  'microservices',
  'database-design',
];

/**
 * Auto-route: pick the right model based on the task.
 * Simple heuristic -- no ML, just capability analysis.
 *
 * Returns { model, reason } where reason explains the routing decision.
 */
export function routeModel(
  _userMessage: string,
  matchedCapabilities: string[],
  defaultModel: string,
): { model: string; reason: string } {
  const needsStrong = matchedCapabilities.some(c => STRONG_TASKS.includes(c));

  if (needsStrong) {
    const strong = getModelByTier('strong');
    if (strong && strong.id !== defaultModel) {
      const matched = matchedCapabilities.filter(c => STRONG_TASKS.includes(c));
      return {
        model: strong.id,
        reason: `${matched.join(', ')} task`,
      };
    }
  }

  return { model: defaultModel, reason: 'default' };
}
