// src/cli/app.tsx
import React, { useState, useRef, useCallback } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { LLMProvider } from '../api/provider.js';
import type { TokenUsage } from '../api/types.js';
import type { AppConfig } from '../config/schema.js';
import type { ToolRegistry } from '../tools/registry.js';
import type { ToolContext, PermissionRequest, PermissionResponse } from '../tools/types.js';
import { ConversationEngine } from '../core/engine.js';
import { PermissionManager } from '../permissions/manager.js';
import { Session } from '../session/session.js';
import { ContextWindow } from '../session/context.js';
import {
  StatusBar,
  MessageList,
  ToolIndicator,
  PermissionPrompt,
} from './components/index.js';
import type { ChatEntry } from './components/index.js';

interface AppProps {
  provider: LLMProvider;
  config: AppConfig;
  registry: ToolRegistry;
}

interface PendingPermission {
  request: PermissionRequest;
  resolve: (response: PermissionResponse) => void;
}

export default function App({ provider, config, registry }: AppProps) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [streaming, setStreaming] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [thinking, setThinking] = useState('');
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [contextPercent, setContextPercent] = useState(0);
  const [pendingPermission, setPendingPermission] = useState<PendingPermission | null>(null);
  const { exit } = useApp();

  const engineRef = useRef<ConversationEngine | null>(null);
  const contextWindowRef = useRef<ContextWindow | null>(null);
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
  });

  const handleSubmit = async (value: string) => {
    if (!value.trim()) return;

    if (value === '/quit' || value === '/exit') {
      exit();
      return;
    }

    setInput('');
    setHistory((h) => [...h, { role: 'user', content: value }]);
    setIsStreaming(true);
    setStreaming('');
    setThinking('');
    setErrorMsg(null);
    setActiveTool(null);

    let responseText = '';

    try {
      await engineRef.current!.handleUserMessage(value, {
        onTextDelta: (text) => {
          responseText += text;
          setStreaming(responseText);
        },
        onThinkingDelta: (text) => {
          setThinking((t) => t + text);
        },
        onToolStart: (_id, name) => {
          setActiveTool(name);
        },
        onToolEnd: (_id, _name, _result) => {
          setActiveTool(null);
        },
        onMessageEnd: (usage) => {
          setTokenUsage(usage);
          if (contextWindowRef.current) {
            setContextPercent(contextWindowRef.current.getUsageSummary().percent);
          }
        },
        onCompaction: (result) => {
          console.log(
            `[compaction] Summarized ${result.compactedMessageCount} messages, ` +
            `preserved ${result.preservedMessageCount}`,
          );
        },
        onError: (err) => {
          setErrorMsg(err.message);
        },
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }

    // Derive display entries from the engine's internal message history
    const msgs = engineRef.current!.getMessages();
    const displayEntries: ChatEntry[] = [];
    for (const msg of msgs) {
      if (msg.role === 'user' && typeof msg.content === 'string') {
        displayEntries.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'assistant') {
        const text =
          typeof msg.content === 'string'
            ? msg.content
            : (msg.content as any[])
                .filter((b: any) => b.type === 'text')
                .map((b: any) => b.text)
                .join('');
        if (text) displayEntries.push({ role: 'assistant', content: text });
      }
    }
    setHistory(displayEntries);
    setStreaming('');
    setIsStreaming(false);
  };

  return (
    <Box flexDirection="column" padding={1}>
      <StatusBar
        modelName={config.model}
        providerName={provider.name}
        messageCount={history.length}
        tokenUsage={tokenUsage}
        contextPercent={contextPercent}
      />

      <MessageList
        messages={history}
        streamingText={streaming}
        thinkingText={thinking}
        isStreaming={isStreaming}
      />

      <ToolIndicator toolName={activeTool} />

      {pendingPermission && (
        <PermissionPrompt
          request={pendingPermission.request}
          onRespond={handlePermissionResponse}
        />
      )}

      {errorMsg && (
        <Box marginBottom={1}>
          <Text color="red">Error: {errorMsg}</Text>
        </Box>
      )}

      {!isStreaming && !pendingPermission && (
        <Box>
          <Text color="blue" bold>{'> '}</Text>
          <TextInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            placeholder="Type a message..."
          />
        </Box>
      )}
    </Box>
  );
}
