export type HookEvent =
  | 'PreToolUse' | 'PostToolUse' | 'PostToolUseFailure'
  | 'UserPromptSubmit' | 'Stop' | 'DispatchStop'
  | 'SessionStart' | 'SessionEnd'
  | 'PreCompact' | 'PostCompact'
  | 'Notification';

export type HookHandlerType = 'command' | 'http';

export interface HookDefinition {
  event: HookEvent;
  type: HookHandlerType;
  command?: string;
  url?: string;
  timeout?: number;
  matchTools?: string[];  // only fire for specific tools (PreToolUse/PostToolUse)
}

export interface HookPayload {
  event: HookEvent;
  toolName?: string;
  toolInput?: unknown;
  toolResult?: unknown;
  sessionId?: string;
  timestamp: number;
}

export interface HookResult {
  action: 'allow' | 'deny' | 'continue';
  message?: string;
  modifiedInput?: unknown;
}
