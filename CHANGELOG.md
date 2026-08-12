# Changelog

All notable changes to this project will be documented in this file.

The format is based on **Keep a Changelog** and this project adheres to **Semantic Versioning (SemVer)**.

---

## [Unreleased]

### Added

* Nothing yet

---

## [0.9.0] - 2026-08-12

### Added

* Realtime `PUBLIC_DISPLAY` role for session-level read-only connections
* Authoritative Public Display projection in the realtime auction snapshot
* League branding data in the Public Display snapshot
* Public Display team projection with remaining credits, maximum bid and P/D/C/A roster composition
* Current-player data with role and real-team information
* Recent confirmed-award feed for the Public Display
* Full roster-entry projection for the electronic roster overview
* `/public` auction view designed for fullscreen monitor use
* League and FantaAstaAPP branding header
* Current player presentation with player photo support
* Recent-awards panel with constrained height and internal scrolling
* Team cards with credits, maximum bid and roster-role counts
* Visual overlays for `PASSED` and `EXCLUDED` teams, including exclusion reason
* Session-status visual indicators
* Suspended-session banner while preserving the frozen auction state underneath
* Electronic roster overview with eight team columns and free roster slots
* Public Display visual modes:
  * `STANDARD`
  * `HIGH_CONTRAST_OUTDOOR`
  * `COMPACT`
  * `DARK`

### Changed

* Public Display connections join only the session room and do not require a team identity
* Public Display connections cannot send auction write commands
* Public Display data is derived exclusively from the authoritative server snapshot
* Public Display team snapshots now include complete roster entries
* Fullscreen team-card layout no longer stretches roster-role rows to fill unused viewport height
* Suspended sessions preserve the normal auction layout while displaying a prominent pause message

### Tested

* Public Display realtime registration and read-only authorization
* Public Display snapshot contracts and repository projections
* League, team, player, recent-award and roster-entry Public Display data
* `STANDARD`, `HIGH_CONTRAST_OUTDOOR`, `COMPACT` and `DARK` visual modes
* `PASSED` and `EXCLUDED` overlays in standard, outdoor and dark modes
* Suspended-session presentation in standard, outdoor, dark and compact modes
* Fullscreen Public Display layout
* 33 automated server test files
* 236 automated server tests
* 10 automated domain test files
* 86 automated domain tests
* Full monorepo type checking
* Full monorepo production build

---

## [0.8.0] - 2026-08-08

### Added

* Transactional repository operations required by confirmed auction awards
* Domain validation for definitive auction award confirmation
* Transactional confirmed-award application service
* Persistent `auction_events` domain audit trail
* Transactional Auction Event repository
* `AUCTION_AWARD_CONFIRMED` audit event
* Post-commit backup requester boundary for critical confirmed awards

### Changed

* Auction award confirmation now persists roster assignment, remaining credits and player availability atomically
* Confirmed auction calls now participate in the same authoritative transaction as the definitive award
* Confirmed-award validation enforces player availability, roster capacity, role limits, remaining credits and roster completability
* Confirmed award domain audit events are persisted inside the same SQLite transaction
* Confirmed award errors are mapped consistently through the HTTP command protocol
* The atomic command pipeline now exposes its transaction executor to command application logic
* Successful non-replayed confirmations request the post-commit backup boundary
* Backup-request failures are isolated from an already committed auction command
* Idempotent confirmation replays do not request duplicate backups

### Tested

* Complete rollback of confirmed awards on transactional failure
* Confirmed roster-entry persistence
* Player transition to `ROSTERED`
* Remaining-credit update
* Persistent confirmed-award audit events
* Auction-event repository integration
* No audit persistence after rollback
* Post-commit backup request after confirmation
* No duplicate backup request on idempotent replay
* Backup-request failure isolation
* 31 automated server test files
* 217 automated server tests
* 10 automated domain test files
* 86 automated domain tests
* Full monorepo type checking
* Full monorepo production build

---

## [0.7.0] - 2026-08-06

### Added

* Socket.IO server bootstrap integrated with Fastify
* Realtime connection identity and lifecycle model
* Realtime connection manager
* Session, team, operator and observer room conventions
* Device registration workflow
* Team authentication through access PINs
* `OPERATOR` and `OBSERVER` realtime roles
* Single active operator enforcement for each auction-session team
* Socket.IO realtime publisher abstraction
* Authoritative auction snapshot contracts and service
* Automatic snapshot delivery after device registration
* Auction event dispatcher
* Auction snapshot dispatcher
* Persistent auction-session `stateVersion`
* Persistent command registry for idempotent commands
* Atomic and idempotent auction command executor
* Shared auction call command handler
* Atomic auction call command service
* Realtime auction command protocol
* Socket command handler for team remotes
* Socket.IO `auction:command` listener
* Realtime commands for:

  * `BID`
  * `PASS`
  * `UNDO_PASS`

### Changed

* Auction commands now carry `commandId` and `stateVersion`
* HTTP auction commands now use the atomic command pipeline
* Aggregate persistence, state-version increment and command registration now run in one transaction
* Duplicate commands return the previously persisted result
* Stale commands are rejected with `STALE_STATE`
* Reused command IDs with different payloads are rejected with `COMMAND_ID_CONFLICT`
* Realtime events and authoritative snapshots are published only after a successful commit
* Idempotent command replays no longer republish events or snapshots
* Team observers are explicitly read-only
* Team operators can execute commands only for their registered team and session
* Banditore-only commands remain restricted to the administrative HTTP workflow
* Atomic command errors are mapped consistently to HTTP and Socket.IO responses

### Tested

* 27 automated server test files
* 187 automated server tests
* Realtime connection and registration workflows
* PIN authentication
* Operator exclusivity
* Observer registration
* Authoritative snapshot delivery
* Realtime publisher and dispatcher behavior
* Atomic command persistence and rollback
* Optimistic concurrency through `stateVersion`
* Command idempotency and command-ID conflicts
* Socket command validation and authorization
* HTTP auction command protocol
* Server type checking
* Server production build
* Contracts type checking
* Contracts production build

---

## [0.6.0] - 2026-08-01

### Added

* Auction Call domain entity
* Auction Call Team domain entity
* Complete Auction Engine domain workflow
* Maximum bid calculation rules
* Auction opening workflow
* Bid management workflow
* Pass and Undo Pass workflows
* Auction confirmation workflow
* Auction cancellation workflow
* SQLite persistence for Auction Calls
* Auction Call repository
* Auction Call application service
* REST APIs for Auction Calls
* HTTP command endpoints for auction operations
* Shared integration test fixtures for the auction engine

### Changed

* Backend architecture extended with a complete Auction Engine module
* Auction workflow is now fully server-authoritative
* HTTP command routing aligned with the domain command model

### Tested

* Backend type checking
* Backend production build
* Complete Auction Call REST API
* Repository integration
* Service integration
* Auction command workflows
* 63 automated backend tests

---

## [0.5.0] - 2026-07-30

### Added

* Player domain entity
* Roster Entry domain entity
* Shared TypeScript contracts and domain models for Players
* Shared TypeScript contracts and domain models for Roster Entries
* Player normalization utilities
* FMS ReVo player archive parser
* FMS ReVo initial roster parser
* Initial roster import planner
* Transactional initial roster import service
* Fastify API for player archive import
* Fastify API for initial roster import

### Changed

* Players are now managed at the auction-session level
* Initial rosters are imported transactionally
* Imported players are automatically marked as `ROSTERED`
* Remaining team credits are automatically updated during roster import
* Initial roster entries are created automatically during import

### Tested

* Backend type checking
* Backend production build
* Player archive import validation
* Initial roster import planning
* Transactional roster import workflow
* HTTP route validation for player imports

## [0.4.0] - 2026-07-28

### Added

* Team domain entity
* Owner domain entity
* Auction Session Team domain entity
* Shared Zod schemas and TypeScript contracts for Teams
* Shared Zod schemas and TypeScript contracts for Owners
* Shared Zod schemas and TypeScript contracts for Auction Session Teams
* SQLite repositories for Teams, Owners and Auction Session Teams
* Application services for Teams, Owners and Auction Session Teams
* Fastify CRUD APIs for Teams
* Fastify CRUD APIs for Owners
* Fastify CRUD APIs for Auction Session Teams
* Consistent HTTP error mapping across all league configuration modules

### Changed

* League configuration is now fully persisted
* Backend architecture extended with dedicated Team and Owner modules
* Repository and service layers aligned across all configuration entities

### Tested

* Backend type checking
* Backend production build
* Team CRUD validation
* Owner CRUD validation
* Auction Session Team CRUD validation
* Repository layer integration
* Service layer integration
* HTTP route validation

## [0.3.0] - 2026-07-27

### Added

* Independent `League` domain entity
* Auction-session lifecycle with the following states:

  * `SETUP`
  * `READY`
  * `RUNNING`
  * `SUSPENDED`
  * `COMPLETED`
  * `CLOSED`
* Explicit auction-session lifecycle commands:

  * `ready`
  * `start`
  * `suspend`
  * `resume`
  * `complete`
  * `close`
* Shared Zod schemas and TypeScript contracts for auction sessions
* Domain rules for status transitions, updates and deletions
* SQLite repository for auction-session persistence
* Application service for auction-session use cases
* Fastify APIs for:

  * listing auction sessions;
  * retrieving a session by ID;
  * creating a session;
  * updating a session;
  * deleting a session;
  * executing lifecycle commands.
* Database constraints for:

  * unique league and season combinations;
  * unique league and edition-number combinations;
  * foreign-key integrity between leagues and sessions.
* Consistent HTTP responses for validation, missing resources and domain conflicts
* Handling of SQLite creation conflicts
* Integration tests covering the complete auction-session API
* Complete lifecycle integration test from SETUP to CLOSED

### Changed

* Auction-session state can no longer be changed through a generic update
* Structural fields can only be modified while a session is in `SETUP`
* Initial credits can be modified in:

  * `SETUP`
  * `READY`
  * `RUNNING`
  * `SUSPENDED`
* Completed and closed sessions are read-only
* Sessions can only be deleted while in `SETUP`
* Only one operationally active session is allowed for each league
* HTTP errors now use consistent application error codes

### Tested

* 29 backend integration tests covering:

  * application health;
  * database health;
  * auction-session listing;
  * auction-session retrieval;
  * creation and request validation;
  * database conflicts;
  * updates and state-dependent editability;
  * controlled deletion;
  * lifecycle commands;
  * invalid commands;
  * invalid state transitions;
  * active-session conflicts.
* Server type checking
* Server production build
* SQLite integration behavior

---

## [0.2.0] - 2026-07-23

### Added

* Monorepo workspace based on pnpm
* Fastify backend application
* React + Vite frontend application
* SQLite persistence layer
* Drizzle ORM configuration and migrations
* Database health endpoint (`/api/db-health`)
* Application health endpoint (`/api/health`)
* Initial project documentation
* GitHub repository structure

### Changed

* Improved project architecture and folder organization
* Standardized development environment

### Fixed

* SQLite initialization issues
* Build process improvements
* Workspace dependency resolution

---

## [0.1.0] - 2026-07-17

### Added

* Initial project setup
* TypeScript configuration
* Fastify server
* React + Vite client
* SQLite database integration
* Drizzle ORM
* Initial database schema
* Health check endpoint
* Logging with Pino
* Testing with Vitest
* Local development environment
