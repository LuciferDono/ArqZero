import type { Tool, ToolContext } from '../types.js';
import type { AgentRunner } from '../../agents/runner.js';
import type { AgentDefinition } from '../../agents/types.js';

// NOTE: Global mutable singleton kept for backward compatibility.
// Prefer passing agentRunner via ToolContext.agentRunner instead.
let agentRunner: AgentRunner | null = null;

/** @deprecated Pass agentRunner via ToolContext.agentRunner instead. */
export function setAgentRunner(runner: AgentRunner | null): void {
  agentRunner = runner;
}

export const taskTool: Tool = {
  name: 'Dispatch',
  description:
    'Launch a sub-agent to handle a complex task autonomously. The agent gets its own conversation context and can use tools.',
  inputSchema: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'The task for the agent to perform',
      },
      description: {
        type: 'string',
        description: 'Short description of what the agent will do',
      },
      model: {
        type: 'string',
        description: 'Optional model override',
      },
      allowedTools: {
        type: 'string',
        description: 'Comma-separated list of allowed tools',
      },
    },
    required: ['prompt'],
  },
  permissionLevel: 'ask',
  async execute(input: unknown, ctx: ToolContext) {
    const runner = ctx.agentRunner ?? agentRunner;
    if (!runner) {
      return {
        content: 'Agent runner is not configured. Cannot launch sub-agent.',
        isError: true,
      };
    }

    const { prompt, description, model, allowedTools } = input as {
      prompt: string;
      description?: string;
      model?: string;
      allowedTools?: string;
    };

    // Build an ad-hoc agent definition if allowedTools or description provided
    let definition: AgentDefinition | undefined;
    if (allowedTools || description) {
      definition = {
        name: description ?? 'task',
        description: description ?? 'Ad-hoc task agent',
        allowedTools: allowedTools
          ? allowedTools.split(',').map((t) => t.trim()).filter(Boolean)
          : undefined,
      };
    }

    try {
      const result = await runner.run({ prompt, definition, model });
      return { content: result };
    } catch (err) {
      return {
        content: `Sub-agent error: ${err instanceof Error ? err.message : String(err)}`,
        isError: true,
      };
    }
  },
};
