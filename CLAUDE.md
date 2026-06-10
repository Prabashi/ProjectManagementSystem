# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Monorepo for a Project Management System with a C# .NET 10 Web API backend and a React/TypeScript frontend. Requirements are being defined incrementally.

## Monorepo Structure

```
backend/                  # ASP.NET Core 10 Web API
frontend/                 # React + TypeScript app
docker-compose.yml        # Dev infrastructure (db + migrate only)
docker-compose.fullstack.yml  # Full stack for E2E/CI/production (db + migrate + api)
.env.example              # Template for production secrets
```

---

## Backend (C# / .NET 10)

### Local dev setup

From the **monorepo root**:

```bash
# Start PostgreSQL and run all pending Flyway migrations
docker compose up

# Apply new migrations without restarting the DB
docker compose run --rm migrate
```

Then run the API locally from `backend/`:

```bash
dotnet run        # http://localhost:5231
```

OpenAPI docs at `/openapi/v1.json` in Development. `backend/ProjectManagementSystem.http` has sample requests.

### Commands

All backend commands run from the `backend/` directory.

```bash
# Restore packages
dotnet restore

# Build
dotnet build

# Run (HTTP on http://localhost:5231)
dotnet run

# Run all backend tests
dotnet test

# Run a single test class
dotnet test --filter "FullyQualifiedName~ClassName"

# Run a single test method
dotnet test --filter "FullyQualifiedName~ClassName.MethodName"

# Regenerate EF Core entities from the live DB (run after every migration)
bash scripts/scaffold.sh
```

### Database migrations (Flyway)

SQL migration files live in `backend/sql/` named `V{n}__{Description}.sql` (e.g. `V1__Create_users.sql`).

**Adding a migration:**
1. Create `backend/sql/V{next}__{Description}.sql`
2. Run `docker compose run --rm migrate` to apply it
3. Run `bash backend/scripts/scaffold.sh` to regenerate EF Core entities

Flyway owns the schema. Never use `dotnet ef migrations add` — it would create a competing source of truth.

### Architecture & Conventions

**Controllers, not minimal APIs.** All endpoints live in `[ApiController]`-attributed controller classes. Minimal-API style (`app.MapGet`) must not be used.

**Layering:**

- `Controllers/` — thin HTTP layer; delegates immediately to services
- `Services/` — business logic; all service classes depend on interfaces for DI and testability
- `Repositories/` — data access via EF Core; one repository per aggregate root
- `Data/` — `DbContext`, EF Core entity configurations, and DB-first scaffolded models
- `Hubs/` — SignalR hubs for real-time features
- `Models/` — DTOs / request-response models (separate from EF entities)

**Database:** PostgreSQL via `Npgsql.EntityFrameworkCore.PostgreSQL`. DB-first: schema is managed by **Flyway** SQL scripts in `backend/sql/`; EF Core entities are regenerated from the live DB via `bash scripts/scaffold.sh` after each migration.

**Real-time:** SignalR hubs in `Hubs/`; push updates to connected clients on relevant state changes.

**Auth:** ASP.NET Core authentication and authorization middleware. Use `[Authorize]` on controllers/actions; role-based or policy-based as requirements dictate.

**Dependency Injection:** Every service and repository is registered in `Program.cs` via its interface. Never resolve services manually (`GetService`). Constructor-inject only.

**Testing:** xUnit. Every public method on every service and repository must have a unit test. Mock dependencies with interfaces using NSubstitute. Test project mirrors the source project's namespace structure.

**Design principles:** SOLID throughout. Apply design patterns (Repository, Unit of Work, Factory, Strategy, etc.) where they reduce coupling or complexity — not by default everywhere.

---

## Frontend (React / TypeScript)

### Commands

All frontend commands run from the `frontend/` directory.

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run all unit tests
npm test

# Run a single test file
npm test -- path/to/Component.test.tsx

# Run tests in watch mode
npm run test:watch

# Type-check without emitting
npm run typecheck

# Lint
npm run lint

# Build for production
npm run build
```

E2E tests (Cucumber + Playwright) will be added later; commands TBD.

### Architecture & Conventions

**Component separation:** UI components are split into two layers:

- _Presentational components_ — pure rendering, props-driven, no direct store access
- _Container components_ (or hooks) — connect to Redux, call RTK Query hooks, handle local state logic

Each component lives in its own folder with a co-located test file (`Component.test.tsx`).

**State management:** Redux Toolkit. Use `createSlice` for local/shared UI state. Avoid plain `useReducer` for state that belongs in the global store.

**Data fetching:** RTK Query (`createApi`). Define all API endpoints in service files under `src/services/`. Do not use raw `fetch` or Axios alongside RTK Query.

**Custom hooks:** Extract non-trivial logic from components into `src/hooks/` as custom hooks. Each custom hook must have a corresponding unit test.

**UI library:** MUI (Material UI). Use MUI components and the `sx` prop / `styled` API for styling. Avoid mixing in other component libraries.

**Testing:** Jest + React Testing Library. Every component, hook, and utility must have a unit test. Test behavior, not implementation details — query by role/label, not by class or internal state.

**Design principles:** SOLID applies to frontend too. Keep components focused (SRP), depend on abstractions (hook interfaces, typed props), and avoid deep prop drilling in favor of context or the Redux store.

---

## Cross-cutting

- TypeScript strict mode enabled on the frontend.
- All new code must be covered by unit tests before a feature is considered complete.
- E2E tests (Cucumber + Playwright) will be written once the feature is stable; keep component markup accessible (semantic HTML, ARIA labels) to support Playwright locators.
