# ArqZero Commercial Strategy — Design Document

**Date:** 2026-03-22
**Author:** prana
**Status:** Draft

---

## Vision

ArqZero is a terminal-native AI coding agent sold as a BYOK (Bring Your Own Key) product. Users install via npm, bring their own LLM API key, and pay for ArqZero's intelligence layer — capabilities, subagents, verification gates, memory, plugins.

**Phase 1:** npm CLI + website (current focus)
**Phase 2:** VS Code / IDE extension
**Phase 3:** Web app (browser-based)
**Phase 4:** Android / mobile companion

---

## Business Model

### Revenue: Subscription tiers

| Tier | Price | Features |
|---|---|---|
| **Free** | $0 | 9 basic tools (Read, Write, Edit, Bash, Glob, Grep, LS, WebSearch, WebFetch), 5 slash commands (/help, /clear, /config, /quit, /status), no subagents, no memory, no plugins, 10 capabilities, basic markdown rendering |
| **Pro** | $12/mo | All 18 tools, all 25+ slash commands, subagents (up to 7 parallel), cross-session memory, plugins, all 42 capabilities with verification gates, diff previews, shimmer spinner, session resume, custom commands, worktrees |
| **Team** | $30/user/mo | Pro + shared team memory, ARQZERO.md sync across team, team settings profiles, usage dashboard, priority support |

### What users pay for vs what's free

**Free = functional CLI.** Users can install, configure their API key, and use ArqZero for basic coding tasks. Good enough to evaluate, not good enough to depend on.

**Pro = the intelligence layer.** The 42 capabilities with structured methodologies, subagent dispatch, verification gates, memory persistence, and the full tool suite. This is what makes ArqZero an *agent* rather than a chat wrapper.

**Team = collaboration.** Shared context, team-wide ARQZERO.md, usage visibility.

### Cost structure

| Item | Cost | Notes |
|---|---|---|
| LLM compute | $0 | User's API key, user's bill |
| License server | ~$5/mo | Simple key validation API on Cloudflare Workers or Vercel Edge |
| Website hosting | ~$0-20/mo | Static site on Vercel/Netlify |
| npm registry | $0 | npm publish is free |
| Payment processing | Stripe (~2.9% + $0.30) | Standard |
| Domain | ~$12/year | arqzero.dev or arqzero.ai |

**Margin: ~95%** on Pro subscriptions. No GPU costs, no inference costs, no heavy infrastructure.

---

## LLM Provider Strategy

### Phase 1: Any OpenAI-compatible endpoint

ArqZero already uses the `openai` npm package with a configurable `baseURL`. This covers:

| Provider | baseURL | Notes |
|---|---|---|
| Fireworks AI | `https://api.fireworks.ai/inference/v1` | Current default, GLM-4.7 |
| OpenAI | `https://api.openai.com/v1` | GPT-4o, o1 |
| Anthropic (via proxy) | Various | Through OpenRouter or LiteLLM |
| Together AI | `https://api.together.xyz/v1` | Open-source models |
| Groq | `https://api.groq.com/openai/v1` | Fast inference |
| Ollama (local) | `http://localhost:11434/v1` | Free, private, offline |
| Any OpenAI-compatible | User-configured | Maximum flexibility |

### Config format

```json
{
  "provider": {
    "baseURL": "https://api.fireworks.ai/inference/v1",
    "apiKey": "fw_...",
    "model": "accounts/fireworks/models/glm-4p7"
  }
}
```

Single adapter, user configures the endpoint. ArqZero doesn't care which LLM is behind it — as long as it speaks OpenAI chat completions with tool use.

### Phase 2: Native Anthropic adapter

Add back the Anthropic SDK adapter for direct Claude API access (not OpenAI-compatible). This captures the Claude Code users who want to switch clients but keep their Anthropic API key.

---

## Licensing System

### How it works

1. User signs up at arqzero.dev, gets a license key
2. User installs: `npm i -g arqzero`
3. First run: `arqzero setup` — enter license key + LLM API key
4. ArqZero validates the license key on startup (one HTTP call to license API)
5. License key determines tier (free/pro/team)
6. Features gate based on tier

### License validation

- **Online check:** On first run each day, ping `https://api.arqzero.dev/v1/license` with the key
- **Offline grace:** Cache the last validation for 7 days. ArqZero works offline for a week.
- **No phone-home per request.** Validation happens once per day, not per LLM call.
- **Graceful degradation:** If license check fails (network down), fall back to cached tier. If cache expired, fall back to free tier.

### License API (minimal)

```
POST /v1/license/validate
Body: { "key": "arq_..." }
Response: { "valid": true, "tier": "pro", "expiresAt": "2027-01-01" }
```

Host on Cloudflare Workers — zero cold start, free tier covers thousands of validations/day.

### Anti-piracy

Not a priority for v1. The target market (developers) will pay $12/mo if the product is good. Over-investing in DRM alienates early adopters. Simple key validation is sufficient.

---

## Feature Gating

### Implementation approach

In `src/config/schema.ts`, add a `tier` field:

```typescript
export type Tier = 'free' | 'pro' | 'team';
```

In each feature's code path, check the tier before executing:

```typescript
// In tool executor
if (PAID_TOOLS.has(toolName) && config.tier === 'free') {
  return { content: 'This tool requires ArqZero Pro. Upgrade at arqzero.dev', isError: true };
}
```

### What's gated

| Feature | Free | Pro | Team |
|---|---|---|---|
| Basic tools (Read, Write, Edit, Bash, Glob, Grep, LS) | Yes | Yes | Yes |
| WebSearch, WebFetch | Yes | Yes | Yes |
| MultiEdit, NotebookRead/Edit, TodoWrite/Read | No | Yes | Yes |
| BashOutput, KillShell | No | Yes | Yes |
| Dispatch (subagents) | No | Yes | Yes |
| Slash commands (basic 5) | Yes | Yes | Yes |
| Slash commands (all 25+) | No | Yes | Yes |
| Cross-session memory | No | Yes | Yes |
| Checkpoints / /undo | No | Yes | Yes |
| Plugins | No | Yes | Yes |
| Custom commands | No | Yes | Yes |
| Worktrees | No | Yes | Yes |
| Session resume (-c) | No | Yes | Yes |
| Capabilities (basic 10) | Yes | Yes | Yes |
| Capabilities (all 42 + verification gates) | No | Yes | Yes |
| Headless mode (-p) | Yes | Yes | Yes |
| Shimmer spinner | No | Yes | Yes |
| Diff previews in permissions | No | Yes | Yes |
| MCP support | No | Yes | Yes |
| Hooks | No | Yes | Yes |
| Shared team memory | No | No | Yes |
| Team settings sync | No | No | Yes |
| Usage dashboard | No | No | Yes |

---

## Website (arqzero.dev)

### Pages

1. **Landing page** — Hero with terminal demo GIF, value prop, pricing, "Get started in 30 seconds"
2. **Docs** — Installation, configuration, tools reference, slash commands, capabilities guide
3. **Pricing** — Three tiers with feature comparison
4. **Blog** — Release notes, tutorials, comparisons (ArqZero vs Claude Code vs Cursor)
5. **Dashboard** — License management, usage stats (Team tier), billing via Stripe

### Tech stack

- **Framework:** Astro or Next.js (static export)
- **Hosting:** Vercel (free tier)
- **Auth:** Clerk or Auth.js
- **Payments:** Stripe Checkout + Customer Portal
- **License API:** Cloudflare Workers

### Key messaging

**Headline:** "The terminal-native coding agent. Bring your own AI."

**Subheadline:** "ArqZero is an AI engineering agent that follows real methodologies — TDD, debugging protocols, code review checklists — not ad-hoc prompting. Works with any OpenAI-compatible LLM."

**Differentiators:**
- Not a chat wrapper — a structured engineering agent
- 42 capabilities with real multi-step methodologies
- Verification gates that prevent half-done work
- Subagent parallelization for complex tasks
- Works with ANY LLM provider (Fireworks, OpenAI, Ollama, etc.)
- No vendor lock-in — your API key, your data, your terminal

---

## Distribution

### npm

```bash
npm install -g arqzero
arqzero setup
```

Package is public on npm. Source code can be:
- **Open-core:** Core is open source (MIT/Apache), premium features in a separate private package
- **Closed source:** npm package is compiled/minified, source on private repo

**Recommendation: Open-core.** The terminal agent market is trust-sensitive. Developers won't install a closed-source tool that runs bash commands on their machine. Open-core builds trust while protecting premium features.

### Open-core structure

```
arqzero/                    (public, MIT)
  src/core/                 Engine, tools, permissions
  src/cli/                  TUI, components
  src/api/                  Provider adapters

@arqzero/pro                (private npm, requires license)
  src/agents/               Subagent system
  src/memory/               Cross-session memory
  src/plugins/              Plugin loader
  src/registry/             42 capabilities
  src/checkpoints/          Undo system
```

Free users get the public package. Pro users install `@arqzero/pro` which the main package dynamically loads if present.

---

## Roadmap

### Phase 1: Commercial Launch (4-6 weeks)

1. **Multi-provider support** — Refactor config to support any OpenAI-compatible baseURL
2. **License system** — Key validation API, tier-based feature gating
3. **Website** — Landing page, docs, pricing, Stripe integration
4. **npm publish** — Public package, clean README, `arqzero setup` wizard
5. **Feature gating** — Free vs Pro enforcement in code
6. **Polish** — Fix remaining bugs, improve TUI stability

### Phase 2: Growth (2-3 months post-launch)

7. **Anthropic native adapter** — Direct Claude API support (not just OpenAI-compat)
8. **VS Code extension** — Sidebar panel that wraps ArqZero's engine
9. **Team features** — Shared memory, team ARQZERO.md, usage dashboard
10. **Plugin marketplace** — Community-contributed capabilities and tools

### Phase 3: Platform (6+ months)

11. **Web app** — Browser-based ArqZero (like Claude.ai but for coding)
12. **Android companion** — Monitor agents, approve permissions, review diffs on mobile
13. **Enterprise** — SSO, audit logs, compliance, on-prem deployment
14. **API** — ArqZero-as-a-Service for other tools to embed

---

## Competitive Positioning

| | ArqZero | Claude Code | Cursor | Continue |
|---|---|---|---|---|
| **Interface** | Terminal TUI | Terminal TUI | IDE (VS Code fork) | IDE extension |
| **LLM** | Any (BYOK) | Claude only | OpenAI/Claude | Any |
| **Price** | $12/mo + BYOK | $20-200/mo (includes compute) | $20/mo (includes compute) | Free + BYOK |
| **Open source** | Open-core | No | No | Yes (MIT) |
| **Methodologies** | 42 structured capabilities | Ad-hoc prompting | Ad-hoc prompting | Ad-hoc prompting |
| **Subagents** | Yes (7 parallel) | Yes | No | No |
| **Verification gates** | Yes (mandatory) | No | No | No |

**ArqZero's unique angle:** It's the only agent that follows *structured engineering methodologies* — not just "write code." The capability system with verification gates is something no competitor has.

---

## Success Metrics

### Launch targets (first 3 months)

| Metric | Target |
|---|---|
| npm installs | 5,000 |
| Free users | 1,000 |
| Pro subscribers | 100 |
| MRR | $1,200 |
| GitHub stars (if open-core) | 500 |

### Key health metrics

- **Activation rate:** % of installers who complete setup and send first message
- **Retention (D7):** % of users who return after 7 days
- **Free-to-Pro conversion:** % of free users who upgrade
- **Churn:** Monthly Pro subscriber cancellation rate

---

## Risks

| Risk | Mitigation |
|---|---|
| Claude Code is free with Pro plan | ArqZero works with ANY LLM, not just Claude. Price undercuts at $12 vs $20. Open-core builds trust. |
| Fireworks API reliability | Multi-provider support means users aren't locked to one provider |
| Low conversion free->pro | Ensure free tier is useful but clearly limited. Pro features must be demonstrably better. |
| Open source fork | Inevitable with open-core. Premium features in private package. Build brand and community moat. |
| LLM quality varies by provider | Document recommended models per provider. Default to proven models. |

---

## Immediate Next Steps

1. Refactor provider config to support any OpenAI-compatible endpoint
2. Build license validation system (Cloudflare Worker)
3. Add tier field to config and feature gating
4. Create landing page (arqzero.dev)
5. Set up Stripe billing
6. npm publish as public package
7. Write docs
8. Launch on Product Hunt, Hacker News, r/programming




  ░█████╗░██████╗░░██████╗░  ███████╗ ██████╗ ██████╗░ ░█████╗░
  ██╔══██╗██╔══██╗██╔═══██╗  ╚══███╔╝ ██╔═══╝ ██╔══██╗ ██╔══██╗
  ███████║██████╔╝██║ █ ██║    ███╔╝  █████╗  ██████╔╝ ██║  ██║
  ██╔══██║██╔══██╗╚███████   ███╔╝    ██╔══╝  ██╔══██╗ ╚█████╔╝
  ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═══╝███  ███████╗  ██████╗ ╚═╝  ╚═╝  ╚════╝
                        
                      