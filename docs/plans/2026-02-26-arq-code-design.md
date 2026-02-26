# ArqZero Design Document

**Date:** 2026-02-26
**Status:** Approved
**Author:** prana

## Overview

ArqZero is a TypeScript/Node.js CLI tool that replicates Claude Code's full feature set — interactive REPL with tool use, permission system, MCP support, and skills/plugins — powered by Claude via Cursor's internal chat API, distributed via npm, for personal/team use.

## Architecture: Monolithic with Clean Interfaces

Single package, clear internal module boundaries. Every module exports a TypeScript interface. Modules communicate through interfaces, never by reaching into sibling internals. Extraction to separate packages later becomes copy-paste, not surgery.

### Project Structure

```
arqzero/
├── src/
│   ├── cli/                 # Terminal UI & REPL
│   │   ├── renderer.ts           # Ink-based terminal rendering
│   │   ├── input.ts               # User input handling
│   │   ├── commands.ts            # Slash command dispatcher
│   │   └── spinner.ts             # Status indicators
│   ├── core/                # Conversation engine
│   │   ├── engine.ts              # Main message loop
│   │   ├── message.ts             # Message types & formatting
│   │   └── compaction.ts          # Context window compaction
│   ├── session/             # State management
│   │   ├── session.ts             # Session lifecycle
│   │   ├── context.ts             # Context window tracking
│   │   └── history.ts             # Conversation persistence (compacted snapshots)
│   ├── api/                 # LLM provider adapter
│   │   ├── provider.ts            # Provider-agnostic interface (stable forever)
│   │   ├── types.ts               # StreamEvent, ChatRequest, etc.
│   │   ├── cursor/
│   │   │   ├── adapter.ts         # Implements LLMProvider via Cursor internal API
│   │   │   ├── protobuf/
│   │   │   │   ├── schemas/       # .proto files from reverse engineering
│   │   │   │   ├── generated/     # protoc output (gitignored, built on install)
│   │   │   │   └── codegen.ts     # Build script for proto compilation
│   │   │   ├── checksum.ts        # Jyh cipher (timestamp XOR + machine ID)
│   │   │   ├── auth.ts            # Token extraction from Cursor's SQLite DB
│   │   │   ├── stream-decoder.ts  # ConnectRPC envelope -> StreamEvent
│   │   │   └── headers.ts        # Required headers assembly
│   │   ├── anthropic/
│   │   │   └── adapter.ts         # Thin wrapper around @anthropic-ai/sdk (fallback)
│   │   └── mock/
│   │       └── adapter.ts         # Canned responses for testing
│   ├── tools/               # Tool system
│   │   ├── registry.ts            # Tool registry (self-registration pattern)
│   │   ├── types.ts               # Tool interface contract
│   │   ├── executor.ts            # Tool execution + result formatting
│   │   └── builtins/
│   │       ├── index.ts           # Barrel file — explicit imports of all builtins
│   │       ├── read.ts
│   │       ├── write.ts
│   │       ├── edit.ts
│   │       ├── glob.ts
│   │       ├── grep.ts
│   │       ├── bash.ts
│   │       ├── web-search.ts
│   │       ├── web-fetch.ts
│   │       └── ask-user.ts
│   ├── permissions/         # Permission system
│   │   ├── manager.ts            # Permission checks & prompts
│   │   ├── escalation.ts         # Dynamic escalation (ask -> dangerous)
│   │   ├── rules.ts              # Permission rule definitions
│   │   └── config.ts             # User permission preferences
│   ├── mcp/                 # MCP client
│   │   ├── client.ts             # MCP protocol client
│   │   ├── transport.ts          # stdio/SSE transports
│   │   └── bridge.ts             # MCP tool -> arq tool bridge
│   ├── skills/              # Skills/plugin system
│   │   ├── loader.ts             # Skill discovery & loading
│   │   ├── parser.ts             # Skill file parsing
│   │   └── commands.ts           # Slash command registration
│   ├── config/              # Configuration management
│   │   ├── schema.ts             # Zod schema for ~/.arqzero/config.json
│   │   ├── loader.ts             # Reads, validates, merges with env vars
│   │   └── init.ts               # First-run config initialization flow
│   └── system/              # Cross-platform utilities
│       └── machine-id.ts         # Machine ID extraction (Win/Mac/Linux)
├── bin/
│   └── arq.ts               # Entry point
├── package.json
└── tsconfig.json
```

## Section 1: API Adapter Layer

### Provider Interface

```typescript
// api/provider.ts
interface LLMProvider {
  chat(params: ChatRequest): AsyncIterable<StreamEvent>;
  abort(): void;
  isAvailable(): Promise<boolean>;
}

// api/types.ts
interface ChatRequest {
  messages: Message[];
  model: string;
  tools?: ToolDefinition[];
  maxTokens?: number;
  systemPrompt?: string;
  intent: 'chat' | 'summarize';  // routes model selection for compaction
}

type StreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'thinking_delta'; text: string }    // extended thinking (Opus)
  | { type: 'tool_use_start'; id: string; name: string }
  | { type: 'tool_use_delta'; id: string; input: string }
  | { type: 'tool_use_end'; id: string }
  | { type: 'message_end'; usage: TokenUsage }
  | { type: 'error'; error: Error };
```

### Cursor Adapter Flow

```
adapter.chat() called
  -> auth.ts reads token from Cursor SQLite DB (cross-platform paths)
  -> checksum.ts generates x-cursor-checksum via jyh cipher
     (uses system/machine-id.ts for machine ID)
  -> headers.ts assembles full header set
  -> Serialize to protobuf (envelope: [type:1][len:4BE][payload])
  -> HTTP/2 POST to agentn.api5.cursor.sh/aiserver.v1.ChatService/StreamUnifiedChatWithTools
  -> stream-decoder.ts reads ConnectRPC frames
     - Handles compressed frames (flag 0x01, gzip)
     - Handles trailer frames (flag 0x02, end-of-stream metadata)
     - Handles partial frames across TCP chunk boundaries
  -> Yields provider-agnostic StreamEvent objects
```

### Cursor SQLite Paths

```
Windows: %APPDATA%\Cursor\User\globalStorage\state.vscdb
macOS:   ~/Library/Application Support/Cursor/User/globalStorage/state.vscdb
Linux:   ~/.config/Cursor/User/globalStorage/state.vscdb
```

Keys: `cursorAuth/accessToken` and `storage.serviceMachineId`

### Risk Mitigation

1. **Version pinning** — `headers.ts` tracks which `x-cursor-client-version` works
2. **Automatic fallback** — 3 consecutive auth errors prompts: "Switch to Anthropic direct?"
3. **Health check on startup** — `isAvailable()` checks Cursor installation + pings endpoint
4. **Proto schema isolation** — update schemas, regenerate, nothing else changes
5. **Auth token refresh** — re-reads from SQLite on 401, not just at startup

### Anthropic Fallback

Thin wrapper around `@anthropic-ai/sdk`. One config change and you're running direct. Safety net for when Cursor API breaks.

## Section 2: Tool System

### Tool Interface

```typescript
// tools/types.ts
interface Tool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  permissionLevel: PermissionLevel;
  execute(input: unknown, ctx: ToolContext): Promise<ToolResult>;
}

interface ToolContext {
  cwd: string;
  session: Session;
  permissions: PermissionManager;
  config: AppConfig;
  promptUser: (request: PermissionRequest) => Promise<PermissionResponse>;
  // ^ callback for ask-user.ts — no direct CLI import
}

interface ToolResult {
  content: string;
  isError?: boolean;
  display?: {
    language?: string;     // syntax highlighting hint
    truncated?: boolean;   // renderer shows "...N lines hidden"
    lineCount?: number;
  };
}

type PermissionLevel = 'safe' | 'ask' | 'dangerous';
```

### Registry Pattern

- `ToolRegistry` class with `register()`, `get()`, `getDefinitions()`
- Tools self-register at import time
- `tools/builtins/index.ts` barrel file explicitly imports all builtins — single import for engine.ts
- No magic discovery, no subtle "tool doesn't exist because file wasn't imported" bugs

### Built-in Tools

| Tool | Permission | Notes |
|------|-----------|-------|
| Read | safe | Line numbers, offset/limit, image support |
| Write | ask | File creation/overwrite |
| Edit | ask | String replacement (old_string -> new_string) |
| Glob | safe | Fast file pattern matching |
| Grep | safe | Ripgrep-powered content search |
| Bash | ask (escalates) | Separate stdout/stderr, timeout, interactive process detection + rejection |
| WebSearch | ask | Web search integration |
| WebFetch | ask | URL fetching + content extraction |
| AskUser | safe | Suspends execution via ToolContext callback |

### bash.ts Special Considerations

```typescript
interface BashInput {
  command: string;
  timeout?: number;     // default 30s, max configurable
  cwd?: string;         // override session cwd
}

interface BashResult extends ToolResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

- Detects interactive processes (vim, ssh, python REPL) and rejects with error
- Separate stdout/stderr — combined output loses signal
- Configurable timeout with hard max from config

### MCP Tool Bridge

MCP tools register into the same `ToolRegistry` as builtins via `mcp/bridge.ts`:

- Namespaced as `mcp__<server>__<toolname>` (matches Claude Code convention)
- Default permission level: `ask` (conservative)
- To the LLM, indistinguishable from builtins

## Section 3: Permission System

### Dynamic Escalation

Permission isn't just the tool — it's the **input**. Bash is `ask` by default but specific commands escalate to `dangerous`:

```typescript
const DANGEROUS_PATTERNS = [
  /rm\s+(-rf|--recursive)/,
  /git\s+push\s+--force/,
  /git\s+reset\s+--hard/,
  /DROP\s+(TABLE|DATABASE)/i,
  /mkfs|fdisk/,
  /dd\s+if=.*\s+of=(?!\/dev\/null)/,  // dd writing to real devices, not /dev/null
];
```

Note: `/dev/null` redirection (`2>/dev/null`) is NOT flagged — it's common and harmless.

### User Response Options

- **[A] Allow** — execute this one time
- **[D] Deny** — skip, return error to LLM
- **[S] Always allow** — for this tool, never ask again this session
- **[T] Trust pattern** — always allow "git commit" but still ask "git push"

### Config-Level Defaults

```jsonc
// ~/.arqzero/config.json
{
  "permissions": {
    "defaultMode": "ask",
    "alwaysAllow": ["Read", "Glob", "Grep"],
    "alwaysDeny": [],
    "trustedPatterns": {
      "Bash": ["npm test", "npm run *", "git status", "git diff"]
    }
  }
}
```

Config is the floor, session choices override upward.

## Section 4: Session & Context Management

### Context Window

- Tracks token count per message
- Triggers compaction at 85% capacity
- Compaction summarizes old messages via LLM call using `intent: 'summarize'` on ChatRequest (routes model selection through provider)
- Recent messages (~20% of context) preserved verbatim

### Session Persistence

```
~/.arqzero/sessions/{session-id}.jsonl
```

JSONL format, append-only. Stores **compacted snapshots**, not raw message replay — so resuming a long session starts from the last compaction point, not at 80% capacity.

### Session Resume

`history.ts` stores the compacted summary state. Resume loads:
1. System prompt
2. Last compaction summary
3. Messages since last compaction

## Section 5: CLI & REPL

### Ink-Based Rendering

```
<App>
  <StatusBar model={model} tokens={usage} />
  <MessageList messages={messages} />
  <ToolExecutionIndicator activeTool={currentTool} />
  <InputPrompt onSubmit={handleInput} />
  <PermissionPrompt pending={permissionRequest} />
</App>
```

### Slash Commands

`/help`, `/model`, `/clear`, `/compact`, `/config`, `/quit`, `/skill`

Registered via the same registry pattern as tools.

## Section 6: Skills & Plugin System

### Skill Structure

```
~/.arqzero/skills/<skill-name>/
  ├── skill.json    # metadata + trigger rules + slash command
  └── prompt.md     # content injected into context when triggered
```

### MCP Server Config

```jsonc
// ~/.arqzero/config.json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "..." }
    }
  }
}
```

Spawned at startup, tools discovered and registered through `mcp/bridge.ts`.

## Section 7: First-Run Experience

`config/init.ts` runs when no `~/.arqzero/config.json` exists:

1. Detect Cursor installation — check SQLite path exists
2. If found: validate token is readable, set Cursor as default provider
3. If not found: prompt for Anthropic API key
4. Write initial config with sensible defaults
5. Create `~/.arqzero/sessions/` and `~/.arqzero/skills/` directories

Built in step 1, not as polish.

## Build Order

1. **API adapter + streaming REPL + config init** — talking terminal with first-run flow
2. **Tool registry + Read/Write/Edit/Bash/Glob/Grep** — core utility loop
3. **Permission system** — stub early, flesh out with escalation
4. **Session management + compaction** — context window handling
5. **MCP client + bridge** — external tool integration
6. **Skills/plugin loader** — extensibility
7. **Polish** — full Ink UI, all slash commands, WebSearch/WebFetch tools

## Key Dependencies

- `ink` + `react` — terminal UI
- `@anthropic-ai/sdk` — Anthropic fallback adapter
- `@connectrpc/connect` — ConnectRPC for Cursor adapter
- `@bufbuild/protobuf` — protobuf serialization
- `better-sqlite3` — reading Cursor's auth token
- `zod` — config schema validation
- `@anthropic-ai/sdk` — Anthropic messages API (fallback)
- `glob` / `fast-glob` — file pattern matching
- `@vscode/ripgrep` — content search (grep tool)

## V1 Exclusions (Intentional)

- Tool search / deferred loading — all tools loaded at startup
- Tool-specific UI rendering — tools return plain text
- Tool parallelism — sequential execution in v1
- Hooks system — no pre/post tool execution hooks
- Memory system — no persistent auto-memory across sessions
