// src/cli/app.tsx
import React, { useState } from 'react';
import { Box, Text, useApp } from 'ink';
import TextInput from 'ink-text-input';
import type { LLMProvider } from '../api/provider.js';
import type { Message } from '../api/types.js';

interface AppProps {
  provider: LLMProvider;
}

interface ChatEntry {
  role: 'user' | 'assistant';
  content: string;
}

export default function App({ provider }: AppProps) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [streaming, setStreaming] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const { exit } = useApp();

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

    const messages: Message[] = [
      ...history.map((e) => ({ role: e.role, content: e.content } as Message)),
      { role: 'user' as const, content: value },
    ];

    let responseText = '';

    try {
      for await (const event of provider.chat({
        messages,
        model: 'default',
        intent: 'chat',
      })) {
        if (event.type === 'text_delta') {
          responseText += event.text;
          setStreaming(responseText);
        }
      }
    } catch (err) {
      responseText = `Error: ${err instanceof Error ? err.message : String(err)}`;
    }

    setHistory((h) => [...h, { role: 'assistant', content: responseText }]);
    setStreaming('');
    setIsStreaming(false);
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">ArqZero</Text>
        <Text color="gray"> v0.1.0 | provider: {provider.name} | /quit to exit</Text>
      </Box>

      {history.map((entry, i) => (
        <Box key={i} flexDirection="column" marginBottom={1}>
          <Text color={entry.role === 'user' ? 'blue' : 'green'} bold>
            {entry.role === 'user' ? '> ' : ''}
          </Text>
          <Text>{entry.content}</Text>
        </Box>
      ))}

      {isStreaming && streaming && (
        <Box marginBottom={1}>
          <Text color="green">{streaming}</Text>
          <Text color="gray">{'\u258c'}</Text>
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
