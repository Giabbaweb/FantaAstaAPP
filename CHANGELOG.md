# Changelog

All notable changes to this project will be documented in this file.

The format is based on **Keep a Changelog** and this project adheres to **Semantic Versioning (SemVer)**.

---

## [Unreleased]

### Added

* Nothing yet

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
