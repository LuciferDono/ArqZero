import type { Tool, ToolContext, ToolResult } from '../types.js';
import { getTodoStore, type TodoItem } from './todo-store.js';

interface TodoWriteInput {
  todos: TodoItem[];
}

function formatTodos(): string {
  const store = getTodoStore();
  if (store.size === 0) return 'No tasks';

  const lines: string[] = [];
  for (const [, item] of store) {
    const priority = item.priority ? ` [${item.priority}]` : '';
    lines.push(`- [${item.status}] ${item.content}${priority} (id: ${item.id})`);
  }
  return lines.join('\n');
}

export { formatTodos };

export const todoWriteTool: Tool = {
  name: 'TodoWrite',
  description: 'Stores or updates a task list in the current session.',
  inputSchema: {
    type: 'object',
    properties: {
      todos: {
        type: 'array',
        description: 'Array of todo items to store/update',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            content: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          },
          required: ['id', 'content', 'status'],
        },
      },
    },
    required: ['todos'],
  },
  permissionLevel: 'safe',

  async execute(input: unknown, _ctx: ToolContext): Promise<ToolResult> {
    const { todos } = input as TodoWriteInput;
    const store = getTodoStore();

    for (const todo of todos) {
      store.set(todo.id, todo);
    }

    return { content: formatTodos() };
  },
};
