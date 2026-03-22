export interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority?: 'high' | 'medium' | 'low';
}

const store = new Map<string, TodoItem>();

export function getTodoStore(): Map<string, TodoItem> {
  return store;
}
