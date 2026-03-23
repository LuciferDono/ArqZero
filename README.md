# ArqZero

Terminal-native AI engineering agent with structured methodologies.

## Install

```bash
npm i -g arqzero
```

## Quick Start

```bash
arqzero setup     # Configure your LLM API key
arqzero           # Start coding
```

Or use headless mode:

```bash
arqzero -p "fix the bug in src/index.ts"
arqzero -p "add tests for the auth module" --output-format json
```

## What Makes ArqZero Different

**Not a chatbot wrapper.** ArqZero follows real engineering methodology.

- **42 Structured Capabilities** -- TDD, debugging, code review, planning, migration, incident response -- each with 8-10 step imperative protocols
- **Verification Gates** -- Won't claim done until tests pass. Mandatory completion checks.
- **Any LLM Provider** -- Fireworks, OpenAI, Anthropic, Ollama, any OpenAI-compatible endpoint. Your keys, your models, your data.
- **18 Built-in Tools** -- Read, Write, Edit, Bash, Glob, Grep, WebSearch, MultiEdit, Dispatch, and more
- **Subagent Dispatch** -- Up to 7 parallel agents for complex tasks with auto model routing
- **Cross-Session Memory** -- Learns across sessions. Remembers your project, your patterns.

## How It Works

```
you: fix the auth bug in login

  Engaging debugging + security

  Read src/auth/login.ts (42 lines)              0.2s
  Grep "token" -> 12 matches                     0.3s
  Edit src/auth/login.ts                          0.1s
    + const token = await verifyJWT(req);
    - const token = req.headers.auth;
  Bash npm test                                   1.4s
    42 passing, 0 failing

Auth now validates JWT properly. Bug fixed.
```

## Pricing

| Tier | Price | What You Get |
|------|-------|-------------|
| **Free** | $0 | 9 tools, 10 capabilities, 50 msgs/day. No account needed. |
| **Pro** | $12/mo | All 18 tools, 42 capabilities, verification gates, subagents, memory, unlimited |
| **Team** | $30/user/mo | Pro + shared memory, team settings, usage dashboard |

You bring your own LLM API key. ArqZero never sees your code or API keys.

## Supported Providers

Any OpenAI-compatible endpoint:

| Provider | Config |
|----------|--------|
| Fireworks AI | `baseURL: https://api.fireworks.ai/inference/v1` |
| OpenAI | `baseURL: https://api.openai.com/v1` |
| Together AI | `baseURL: https://api.together.xyz/v1` |
| Groq | `baseURL: https://api.groq.com/openai/v1` |
| Ollama (local) | `baseURL: http://localhost:11434/v1` |

## Commands

Type `/` in the prompt to see all commands, or use `/help`.

## Documentation

Visit [arqzero.dev/docs](https://arqzero.dev/docs)

## License

MIT
