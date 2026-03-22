import type { Tool, ToolContext, ToolResult } from '../types.js';
import { formatTodos } from './todo-write.js';

export const todoReadTool: Tool = {
  name: 'TodoRead',
  description: 'Reads the current task list from the session.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
  permissionLevel: 'safe',

  async execute(_input: unknown, _ctx: ToolContext): Promise<ToolResult> {
    return { content: formatTodos() };
  },
};
