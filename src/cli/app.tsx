// src/cli/app.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import { CheckpointStore } from '../checkpoints/store.js';
import { CronManager } from './cron.js';
import {
  Header,
  OperationLog,
  CommandInput,
  PermissionInline,
  TranscriptView,
  Footer,
} from './components/index.js';
import type { OperationEntryData } from './components/index.js';
import { useInputHistory } from './hooks/useInputHistory.js';
import { SlashSuggestions, filterSuggestions } from './components/SlashSuggestions.js';
import type { SlashSuggestion } from './components/SlashSuggestions.js';
import type { Message } from '../api/types.js';

interface AppProps {
  provider: LLMProvider;
  config: AppConfig;
  registry: ToolRegistry;
  systemPrompt?: string;
  commandRegistry?: SlashCommandRegistry;
  initialMessages?: Message[];
  resumedSessionId?: string;
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

function extractPath(input?: Record<string, unknown>): string {
  if (!input) return '';
  const p = (input.file_path ?? input.path ?? input.notebook_path ?? '') as string;
  // Show just filename or last 2 path segments
  const parts = p.replace(/\\/g, '/').split('/');
  return parts.length > 2 ? parts.slice(-2).join('/') : p;
}

function summarizeToolResult(name: string, result: ToolResult, input?: Record<string, unknown>): string {
  const content = result.content;
  const path = extractPath(input);

  switch (name) {
    case 'Read': {
      const lineCount = content.split('\n').length;
      return path ? `${path} (${lineCount} lines)` : `${lineCount} lines`;
    }
    case 'Write':
      return path ? `${path}` : 'file written';
    case 'Edit':
    case 'MultiEdit':
      return path ? `${path}` : 'file edited';
    case 'Bash': {
      const cmd = (input?.command as string) ?? '';
      const short = cmd.length > 60 ? cmd.slice(0, 57) + '...' : cmd;
      return short || '(command)';
    }
    case 'Glob': {
      const pattern = (input?.pattern as string) ?? '';
      const lines = content.trim().split('\n').filter(Boolean);
      return pattern ? `${pattern} → ${lines.length} files` : `${lines.length} files`;
    }
    case 'Grep': {
      const pattern = (input?.pattern as string) ?? '';
      const lines = content.trim().split('\n').filter(Boolean);
      return pattern ? `"${pattern}" → ${lines.length} matches` : `${lines.length} matches`;
    }
    case 'LS': {
      const lines = content.trim().split('\n').filter(Boolean);
      return path ? `${path} (${lines.length} entries)` : `${lines.length} entries`;
    }
    case 'WebSearch':
      return (input?.query as string) ?? 'search';
    case 'WebFetch':
      return (input?.url as string)?.slice(0, 50) ?? 'fetch';
    case 'Dispatch':
      return (input?.description as string) ?? 'sub-agent';
    case 'NotebookRead':
      return path || 'notebook';
    case 'NotebookEdit':
      return path || 'notebook edited';
    case 'TodoWrite':
      return 'tasks updated';
    case 'TodoRead':
      return 'tasks';
    default:
      return content.length > 60 ? content.slice(0, 57) + '...' : content;
  }
}

export default function App({ provider, config, registry, systemPrompt, commandRegistry, initialMessages, resumedSessionId }: AppProps) {
  const [input, setInput] = useState('');
  const [entries, setEntries] = useState<OperationEntryData[]>([]);
  const [modelName, setModelName] = useState(config.model);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeOperation, setActiveOperation] = useState<{ name: string; startTime: number } | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const [costEstimate, setCostEstimate] = useState(0);
  const [contextPercent, setContextPercent] = useState(0);
  const [pendingPermission, setPendingPermission] = useState<PendingPermission | null>(null);
  const [transcriptMode, setTranscriptMode] = useState(false);
  const [expandedView, setExpandedView] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const { exit } = useApp();
  const history = useInputHistory();

  // Build suggestion list from registered commands
  const allCommands: SlashSuggestion[] = React.useMemo(() => {
    if (!commandRegistry) return [];
    return commandRegistry.getAll().map((c) => ({ name: c.name, description: c.description }));
  }, [commandRegistry]);

  // Filter suggestions based on current input
  const suggestions = React.useMemo(() => {
    if (!input.startsWith('/') || isStreaming || !!pendingPermission) return [];
    return filterSuggestions(input, allCommands);
  }, [input, allCommands, isStreaming, pendingPermission]);

  const showSuggestions = suggestions.length > 0 && input.startsWith('/') && !isStreaming;

  const engineRef = useRef<ConversationEngine | null>(null);
  const contextWindowRef = useRef<ContextWindow | null>(null);
  const toolStartTimesRef = useRef<Map<string, number>>(new Map());
  const checkpointStoreRef = useRef<CheckpointStore | null>(null);
  const cronManagerRef = useRef<CronManager | null>(null);

  const sessionRef = useRef<Session | null>(null);

  if (!engineRef.current) {
    const permissionManager = new PermissionManager(config.permissions);
    const session = resumedSessionId ? new Session(resumedSessionId) : new Session();
    sessionRef.current = session;
    const contextWindow = new ContextWindow();
    contextWindowRef.current = contextWindow;
    const checkpointStore = new CheckpointStore();
    checkpointStoreRef.current = checkpointStore;
    const cronManager = new CronManager();
    cronManagerRef.current = cronManager;
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
      checkpointStore,
    });

    // Load initial messages for session resume
    if (initialMessages && initialMessages.length > 0) {
      engineRef.current.setMessages(initialMessages);
    }
  }

  // Show welcome / resume message once on mount (avoid setState during render)
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setEntries((e) => [
        ...e,
        {
          type: 'system' as const,
          content: `Resumed session ${sessionRef.current!.id} (${initialMessages.length} messages)`,
        },
      ]);
    } else {
      setEntries((e) => [
        ...e,
        {
          type: 'system' as const,
          content: `ArqZero v2.0.0\n  Type a message to start. Use /help for commands.`,
        },
      ]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePermissionResponse = useCallback((response: PermissionResponse) => {
    if (pendingPermission) {
      pendingPermission.resolve(response);
      setPendingPermission(null);
    }
  }, [pendingPermission]);

  useInput((_input, key) => {
    if (key.ctrl && _input === 'c') {
      engineRef.current?.abort();
      cronManagerRef.current?.stopAll();
      exit();
    }

    // Ctrl+L: clear entries
    if (key.ctrl && _input === 'l') {
      setEntries([]);
      return;
    }

    // Ctrl+O: cycle view (normal → expanded → transcript → normal)
    if (key.ctrl && _input === 'o') {
      if (!transcriptMode && !expandedView) {
        setExpandedView(true);
      } else if (expandedView && !transcriptMode) {
        setExpandedView(false);
        setTranscriptMode(true);
      } else {
        setTranscriptMode(false);
        setExpandedView(false);
      }
      return;
    }

    // Ctrl+J: insert newline (multi-line input)
    if (key.ctrl && _input === 'j' && !isStreaming && !pendingPermission) {
      setInput((v) => v + '\n');
      return;
    }

    // Escape: abort streaming, collapse expanded, or clear input
    if (key.escape) {
      if (isStreaming) {
        engineRef.current?.abort();
        setIsStreaming(false);
        setActiveOperation(null);
        setStreamingText('');
        setEntries((e) => [...e, { type: 'system', content: '(interrupted)' }]);
      } else if (expandedView) {
        setExpandedView(false);
      } else if (transcriptMode) {
        setTranscriptMode(false);
      } else {
        setInput('');
      }
      return;
    }

    // When suggestions are showing, arrow keys navigate them
    if (showSuggestions) {
      if (key.upArrow) {
        setSuggestionIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setSuggestionIndex((i) => Math.min(suggestions.length - 1, i + 1));
        return;
      }
      // Tab: accept selected suggestion
      if (key.tab) {
        const selected = suggestions[suggestionIndex];
        if (selected) {
          setInput(selected.name + ' ');
          setSuggestionIndex(0);
        }
        return;
      }
    } else {
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
    }
  });

  const handleSubmitImpl = async (value: string) => {
    // If suggestions are visible, execute the selected command
    if (showSuggestions && suggestions.length > 0) {
      const selected = suggestions[suggestionIndex];
      if (selected) {
        value = selected.name;
        setInput('');
        setSuggestionIndex(0);
      }
    }

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
          checkpointStore: checkpointStoreRef.current ?? undefined,
          contextWindow: contextWindowRef.current ?? undefined,
          toolRegistry: registry,
          tokenUsage: tokenUsage ? { inputTokens: tokenUsage.inputTokens, outputTokens: tokenUsage.outputTokens } : undefined,
          costEstimate,
          messages: engineRef.current?.getMessages(),
          cronManager: cronManagerRef.current ?? undefined,
          onModelChange: (m: string) => { config.model = m; setModelName(m); },
          onClear: () => setEntries([]),
          onCompact: () => {
            setEntries((e) => [...e, { type: 'system', content: 'Manual compaction triggered.' }]);
          },
          onQuit: () => {
            cronManagerRef.current?.stopAll();
            exit();
          },
          onSubmit: async (prompt: string) => {
            await handleSubmitRef.current(prompt);
          },
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
        onToolEnd: (id, name, result, toolInput) => {
          setActiveOperation(null);
          const startTime = toolStartTimesRef.current.get(id);
          const elapsed = startTime ? Date.now() - startTime : undefined;
          toolStartTimesRef.current.delete(id);

          const summary = summarizeToolResult(name, result, toolInput);
          const entry: OperationEntryData = {
            type: 'tool',
            content: summary,
            toolName: name,
            elapsed,
          };

          // Attach diff metadata from Edit/Write tools
          if (result.metadata) {
            entry.filePath = result.metadata.filePath;
            entry.oldContent = result.metadata.oldContent;
            entry.newContent = result.metadata.newContent;
            entry.diffOperation = result.metadata.diffOperation;
          }

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

  const handleSubmitRef = useRef(handleSubmitImpl);
  handleSubmitRef.current = handleSubmitImpl;
  const stableHandleSubmit = useCallback((v: string) => handleSubmitRef.current(v), []);

  return (
    <Box flexDirection="column" padding={1}>
      <Header
        modelName={modelName}
        tokenUsage={tokenUsage}
        costEstimate={costEstimate}
        contextPercent={contextPercent}
      />

      {transcriptMode ? (
        <TranscriptView messages={engineRef.current?.getMessages() ?? []} />
      ) : (
        <OperationLog
          entries={entries}
          activeOperation={activeOperation}
          streamingText={isStreaming ? streamingText : undefined}
          expanded={expandedView}
        />
      )}

      {pendingPermission && (
        <PermissionInline
          request={pendingPermission.request}
          onRespond={handlePermissionResponse}
        />
      )}

      <CommandInput
        value={input}
        onChange={(v) => { setInput(v); setSuggestionIndex(0); }}
        onSubmit={stableHandleSubmit}
        disabled={isStreaming || !!pendingPermission}
      />

      <SlashSuggestions
        suggestions={suggestions}
        selectedIndex={suggestionIndex}
        visible={showSuggestions}
      />

      <Footer
        isStreaming={isStreaming}
        transcriptMode={transcriptMode}
        expandedView={expandedView}
        sessionId={sessionRef.current?.id}
      />
    </Box>
  );
}
