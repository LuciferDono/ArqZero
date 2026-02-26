# arq-CODE Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Claude Code clone (arq-CODE) — a TypeScript CLI with interactive REPL, tool use, permissions, MCP support, and skills, powered by Claude via Cursor's internal API.

**Architecture:** Monolithic TypeScript/Node.js package with clean module interfaces. Cursor's reverse-engineered gRPC API as primary LLM backend with Anthropic SDK as fallback. Ink (React) for terminal UI. Self-registering tool system with permission escalation.

**Tech Stack:** TypeScript, Node.js, Ink/React, better-sqlite3, Zod, node:http2, @bufbuild/protobuf, @anthropic-ai/sdk, fast-glob, @vscode/ripgrep

**Security note:** The Bash tool intentionally executes shell commands — that is its purpose. Input validation and permission escalation (see Phase 4) are the security controls. All user-facing command execution goes through the permission system before reaching the shell.

---

## Key Architectural Decisions

These decisions emerged from design review and must be preserved during implementation:

1. **stream-decoder.ts** must handle compressed frames (flag byte 0x01, gzip), trailer frames (flag byte 0x02, end-of-stream metadata), and partial frames across TCP chunk boundaries. Build a standalone test against recorded frames before wiring into the full stack.

2. **auth.ts** re-reads from Cursor's SQLite DB on HTTP 401, not just at startup. Cross-platform paths:
   - Windows: `%APPDATA%\Cursor\User\globalStorage\state.vscdb`
   - macOS: `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb`
   - Linux: `~/.config/Cursor/User/globalStorage/state.vscdb`
   - `isAvailable()` must check Cursor installation exists before touching SQLite.

3. **thinking_delta** is a required event type in StreamEvent — for extended thinking output from Opus models. Without it, thinking content is silently dropped or misparsed as text.

4. **system/machine-id.ts** is separate from checksum.ts — machine ID extraction is its own cross-platform problem and must not be buried in the cipher logic.

5. **tools/builtins/index.ts** barrel file is the single import point for engine.ts. No magic self-registration at import time. If a tool file isn't explicitly imported in this barrel, it doesn't exist. This prevents subtle bugs.

6. **ask-user.ts** uses a callback on ToolContext (`ctx.promptUser`), never imports the CLI layer directly. Clean inversion of control.

7. **ToolResult.display.truncated** is functional, not cosmetic — the renderer needs to know if a file read was truncated or it silently shows partial content with no indication.

8. **bash.ts** rejects interactive processes (vim, ssh, python REPL, etc.) by pattern matching rather than hanging. Separate stdout/stderr in results — combined output loses signal.

9. **Compaction** summary call goes through `LLMProvider.chat()` with `intent: 'summarize'` — not a raw API call. This ensures it works across all providers and allows routing to a cheaper model.

10. **Session resume** loads from the last compaction snapshot, not raw message replay. Otherwise a resumed long session starts at 80% context capacity.

11. **config/init.ts** runs on first launch (Phase 1, Task 2) — not polish. Without it, first launch crashes or silently fails.

12. **Permission escalation** does NOT flag `>/dev/null` redirection — it's common and harmless. Only flag destructive writes: `dd if=... of=<real device>`, `rm -rf`, `git push --force`, `DROP TABLE`, etc.

---

## Phase 1: Project Scaffold + Config + API Adapter

### Task 1: Initialize Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `bin/arq.ts`

**Step 1: Initialize npm project and install core dependencies**

Run:
```bash
cd C:\Users\prana\Projekts\Workshop\Arq-CODE
npm init -y
npm install typescript tsx ink react ink-text-input zod better-sqlite3
npm install -D @types/node @types/react @types/better-sqlite3
```

**Step 2: Create tsconfig.json**

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "jsx": "react-jsx",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "resolveJsonModule": true,
    "sourceMap": true
  },
  "include": ["src/**/*", "bin/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create .gitignore**

```
node_modules/
dist/
*.js.map
.env
src/api/cursor/protobuf/generated/
```

**Step 4: Update package.json scripts and bin**

Add to `package.json`:
```jsonc
{
  "name": "arq-code",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "arq": "./bin/arq.ts"
  },
  "scripts": {
    "dev": "tsx bin/arq.ts",
    "build": "tsc",
    "test": "node --test --experimental-strip-types src/**/*.test.ts"
  }
}
```

**Step 5: Create entry point stub**

```typescript
// bin/arq.ts
#!/usr/bin/env tsx
console.log('arq-CODE v0.1.0');
```

**Step 6: Verify it runs**

Run: `npm run dev`
Expected: Prints "arq-CODE v0.1.0"

**Step 7: Commit**

```bash
git add package.json tsconfig.json .gitignore bin/arq.ts package-lock.json
git commit -m "feat: initialize arq-CODE project scaffold"
```

---

### Task 2: Config Schema + Loader

**Files:**
- Create: `src/config/schema.ts`
- Create: `src/config/loader.ts`
- Create: `src/config/init.ts`
- Test: `src/config/schema.test.ts`

**Step 1: Write the failing test for config schema**

```typescript
// src/config/schema.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AppConfigSchema } from './schema.js';

describe('AppConfigSchema', () => {
  it('should validate a minimal config', () => {
    const result = AppConfigSchema.safeParse({
      provider: 'cursor',
    });
    assert.strictEqual(result.success, true);
  });

  it('should apply defaults for missing optional fields', () => {
    const result = AppConfigSchema.safeParse({
      provider: 'cursor',
    });
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.permissions.defaultMode, 'ask');
      assert.deepStrictEqual(result.data.permissions.alwaysAllow, ['Read', 'Glob', 'Grep']);
      assert.strictEqual(result.data.model, 'claude-4-sonnet');
    }
  });

  it('should reject invalid provider', () => {
    const result = AppConfigSchema.safeParse({
      provider: 'invalid',
    });
    assert.strictEqual(result.success, false);
  });

  it('should validate full config with MCP servers', () => {
    const result = AppConfigSchema.safeParse({
      provider: 'cursor',
      model: 'claude-4.5-opus-high',
      mcpServers: {
        github: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-github'],
          env: { GITHUB_TOKEN: 'test' },
        },
      },
    });
    assert.strictEqual(result.success, true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx tsx --test src/config/schema.test.ts`
Expected: FAIL — cannot find module './schema.js'

**Step 3: Implement config schema**

```typescript
// src/config/schema.ts
import { z } from 'zod';

export const McpServerSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).default([]),
  env: z.record(z.string()).default({}),
});

export const PermissionsSchema = z.object({
  defaultMode: z.enum(['ask', 'trust', 'locked']).default('ask'),
  alwaysAllow: z.array(z.string()).default(['Read', 'Glob', 'Grep']),
  alwaysDeny: z.array(z.string()).default([]),
  trustedPatterns: z.record(z.array(z.string())).default({}),
});

export const AppConfigSchema = z.object({
  provider: z.enum(['cursor', 'anthropic']),
  model: z.string().default('claude-4-sonnet'),
  anthropicApiKey: z.string().optional(),
  maxTokens: z.number().default(8192),
  permissions: PermissionsSchema.default({}),
  mcpServers: z.record(McpServerSchema).default({}),
  bash: z.object({
    defaultTimeout: z.number().default(30000),
    maxTimeout: z.number().default(600000),
  }).default({}),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type McpServerConfig = z.infer<typeof McpServerSchema>;
```

**Step 4: Run test to verify it passes**

Run: `npx tsx --test src/config/schema.test.ts`
Expected: All 4 tests PASS

**Step 5: Implement config loader**

```typescript
// src/config/loader.ts
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AppConfigSchema, type AppConfig } from './schema.js';

export function getArqDir(): string {
  return path.join(os.homedir(), '.arq');
}

export function getConfigPath(): string {
  return path.join(getArqDir(), 'config.json');
}

export function configExists(): boolean {
  return fs.existsSync(getConfigPath());
}

export function loadConfig(): AppConfig {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    throw new Error(`Config not found at ${configPath}. Run 'arq' to initialize.`);
  }

  const raw = fs.readFileSync(configPath, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in ${configPath}`);
  }

  const result = AppConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Config validation failed:\n${issues}`);
  }

  // Merge env var overrides
  if (process.env.ANTHROPIC_API_KEY && !result.data.anthropicApiKey) {
    result.data.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  }

  return result.data;
}

export function writeConfig(config: AppConfig): void {
  const arqDir = getArqDir();
  fs.mkdirSync(arqDir, { recursive: true });
  fs.mkdirSync(path.join(arqDir, 'sessions'), { recursive: true });
  fs.mkdirSync(path.join(arqDir, 'skills'), { recursive: true });
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
}
```

**Step 6: Implement first-run init**

```typescript
// src/config/init.ts
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { writeConfig, configExists } from './loader.js';
import type { AppConfig } from './schema.js';

function getCursorDbPath(): string {
  const platform = process.platform;
  if (platform === 'win32') {
    return path.join(
      process.env.APPDATA || '',
      'Cursor', 'User', 'globalStorage', 'state.vscdb'
    );
  } else if (platform === 'darwin') {
    return path.join(
      os.homedir(),
      'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'state.vscdb'
    );
  }
  return path.join(
    os.homedir(),
    '.config', 'Cursor', 'User', 'globalStorage', 'state.vscdb'
  );
}

export function detectCursorInstallation(): boolean {
  return fs.existsSync(getCursorDbPath());
}

export { getCursorDbPath };

export function createDefaultConfig(
  provider: 'cursor' | 'anthropic',
  anthropicApiKey?: string
): AppConfig {
  return {
    provider,
    model: 'claude-4-sonnet',
    anthropicApiKey,
    maxTokens: 8192,
    permissions: {
      defaultMode: 'ask',
      alwaysAllow: ['Read', 'Glob', 'Grep'],
      alwaysDeny: [],
      trustedPatterns: {
        Bash: ['npm test', 'npm run *', 'git status', 'git diff', 'git log'],
      },
    },
    mcpServers: {},
    bash: {
      defaultTimeout: 30000,
      maxTimeout: 600000,
    },
  };
}

export async function runInit(
  promptFn: (question: string) => Promise<string>
): Promise<AppConfig> {
  if (configExists()) {
    throw new Error('Config already exists');
  }

  const hasCursor = detectCursorInstallation();

  let provider: 'cursor' | 'anthropic';
  let apiKey: string | undefined;

  if (hasCursor) {
    const answer = await promptFn(
      'Cursor installation detected. Use Cursor as LLM provider? (y/n): '
    );
    provider = answer.toLowerCase().startsWith('y') ? 'cursor' : 'anthropic';
  } else {
    provider = 'anthropic';
  }

  if (provider === 'anthropic') {
    apiKey = await promptFn('Enter your Anthropic API key: ');
    if (!apiKey.trim()) {
      throw new Error('Anthropic API key is required');
    }
  }

  const config = createDefaultConfig(provider, apiKey);
  writeConfig(config);
  return config;
}
```

**Step 7: Commit**

```bash
git add src/config/
git commit -m "feat: add config schema, loader, and first-run init"
```

---

### Task 3: System Utilities — Machine ID

**Files:**
- Create: `src/system/machine-id.ts`
- Test: `src/system/machine-id.test.ts`

**Step 1: Write failing test**

```typescript
// src/system/machine-id.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getMachineId } from './machine-id.js';

describe('getMachineId', () => {
  it('should return a non-empty string', async () => {
    const id = await getMachineId();
    assert.ok(typeof id === 'string');
    assert.ok(id.length > 0);
  });

  it('should return consistent results', async () => {
    const id1 = await getMachineId();
    const id2 = await getMachineId();
    assert.strictEqual(id1, id2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx tsx --test src/system/machine-id.test.ts`
Expected: FAIL

**Step 3: Implement machine ID extraction**

Uses `node:child_process` `execFileSync` (not shell exec) for safe cross-platform ID retrieval:

```typescript
// src/system/machine-id.ts
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';

let cachedId: string | null = null;

export async function getMachineId(): Promise<string> {
  if (cachedId) return cachedId;

  try {
    const platform = process.platform;
    let raw: string;

    if (platform === 'win32') {
      raw = execFileSync('wmic', ['csproduct', 'get', 'UUID'], { encoding: 'utf-8' })
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && l !== 'UUID')[0] || '';
    } else if (platform === 'darwin') {
      const output = execFileSync('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'], { encoding: 'utf-8' });
      const match = output.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
      raw = match ? match[1] : '';
    } else {
      raw = execFileSync('cat', ['/etc/machine-id'], { encoding: 'utf-8' }).trim();
    }

    cachedId = raw || crypto.randomUUID();
  } catch {
    // Fallback: generate a stable ID from hostname + username
    const hostname = process.env.COMPUTERNAME || process.env.HOSTNAME || 'unknown';
    const user = process.env.USERNAME || process.env.USER || 'unknown';
    cachedId = crypto
      .createHash('sha256')
      .update(`${hostname}-${user}`)
      .digest('hex');
  }

  return cachedId;
}
```

**Step 4: Run test to verify it passes**

Run: `npx tsx --test src/system/machine-id.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/system/
git commit -m "feat: add cross-platform machine ID extraction"
```

---

### Task 4: API Provider Interface + Types

**Files:**
- Create: `src/api/provider.ts`
- Create: `src/api/types.ts`

**Step 1: Create the provider-agnostic types**

```typescript
// src/api/types.ts
export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | ContentBlock[];
  toolCallId?: string;
  toolName?: string;
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: string;
  isError?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ChatRequest {
  messages: Message[];
  model: string;
  tools?: ToolDefinition[];
  maxTokens?: number;
  systemPrompt?: string;
  intent: 'chat' | 'summarize';
}

export type StreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'thinking_delta'; text: string }
  | { type: 'tool_use_start'; id: string; name: string }
  | { type: 'tool_use_delta'; id: string; input: string }
  | { type: 'tool_use_end'; id: string }
  | { type: 'message_end'; usage: TokenUsage }
  | { type: 'error'; error: Error };
```

**Step 2: Create the provider interface**

```typescript
// src/api/provider.ts
import type { ChatRequest, StreamEvent } from './types.js';

export interface LLMProvider {
  readonly name: string;
  chat(params: ChatRequest): AsyncIterable<StreamEvent>;
  abort(): void;
  isAvailable(): Promise<boolean>;
}
```

**Step 3: Commit**

```bash
git add src/api/provider.ts src/api/types.ts
git commit -m "feat: add LLM provider interface and stream event types"
```

---

### Task 5: Mock Adapter (for testing everything without a real API)

**Files:**
- Create: `src/api/mock/adapter.ts`
- Test: `src/api/mock/adapter.test.ts`

**Step 1: Write failing test**

```typescript
// src/api/mock/adapter.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MockAdapter } from './adapter.js';

describe('MockAdapter', () => {
  it('should be available', async () => {
    const adapter = new MockAdapter();
    assert.strictEqual(await adapter.isAvailable(), true);
  });

  it('should stream a text response', async () => {
    const adapter = new MockAdapter('Hello from mock!');
    const events: string[] = [];

    for await (const event of adapter.chat({
      messages: [{ role: 'user', content: 'hi' }],
      model: 'mock',
      intent: 'chat',
    })) {
      if (event.type === 'text_delta') events.push(event.text);
    }

    assert.strictEqual(events.join(''), 'Hello from mock!');
  });

  it('should emit message_end with usage', async () => {
    const adapter = new MockAdapter('test');
    let gotEnd = false;

    for await (const event of adapter.chat({
      messages: [{ role: 'user', content: 'hi' }],
      model: 'mock',
      intent: 'chat',
    })) {
      if (event.type === 'message_end') {
        gotEnd = true;
        assert.ok(event.usage.inputTokens >= 0);
        assert.ok(event.usage.outputTokens >= 0);
      }
    }

    assert.strictEqual(gotEnd, true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx tsx --test src/api/mock/adapter.test.ts`
Expected: FAIL

**Step 3: Implement mock adapter**

```typescript
// src/api/mock/adapter.ts
import type { LLMProvider } from '../provider.js';
import type { ChatRequest, StreamEvent } from '../types.js';

export class MockAdapter implements LLMProvider {
  readonly name = 'mock';
  private response: string;
  private aborted = false;

  constructor(response = 'This is a mock response from arq-CODE.') {
    this.response = response;
  }

  async *chat(params: ChatRequest): AsyncIterable<StreamEvent> {
    this.aborted = false;

    // Simulate streaming by yielding word by word
    const words = this.response.split(' ');
    for (let i = 0; i < words.length; i++) {
      if (this.aborted) return;
      const text = i === 0 ? words[i] : ' ' + words[i];
      yield { type: 'text_delta', text };
      await new Promise((r) => setTimeout(r, 10));
    }

    yield {
      type: 'message_end',
      usage: {
        inputTokens: params.messages.reduce(
          (acc, m) => acc + (typeof m.content === 'string' ? m.content.length : 0), 0
        ),
        outputTokens: this.response.length,
      },
    };
  }

  abort(): void {
    this.aborted = true;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx tsx --test src/api/mock/adapter.test.ts`
Expected: All 3 tests PASS

**Step 5: Commit**

```bash
git add src/api/mock/
git commit -m "feat: add mock LLM adapter for testing"
```

---

### Task 6: Cursor Auth + Checksum

**Files:**
- Create: `src/api/cursor/auth.ts`
- Create: `src/api/cursor/checksum.ts`
- Test: `src/api/cursor/checksum.test.ts`

**Step 1: Write failing test for checksum**

```typescript
// src/api/cursor/checksum.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateChecksum } from './checksum.js';

describe('generateChecksum', () => {
  it('should return a non-empty string', () => {
    const result = generateChecksum('test-machine-id');
    assert.ok(typeof result === 'string');
    assert.ok(result.length > 0);
  });

  it('should include machine ID in output', () => {
    const machineId = 'abc123-machine';
    const result = generateChecksum(machineId);
    assert.ok(result.includes(machineId));
  });

  it('should produce different output at different times', () => {
    const r1 = generateChecksum('test', 1000000);
    const r2 = generateChecksum('test', 2000000);
    assert.notStrictEqual(r1, r2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx tsx --test src/api/cursor/checksum.test.ts`
Expected: FAIL

**Step 3: Implement jyh cipher checksum**

```typescript
// src/api/cursor/checksum.ts

/**
 * Generates the x-cursor-checksum header using the jyh cipher.
 * Timestamp-based XOR cipher combined with the machine ID.
 */
export function generateChecksum(machineId: string, timestampMs?: number): string {
  const ts = timestampMs ?? Date.now();
  const timestamp = Math.floor(ts / 1000000);

  const bytes = new Uint8Array(6);
  bytes[0] = (timestamp >> 40) & 0xff;
  bytes[1] = (timestamp >> 32) & 0xff;
  bytes[2] = (timestamp >> 24) & 0xff;
  bytes[3] = (timestamp >> 16) & 0xff;
  bytes[4] = (timestamp >> 8) & 0xff;
  bytes[5] = timestamp & 0xff;

  let key = 165;
  for (let i = 0; i < 6; i++) {
    bytes[i] = ((bytes[i] ^ key) + i) % 256;
    key = bytes[i];
  }

  const encoded = Buffer.from(bytes)
    .toString('base64url')
    .replace(/=+$/, '');

  return encoded + machineId;
}
```

**Step 4: Run test to verify it passes**

Run: `npx tsx --test src/api/cursor/checksum.test.ts`
Expected: All 3 tests PASS

**Step 5: Implement Cursor auth token reader**

```typescript
// src/api/cursor/auth.ts
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface CursorAuth {
  accessToken: string;
  machineId: string;
}

export function getCursorDbPath(): string {
  const platform = process.platform;
  if (platform === 'win32') {
    return path.join(
      process.env.APPDATA || '',
      'Cursor', 'User', 'globalStorage', 'state.vscdb'
    );
  } else if (platform === 'darwin') {
    return path.join(
      os.homedir(),
      'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'state.vscdb'
    );
  }
  return path.join(
    os.homedir(),
    '.config', 'Cursor', 'User', 'globalStorage', 'state.vscdb'
  );
}

function queryValue(db: Database.Database, key: string): string | null {
  // Try ItemTable first
  try {
    const stmt = db.prepare('SELECT value FROM ItemTable WHERE key = ?');
    const row = stmt.get(key) as { value: Buffer } | undefined;
    if (row) return row.value.toString('utf-8');
  } catch { /* table may not exist */ }

  // Fallback: cursorDiskKV
  try {
    const stmt = db.prepare('SELECT value FROM cursorDiskKV WHERE key = ?');
    const row = stmt.get(key) as { value: Buffer } | undefined;
    if (row) return row.value.toString('utf-8');
  } catch { /* table may not exist */ }

  return null;
}

export function readCursorAuth(): CursorAuth {
  const dbPath = getCursorDbPath();

  if (!fs.existsSync(dbPath)) {
    throw new Error(
      `Cursor database not found at ${dbPath}. Is Cursor installed?`
    );
  }

  const db = new Database(dbPath, { readonly: true });
  try {
    const accessToken = queryValue(db, 'cursorAuth/accessToken');
    const machineId = queryValue(db, 'storage.serviceMachineId');

    if (!accessToken) {
      throw new Error(
        'Could not read access token from Cursor database. Are you logged in?'
      );
    }
    if (!machineId) {
      throw new Error('Could not read machine ID from Cursor database.');
    }

    return { accessToken, machineId };
  } finally {
    db.close();
  }
}

// Cache with refresh on 401
let cachedAuth: CursorAuth | null = null;

export function getCursorAuth(forceRefresh = false): CursorAuth {
  if (!cachedAuth || forceRefresh) {
    cachedAuth = readCursorAuth();
  }
  return cachedAuth;
}
```

**Step 6: Commit**

```bash
git add src/api/cursor/
git commit -m "feat: add Cursor auth reader and jyh cipher checksum"
```

---

### Task 7: Cursor Stream Decoder

**Files:**
- Create: `src/api/cursor/stream-decoder.ts`
- Test: `src/api/cursor/stream-decoder.test.ts`

**Step 1: Write failing test**

```typescript
// src/api/cursor/stream-decoder.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ConnectRpcDecoder, type DecodedFrame } from './stream-decoder.js';

describe('ConnectRpcDecoder', () => {
  it('should decode a single complete frame', () => {
    const decoder = new ConnectRpcDecoder();
    const payload = Buffer.from('hello');

    // Build envelope: [flags:1][length:4BE][payload]
    const envelope = Buffer.alloc(5 + payload.length);
    envelope[0] = 0x00; // no compression
    envelope.writeUInt32BE(payload.length, 1);
    payload.copy(envelope, 5);

    const frames: DecodedFrame[] = [];
    for (const frame of decoder.decode(envelope)) {
      frames.push(frame);
    }

    assert.strictEqual(frames.length, 1);
    assert.strictEqual(frames[0].isCompressed, false);
    assert.strictEqual(frames[0].isTrailer, false);
    assert.deepStrictEqual(frames[0].payload, payload);
  });

  it('should handle partial frames across chunks', () => {
    const decoder = new ConnectRpcDecoder();
    const payload = Buffer.from('hello world');

    const envelope = Buffer.alloc(5 + payload.length);
    envelope[0] = 0x00;
    envelope.writeUInt32BE(payload.length, 1);
    payload.copy(envelope, 5);

    // Split into two chunks at byte 7
    const chunk1 = envelope.subarray(0, 7);
    const chunk2 = envelope.subarray(7);

    const frames1 = [...decoder.decode(chunk1)];
    assert.strictEqual(frames1.length, 0); // incomplete

    const frames2 = [...decoder.decode(chunk2)];
    assert.strictEqual(frames2.length, 1);
    assert.deepStrictEqual(frames2[0].payload, payload);
  });

  it('should handle multiple frames in one chunk', () => {
    const decoder = new ConnectRpcDecoder();
    const p1 = Buffer.from('aaa');
    const p2 = Buffer.from('bbb');

    const e1 = Buffer.alloc(5 + p1.length);
    e1[0] = 0x00;
    e1.writeUInt32BE(p1.length, 1);
    p1.copy(e1, 5);

    const e2 = Buffer.alloc(5 + p2.length);
    e2[0] = 0x00;
    e2.writeUInt32BE(p2.length, 1);
    p2.copy(e2, 5);

    const combined = Buffer.concat([e1, e2]);
    const frames = [...decoder.decode(combined)];

    assert.strictEqual(frames.length, 2);
    assert.deepStrictEqual(frames[0].payload, p1);
    assert.deepStrictEqual(frames[1].payload, p2);
  });

  it('should detect compressed frames', () => {
    const decoder = new ConnectRpcDecoder();
    const payload = Buffer.from('compressed');

    const envelope = Buffer.alloc(5 + payload.length);
    envelope[0] = 0x01; // compressed flag
    envelope.writeUInt32BE(payload.length, 1);
    payload.copy(envelope, 5);

    const frames = [...decoder.decode(envelope)];
    assert.strictEqual(frames[0].isCompressed, true);
  });

  it('should detect trailer frames', () => {
    const decoder = new ConnectRpcDecoder();
    const payload = Buffer.from('trailer-data');

    const envelope = Buffer.alloc(5 + payload.length);
    envelope[0] = 0x02; // trailer flag
    envelope.writeUInt32BE(payload.length, 1);
    payload.copy(envelope, 5);

    const frames = [...decoder.decode(envelope)];
    assert.strictEqual(frames[0].isTrailer, true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx tsx --test src/api/cursor/stream-decoder.test.ts`
Expected: FAIL

**Step 3: Implement stream decoder**

```typescript
// src/api/cursor/stream-decoder.ts
import { gunzipSync } from 'node:zlib';

export interface DecodedFrame {
  flags: number;
  isCompressed: boolean;
  isTrailer: boolean;
  payload: Buffer;
}

export class ConnectRpcDecoder {
  private buffer = Buffer.alloc(0);

  *decode(chunk: Buffer): Generator<DecodedFrame> {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length >= 5) {
      const flags = this.buffer[0];
      const length = this.buffer.readUInt32BE(1);
      const frameSize = 5 + length;

      if (this.buffer.length < frameSize) {
        break; // wait for more data
      }

      let payload = this.buffer.subarray(5, frameSize);
      const isCompressed = (flags & 0x01) !== 0;
      const isTrailer = (flags & 0x02) !== 0;

      if (isCompressed && !isTrailer) {
        try {
          payload = gunzipSync(payload);
        } catch {
          // If decompression fails, yield raw payload
        }
      }

      yield {
        flags,
        isCompressed,
        isTrailer,
        payload: Buffer.from(payload),
      };

      this.buffer = this.buffer.subarray(frameSize);
    }
  }

  reset(): void {
    this.buffer = Buffer.alloc(0);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx tsx --test src/api/cursor/stream-decoder.test.ts`
Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add src/api/cursor/stream-decoder.ts src/api/cursor/stream-decoder.test.ts
git commit -m "feat: add ConnectRPC stream decoder with compression and trailer support"
```

---

### Task 8: Cursor Headers + Adapter Shell

**Files:**
- Create: `src/api/cursor/headers.ts`
- Create: `src/api/cursor/adapter.ts`

**Step 1: Implement headers assembly**

```typescript
// src/api/cursor/headers.ts
import { generateChecksum } from './checksum.js';

// Pin to a known working version — update when Cursor changes
const CURSOR_CLIENT_VERSION = '2.3.41';

export function buildHeaders(
  accessToken: string,
  machineId: string
): Record<string, string> {
  const os = process.platform === 'win32'
    ? 'windows'
    : process.platform === 'darwin' ? 'macos' : 'linux';
  const arch = process.arch === 'x64' ? 'x86_64' : process.arch;

  return {
    ':method': 'POST',
    ':path': '/aiserver.v1.ChatService/StreamUnifiedChatWithTools',
    'authorization': `Bearer ${accessToken}`,
    'content-type': 'application/connect+proto',
    'connect-protocol-version': '1',
    'x-cursor-client-version': CURSOR_CLIENT_VERSION,
    'x-cursor-client-type': 'ide',
    'x-cursor-client-os': os,
    'x-cursor-client-arch': arch,
    'x-cursor-client-device-type': 'desktop',
    'x-cursor-checksum': generateChecksum(machineId),
    'x-ghost-mode': 'true',
  };
}
```

**Step 2: Create Cursor adapter shell**

The adapter uses node:http2 directly for raw binary streaming. Protobuf serialization is a TODO — requires captured .proto schemas from the Cursor IDE binary.

```typescript
// src/api/cursor/adapter.ts
import http2 from 'node:http2';
import type { LLMProvider } from '../provider.js';
import type { ChatRequest, StreamEvent } from '../types.js';
import { getCursorAuth } from './auth.js';
import { buildHeaders } from './headers.js';
import { ConnectRpcDecoder } from './stream-decoder.js';

const CURSOR_API_HOST = 'https://agentn.api5.cursor.sh';

export class CursorAdapter implements LLMProvider {
  readonly name = 'cursor';
  private session: http2.ClientHttp2Session | null = null;
  private aborted = false;
  private consecutiveErrors = 0;

  async *chat(params: ChatRequest): AsyncIterable<StreamEvent> {
    this.aborted = false;
    const forceRefresh = this.consecutiveErrors > 0;
    const auth = getCursorAuth(forceRefresh);

    try {
      const session = http2.connect(CURSOR_API_HOST);
      this.session = session;

      const headers = buildHeaders(auth.accessToken, auth.machineId);

      // TODO: Replace with actual protobuf serialization once
      // .proto schemas are captured from Cursor IDE binary
      const requestBody = Buffer.from(JSON.stringify({
        messages: params.messages,
        model: params.model,
      }));

      // Wrap in ConnectRPC envelope
      const envelope = Buffer.alloc(5 + requestBody.length);
      envelope[0] = 0x00;
      envelope.writeUInt32BE(requestBody.length, 1);
      requestBody.copy(envelope, 5);

      const req = session.request({
        ...headers,
        'content-length': String(envelope.length),
      });

      req.write(envelope);
      req.end();

      const decoder = new ConnectRpcDecoder();

      // Read streaming response
      for await (const chunk of req) {
        if (this.aborted) break;
        for (const frame of decoder.decode(chunk as Buffer)) {
          if (frame.isTrailer) continue;
          // TODO: Deserialize protobuf to StreamEvent
          const text = frame.payload.toString('utf-8');
          if (text) {
            yield { type: 'text_delta', text };
          }
        }
      }

      this.consecutiveErrors = 0;
      session.close();
    } catch (error) {
      this.consecutiveErrors++;
      yield {
        type: 'error',
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  abort(): void {
    this.aborted = true;
    this.session?.close();
  }

  async isAvailable(): Promise<boolean> {
    try {
      getCursorAuth();
      return true;
    } catch {
      return false;
    }
  }
}
```

**Step 3: Commit**

```bash
git add src/api/cursor/headers.ts src/api/cursor/adapter.ts
git commit -m "feat: add Cursor adapter shell with headers and HTTP/2 streaming"
```

---

### Task 9: Anthropic Fallback Adapter

**Files:**
- Create: `src/api/anthropic/adapter.ts`

**Step 1: Install Anthropic SDK**

Run: `npm install @anthropic-ai/sdk`

**Step 2: Implement Anthropic adapter**

Thin wrapper around `@anthropic-ai/sdk`. The event mapping is:

| Anthropic Event | StreamEvent |
|----------------|-------------|
| `content_block_start` where `content_block.type === 'tool_use'` | `{ type: 'tool_use_start', id: content_block.id, name: content_block.name }` |
| `content_block_delta` where `delta.type === 'text_delta'` | `{ type: 'text_delta', text: delta.text }` |
| `content_block_delta` where `delta.type === 'thinking_delta'` | `{ type: 'thinking_delta', text: delta.thinking }` |
| `content_block_delta` where `delta.type === 'input_json_delta'` | `{ type: 'tool_use_delta', id: <tracked>, input: delta.partial_json }` |
| `content_block_stop` for tool_use blocks | `{ type: 'tool_use_end', id: <tracked> }` |
| `message_stop` / finalMessage | `{ type: 'message_end', usage: { inputTokens, outputTokens } }` |

Tool use ID tracking: maintain a `currentBlockId` variable. Set it on `content_block_start`, use it for `tool_use_delta` and `tool_use_end`, clear on `content_block_stop`.

Message format conversion for tool results: Anthropic expects tool results as `{ role: 'user', content: [{ type: 'tool_result', tool_use_id, content }] }`. Map from arq's `{ role: 'tool', toolCallId, content }`.

Use `client.messages.stream()` with AbortController for cancellation. `isAvailable()` calls `client.models.list({ limit: 1 })` to verify the key.

**Step 3: Commit**

```bash
git add src/api/anthropic/
git commit -m "feat: add Anthropic fallback adapter with streaming and tool use"
```

---

### Task 10: Basic Streaming REPL

**Files:**
- Create: `src/cli/app.tsx`
- Modify: `bin/arq.ts`

**Step 1: Create minimal Ink app**

Ink React component with:
- Status bar (model name, provider, token count)
- Message history display (user messages in blue, assistant in green)
- Streaming text with cursor indicator
- TextInput for user input
- `/quit` command to exit

**Step 2: Update entry point to wire config -> provider -> app**

`bin/arq.ts` reads config, selects provider (Cursor -> Anthropic -> Mock fallback), passes to Ink app via `render()`.

**Step 3: Test manually**

Run: `npm run dev`
Expected: Working REPL that streams responses from the selected provider.

**Step 4: Commit**

```bash
git add src/cli/app.tsx bin/arq.ts
git commit -m "feat: add basic streaming REPL with Ink UI and provider selection"
```

---

## Phase 2: Tool System

### Task 11: Tool Types + Registry

**Files:**
- Create: `src/tools/types.ts`
- Create: `src/tools/registry.ts`
- Test: `src/tools/registry.test.ts`

**Tool interface:**
```typescript
interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;  // JSON Schema, sent to LLM
  permissionLevel: 'safe' | 'ask' | 'dangerous';
  execute(input: unknown, ctx: ToolContext): Promise<ToolResult>;
}

interface ToolContext {
  cwd: string;
  config: AppConfig;
  promptUser: (request: PermissionRequest) => Promise<PermissionResponse>;
}

interface ToolResult {
  content: string;
  isError?: boolean;
  display?: { language?: string; truncated?: boolean; lineCount?: number; };
}
```

**ToolRegistry:** `register()`, `get()`, `has()`, `getAll()`, `getDefinitions()`. Throws on duplicate registration. `getDefinitions()` returns `{ name, description, input_schema }[]` for the LLM.

**Tests:** register + get, duplicate throws, unknown returns undefined, definitions format matches LLM expectations.

### Task 12: Read Tool

**Files:**
- Create: `src/tools/builtins/read.ts`
- Test: `src/tools/builtins/read.test.ts`

File reading with line numbers (`N\t<content>`), offset/limit support, error handling for missing files. Permission: safe.

### Task 13: Write + Edit Tools

**Files:**
- Create: `src/tools/builtins/write.ts`
- Create: `src/tools/builtins/edit.ts`
- Test: `src/tools/builtins/write.test.ts`
- Test: `src/tools/builtins/edit.test.ts`

**Write tool:** Creates or overwrites files. `fs.mkdirSync(dirname, { recursive: true })` for parent dirs. Input: `{ file_path: string, content: string }`. Returns character count on success. Permission: ask.

**Edit tool:** Exact string replacement. Input: `{ file_path: string, old_string: string, new_string: string, replace_all?: boolean }`. Fails if `old_string` not found. Fails if `old_string` is not unique and `replace_all` is false (check `indexOf !== lastIndexOf`). Permission: ask.

**Tests for Write:** creates new file, creates parent dirs, has ask permission. **Tests for Edit:** replaces unique string, errors on not found, errors on non-unique without replace_all.

### Task 14: Bash Tool

**Files:**
- Create: `src/tools/builtins/bash.ts`
- Test: `src/tools/builtins/bash.test.ts`

Shell command execution with:
- `execFileSync` with shell option for command execution
- Separate stdout/stderr capture
- Configurable timeout with hard max from config
- Interactive process detection and rejection (vim, ssh, python REPL patterns)
- Permission: ask (escalates to dangerous via permission system)

### Task 15: Glob + Grep Tools

**Files:**
- Create: `src/tools/builtins/glob.ts`
- Create: `src/tools/builtins/grep.ts`
- Test: `src/tools/builtins/glob.test.ts`

Glob: uses `fast-glob` with node_modules/.git ignore. Grep: tries ripgrep, falls back to native grep. Both permission: safe.

Install: `npm install fast-glob`

### Task 16: AskUser Tool + Builtins Barrel

**Files:**
- Create: `src/tools/builtins/ask-user.ts`
- Create: `src/tools/builtins/index.ts`

AskUser: uses `ctx.promptUser` callback (no direct CLI import). Barrel: explicit imports of all builtins — single import point for engine.

### Task 17: Tool Executor

**Files:**
- Create: `src/tools/executor.ts`
- Test: `src/tools/executor.test.ts`

Wraps registry lookup + tool execution with try/catch. Returns error ToolResult for unknown tools or thrown exceptions.

---

## Phase 3: Core Engine

### Task 18: Message Types + Conversation Engine

**Files:**
- Create: `src/core/message.ts`
- Create: `src/core/engine.ts`

Engine implements the conversation loop:
1. User sends message
2. Build ChatRequest with messages + tool definitions
3. Stream response from LLM
4. If tool_use events: execute tools, add results, recurse
5. If text only: append assistant message, done

Callbacks for UI updates: onTextDelta, onThinkingDelta, onToolStart, onToolEnd, onMessageEnd, onError.

### Task 19: Wire Everything Together

**Files:**
- Modify: `src/cli/app.tsx`
- Modify: `bin/arq.ts`

Create ToolRegistry, register all builtins, create ToolExecutor, create ConversationEngine, wire callbacks to React state. Test end-to-end with mock adapter.

---

## Phase 4: Permission System

### Task 20: Permission Manager + Escalation

**Files:**
- Create: `src/permissions/escalation.ts`
- Create: `src/permissions/manager.ts`
- Test: `src/permissions/escalation.test.ts`

Dynamic escalation: Bash `ask` -> `dangerous` for rm -rf, git push --force, etc. Session-level rules (always allow, trust pattern). Config-level defaults as floor. Wire into ToolExecutor before tool.execute().

---

## Phase 5: Session Management

### Task 21: Context Window + Session + History

**Files:**
- Create: `src/session/context.ts`
- Create: `src/session/session.ts`
- Create: `src/session/history.ts`
- Create: `src/core/compaction.ts`

Context: token tracking, 85% compaction threshold. Session: lifecycle + unique IDs. History: JSONL with compacted snapshots. Compaction: summarize via `intent: 'summarize'` through LLMProvider. Resume loads from last compaction point.

---

## Phase 6: MCP Client

### Task 22: MCP Client + Bridge

**Files:**
- Create: `src/mcp/client.ts`
- Create: `src/mcp/transport.ts`
- Create: `src/mcp/bridge.ts`

Install: `npm install @modelcontextprotocol/sdk`

Use official SDK for stdio transport. Bridge converts MCP tools to arq Tool interface with `mcp__server__toolname` prefix. Permission: ask.

---

## Phase 7: Skills/Plugin System

### Task 23: Skill Loader + Parser + Commands

**Files:**
- Create: `src/skills/loader.ts`
- Create: `src/skills/parser.ts`
- Create: `src/skills/commands.ts`

Scan `~/.arq/skills/`, parse `skill.json`, register slash commands. Inject `prompt.md` as system message when triggered.

---

## Phase 8: Polish

### Task 24: Full Ink UI Components

StatusBar, MessageList, ToolIndicator, PermissionPrompt as separate React components.

### Task 25: Slash Commands

Registry for /help, /model, /clear, /compact, /config, /quit, /skill.

### Task 26: WebSearch + WebFetch Tools

External web access tools. Add to builtins barrel.

### Task 27: npm Package Finalization

Compiled entry point, npm link test, global `arq` command.
