<p align="center">
  <img src="https://luciferdono.github.io/ArqZero/logo.png" alt="ArqZero" width="120" />
</p>

<h1 align="center">ArqZero</h1>

<p align="center">
  Terminal-native AI engineering agent with structured methodologies.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/arqzero"><img src="https://img.shields.io/npm/v/arqzero?color=00D4AA&label=npm" alt="npm version" /></a>
  <a href="https://github.com/LuciferDono/ArqZero/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue" alt="license" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18.19-green" alt="node" /></a>
  <a href="https://github.com/LuciferDono/ArqZero/issues"><img src="https://img.shields.io/github/issues/LuciferDono/ArqZero" alt="issues" /></a>
</p>

<p align="center">
  <a href="https://luciferdono.github.io/ArqZero/">Website</a> &middot;
  <a href="https://luciferdono.github.io/ArqZero/docs">Docs</a> &middot;
  <a href="https://github.com/LuciferDono/ArqZero/issues">Issues</a>
</p>

---

**Not a chatbot wrapper.** ArqZero follows real engineering methodology — 42 structured capabilities, verification gates, and parallel subagents. Bring your own LLM key. Your code never leaves your machine.

## Install

```bash
npm i -g arqzero
```

## Quick Start

```bash
arqzero setup     # Configure your LLM API key
arqzero           # Start coding
```

Headless mode:

```bash
arqzero -p "fix the bug in src/index.ts"
arqzero -p "add tests for the auth module" --output-format json
```

## What Makes ArqZero Different

| Feature | ArqZero | Typical AI CLI |
|---------|---------|----------------|
| **Methodology** | 42 structured capabilities (TDD, debugging, code review, migration, incident response) with 8-10 step protocols | Freeform prompting |
| **Verification** | Won't claim done until tests pass. Mandatory completion checks. | "I've made the changes" |
| **Provider** | Any OpenAI-compatible endpoint. Your keys, your models, your data. | Single vendor lock-in |
| **Tools** | 18 built-in (Read, Write, Edit, Bash, Glob, Grep, WebSearch, MultiEdit, Dispatch...) | Basic file ops |
| **Parallelism** | Up to 7 subagents via Dispatch tool with auto model routing | Sequential only |
| **Memory** | Cross-session learning. Remembers your project and patterns. | Stateless |
| **Plugins** | Extensible plugin system with hooks, commands, and capabilities | Closed |

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

## Supported Providers

Any OpenAI-compatible endpoint works out of the box:

| Provider | Base URL |
|----------|----------|
| **Fireworks AI** (default) | `https://api.fireworks.ai/inference/v1` |
| OpenAI | `https://api.openai.com/v1` |
| Together AI | `https://api.together.xyz/v1` |
| Groq | `https://api.groq.com/openai/v1` |
| Ollama (local) | `http://localhost:11434/v1` |

## Tools

| Tool | Description |
|------|-------------|
| `Read` | Read files with line numbers |
| `Write` | Create or overwrite files |
| `Edit` | Surgical string replacements |
| `MultiEdit` | Batch edits across files |
| `Bash` | Execute shell commands |
| `BashOutput` | Read output from background commands |
| `KillShell` | Stop running processes |
| `Glob` | Fast file pattern matching |
| `Grep` | Content search with regex |
| `LS` | Directory listing |
| `WebSearch` | Search the web |
| `WebFetch` | Fetch URL content |
| `Prompt` | Ask the user a question |
| `Dispatch` | Launch parallel subagents |
| `TodoWrite` | Track task progress |
| `TodoRead` | Read task list |
| `NotebookRead` | Read Jupyter notebooks |
| `NotebookEdit` | Edit notebook cells |

## Commands

25 slash commands. Type `/` to see them all, or `/help` for details.

Key commands: `/model` `/config` `/compress` `/check` `/setup` `/think` `/undo` `/skill` `/memory` `/agents` `/loop` `/vim`

## Pricing

| Tier | Price | What You Get |
|------|-------|-------------|
| **Free** | $0 | 9 tools, 10 capabilities, 50 msgs/day. No account needed. |
| **Pro** | $15/mo | All 18 tools, 42 capabilities, verification gates, subagents, memory, unlimited |
| **Team** | $30/user/mo | Pro + shared memory, team settings, usage dashboard |

You bring your own LLM API key. ArqZero never sees your code or API keys.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## Security

Found a vulnerability? See [SECURITY.md](SECURITY.md). Do not open a public issue.

## License

[Apache License 2.0](LICENSE)

---

<p align="center">
  Built by <a href="https://github.com/LuciferDono">prana</a>
</p>
