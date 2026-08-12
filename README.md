<p align="center">
  <img src="docs/images/logo.png" alt="FantaAstaAPP Logo" width="220">
</p>

<h1 align="center">FantaAstaAPP</h1>

<p align="center">
Offline-first Fantasy Football Auction Manager
</p>

<p align="center">

  <img src="https://img.shields.io/badge/version-v0.9.0-blue" alt="Version v0.9.0">
  <img src="https://img.shields.io/badge/Node.js-20.x-339933" alt="Node.js 20">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6" alt="TypeScript 5">
  <img src="https://img.shields.io/badge/React-19-61DAFB" alt="React 19">
  <img src="https://img.shields.io/badge/Fastify-5-black" alt="Fastify 5">
  <img src="https://img.shields.io/badge/SQLite-3-003B57" alt="SQLite 3">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License">
</p>

</p>

---

## Overview

FantaAstaAPP is an **offline-first**, **server-authoritative** application designed to manage live Fantasy Football auctions over a local Wi-Fi network.

Unlike traditional auction software, FantaAstaAPP synchronizes every connected device in real time while keeping the auction state entirely under the control of a single authoritative server.

The application has been designed around the real operational workflow of live fantasy football leagues, providing reliability, consistency and complete traceability of every action.

Starting with v0.6.0, FantaAstaAPP provides the complete backend workflow for a live fantasy football auction, covering:

- league configuration;
- player archive import;
- initial roster import;
- complete Auction Engine;
- REST APIs for auction operations.

Typical setup:

- 🖥️ Auctioneer (Administrator)
- 📱 One smartphone per team
- 👥 Optional spectators (read-only)
- 📺 Public display
- 📡 Local Wi-Fi network
- 💾 Local SQLite database

No Internet connection is required during the auction.

---

## Key Features

- Offline-first architecture
- Server-authoritative auction engine
- Real-time synchronization via Socket.IO
- Administrator Console
- Team Remote Controllers
- Public Display mode
- SQLite persistence
- Complete audit trail
- Automatic validation rules
- Backup & Recovery
- FMS import/export
- Manual correction tools

---

## Architecture

```text
                  Local Wi-Fi Network

        ┌─────────────────────────────────┐
        │        Administrator PC         │
        │                                 │
        │  Fastify + Auction Engine       │
        │  SQLite + Drizzle ORM           │
        └───────────────┬─────────────────┘
                        │
        ┌───────────────┼────────────────┐
        │               │                │
        ▼               ▼                ▼
   Team Remote     Team Remote     Public Display
    (Operator)      (Operator)        (Read Only)
```

The server is the single source of truth.

Every command follows the same lifecycle:

```text
Command
    ↓
Validation
    ↓
Domain Event
    ↓
State Update
    ↓
Realtime Broadcast
```

---

## Technology Stack

| Layer | Technology |
|--------|------------|
| Runtime | Node.js 20 |
| Language | TypeScript |
| Backend | Fastify |
| Frontend | React + Vite |
| Database | SQLite |
| ORM | Drizzle ORM |
| Realtime | Socket.IO |
| Validation | Zod |
| Logging | Pino |
| Testing | Vitest |

---

## Project Structure

```text
FantaAstaAPP/
├── apps/
│   ├── server/
│   └── web/
├── packages/
│   ├── contracts/
│   └── domain/
├── docs/
├── data/
├── backups/
├── logs/
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
└── LICENSE
```

---

## Current Status

Current Release

**v0.9.0**

Completed milestones

- ✅ Project foundations
- ✅ Monorepo setup
- ✅ Fastify backend
- ✅ React frontend
- ✅ SQLite persistence
- ✅ Drizzle ORM
- ✅ Health APIs
- ✅ Project documentation
- ✅ League persistence foundation
- ✅ Auction Session CRUD APIs
- ✅ Auction Session lifecycle commands
- ✅ Domain validation and conflict handling
- ✅ Backend integration test suite
- ✅ Team management backend
- ✅ Owner management backend
- ✅ Auction Session Team management
- ✅ Shared contracts for Teams, Owners and Auction Session Teams
- ✅ Repository layer for league configuration
- ✅ Service layer for league configuration
- ✅ REST APIs for Teams
- ✅ REST APIs for Owners
- ✅ REST APIs for Auction Session Teams
- ✅ Player domain model
- ✅ Roster Entry domain model
- ✅ FMS ReVo player archive import
- ✅ FMS ReVo initial roster import
- ✅ Transactional roster import
- ✅ Player import REST API
- ✅ Initial roster import REST API
- ✅ Auction Call domain model
- ✅ Auction Call Team domain model
- ✅ Maximum bid validation
- ✅ Auction opening and bidding workflows
- ✅ Pass and Undo Pass workflows
- ✅ Provisional award, confirmation and cancellation
- ✅ Auction Call SQLite persistence and migration
- ✅ Auction Call repository and application service
- ✅ Auction Call REST and command APIs
- ✅ Auction Engine integration test suite
- ✅ Socket.IO realtime infrastructure
- ✅ Device registration and team PIN authentication
- ✅ OPERATOR and OBSERVER roles
- ✅ Authoritative realtime auction snapshots
- ✅ Auction event and snapshot broadcasting
- ✅ Persistent stateVersion and command registry
- ✅ Atomic and idempotent auction command pipeline
- ✅ Socket.IO auction:command protocol
- ✅ Team remote BID, PASS and UNDO_PASS commands
- ✅ Confirmed auction award domain validation
- ✅ Transactional confirmed-award persistence
- ✅ Atomic roster, credits and player availability updates
- ✅ Persistent auction_events domain audit trail
- ✅ AUCTION_AWARD_CONFIRMED audit event
- ✅ Complete rollback of confirmed awards and audit on failure
- ✅ Post-commit backup requester boundary
- ✅ Idempotent confirmation replay without duplicate backup requests
- ✅ PUBLIC_DISPLAY realtime read-only role
- ✅ Session-level Public Display registration
- ✅ Authoritative Public Display projection
- ✅ League branding in the Public Display
- ✅ Current player, price, leader and turn presentation
- ✅ Recent confirmed awards panel with internal scrolling
- ✅ Team credits, maximum bid and P/D/C/A composition
- ✅ PASSED and EXCLUDED visual overlays
- ✅ Session status indicators and SUSPENDED banner
- ✅ STANDARD, HIGH_CONTRAST_OUTDOOR, COMPACT and DARK display modes
- ✅ Electronic roster overview with roster entries and free slots
- ✅ 33 backend test files
- ✅ 236 backend tests passing
- ✅ 10 domain test files
- ✅ 86 domain tests passing
- ✅ Full monorepo type checking
- ✅ Full monorepo production build

Auction Session lifecycle

```text
SETUP
  ↓ ready
READY
  ↓ start
RUNNING
  ├─ suspend → SUSPENDED
  │               ↓ resume
  │             RUNNING
  └─ complete → COMPLETED
                    ↓ close
                  CLOSED

```

Next milestone

➡ **v0.10.0 — Sospensione e resilienza**

---

## Quick Start

Install dependencies

```bash
pnpm install
```

Run the development environment

```bash
pnpm dev
```

Build the project

```bash
pnpm build
```

Run tests

```bash
pnpm test
```

---

## Applications

| Interface | Path |
|-----------|------|
| Administrator Console | `/admin` |
| Team Remote Controller | `/remote` |
| Public Display | `/public` |

---

## Public Display

Version v0.9.0 introduces a realtime, read-only Public Display for the shared auction monitor.

Main capabilities:

- fullscreen `/public` view driven exclusively by the authoritative server snapshot;
- session-level `PUBLIC_DISPLAY` realtime role with no auction write commands;
- current player, price, provisional leader and turn;
- recent confirmed awards;
- remaining credits, maximum bid and P/D/C/A composition for all teams;
- visual overlays for `PASSED` and `EXCLUDED` teams, including exclusion reason;
- session status indicators and a dedicated `SUSPENDED` banner;
- `STANDARD`, `HIGH_CONTRAST_OUTDOOR`, `COMPACT` and `DARK` visual modes;
- electronic roster overview with roster entries and free role slots.

---

## 📚 Documentation

The `docs/` directory contains the complete project documentation.

### Functional Design

| Document | Description |
|----------|-------------|
| [FANTA_ASTA_APP_SPEC.md](docs/FANTA_ASTA_APP_SPEC.md) | Complete functional specification |
| [IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md) | Development phases and milestones |
| [INITIAL_STRUCTURE.md](docs/INITIAL_STRUCTURE.md) | Initial repository organization |

### Technical Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture |
| [CODING_STANDARDS.md](docs/CODING_STANDARDS.md) | Coding conventions |
| [DECISIONS.md](docs/DECISIONS.md) | Architecture Decision Records |
| [ROADMAP.md](docs/ROADMAP.md) | Technical roadmap |

---

## Roadmap

| Version | Status |
|----------|--------|
| v0.1 | ✅ Foundations |
| v0.2 | ✅ Persistence & Documentation |
| v0.3 | ✅ Auction Session Management |
| v0.4 | ✅ League Configuration |
| v0.5 | ✅ Player Import & Initial Rosters |
| v0.6 | ✅ Auction Engine |
| v0.7 | ✅ Realtime Controllers |
| v0.8 | ✅ Confirmed Awards & Transactions |
| v0.9    | ✅ Public Display                  |
| v0.10   | ⏭️ Suspension & Resilience         |
| v0.11   | ⏳ Manual Operations & Corrections |
| v0.12   | ⏳ FMS Import/Export               |
| v0.13   | ⏳ Backup & Recovery               |
| v0.14   | ⏳ Operational Validation          |
| v1.0 | 🎯 Stable Release |

---

## Versioning

This project follows:

- Semantic Versioning
- Keep a Changelog
- Conventional Commits

---

## License

Distributed under the MIT License.

See the `LICENSE` file for more information.

---

## Author

**FantaAstaAPP**

Designed and developed by **Arti John**

2026
