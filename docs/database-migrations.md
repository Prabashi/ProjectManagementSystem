# Database Migrations

This document explains why Flyway was chosen for schema management, its trade-offs, and the alternatives considered.

---

## Why Flyway

The project is **DB-first** — the database schema is the source of truth, and EF Core entities are generated *from* the live DB (via `scaffold.sh`), not the other way around. That rules out EF Core migrations as the schema manager, because they assume the opposite direction (C# model → schema). Mixing both would create two competing sources of truth for the same schema.

Flyway fits a DB-first workflow naturally: you write SQL, Flyway runs it in order, and nothing else touches the schema.

---

## Flyway Pros

**Plain SQL, no abstraction.** Migrations are just `.sql` files. What you write is exactly what runs — no translation layer that might generate subtly different SQL than you intended. Easy to review in PRs, easy to run manually, readable by anyone who knows SQL regardless of their familiarity with the framework.

**Strict versioning with checksum enforcement.** Once a `V__` migration is applied, Flyway records its checksum. If the file is later modified, Flyway refuses to run and fails loudly. This prevents the common mistake of quietly editing an already-applied migration and ending up with environments that have diverged schemas.

**Repeatable migrations for replaceable objects.** `R__` scripts (functions, triggers, views) are re-run whenever their content changes. This is a better model than versioned scripts for objects that are meant to be replaced in place — you edit the file, Flyway detects the checksum change, and re-applies it. No `V7__Fix_what_V6_should_have_done.sql` chains.

**Language and framework agnostic.** Flyway doesn't know or care that the app is .NET. You can run it as a Docker container (which this project does), a CLI, or a Java library. The migration logic isn't coupled to the application's language or ORM.

**Runs anywhere, including CI.** The Docker-based setup (`docker compose run --rm migrate`) means migrations run identically in development, CI, and production with no environment-specific tooling installed.

---

## Flyway Cons

**No rollback in the community edition.** Flyway Community has no `undo` migration support — that's a paid (Teams/Enterprise) feature. Rollbacks have to be written as new forward migrations manually. For most teams this is the right default anyway (rollbacks are risky and rarely tested), but it's a real gap when you need one urgently.

**Migrations are immutable after apply.** The checksum enforcement that protects you also constrains you. If you spot a mistake in a migration after it's been applied to any environment, you cannot fix it in place — you must write a corrective migration. This is correct behaviour, but it surprises developers used to editing migrations freely during development.

**No auto-generation of migration scripts.** EF Core can look at your model, diff it against the DB, and generate a migration. Flyway has no such capability in the community edition. You write every migration by hand. For a DB-first project this is fine — the SQL *is* the design — but it's slower when you're iterating rapidly on schema structure.

**Java runtime dependency.** Flyway is a Java tool. This project sidesteps it entirely by using the official Docker image, but in environments where Docker isn't available the dependency becomes visible.

---

## Alternatives

### EF Core Migrations (`dotnet ef migrations add`)

The natural choice for a code-first .NET project. You change your C# model classes and run `dotnet ef migrations add`, which generates a migration file automatically.

- **Pros:** fully integrated with EF Core; auto-generates migrations from model diffs; rollback support (`dotnet ef database update <previous>`); no separate tooling.
- **Cons:** code-first only — the C# model becomes the schema source of truth, which is the opposite of this project's approach. Mixing it with Flyway creates two competing migration systems. Generated SQL is sometimes surprising and hard to review. C# migration files are harder to read than plain SQL.

### Liquibase

The closest Flyway competitor. Supports SQL, XML, YAML, and JSON changeset formats.

- **Pros:** rollback support in the community edition (each changeset can have a `rollback` block); built-in diff/generate capability; more flexible change tracking.
- **Cons:** significantly more complex — changesets have more metadata to write; the XML/YAML formats add verbosity for something that's ultimately just SQL; steeper learning curve; heavier runtime than Flyway.

### DbUp

A .NET-native library (NuGet package) that embeds directly into your application and runs migrations on startup.

- **Pros:** no separate tooling or Docker image — migrations run as part of the application process; .NET-native so no Java dependency; simple and lightweight.
- **Cons:** no repeatable migration concept out of the box; fewer features overall; migrations running on app startup can complicate blue/green deployments and horizontal scaling (multiple instances race to apply migrations); less battle-tested at scale than Flyway or Liquibase.

### Sqitch

A change management tool designed to be git-aware and dependency-driven rather than sequential by version number.

- **Pros:** rollback is a first-class concept (every change has a `deploy`, `revert`, and `verify` script); dependencies between changes can be declared explicitly rather than implied by version order; not checksum-based, so scripts can be edited more freely.
- **Cons:** significantly more complex mental model; much smaller community than Flyway; less tooling support; the flexibility it offers is rarely needed for straightforward sequential schema evolution.

---

## Summary

| Tool | Rollback | Auto-generate | Repeatable scripts | .NET-native | Format |
|---|---|---|---|---|---|
| **Flyway** (current) | Paid only | No | Yes (`R__`) | No (Docker) | SQL |
| EF Core Migrations | Yes | Yes | No | Yes | C# |
| Liquibase | Yes (free) | Yes | Yes | No | SQL/XML/YAML |
| DbUp | No | No | No (manual) | Yes | SQL |
| Sqitch | Yes | No | Yes | No | SQL |

For this project's DB-first design, Flyway is the right fit. The main thing it lacks — rollback — is something Liquibase provides freely, so Liquibase would be the strongest alternative if rollback support becomes a hard requirement.
