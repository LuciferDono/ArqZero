# Changelog

All notable changes to ArqZero are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Multi-provider expansion: Anthropic, OpenRouter, OpenAI-compatible adapters
- Provider factory + registry layer (`src/api/factory.ts`, `src/api/registry.ts`)
- OpenRouter multi-key fallback chain — auto-rotates on `401/402/403/429/5xx`
- `/provider` slash command for live provider switching

### Changed
- README: license badge corrected (Apache 2.0), photo path fixed

### Removed
- Stale launch-priorities HTML artifact (`docs/research/arqzero-launch-priorities.html`)

## [2.0.0] — 2026-03-22

### Added
- Commercial layer — backend (Hono + Supabase + Drizzle), website (Next.js, GitHub Pages), CLI auth
- Email-based device auth (Resend) with brute-force protection + 5-attempt rate limit
- JWT access tokens (1h) + refresh tokens (90d) with 7-day offline grace
- Distributed feature gating across tools, commands, and capabilities
- Path-guard with sensitive directory blocklist (`.ssh`, `.gnupg`, `.aws`, `.env`)
- Worktree isolation flag (`--worktree`)
- Cross-session memory at `~/.arqzero/memory/`
- 11 hook event types (PreToolUse, PostToolUse, SessionStart, SessionEnd, etc.)
- Plugin manifest + loader + manager
- Dispatch tool — up to 7 parallel subagents with auto model routing
- 18 built-in tools, 42 structured capabilities
- 25 slash commands incl. `/compress`, `/check`, `/setup`, `/think`, `/undo`, `/save-session`
- Verification gates (build, type, lint, test, security, diff) before completion claims
- Custom slash commands via `.arqzero/commands/*.md`
- Strategic context compaction at token limits
- Comprehensive test suite — 747 CLI tests, 24 backend tests

### Changed
- Default provider: Fireworks AI with GLM-4.7 (Enso) and GLM-5 (PRIMUS)
- TUI rebrand to "The Grid" — amber/gold (#FFB800), shimmer spinner, command center
- Config dir moved to `~/.arqzero/`
- npm package renamed to `arqzero`, bin command `arqzero`
- License switched to Apache 2.0

### Security
- Hard startup error if `JWT_SECRET` missing or < 32 chars
- `crypto.randomInt` for verification codes (replaced `Math.random`)
- Rate limiting on all auth endpoints (login, verify, refresh)
- CORS conditional on `NODE_ENV` (no localhost in production)
- Old token cleanup on login + verify
- Team-memory value cap at 64 KB
- Old `/auth/verify` endpoint invalidates all unused tokens after 5 wrong attempts

## [1.x] — Pre-history

Pre-2.0 was the original Claude Code clone phase. v2.0 was a rewrite with the labs-native architecture, commercial layer, and Fireworks default.

[Unreleased]: https://github.com/LuciferDono/ArqZero/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/LuciferDono/ArqZero/releases/tag/v2.0.0
