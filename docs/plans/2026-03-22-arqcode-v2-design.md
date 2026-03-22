# ArqCode v2 Design — Unique TUI Agent on Fireworks AI

**Goal:** Transform ArqCode from a Claude Code clone into a distinctive TUI coding agent with its own identity, powered by Fireworks AI.

**Principles:**
1. **Not a chatbot** — ArqCode is a *command center*, not a messenger app
2. **Terminal-native** — draws from lazygit/btop/k9s aesthetic, not web chat UIs
3. **Fireworks-first** — OpenAI-compatible API, single clean provider

---

## Part 1: Fireworks API Provider

Replace Cursor + Anthropic adapters with a single Fireworks provider using the `openai` npm package.

### Architecture

```
src/api/
├── provider.ts          # LLMProvider interface (keep)
├── types.ts             # StreamEvent, ChatRequest, Message (keep, adapt)
├── fireworks/
│   └── adapter.ts       # OpenAI SDK with baseURL override
└── mock/
    └── adapter.ts       # Keep for testing
```

**Remove:** `src/api/anthropic/`, `src/api/cursor/` (entire directories)

### Fireworks Adapter

```typescript
import OpenAI from 'openai';

export class FireworksAdapter implements LLMProvider {
  name = 'fireworks';
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      baseURL: 'https://api.fireworks.ai/inference/v1',
      apiKey,
    });
  }

  async *chat(request: ChatRequest): AsyncGenerator<StreamEvent> {
    const stream = await this.client.chat.completions.create({
      model: request.model,
      messages: this.convertMessages(request.messages),
      tools: request.tools?.map(t => ({
        type: 'function' as const,
        function: { name: t.name, description: t.description, parameters: t.input_schema }
      })),
      stream: true,
      max_tokens: request.maxTokens,
    });

    // Map OpenAI stream chunks to ArqCode StreamEvents
    for await (const chunk of stream) { ... }
  }
}
```

**Default model:** `accounts/fireworks/models/llama-v3p3-70b-instruct` (fast, good at tool use)

### Config Changes

```json
{
  "provider": "fireworks",
  "model": "accounts/fireworks/models/llama-v3p3-70b-instruct",
  "fireworksApiKey": "fw_...",
  "maxTokens": 8192
}
```

---

## Part 2: Unique TUI Identity — "The Grid"

ArqCode's TUI is called **The Grid**. It's a command center, not a chat window.

### Design Language

**Visual identity:**
- **Color palette:** Amber/gold primary (#FFB800), dark background, white text
- **No chat bubbles** — content flows like a terminal log
- **Horizontal rules** between logical sections (not per-message)
- **Monospace everything** — this is a terminal tool, own it
- **Status is always visible** — model, tokens, cost, active operations

**Interaction model:**
- **Command-first** — input area is a command line, not a chat box
- **Streaming output** appears inline, like `tail -f`
- **Tool execution** shows as indented operations with spinners
- **File changes** show inline diffs (green/red), not just "file written"
- **Thinking** is collapsed by default, expand with keybind

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  ◆ ArqCode                    llama-70b │ 2.4k tokens │ $0.01 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ▸ read src/index.ts                                    0.2s │
│  ▸ edit src/index.ts (+3 -1)                            0.1s │
│    ┊ - const x = 1;                                          │
│    ┊ + const x = computeValue();                             │
│    ┊ + const y = x * 2;                                      │
│    ┊ + const z = y + 1;                                      │
│                                                              │
│  Added computeValue() and derived variables for the          │
│  calculation pipeline.                                       │
│                                                              │
│  ▸ bash npm test                                        1.4s │
│    ┊ 12 passing, 0 failing                                   │
│                                                              │
│  All tests pass. The refactor is complete.                   │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  ◆ arq >                                                     │
└──────────────────────────────────────────────────────────────┘
```

### Key Differences from Claude Code

| Claude Code | ArqCode |
|---|---|
| Chat-style with "Human:" / "Assistant:" | Command center — operations log |
| Tool output hidden behind expandable | Tool output inline with diffs |
| White/blue color scheme | Amber/gold accent on dark |
| Markdown rendered in terminal | Code blocks only, minimal MD |
| "Type a message..." placeholder | `◆ arq >` command prompt |
| Thinking shown as stream | Thinking collapsed, Ctrl+T to toggle |
| Permission modal overlay | Permission inline with [y/n/a] |

### Components

```
src/cli/
├── app.tsx                    # Main app (rewrite)
├── components/
│   ├── Grid.tsx               # Main layout container
│   ├── Header.tsx             # Status bar with model/tokens/cost
│   ├── OperationLog.tsx       # Scrollable operations feed
│   ├── OperationEntry.tsx     # Single operation (tool call, text, etc.)
│   ├── DiffView.tsx           # Inline colored diff display
│   ├── CommandInput.tsx       # Multi-line input with prompt
│   ├── PermissionInline.tsx   # Inline [y/n/a] permission
│   ├── Spinner.tsx            # Animated operation spinner
│   └── ThinkingCollapse.tsx   # Collapsible thinking section
└── theme.ts                   # Color constants, box chars
```

---

## Part 3: Missing Features

### 3a. Inline Diff Display
When Edit tool modifies a file, show the diff inline:
```
▸ edit src/foo.ts (+2 -1)                              0.1s
  ┊ - old line
  ┊ + new line 1
  ┊ + new line 2
```

### 3b. Multi-line Input
Shift+Enter for newlines. Enter to submit. Escape to cancel.

### 3c. Operation Timing
Every tool call shows elapsed time. Total request time in header.

### 3d. Cost Estimation
Track token usage, compute cost based on model pricing table.

### 3e. Scrollable History
Up/Down arrow to scroll through operation log. PgUp/PgDn for pages.

### 3f. Dynamic System Prompt
Load `ARQCODE.md` from project root as system prompt context (like CLAUDE.md).

### 3g. Keyboard Shortcuts
- `Ctrl+C` — abort current operation
- `Ctrl+T` — toggle thinking visibility
- `Ctrl+L` — clear screen
- `Escape` — cancel current input
- `Up/Down` — scroll history
- `Tab` — command completion for slash commands

---

## Implementation Phases

### Phase A: Provider Swap (Fireworks)
1. Install `openai` npm package
2. Create `src/api/fireworks/adapter.ts`
3. Update `src/api/types.ts` for OpenAI-compatible events
4. Update config schema (fireworksApiKey, remove anthropicApiKey)
5. Update `bin/arq.ts` bootstrap
6. Remove `src/api/cursor/` and `src/api/anthropic/`
7. Remove `better-sqlite3`, `@anthropic-ai/sdk` dependencies
8. Tests

### Phase B: The Grid — Core TUI
1. Create theme.ts (colors, box chars, constants)
2. Rewrite app.tsx with Grid layout
3. Create Header component
4. Create OperationLog + OperationEntry
5. Create CommandInput (multi-line)
6. Create Spinner component
7. Wire to conversation engine
8. Tests

### Phase C: Inline Operations
1. DiffView component
2. Tool result formatting (inline diffs, bash output)
3. Operation timing
4. Cost estimation
5. Permission inline prompt
6. ThinkingCollapse component
7. Tests

### Phase D: Quality of Life
1. Dynamic system prompt (ARQCODE.md loading)
2. Keyboard shortcuts
3. Scrollable history
4. Slash command tab completion
5. Input history (up arrow for previous commands)
6. Tests

---

## Dependencies

**Add:** `openai` (Fireworks-compatible)
**Remove:** `@anthropic-ai/sdk`, `better-sqlite3` (Cursor auth)
**Keep:** `ink`, `react`, `fast-glob`, `zod`, `tsx`, `@modelcontextprotocol/sdk`
