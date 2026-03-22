// src/cli/app.tsx
import React, { useState, useRef, useCallback } from 'react';
import { Box, useApp, useInput } from 'ink';
import type { LLMProvider } from '../api/provider.js';
import type { TokenUsage } from '../api/types.js';
import type { AppConfig } from '../config/schema.js';
import type { ToolRegistry } from '../tools/registry.js';
import type { ToolContext, ToolResult, PermissionRequest, PermissionResponse } from '../tools/types.js';
import { ConversationEngine } from '../core/engine.js';
import type { MatchResult } from '../registry/matcher.js';
import { PermissionManager } from '../permissions/manager.js';
import { Session } from '../session/session.js';
import { ContextWindow } from '../session/context.js';
import type { SlashCommandRegistry, SlashCommandContext } from '../commands/registry.js';
import {
  Header,
  OperationLog,
  CommandInput,
  PermissionInline,
} from './components/index.js';
import type { OperationEntryData } from './components/index.js';
import { useInputHistory } from './hooks/useInputHistory.js';

interface AppProps {
  provider: LLMProvider;
  config: AppConfig;
  registry: ToolRegistry;
  systemPrompt?: string;
  commandRegistry?: SlashCommandRegistry;
}

interface PendingPermission {
  request: PermissionRequest;
  resolve: (response: PermissionResponse) => void;
}

// Fireworks pricing estimate: ~$0.90/M input, ~$0.90/M output for llama-70b
const COST_PER_INPUT_TOKEN = 0.9 / 1_000_000;
const COST_PER_OUTPUT_TOKEN = 0.9 / 1_000_000;

function estimateCost(usage: TokenUsage): number {
  return (
    usage.inputTokens * COST_PER_INPUT_TOKEN +
    usage.outputTokens * COST_PER_OUTPUT_TOKEN
  );
}

function summarizeToolResult(name: string, result: ToolResult): string {
  const content = result.content;

  if (name === 'Read') {
    const lineMatch = content.match(/(\d+)\s*lines?/i);
    const pathMatch = content.match(/(?:Read|read)\s+(.+?)(?:\s|$)/);
    if (lineMatch) return `${pathMatch?.[1] ?? ''} (${lineMatch[1]} lines)`.trim();
  }

  if (name === 'Write') {
    const pathMatch = content.match(/(?:Wrote|wrote|Written|written)\s+(.+?)(?:\s|$)/);
    return `Wrote ${pathMatch?.[1] ?? ''}`.trim();
  }

  if (name === 'Edit') {
    const pathMatch = content.match(/(?:in|edited)\s+(.+?)(?:\s|$)/i);
    return `Edited ${pathMatch?.[1] ?? ''}`.trim();
  }

  if (name === 'Bash') {
    const firstLine = content.split('\n')[0] ?? '';
    return firstLine.length > 60 ? firstLine.slice(0, 57) + '...' : firstLine;
  }

  if (name === 'Glob') {
    const lines = content.trim().split('\n').filter(Boolean);
    return `Found ${lines.length} files`;
  }

  if (name === 'Grep') {
    const lines = content.trim().split('\n').filter(Boolean);
    return `Found ${lines.length} matches`;
  }

  // Fallback
  return content.length > 60 ? content.slice(0, 57) + '...' : content;
}

export default function App({ provider, config, registry, systemPrompt, commandRegistry }: AppProps) {
  const [input, setInput] = useState('');
  const [entries, setEntries] = useState<OperationEntryData[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeOperation, setActiveOperation] = useState<{ name: string; startTime: number } | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const [costEstimate, setCostEstimate] = useState(0);
  const [contextPercent, setContextPercent] = useState(0);
  const [pendingPermission, setPendingPermission] = useState<PendingPermission | null>(null);
  const { exit } = useApp();
  const history = useInputHistory();

  const engineRef = useRef<ConversationEngine | null>(null);
  const contextWindowRef = useRef<ContextWindow | null>(null);
  const toolStartTimesRef = useRef<Map<string, number>>(new Map());

  if (!engineRef.current) {
    const permissionManager = new PermissionManager(config.permissions);
    const session = new Session();
    const contextWindow = new ContextWindow();
    contextWindowRef.current = contextWindow;
    const toolContext: ToolContext = {
      cwd: process.cwd(),
      config,
      promptUser: async (req) => {
        return new Promise<PermissionResponse>((resolve) => {
          setPendingPermission({ request: req, resolve });
        });
      },
    };
    engineRef.current = new ConversationEngine({
      provider,
      registry,
      model: config.model,
      systemPrompt,
      maxTokens: config.maxTokens,
      toolContext,
      permissions: permissionManager,
      session,
      contextWindow,
    });
  }

  const handlePermissionResponse = useCallback((response: PermissionResponse) => {
    if (pendingPermission) {
      pendingPermission.resolve(response);
      setPendingPermission(null);
    }
  }, [pendingPermission]);

  useInput((_input, key) => {
    if (key.ctrl && _input === 'c') {
      engineRef.current?.abort();
      exit();
    }

    // Ctrl+L: clear entries
    if (key.ctrl && _input === 'l') {
      setEntries([]);
      return;
    }

    // Escape: cancel current input or abort streaming
    if (key.escape) {
      if (isStreaming) {
        engineRef.current?.abort();
      } else {
        setInput('');
      }
      return;
    }

    // Up arrow: navigate history
    if (key.upArrow && !isStreaming && !pendingPermission) {
      const prev = history.navigateUp(input);
      setInput(prev);
      return;
    }

    // Down arrow: navigate history
    if (key.downArrow && !isStreaming && !pendingPermission) {
      const next = history.navigateDown();
      setInput(next);
      return;
    }
  });

  const handleSubmit = async (value: string) => {
    if (!value.trim()) return;

    // Push to history before processing
    history.push(value);

    // Check if it's a slash command
    if (commandRegistry && commandRegistry.isSlashCommand(value)) {
      const { name, args } = commandRegistry.parse(value);
      const cmd = commandRegistry.get(name);
      if (cmd) {
        const slashContext: SlashCommandContext = {
          config,
          commandRegistry,
          onClear: () => setEntries([]),
          onQuit: () => exit(),
        };
        setInput('');
        setEntries((e) => [...e, { type: 'user', content: value }]);
        try {
          const result = await cmd.execute(args, slashContext);
          if (result) {
            setEntries((e) => [...e, { type: 'system', content: result }]);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setEntries((e) => [...e, { type: 'error', content: msg }]);
        }
        return;
      }
    }

    setInput('');
    setEntries((e) => [...e, { type: 'user', content: value }]);
    setIsStreaming(true);
    setStreamingText('');
    setActiveOperation(null);

    let responseText = '';

    try {
      await engineRef.current!.handleUserMessage(value, {
        onTextDelta: (text) => {
          responseText += text;
          setStreamingText(responseText);
        },
        onThinkingDelta: (_text) => {
          // Thinking is not displayed in The Grid
        },
        onToolStart: (id, name) => {
          // If there was streaming text before this tool call, flush it as a text entry
          if (responseText.trim()) {
            const captured = responseText;
            setEntries((e) => [...e, { type: 'text', content: captured }]);
            responseText = '';
            setStreamingText('');
          }
          toolStartTimesRef.current.set(id, Date.now());
          setActiveOperation({ name, startTime: Date.now() });
        },
        onToolEnd: (id, name, result) => {
          setActiveOperation(null);
          const startTime = toolStartTimesRef.current.get(id);
          const elapsed = startTime ? Date.now() - startTime : undefined;
          toolStartTimesRef.current.delete(id);

          const summary = summarizeToolResult(name, result);
          const entry: OperationEntryData = {
            type: 'tool',
            content: summary,
            toolName: name,
            elapsed,
          };

          setEntries((e) => [...e, entry]);
        },
        onMessageEnd: (usage) => {
          setTokenUsage(usage);
          setCostEstimate((c) => c + estimateCost(usage));
          if (contextWindowRef.current) {
            setContextPercent(contextWindowRef.current.getUsageSummary().percent);
          }
        },
        onCapabilitiesMatched: (matches: MatchResult[]) => {
          const names = matches.map((m) => m.capability.name).join(', ');
          setEntries((e) => [
            ...e,
            { type: 'system', content: `\u25b8 ${names} matched` },
          ]);
        },
        onCompaction: (result) => {
          setEntries((e) => [...e, {
            type: 'system',
            content: `[compaction] Summarized ${result.compactedMessageCount} messages, preserved ${result.preservedMessageCount}`,
          }]);
        },
        onError: (err) => {
          setEntries((e) => [...e, { type: 'error', content: err.message }]);
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setEntries((e) => [...e, { type: 'error', content: msg }]);
    }

    // Flush any remaining streamed text as a text entry
    if (responseText.trim()) {
      const finalText = responseText;
      setEntries((e) => [...e, { type: 'text', content: finalText }]);
    }

    setStreamingText('');
    setIsStreaming(false);
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Header
        modelName={config.model}
        tokenUsage={tokenUsage}
        costEstimate={costEstimate}
        contextPercent={contextPercent}
      />

      <OperationLog
        entries={entries}
        activeOperation={activeOperation}
        streamingText={isStreaming ? streamingText : undefined}
      />

      {pendingPermission && (
        <PermissionInline
          request={pendingPermission.request}
          onRespond={handlePermissionResponse}
        />
      )}

      <CommandInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={isStreaming || !!pendingPermission}
      />
    </Box>
  );
}
