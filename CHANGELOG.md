# Changelog

All notable changes to this project will be documented in this file.

The format is based on **Keep a Changelog** and this project adheres to **Semantic Versioning (SemVer)**.

---

## [Unreleased]

### Added

- Architecture Decision Records for Milestone 3 auction-session management
- Defined `League` as an independent domain entity
- Defined the auction-session lifecycle and allowed state transitions
- Defined uniqueness rules for league seasons and edition numbers
- Defined REST API contracts and dedicated lifecycle commands
- Defined database integrity constraints and layered implementation boundaries

### Changed

- Clarified that one installation can store sessions for multiple leagues while allowing only one operationally active session
- Clarified session immutability, deletion rules and field editability by status
- Clarified the scope of Milestone 3 before implementation

---

## [0.2.0] - 2026-07-23

### Added

- Monorepo workspace based on pnpm
- Fastify backend application
- React + Vite frontend application
- SQLite persistence layer
- Drizzle ORM configuration and migrations
- Database health endpoint (`/api/db-health`)
- Application health endpoint (`/api/health`)
- Initial project documentation
- GitHub repository structure

### Changed

- Improved project architecture and folder organization
- Standardized development environment

### Fixed

- SQLite initialization issues
- Build process improvements
- Workspace dependency resolution

---

## [0.1.0] - 2026-07-17

### Added

- Initial project setup
- TypeScript configuration
- Fastify server
- React + Vite client
- SQLite database integration
- Drizzle ORM
- Initial database schema
- Health check endpoint
- Logging with Pino
- Testing with Vitest
- Local development environment