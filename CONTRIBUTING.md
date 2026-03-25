# Contributing to ArqZero

Thanks for wanting to contribute. Here's how to get started.

## Development Setup

```bash
git clone https://github.com/LuciferDono/ArqZero.git
cd ArqZero
npm install
npm run dev          # Start in dev mode
npx tsx --test src/  # Run tests
```

**Requirements:** Node.js >= 18.19.0

## Project Structure

```
src/
  api/           # LLM provider adapters (Fireworks, OpenAI-compatible)
  auth/          # License, gates, token storage
  cli/           # TUI components (Ink/React)
  commands/      # Slash commands (/help, /model, etc.)
  config/        # Settings, model router, schema
  core/          # Conversation engine, agentic loop
  hooks/         # Event system (PreToolUse, PostToolUse, etc.)
  memory/        # Cross-session persistence
  plugins/       # Plugin loader and manager
  registry/      # Capabilities, matcher, injector
  session/       # Context management, compaction
  tools/         # 18 built-in tools (Read, Write, Bash, etc.)
backend/         # API server (Hono + Supabase)
website/         # Marketing site (Next.js)
```

## How to Contribute

### Bug Reports

Open an issue with:
- What you expected
- What happened instead
- Steps to reproduce
- Your Node.js version and OS

### Feature Requests

Open an issue describing the feature and why it's useful. We'll discuss before you build.

### Pull Requests

1. Fork the repo and create a branch from `master`
2. Write tests for any new functionality
3. Make sure all tests pass: `npx tsx --test src/`
4. Keep commits focused — one logical change per commit
5. Open a PR against `master`

### Code Style

- TypeScript with ESM (`"type": "module"`)
- All imports use `.js` extensions (even for `.ts` files)
- Tool exports: `export const fooTool: Tool = { ... }` (objects, not classes)
- Tests: `npx tsx --test <file>` (not `node --test`)
- No default exports unless required by a framework

### Tests

Every PR should include tests. We use Node's built-in test runner with tsx:

```bash
# Run a specific test
npx tsx --test src/tools/read.test.ts

# Run all tests (list files explicitly — glob expansion is broken on Windows)
npx tsx --test src/tools/read.test.ts src/tools/write.test.ts ...
```

### What We're Looking For

- New tool implementations
- Provider adapters (Anthropic, Google, Mistral, etc.)
- Plugin system extensions
- TUI improvements
- Documentation
- Bug fixes with test coverage

### What We're NOT Looking For

- Changes to the licensing/gating model
- Vendored dependencies
- AI-generated PRs without human review

## Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Be respectful, be constructive.

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.
