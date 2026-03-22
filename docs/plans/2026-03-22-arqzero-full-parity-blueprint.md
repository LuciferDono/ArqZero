# ArqZero Full Parity Blueprint

**Objective:** Fill ALL gaps between ArqZero and Claude Code. Root upgrade, not patchwork.

**Current state:** 47 source files, 264 tests, 70 suites. 9 tools, 7 slash commands, no hooks, no subagents, no memory, no checkpoints.

**Target state:** 18+ tools, 25+ slash commands, hook system, subagent dispatch, auto-memory, checkpoints, headless mode, plugin system v2, settings hierarchy, CLI flags.

---

## Dependency Graph

```
Step 1 (Tools)  ──┐
Step 2 (CLI)    ──┼──► Step 7 (Commands)
Step 3 (Hooks)  ──┤         │
Step 5 (Memory) ──┘         ▼
                      Step 8 (Worktrees)
Step 4 (Agents) ◄── Step 1
                │
                ▼
Step 9 (Plugins v2) ◄── Step 3

Step 6 (Checkpoints) ◄── Step 3

Step 10 (Notebooks) ── independent
```

**Parallel groups:**
- Group A (independent): Steps 1, 2, 3, 5, 10 — can ALL run in parallel
- Group B (depends on A): Steps 4, 6, 7
- Group C (depends on B): Steps 8, 9

---

## Step 1: Core Tools Expansion

**Branch:** `feat/tools-expansion`
**Model tier:** default (sonnet-level work)
**Depends on:** nothing
**Parallel with:** Steps 2, 3, 5, 10

### Context Brief
ArqZero has 9 tools. Claude Code has 18. Add the missing 9 tools to reach parity.

### Tasks
1. **MultiEdit tool** (`src/tools/builtins/multi-edit.ts`)
   - Takes array of `{old_string, new_string}` edits for a single file
   - Applies edits sequentially, validates each
   - Permission: ask

2. **LS tool** (`src/tools/builtins/ls.ts`)
   - List directory contents with file sizes and types
   - Permission: safe

3. **BashOutput tool** (`src/tools/builtins/bash-output.ts`)
   - Read stdout/stderr from a running or completed bash process
   - Requires process tracking in bash.ts (store child processes by ID)
   - Permission: safe

4. **KillShell tool** (`src/tools/builtins/kill-shell.ts`)
   - Kill a running bash process by ID
   - Permission: ask

5. **TodoWrite tool** (`src/tools/builtins/todo-write.ts`)
   - Create/update structured task list
   - Status: pending, in_progress, completed
   - Store in memory as JSON
   - Permission: safe

6. **TodoRead tool** (`src/tools/builtins/todo-read.ts`)
   - Read current task list state
   - Permission: safe

7. Update `src/tools/builtins/index.ts` barrel — add all 6 new tools

8. Tests for each tool (TDD: tests first, then implementation)

### Verification
```bash
npx tsx --test src/tools/builtins/multi-edit.test.ts src/tools/builtins/ls.test.ts src/tools/builtins/bash-output.test.ts src/tools/builtins/kill-shell.test.ts src/tools/builtins/todo-write.test.ts src/tools/builtins/todo-read.test.ts
```

### Exit Criteria
- All 6 new tools registered in barrel
- All tests pass
- Existing 264 tests still pass

---

## Step 2: CLI Infrastructure

**Branch:** `feat/cli-infrastructure`
**Model tier:** default
**Depends on:** nothing
**Parallel with:** Steps 1, 3, 5, 10

### Context Brief
ArqZero has no CLI argument parsing — just `bin/arq.ts` that boots the Ink app. Need full CLI with flags, headless mode, and settings hierarchy.

### Tasks
1. **Install `commander`** npm package for CLI parsing

2. **Create `src/cli/args.ts`** — CLI argument definitions
   - `-p, --print <prompt>` — headless mode
   - `-c, --continue` — resume last session
   - `--resume <session-id>` — resume specific session
   - `--model <model>` — override model
   - `--verbose` — verbose logging
   - `--allowedTools <tools>` — restrict tools (comma-separated)
   - `--output-format <fmt>` — text, json, stream-json
   - `--dangerously-skip-permissions` — skip all permission prompts
   - `--version` — show version
   - `--worktree <name>` — (placeholder for Step 8)

3. **Create `src/cli/headless.ts`** — Non-interactive execution
   - Takes prompt string, runs through engine, outputs result
   - Supports output formats: text (default), json, stream-json
   - Exits with code 0 on success, 1 on error

4. **Create `src/config/settings.ts`** — Settings hierarchy
   - Managed > Project (`.arqzero/settings.json`) > User (`~/.arqzero/settings.json`)
   - Merge logic: deep merge, deny rules always win
   - Settings keys: permissions, env, hooks, mcpServers

5. **Rewrite `bin/arq.ts`** — Use commander, route to interactive or headless

6. Tests for args parsing, headless mode, settings merge

### Verification
```bash
npx tsx bin/arq.ts --version
npx tsx bin/arq.ts -p "echo hello" --output-format json
npx tsx --test src/cli/args.test.ts src/cli/headless.test.ts src/config/settings.test.ts
```

### Exit Criteria
- `arqzero -p "prompt"` works in headless mode
- `arqzero --version` shows version
- Settings hierarchy merges correctly
- All existing tests still pass

---

## Step 3: Hook System

**Branch:** `feat/hooks`
**Model tier:** strongest (architecture-critical)
**Depends on:** nothing
**Parallel with:** Steps 1, 2, 5, 10

### Context Brief
Hooks are event-driven interceptors that fire before/after tool use, on session start/end, etc. They're the extensibility backbone — permissions, linting, custom validation all run through hooks.

### Tasks
1. **Create `src/hooks/types.ts`** — Hook type definitions
   ```typescript
   export type HookEvent =
     | 'PreToolUse' | 'PostToolUse' | 'PostToolUseFailure'
     | 'UserPromptSubmit' | 'PermissionRequest'
     | 'Stop' | 'SubagentStop'
     | 'SessionStart' | 'SessionEnd'
     | 'SubagentStart' | 'Notification'
     | 'PreCompact' | 'PostCompact';

   export type HookHandlerType = 'command' | 'http';

   export interface HookDefinition {
     event: HookEvent;
     type: HookHandlerType;
     command?: string;        // shell command to run
     url?: string;            // HTTP endpoint
     timeout?: number;        // ms
     matchTools?: string[];   // only fire for these tools
   }

   export interface HookResult {
     action: 'allow' | 'deny' | 'continue';
     message?: string;
     modifiedInput?: unknown;
   }
   ```

2. **Create `src/hooks/registry.ts`** — HookRegistry class
   - Register hooks from config
   - `fire(event, payload)` → run all matching hooks, collect results
   - Sequential execution (order matters for deny/allow)

3. **Create `src/hooks/command-handler.ts`** — Execute shell command hooks
   - Run command with JSON payload on stdin
   - Parse JSON result from stdout
   - Timeout handling

4. **Create `src/hooks/http-handler.ts`** — Execute HTTP hooks
   - POST JSON payload to URL
   - Parse JSON response
   - Timeout handling

5. **Wire into engine** — Modify `src/core/engine.ts`
   - Fire `PreToolUse` before tool execution (can block)
   - Fire `PostToolUse` after tool execution
   - Fire `Stop` when conversation loop ends

6. **Wire into app** — Fire `SessionStart`/`SessionEnd`

7. **Update config schema** — Add `hooks` field to settings

8. Tests for registry, command handler, event firing

### Verification
```bash
npx tsx --test src/hooks/registry.test.ts src/hooks/command-handler.test.ts src/hooks/http-handler.test.ts
```

### Exit Criteria
- Hooks fire at correct lifecycle points
- PreToolUse can block tool execution
- Command and HTTP handlers work
- All existing tests still pass

---

## Step 4: Subagent System

**Branch:** `feat/subagents`
**Model tier:** strongest (architecture-critical)
**Depends on:** Step 1 (needs TodoWrite/TodoRead)

### Context Brief
The Task tool spawns isolated sub-agents that each get their own context window, tool access, and permissions. Up to 7 can run in parallel.

### Tasks
1. **Create `src/agents/types.ts`** — Agent definition types
   ```typescript
   export interface AgentDefinition {
     name: string;
     description: string;
     systemPrompt?: string;
     allowedTools?: string[];
     model?: string;
   }
   ```

2. **Create `src/agents/loader.ts`** — Load custom agents from `.arqzero/agents/`
   - Scan directory for `.md` files with YAML frontmatter
   - Parse into AgentDefinition[]

3. **Create `src/agents/runner.ts`** — AgentRunner class
   - Spawn a sub-conversation with its own ConversationEngine
   - Isolated message history
   - Tool access restriction (allowedTools filter)
   - Configurable model
   - Max 7 concurrent agents

4. **Create `src/tools/builtins/task.ts`** — Task tool
   - Input: prompt, description, optional subagent_type, optional model
   - Dispatches to AgentRunner
   - Returns agent's final response
   - Permission: ask

5. **Update barrel** — Add Task tool to builtins

6. Tests for loader, runner, task tool

### Verification
```bash
npx tsx --test src/agents/loader.test.ts src/agents/runner.test.ts src/tools/builtins/task.test.ts
```

### Exit Criteria
- Task tool can spawn sub-agents
- Up to 7 concurrent agents
- Custom agents loadable from .arqzero/agents/
- All existing tests still pass

---

## Step 5: Auto-Memory System

**Branch:** `feat/auto-memory`
**Model tier:** default
**Depends on:** nothing
**Parallel with:** Steps 1, 2, 3, 10

### Context Brief
Cross-session memory that persists learnings. Stored in `~/.arqzero/memory/`. MEMORY.md is the index, individual memory files store categorized entries.

### Tasks
1. **Create `src/memory/types.ts`** — Memory entry types
   ```typescript
   export type MemoryType = 'user' | 'feedback' | 'project' | 'reference';
   export interface MemoryEntry {
     name: string;
     description: string;
     type: MemoryType;
     content: string;
     filePath: string;
   }
   ```

2. **Create `src/memory/store.ts`** — MemoryStore class
   - `save(entry)` — write memory file + update MEMORY.md index
   - `load(name)` — read memory file by name
   - `loadAll()` — read all memory files
   - `remove(name)` — delete memory file + update index
   - `search(query)` — fuzzy match against descriptions
   - Base dir: `~/.arqzero/memory/`

3. **Create `src/memory/injector.ts`** — Memory injection into system prompt
   - Load relevant memories based on conversation context
   - Append to system prompt
   - Keep under token budget

4. **Wire into system-prompt.ts** — Load MEMORY.md + relevant memories

5. **Add `/memory` slash command** — List, open, toggle auto-memory

6. Tests

### Verification
```bash
npx tsx --test src/memory/store.test.ts src/memory/injector.test.ts
```

### Exit Criteria
- Memory persists across sessions
- `/memory` command works
- Memories injected into system prompt
- All existing tests still pass

---

## Step 6: Checkpoint & Rewind System

**Branch:** `feat/checkpoints`
**Model tier:** default
**Depends on:** Step 3 (hooks — uses PreToolUse to capture state)

### Context Brief
Auto-capture file state before every edit. `/rewind` lets users restore code and/or conversation to any checkpoint.

### Tasks
1. **Create `src/checkpoints/store.ts`** — CheckpointStore
   - Before each Write/Edit/MultiEdit, snapshot the file's content
   - Store as: `{ timestamp, toolName, filePath, beforeContent, afterContent }`
   - In-memory for current session (no disk persistence needed)

2. **Create `src/checkpoints/rewind.ts`** — Rewind logic
   - List all checkpoints in session
   - Restore code only (revert files to checkpoint state)
   - Restore conversation only (truncate message history)
   - Restore both

3. **Add `/rewind` slash command** — Shows checkpoint list, user picks restore point

4. **Wire into engine** — Capture checkpoints on Write/Edit/MultiEdit tool execution

5. Tests

### Verification
```bash
npx tsx --test src/checkpoints/store.test.ts src/checkpoints/rewind.test.ts
```

### Exit Criteria
- Checkpoints captured before every file edit
- `/rewind` lists checkpoints and restores
- All existing tests still pass

---

## Step 7: Extended Slash Commands

**Branch:** `feat/extended-commands`
**Model tier:** default
**Depends on:** Steps 2 (CLI), 3 (hooks), 5 (memory)

### Context Brief
Add remaining slash commands to match Claude Code: /context, /cost, /effort, /permissions, /tools, /status, /export, /doctor, /init, /agents, /loop, /vim, /rewind (wire from Step 6).

### Tasks
1. **Update `src/commands/builtins.ts`** — Add new commands:
   - `/context` — Show context window usage as percentage bar
   - `/cost` — Show cumulative token usage and cost
   - `/effort` — Set reasoning effort level (low/medium/high)
   - `/permissions` — Show current permission rules
   - `/tools` — List all available tools (builtin + MCP)
   - `/status` — Show version, provider, connectivity
   - `/export` — Export conversation to file
   - `/doctor` — Check installation health
   - `/init` — Generate ARQZERO.md for project
   - `/agents` — List custom agents
   - `/loop <interval> <prompt>` — Scheduled recurring prompt
   - `/vim` — Toggle vim mode for input

2. **Create `src/cli/cron.ts`** — Simple interval-based cron for `/loop`
   - Store active loops
   - Execute prompt on interval
   - Cancel with `/loop stop`

3. Tests for new commands

### Verification
```bash
npx tsx --test src/commands/builtins.test.ts src/cli/cron.test.ts
```

### Exit Criteria
- All 25+ slash commands implemented
- /loop runs recurring prompts
- All existing tests still pass

---

## Step 8: Git Worktrees

**Branch:** `feat/worktrees`
**Model tier:** default
**Depends on:** Step 4 (agents — worktrees are used for agent isolation)

### Context Brief
`arqzero --worktree feature-auth` creates an isolated git worktree + new branch. Each worktree gets its own session.

### Tasks
1. **Create `src/worktrees/manager.ts`** — WorktreeManager
   - `create(name)` — `git worktree add` with new branch
   - `remove(name)` — `git worktree remove`
   - `list()` — `git worktree list`
   - Auto-cleanup when no changes made

2. **Wire into CLI** — `--worktree` flag creates worktree and starts session in it

3. Tests

### Verification
```bash
npx tsx --test src/worktrees/manager.test.ts
```

### Exit Criteria
- `arqzero --worktree name` creates worktree and starts session
- Cleanup works
- All existing tests still pass

---

## Step 9: Plugin System v2

**Branch:** `feat/plugins-v2`
**Model tier:** default
**Depends on:** Steps 3 (hooks), 4 (agents)

### Context Brief
Enhance the existing skills system into a full plugin system with plugin.json manifests, hook registration, agent definitions, and MCP server configuration per plugin.

### Tasks
1. **Create `src/plugins/types.ts`** — Plugin manifest types
   ```typescript
   export interface PluginManifest {
     name: string;
     version: string;
     description: string;
     skills?: string[];       // paths to skill files
     agents?: string[];       // paths to agent files
     hooks?: HookDefinition[];
     mcpServers?: Record<string, McpServerConfig>;
   }
   ```

2. **Create `src/plugins/loader.ts`** — PluginLoader
   - Scan `.arqzero-plugin/` directories
   - Parse plugin.json manifests
   - Register skills, agents, hooks, MCP servers

3. **Create `src/plugins/manager.ts`** — PluginManager
   - Enable/disable plugins
   - `/reload-plugins` support
   - `/plugin disable <name>` support

4. **Update `bin/arq.ts`** — Load plugins at startup

5. Tests

### Verification
```bash
npx tsx --test src/plugins/loader.test.ts src/plugins/manager.test.ts
```

### Exit Criteria
- Plugins load from plugin.json
- Plugins can register hooks, agents, MCP servers
- /reload-plugins works
- All existing tests still pass

---

## Step 10: Notebook Support

**Branch:** `feat/notebooks`
**Model tier:** default (haiku-level work)
**Depends on:** nothing
**Parallel with:** Steps 1, 2, 3, 5

### Context Brief
Add Jupyter notebook read/edit tools. Parse .ipynb JSON format.

### Tasks
1. **Create `src/tools/builtins/notebook-read.ts`** — NotebookRead tool
   - Parse .ipynb JSON, extract cells with outputs
   - Return formatted cell content
   - Permission: safe

2. **Create `src/tools/builtins/notebook-edit.ts`** — NotebookEdit tool
   - Edit cell content by index
   - Add/remove cells
   - Permission: ask

3. **Update barrel** — Add notebook tools

4. Tests

### Verification
```bash
npx tsx --test src/tools/builtins/notebook-read.test.ts src/tools/builtins/notebook-edit.test.ts
```

### Exit Criteria
- NotebookRead parses .ipynb files
- NotebookEdit modifies cells
- All existing tests still pass

---

## Execution Summary

| Step | Name | Depends On | Can Parallel With | Model |
|------|------|-----------|-------------------|-------|
| 1 | Tools Expansion | — | 2, 3, 5, 10 | default |
| 2 | CLI Infrastructure | — | 1, 3, 5, 10 | default |
| 3 | Hook System | — | 1, 2, 5, 10 | strongest |
| 4 | Subagent System | 1 | 6 | strongest |
| 5 | Auto-Memory | — | 1, 2, 3, 10 | default |
| 6 | Checkpoints | 3 | 4 | default |
| 7 | Extended Commands | 2, 3, 5 | 8 | default |
| 8 | Worktrees | 4 | 7, 9 | default |
| 9 | Plugins v2 | 3, 4 | 8 | default |
| 10 | Notebooks | — | 1, 2, 3, 5 | default |

**Optimal execution order:**
- Wave 1 (parallel): Steps 1, 2, 3, 5, 10
- Wave 2 (parallel): Steps 4, 6
- Wave 3 (parallel): Steps 7, 8, 9

**Total: 3 waves, 10 steps.**
