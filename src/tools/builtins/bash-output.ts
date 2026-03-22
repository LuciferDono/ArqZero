import type { Tool, ToolContext, ToolResult } from '../types.js';

interface BashOutputInput {
  process_id: string;
}

export const bashOutputTool: Tool = {
  name: 'BashOutput',
  description: 'Reads accumulated stdout/stderr from a tracked bash process.',
  inputSchema: {
    type: 'object',
    properties: {
      process_id: { type: 'string', description: 'The ID of the tracked process' },
    },
    required: ['process_id'],
  },
  permissionLevel: 'safe',

  async execute(input: unknown, _ctx: ToolContext): Promise<ToolResult> {
    const { process_id: _processId } = input as BashOutputInput;
    return { content: 'Process tracking not yet implemented', isError: true };
  },
};
