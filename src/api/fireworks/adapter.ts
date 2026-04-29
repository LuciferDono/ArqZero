// src/api/fireworks/adapter.ts
//
// Thin Fireworks-specific wrapper over OpenAICompatAdapter, preserved for
// backwards compatibility. New code should prefer the factory in
// src/api/factory.ts which dispatches by provider id.
import { OpenAICompatAdapter } from '../openai-compat/adapter.js';
import { getProviderMeta } from '../registry.js';

export class FireworksAdapter extends OpenAICompatAdapter {
  constructor(apiKey: string) {
    const meta = getProviderMeta('fireworks');
    super({
      providerName: meta.id,
      apiKey,
      baseURL: meta.baseURL,
      defaultModel: meta.defaultModel,
    });
  }

  async isAvailable(): Promise<boolean> {
    return !!this.opts.apiKey;
  }
}
