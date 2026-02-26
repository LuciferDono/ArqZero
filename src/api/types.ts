export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | ContentBlock[];
  toolCallId?: string;
  toolName?: string;
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: string;
  isError?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ChatRequest {
  messages: Message[];
  model: string;
  tools?: ToolDefinition[];
  maxTokens?: number;
  systemPrompt?: string;
  intent: 'chat' | 'summarize';
}

export type StreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'thinking_delta'; text: string }
  | { type: 'tool_use_start'; id: string; name: string }
  | { type: 'tool_use_delta'; id: string; input: string }
  | { type: 'tool_use_end'; id: string }
  | { type: 'message_end'; usage: TokenUsage }
  | { type: 'error'; error: Error };
