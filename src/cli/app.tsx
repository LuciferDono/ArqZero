// src/cli/app.tsx
import React, { useState, useRef } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { LLMProvider } from '../api/provider.js';
import type { TokenUsage } from '../api/types.js';
import type { AppConfig } from '../config/schema.js';
import type { ToolRegistry } from '../tools/registry.js';
import type { ToolContext } from '../tools/types.js';
import { ConversationEngine } from '../core/engine.js';
import { PermissionManager } from '../permissions/manager.js';
import { Session } from '../session/session.js';
import { ContextWindow } from '../session/context.js';

interface AppProps {
  provider: LLMProvider;
  config: AppConfig;
  registry: ToolRegistry;
}

interface ChatEntry {
  role: 'user' | 'assistant';
  content: string;
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
        // TODO: Show actual permission UI prompt (Phase 8 polish)
        // For now, auto-approve in the UI layer
        return { allowed: true };
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

  const usageText = tokenUsage
    ? ` | tokens: ${tokenUsage.inputTokens}in/${tokenUsage.outputTokens}out`
    : '';
  const contextText = contextPercent > 0 ? ` | ctx: ${contextPercent}%` : '';

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">ArqZero</Text>
        <Text color="gray"> v0.1.0 | provider: {provider.name}{usageText}{contextText} | /quit to exit</Text>
      </Box>

      {history.map((entry, i) => (
        <Box key={i} flexDirection="column" marginBottom={1}>
          <Text color={entry.role === 'user' ? 'blue' : 'green'} bold>
            {entry.role === 'user' ? '> ' : ''}
          </Text>
          <Text>{entry.content}</Text>
        </Box>
      ))}

      {isStreaming && thinking && !streaming && (
        <Box marginBottom={1}>
          <Text color="magenta">Thinking...</Text>
        </Box>
      )}

      {isStreaming && activeTool && (
        <Box marginBottom={1}>
          <Text color="yellow">Running {activeTool}...</Text>
        </Box>
      )}

      {isStreaming && streaming && (
        <Box marginBottom={1}>
          <Text color="green">{streaming}</Text>
          <Text color="gray">{'\u258c'}</Text>
        </Box>
      )}

      {errorMsg && (
        <Box marginBottom={1}>
          <Text color="red">Error: {errorMsg}</Text>
        </Box>
      )}

      {!isStreaming && (
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
