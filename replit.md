# FantaAstaAPP

Applicazione locale per la gestione di un'asta di fantacalcio dal vivo.

## Stato progetto

Versione corrente:

0.1 — Fondazioni

## Obiettivi della 0.1

- Monorepo pnpm
- TypeScript
- Fastify
- SQLite
- Drizzle ORM
- React + Vite
- Vitest
- Pino
- GET /api/health
- pagina /admin minima

## Stack approvato

- Node.js
- TypeScript
- Fastify
- React
- Vite
- SQLite
- Drizzle ORM
- Socket.IO
- Zod
- Pino
- Vitest

## Architettura

Server autoritativo.

Principio:

Command → Validation → Event → State Update → Broadcast

## Repository

```text
apps/
  server/
  web/

packages/
  contracts/
  domain/

data/
backups/
logs/
docs/