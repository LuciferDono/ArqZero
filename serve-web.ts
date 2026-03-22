#!/usr/bin/env tsx
import http from 'node:http';
import { URL } from 'node:url';
import { FireworksAdapter } from './src/api/fireworks/adapter.js';
import { MockAdapter } from './src/api/mock/adapter.js';
import { loadConfig, configExists } from './src/config/loader.js';
import { ToolRegistry } from './src/tools/registry.js';
import { builtinTools } from './src/tools/builtins/index.js';
import { ConversationEngine } from './src/core/engine.js';
import { buildSystemPrompt } from './src/core/system-prompt.js';
import { Session } from './src/session/session.js';
import { ContextWindow } from './src/session/context.js';
import { PermissionManager } from './src/permissions/manager.js';
import type { Message } from './src/api/types.js';

const PORT = parseInt(process.env.PORT ?? '7681');

// Initialize
const config = loadConfig();
const provider = config.fireworksApiKey
  ? new FireworksAdapter(config.fireworksApiKey)
  : new MockAdapter();
const registry = new ToolRegistry();
for (const tool of builtinTools) registry.register(tool);
const systemPrompt = buildSystemPrompt(process.cwd());

// Per-session engines (simple map, no auth)
const sessions = new Map<string, ConversationEngine>();

function getEngine(sessionId: string): ConversationEngine {
  if (!sessions.has(sessionId)) {
    const session = new Session();
    const contextWindow = new ContextWindow();
    const permissionManager = new PermissionManager(config.permissions);
    sessions.set(sessionId, new ConversationEngine({
      provider,
      registry,
      model: config.model,
      systemPrompt,
      maxTokens: config.maxTokens,
      toolContext: {
        cwd: process.cwd(),
        config,
        promptUser: async () => ({ allowed: true }), // auto-approve for web
      },
      permissions: permissionManager,
      session,
      contextWindow,
    }));
  }
  return sessions.get(sessionId)!;
}

// HTML page — inline everything, no external deps
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ArqZero</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #1a1a1a;
    color: #D4D4D4;
    font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
  #header {
    padding: 16px 24px;
    border-bottom: 1px solid #374151;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  #header .brand {
    color: #00D4AA;
    font-weight: bold;
    font-size: 18px;
  }
  #header .info {
    color: #6B7280;
    font-size: 13px;
  }
  #messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px 24px;
  }
  .msg {
    margin-bottom: 16px;
    line-height: 1.6;
  }
  .msg.user {
    color: #00D4AA;
  }
  .msg.user::before {
    content: '> ';
    font-weight: bold;
  }
  .msg.assistant {
    color: #D4D4D4;
  }
  .msg.assistant pre {
    background: #0d1117;
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 8px 0;
    border-left: 3px solid #00D4AA;
  }
  .msg.assistant code {
    font-size: 13px;
  }
  .msg.tool {
    color: #4A7CF0;
    font-size: 13px;
    padding-left: 16px;
    border-left: 2px solid #374151;
  }
  .msg.system {
    color: #6B7280;
    font-size: 13px;
    font-style: italic;
  }
  .msg.error {
    color: #D04545;
  }
  #input-area {
    padding: 16px 24px;
    border-top: 1px solid #374151;
    display: flex;
    gap: 12px;
  }
  #input-area input {
    flex: 1;
    background: #0d1117;
    border: 1px solid #374151;
    color: #D4D4D4;
    padding: 12px 16px;
    font-family: inherit;
    font-size: 14px;
    border-radius: 6px;
    outline: none;
  }
  #input-area input:focus {
    border-color: #00D4AA;
  }
  #input-area button {
    background: #00D4AA;
    color: #1a1a1a;
    border: none;
    padding: 12px 24px;
    font-family: inherit;
    font-weight: bold;
    font-size: 14px;
    border-radius: 6px;
    cursor: pointer;
  }
  #input-area button:hover {
    background: #4EECD0;
  }
  #input-area button:disabled {
    background: #374151;
    color: #6B7280;
    cursor: not-allowed;
  }
  .typing {
    color: #00D4AA;
    animation: pulse 1.5s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
</style>
</head>
<body>
<div id="header">
  <span class="brand">&#9670; ArqZero</span>
  <span class="info">autonomous code agent</span>
</div>
<div id="messages"></div>
<div id="input-area">
  <input id="prompt" type="text" placeholder="Type a message..." autofocus />
  <button id="send" onclick="sendMessage()">Send</button>
</div>
<script>
const sessionId = crypto.randomUUID();
const messages = document.getElementById('messages');
const input = document.getElementById('prompt');
const btn = document.getElementById('send');
let sending = false;

function addMsg(cls, text) {
  const div = document.createElement('div');
  div.className = 'msg ' + cls;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return div;
}

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !sending) sendMessage();
});

async function sendMessage() {
  const text = input.value.trim();
  if (!text || sending) return;
  sending = true;
  btn.disabled = true;
  input.value = '';
  addMsg('user', text);
  const el = addMsg('assistant typing', '...');

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, sessionId }),
    });

    if (!res.ok) {
      el.className = 'msg error';
      el.textContent = 'Error: ' + res.statusText;
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    el.className = 'msg assistant';
    el.textContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'text') {
              el.textContent += data.content;
            } else if (data.type === 'tool') {
              const toolEl = addMsg('tool', '● ' + data.name + ' ' + data.content);
            } else if (data.type === 'done') {
              // done
            } else if (data.type === 'error') {
              el.className = 'msg error';
              el.textContent = data.content;
            }
          } catch {}
        }
      }
      messages.scrollTop = messages.scrollHeight;
    }
  } catch (err) {
    el.className = 'msg error';
    el.textContent = 'Connection error: ' + err.message;
  } finally {
    sending = false;
    btn.disabled = false;
    input.focus();
  }
}

// Welcome
addMsg('system', 'ArqZero v2.0.0 — Type a message to start.');
</script>
</body>
</html>`;

// HTTP server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  // Serve HTML
  if (url.pathname === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(HTML);
    return;
  }

  // Chat API (SSE)
  if (url.pathname === '/api/chat' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;

    let parsed: { message: string; sessionId: string };
    try {
      parsed = JSON.parse(body);
    } catch {
      res.writeHead(400);
      res.end('Invalid JSON');
      return;
    }

    const { message, sessionId } = parsed;
    if (!message) {
      res.writeHead(400);
      res.end('Missing message');
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    const engine = getEngine(sessionId);

    try {
      await engine.handleUserMessage(message, {
        onTextDelta: (text) => {
          res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
        },
        onToolStart: (_id, name) => {
          res.write(`data: ${JSON.stringify({ type: 'tool', name, content: 'running...' })}\n\n`);
        },
        onToolEnd: (_id, name, result) => {
          const summary = result.content.length > 100 ? result.content.slice(0, 97) + '...' : result.content;
          res.write(`data: ${JSON.stringify({ type: 'tool', name, content: summary })}\n\n`);
        },
        onError: (err) => {
          res.write(`data: ${JSON.stringify({ type: 'error', content: err.message })}\n\n`);
        },
      });
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', content: err.message ?? 'Unknown error' })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
    return;
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n  ArqZero web interface running at http://localhost:${PORT}`);
  console.log(`\n  To share with friends, run in another terminal:`);
  console.log(`    cloudflared tunnel --url http://localhost:${PORT}`);
  console.log(`\n  Then share the https://....trycloudflare.com URL\n`);
});
