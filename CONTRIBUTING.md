# Contributing

Thank you for your interest in contributing to **FantaAstaAPP**.

This document describes the development workflow, coding conventions and contribution process used throughout the project.

---

# Branching Strategy

The repository follows a simple branching model.

| Branch | Purpose |
|---------|---------|
| `main` | Stable production-ready code |
| `develop` | Active development |

All new features must be developed on the `develop` branch.

Releases are merged into `main` only after successful validation.

---

# Commit Convention

This project follows the **Conventional Commits** specification.

Examples:

```text
feat(session): add auction session API

fix(database): resolve sqlite migration issue

docs(readme): improve project overview

refactor(domain): simplify validation logic

test(api): add health endpoint tests

chore(release): prepare v0.3.0
```

---

# Development Workflow

The recommended workflow is:

1. Update the `develop` branch.
2. Implement a single feature or fix.
3. Verify that:
   - Build succeeds
   - Type checking passes
   - Tests pass
4. Commit using Conventional Commits.
5. Repeat.

---

# Code Style

General principles:

- Keep code simple.
- Prefer readability over cleverness.
- Keep functions focused on a single responsibility.
- Avoid duplicated logic.
- Prefer explicit code over implicit behavior.

---

# Project Structure

```text
apps/
packages/
docs/
data/
```

Business logic belongs to the **domain layer**.

Infrastructure concerns should remain separated.

---

# Testing

Before committing, always execute:

```bash
pnpm build

pnpm typecheck

pnpm test
```

No commit should break the build.

---

# Documentation

Every significant architectural change should be reflected in the appropriate documentation.

This includes:

- README
- CHANGELOG
- ARCHITECTURE
- DECISIONS
- ROADMAP

---

# Versioning

The project follows:

- Semantic Versioning
- Keep a Changelog

Every release must include:

- Updated version number
- Updated changelog
- Git tag
- GitHub Release

---

# Pull Requests

When applicable, pull requests should:

- Have a clear purpose.
- Remain focused on a single feature.
- Avoid unrelated changes.
- Keep commits clean and meaningful.

---

# Philosophy

FantaAstaAPP is designed around a few core principles:

- Offline First
- Server Authoritative
- Reliability
- Simplicity
- Maintainability
- Incremental Development

Every contribution should preserve these principles.