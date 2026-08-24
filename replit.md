# Replit Workspace

## Project

FantaAstaAPP

## Current Version

v0.13.0

## Package Manager

pnpm

## Runtime

Node.js 20

## Main Commands

pnpm install

pnpm dev

pnpm build

pnpm test

pnpm typecheck

pnpm db:generate

pnpm db:migrate

## Workspace

apps/server

apps/web

packages/contracts

packages/domain

## Database

SQLite

Drizzle ORM

## Development Branch

develop

## Stable Branch

main

## Documentation

README.md

PROJECT_CONTEXT.md

docs/ARCHITECTURE.md

docs/DECISIONS.md

docs/CODING_STANDARDS.md

docs/ROADMAP.md

## Development Runtime Architecture

In Replit the project is started by the workspace workflow configured in `.replit`:

```text
Project workflow
→ pnpm dev
```

The root `pnpm dev` command starts both development runtimes in parallel:

```text
pnpm dev
├─ @fantaastaapp/server dev
│  └─ node scripts/dev-server-supervisor.mjs
│     └─ tsx src/index.ts
│        └─ Fastify + Socket.IO on port 3001
└─ @fantaastaapp/web dev
   └─ Vite on port 5173
```

The browser normally reaches the application through the Vite development server on port `5173`.

The Vite proxy forwards:

```text
/api/*      → http://localhost:3001
/assets/*   → http://localhost:3001
/socket.io  → http://localhost:3001
```

Therefore the effective development topology is:

```text
Browser
  ↓
Vite :5173
  ├─ React UI
  ├─ /api/* ────────┐
  ├─ /assets/* ─────┤
  └─ /socket.io/* ──┤
                     ↓
                Fastify :3001
                     ↓
                   SQLite
```

## Frontend HMR vs Backend Reload

Vite observes frontend source changes and updates the browser through HMR.

The backend development process is different.

`dev-server-supervisor.mjs` starts:

```text
tsx src/index.ts
```

but it is not a general TypeScript source watcher.

As a consequence:

- frontend changes can appear immediately in the browser;
- backend changes can pass tests and typecheck while the already-running Fastify process still serves older code;
- before a browser-level test of newly modified backend behavior, the Fastify runtime must be restarted.

Operational rule:

```text
Frontend-only change
→ Vite HMR
→ browser verification
```

```text
Backend change
→ tests / typecheck
→ commit
→ controlled development-runtime restart
→ browser verification
```

A successful test or typecheck validates the source code on disk; it does not prove that an already-running Fastify process has reloaded that source.

## Development Runtime Restart

Do not start a second `pnpm dev` or `pnpm dev:server` while the Replit Project workflow is already active.

When a full restart is required, stop the root `pnpm dev` process and start a fresh runtime from the current source tree.

Before restarting, always consider the auction-session state.

At server startup `StartupRecoveryService` runs before Fastify starts listening. A session found in `RUNNING` is treated as an interrupted live auction and enters the startup-recovery safety flow.

Therefore:

- a restart while the real session is `READY` is neutral;
- a restart while the real session is `RUNNING` is not neutral and must be treated as an operational recovery event;
- never restart the backend casually during a live auction.

This behavior is intentional and is part of the resilience design.

## B6 Runtime Incident — Operational Lesson

During the v0.14 interface-completion work, the browser displayed the new `Avvia asta` frontend while Fastify was still running code loaded before the authoritative START implementation.

The visible result was:

```text
RUNNING
stateVersion = 0
```

with no `SESSION_STARTED` event and no `START_SESSION` command-registry entry.

After a controlled reset of that isolated legacy transition and a full development-runtime restart, the same frontend action correctly produced:

```text
READY #0
→ START_SESSION
→ RUNNING #1
→ SESSION_STARTED
```

and the new state was propagated consistently to both `/admin` and `/public`.

This incident established the mandatory backend-restart rule described above.

## Production / LAN Runtime Requirement

The Replit development topology is not the target runtime for the auction evening.

The production/LAN target must avoid dependence on the Vite development server and should require one controlled application startup on the host PC.

The intended operational model is:

```text
Host PC
├─ compiled FantaAstaAPP backend
├─ Fastify
├─ Socket.IO
├─ SQLite
└─ compiled frontend
```

with the other devices connecting over the auction LAN:

```text
/admin   → auctioneer/admin tablet or PC
/remote  → team smartphones
/public  → public monitor/projector
```

Before the operational v0.14 release candidate, verify and document the final production startup command and whether Fastify directly serves the compiled `apps/web/dist` frontend.

The auction operator must not be required to manually start separate Vite and Fastify development processes in production.
