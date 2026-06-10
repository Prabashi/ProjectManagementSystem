# Project Management System

A monorepo containing a C# .NET 10 Web API backend and a React/TypeScript frontend.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)

## Running locally

### 1. Start the database

From the **monorepo root**, start PostgreSQL and run all pending Flyway migrations:

```bash
docker compose up
```

This creates the `projectmgmt` database and applies all SQL migrations in `backend/sql/`. To stop, press `Ctrl+C`.

### 2. Start the API

From the `backend/` directory:

```bash
dotnet run
```

API runs at **http://localhost:5231**. OpenAPI docs are available at http://localhost:5231/openapi/v1.json.

### 3. Start the frontend

From the `frontend/` directory:

```bash
npm install   # first time only
npm run dev
```

Frontend runs at **http://localhost:5173**.

---

## Running tests

**Backend** (from `backend/`):

```bash
dotnet test
```

**Frontend** (from `frontend/`):

```bash
npm test
```

---

## Adding a database migration

1. Create `backend/sql/V{next}__{Description}.sql`
2. Apply it: `docker compose run --rm migrate`
3. Regenerate EF Core entities: `bash backend/scripts/scaffold.sh`
