# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in ArqZero, please report it responsibly.

**Do NOT open a public issue.**

Email: **arqzerohq@gmail.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

We will acknowledge receipt within 48 hours and aim to release a fix within 7 days for critical issues.

## Scope

| In Scope | Out of Scope |
|----------|-------------|
| CLI tool (src/) | Your LLM provider's API |
| Backend API (backend/) | Third-party plugins |
| Auth/token handling | Your API keys (BYOK) |
| Path traversal protection | Your system configuration |

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.x     | Yes       |
| < 2.0   | No        |

## Security Features

ArqZero includes:
- Path traversal guard with sensitive directory blocklist (.ssh, .gnupg, .aws, .env)
- JWT with mandatory strong secrets (>= 32 chars)
- Brute-force protection on verification endpoints
- Rate limiting on all auth endpoints
- No storage of user API keys (BYOK model)
