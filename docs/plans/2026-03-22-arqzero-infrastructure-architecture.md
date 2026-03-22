# ArqZero Commercial Infrastructure Architecture

**Date:** 2026-03-22
**Author:** labs:architect
**Status:** Draft — pending user approval

---

## System Architecture

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

## Auth Flow: Email + 6-Digit Code

1. `arqzero login` → prompts for email
2. Backend sends 6-digit code to email (via Resend)
3. User enters code in terminal
4. Backend issues JWT access token (1hr) + refresh token (90 days)
5. Stored in `~/.arqzero/auth.json` (permissions 0600)
6. On startup: if JWT expired, refresh silently. If refresh fails, prompt re-login.
7. Offline grace: 7 days from last validation

## Token Strategy

| Token | Format | Lifetime | Contains |
|---|---|---|---|
| Access | JWT (HS256) | 1 hour | user_id, tier, daily_cap |
| Refresh | 256-bit random | 90 days | (opaque, hashed in DB) |
| Verify Code | 6 digits | 10 minutes | (hashed in DB) |

## Database Schema (PostgreSQL)

- `users` — id, email, email_verified, display_name
- `licenses` — id, user_id, tier (free/pro/team), status, stripe_customer_id, period_end
- `sessions` — id, user_id, refresh_token (hashed), machine_id, device_label, expires_at
- `daily_usage` — id, user_id, date, message_count (UNIQUE on user+date)
- `verification_tokens` — id, user_id, token_hash, purpose, expires_at

## API Endpoints (8 total)

```
POST /auth/login       — Send verification code
POST /auth/verify      — Exchange code for tokens
POST /auth/refresh     — Refresh access token
POST /auth/logout      — Revoke session

GET  /license          — Get current license
POST /usage/sync       — Sync daily usage count

POST /checkout/session — Create Stripe checkout URL
POST /webhooks/stripe  — Stripe payment events
```

## Usage Cap Enforcement

- Free: 50 messages/day (tracked locally, synced to server every 10 msgs)
- Pro: unlimited
- Team: unlimited
- Client-side enforcement with server reconciliation
- Multi-device: server merges counts across devices

## Source Code Protection

- Minify/bundle with esbuild (raises bypass effort)
- Distribute tier checks across feature code (no single gate)
- JWT signature verification (prevents fake tokens)
- Accept that determined devs can bypass — convert them with good UX instead

## Infrastructure Cost

| Phase | Users | Monthly Cost |
|---|---|---|
| Launch | 0-1000 | ~$25 (Supabase free + Railway $5 + Resend free + domain) |
| Growth | 1-10K | ~$50-100 (Supabase Pro + Railway Pro) |
| Scale | 10K+ | ~$200 (same architecture, bigger instances) |

## Build Sequence

- **Week 1:** Auth endpoints + CLI login/logout + token storage + free tier cap
- **Week 2:** Stripe integration + license table + Pro tier unlock
- **Week 3:** Usage sync + offline grace + session management + polish
