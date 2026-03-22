import type { Tool, ToolContext, ToolResult } from '../types.js';

interface AskUserInput {
  question: string;
}

export const askUserTool: Tool = {
  name: 'Prompt',
  description: 'Asks the user a question and returns their response.',
  inputSchema: {
    type: 'object',
    properties: {
      question: { type: 'string', description: 'The question to ask the user' },
    },
    required: ['question'],
  },
  permissionLevel: 'safe',

  async execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
    const { question } = input as AskUserInput;

    const response = await ctx.promptUser({
      tool: 'Prompt',
      input: { question },
      level: 'safe',
    });

    if (response.allowed) {
      return { content: `User responded to: ${question}` };
    }

    return {
      content: 'User declined to answer',
      isError: true,
    };
  },
};
