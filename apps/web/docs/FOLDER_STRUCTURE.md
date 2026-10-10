# `apps/web` folder structure

Next.js App Router app. **Routes stay in `src/app/`** (thin pages). Product code lives in **`features/`**, shared primitives in **`components/`**, and I/O in **`lib/`**.

## Layout

```
src/
  app/                          # URL routes only — import from features, keep pages small
    (app)/                      # Authenticated staff console
    (auth)/                     # Login / register
    api/                        # BFF Route Handlers (cookies → gateway)
    page.tsx                    # Marketing landing
  features/                     # Domain slices (team ownership boundaries)
    auth/components/            # Login/register UI
    workspace/components/       # App shell, nav
    inbox/                      # F4 — list, thread, transcript
      components/
      hooks/
      lib/                      # Client API + types for conversations
    marketing/components/       # Landing page sections (public)
  components/
    brand/                      # Logo + companion (marketing + app shell)
    ui/                         # Design system (Button, Input, …)
  lib/
    client/                     # Browser-side helpers (gateway fetch)
    server/
      auth/                     # Cookies, JWT, session (server only)
      gateway/                  # Server fetch + BFF proxy to port 3000
      workspace/                # Workspace list/create helpers
    marketing/                    # Landing-only (avatar motion, hairline)
    utils.ts
  middleware.ts
```

## Rules for a team of three

1. **One feature folder per F-slot area** — avoid editing the same feature folder in one PR when possible; use `features/inbox`, `features/marketing`, etc. as merge boundaries.
2. **`app/` is routing** — no business logic; compose feature components and call `loadWorkspaceShell` / Route Handlers.
3. **`app/api/` is the BFF** — browser never sends httpOnly cookies to the gateway origin; add new gateway proxies here under the same workspace-scoped paths.
4. **`lib/server/*` is server-only** — import from Route Handlers, Server Components, and `middleware.ts` only. Do not import from `"use client"` components.
5. **`components/ui` and `components/brand`** — shared; coordinate in chat before breaking API.
6. **Marketing** — everything under `features/marketing/` should not import from `features/inbox` or `features/workspace` (public vs staff).

## Import cheat sheet

| Old (deprecated) | New |
|------------------|-----|
| `@/components/auth/*` | `@/features/auth/components/*` |
| `@/components/app/*` | `@/features/workspace/components/*` |
| `@/components/inbox/*` | `@/features/inbox/components/*` |
| `@/lib/auth/*` | `@/lib/server/auth/*` or `@/lib/server/gateway/*` |
| `@/lib/conversations/*` | `@/features/inbox/lib/*` |
| `@/lib/avatar/*` | `@/lib/marketing/avatar/*` |
| `@/lib/hairline/*` | `@/lib/marketing/hairline/*` |

## Suggested ownership (example)

| Area | Path | Typical F-slots |
|------|------|-----------------|
| Public marketing | `features/marketing`, `components/brand`, `lib/marketing` | Landing, F1 public |
| Auth + shell | `features/auth`, `features/workspace`, `lib/server/auth` | F1 |
| Inbox / agents | `features/inbox`, future `features/agents` | F4, F2 |
| BFF + gateway | `app/api`, `lib/server/gateway` | Shared — one owner per change |

Run `pnpm --filter @quickstart/web build` before opening a PR that moves files or changes imports.
