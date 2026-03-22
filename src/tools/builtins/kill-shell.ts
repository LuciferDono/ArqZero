import type { Tool, ToolContext, ToolResult } from '../types.js';

interface KillShellInput {
  process_id: string;
}

export const killShellTool: Tool = {
  name: 'KillShell',
  description: 'Kills a tracked bash process.',
  inputSchema: {
    type: 'object',
    properties: {
      process_id: { type: 'string', description: 'The ID of the process to kill' },
    },
    required: ['process_id'],
  },
  permissionLevel: 'ask',

  async execute(input: unknown, _ctx: ToolContext): Promise<ToolResult> {
    const { process_id: _processId } = input as KillShellInput;
    return { content: 'Process tracking not yet implemented' };
  },
};
