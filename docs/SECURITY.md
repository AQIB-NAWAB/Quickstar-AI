# Security baseline

## Credentials

- Dashboard auth: JWT in httpOnly cookie + optional `Authorization: Bearer`
- Widget auth: `X-Client-Id` (public). Optional `X-Client-Secret` for server-to-server
- Secrets hashed with SHA-256 at rest; plaintext shown once on create/rotate
- Project `allowedOrigins` enforced when `Origin` header is present

## Rate limiting

- Redis sliding window per IP (`RATE_LIMIT_MAX_IP`) and per client (`RATE_LIMIT_MAX_CLIENT`)
- Fails open only if Redis is unreachable in local/dev (still logs)

## Request hygiene

- Helmet enabled
- Body limit 1MB (down from legacy 150MB)
- Zod validation on public inputs
- Request IDs via Fastify

## RAG / LLM

- All model calls server-side only
- Low-confidence answers can escalate; cache skipped for low confidence
- Prompt injection mitigated by grounded-tool answers + system instructions

## Ops

- See [CUTOVER.md](./CUTOVER.md) for dual-run and production checklist
- Never commit `.env`; rotate `JWT_SECRET` before production

## Supply-chain incident (2026)

A compromised GitHub account injected a remote-code-execution backdoor into
this codebase. This clean tree was rebuilt from the infected fork with
malicious history omitted.

Removed artifacts:

- Obfuscated PolinRider-style loader appended to `apps/web/tailwind.config.js`
  (`global['!']='9-9603'`)
- Fake font payload
  `apps/web/src/app/dashboard/projects/[id]/analytics/public/fonts/fa-solid-400.woff2`
  (JavaScript disguised as a WOFF2)
- Camouflage Font Awesome files and a "Blockchain Explorer" README under that
  unused `analytics/public/fonts/` directory
- `.vscode/tasks.json` that ran the fake font with Node on `folderOpen`
- `.vscode/settings.json` that enabled automatic tasks and hid the terminal
- Attacker `.gitignore` entry `config.bat`, plus un-ignoring `.env` and `.vscode/`

Re-check the tree with `bash scripts/check-supply-chain.sh`.

If this account or any developer machine opened the infected repo, rotate
GitHub tokens, npm tokens, cloud keys, and `JWT_SECRET` / `ENCRYPTION_KEY`.
Do not reuse commits or branches from the infected fork.
