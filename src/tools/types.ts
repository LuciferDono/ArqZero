import type { AppConfig } from '../config/schema.js';

export type PermissionLevel = 'safe' | 'ask' | 'dangerous';

export interface PermissionRequest {
  tool: string;
  input: unknown;
  level: PermissionLevel;
}

export interface PermissionResponse {
  allowed: boolean;
  remember?: 'session' | 'pattern';
}

export interface ToolContext {
  cwd: string;
  config: AppConfig;
  promptUser: (request: PermissionRequest) => Promise<PermissionResponse>;
}

export interface ToolResult {
  content: string;
  isError?: boolean;
  display?: {
    language?: string;
    truncated?: boolean;
    lineCount?: number;
  };
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  permissionLevel: PermissionLevel;
  execute(input: unknown, ctx: ToolContext): Promise<ToolResult>;
}
