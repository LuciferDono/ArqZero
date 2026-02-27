import type { TokenUsage } from '../api/types.js';

export interface ContextWindowConfig {
  maxContextTokens: number;     // e.g., 200000 for Claude
  compactionThreshold: number;  // 0.85 = 85%
  preserveRatio: number;        // 0.2 = keep 20% of recent messages
}

const DEFAULT_CONFIG: ContextWindowConfig = {
  maxContextTokens: 200000,
  compactionThreshold: 0.85,
  preserveRatio: 0.2,
};

export class ContextWindow {
  private config: ContextWindowConfig;
  private totalInputTokens = 0;
  private totalOutputTokens = 0;

  constructor(config?: Partial<ContextWindowConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update token counts from a message_end event.
   */
  trackUsage(usage: TokenUsage): void {
    this.totalInputTokens = usage.inputTokens;
    this.totalOutputTokens = usage.outputTokens;
  }

  /**
   * Estimated total tokens currently in context.
   * Uses inputTokens as the best approximation of context size.
   */
  getEstimatedTokens(): number {
    return this.totalInputTokens;
  }

  /**
   * Check if compaction should be triggered.
   */
  needsCompaction(): boolean {
    const threshold = this.config.maxContextTokens * this.config.compactionThreshold;
    return this.totalInputTokens >= threshold;
  }

  /**
   * How many recent messages to preserve during compaction.
   * Returns a count based on preserveRatio.
   */
  getPreserveCount(totalMessages: number): number {
    return Math.max(2, Math.ceil(totalMessages * this.config.preserveRatio));
  }

  getUsageSummary(): { input: number; output: number; max: number; percent: number } {
    return {
      input: this.totalInputTokens,
      output: this.totalOutputTokens,
      max: this.config.maxContextTokens,
      percent: Math.round((this.totalInputTokens / this.config.maxContextTokens) * 100),
    };
  }

  reset(): void {
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
  }
}
