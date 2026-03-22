import type { LLMProvider } from '../api/provider.js';
import type { ToolContext } from '../tools/types.js';
import { ToolRegistry } from '../tools/registry.js';
import { ConversationEngine } from '../core/engine.js';
import type { AgentDefinition } from './types.js';

export class AgentRunner {
  private activeAgents = new Map<string, { engine: ConversationEngine; promise: Promise<string> }>();
  private maxConcurrent = 7;
  private nextId = 0;

  constructor(
    private provider: LLMProvider,
    private registry: ToolRegistry,
    private toolContext: ToolContext,
    private defaultModel: string,
  ) {}

  async run(options: {
    prompt: string;
    definition?: AgentDefinition;
    model?: string;
  }): Promise<string> {
    if (this.activeAgents.size >= this.maxConcurrent) {
      throw new Error('Maximum concurrent agents reached (7)');
    }

    const agentId = `agent-${this.nextId++}`;
    const definition = options.definition;

    // Determine model: prompt-level > definition > default
    const model = options.model ?? definition?.model ?? this.defaultModel;

    // Create filtered registry if allowedTools specified
    let agentRegistry = this.registry;
    if (definition?.allowedTools && definition.allowedTools.length > 0) {
      agentRegistry = new ToolRegistry();
      for (const toolName of definition.allowedTools) {
        const tool = this.registry.get(toolName);
        if (tool) {
          agentRegistry.register(tool);
        }
      }
    }

    // Create isolated engine for this sub-agent
    const engine = new ConversationEngine({
      provider: this.provider,
      registry: agentRegistry,
      model,
      systemPrompt: definition?.systemPrompt,
      toolContext: this.toolContext,
    });

    // Run and collect text
    const promise = this.executeAgent(engine, options.prompt);

    this.activeAgents.set(agentId, { engine, promise });

    try {
      const result = await promise;
      return result;
    } finally {
      this.activeAgents.delete(agentId);
    }
  }

  private async executeAgent(engine: ConversationEngine, prompt: string): Promise<string> {
    const textParts: string[] = [];
    let agentError: Error | undefined;

    await engine.handleUserMessage(prompt, {
      onTextDelta: (text) => textParts.push(text),
      onError: (err) => { agentError = err; },
    });

    if (agentError) throw agentError;

    return textParts.join('');
  }

  getActiveCount(): number {
    return this.activeAgents.size;
  }
}
