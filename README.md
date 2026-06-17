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

**Frontend unit tests** (from `frontend/`):

```bash
npm test
```

**E2E tests — Cucumber + Playwright** (from `frontend/`):

E2E tests require the full stack to be running before executing the suite.

### 1. First-time browser install

```bash
cd frontend
npx playwright install chromium
```

This only needs to be done once per machine.

### 2. Start the full stack

**Option A — Docker for everything except the frontend dev server (recommended for E2E):**

```bash
# From the monorepo root — starts db, runs migrations, and starts the API
docker compose -f docker-compose.fullstack.yml up

# In a separate terminal, from frontend/
npm run dev
```

**Option B — Manual (already running locally):**

Make sure all three are running:
- `docker compose up` (PostgreSQL + migrations)
- `dotnet run` from `backend/` (API on http://localhost:5231)
- `npm run dev` from `frontend/` (frontend on http://localhost:5173)

### 3. Run the tests

```bash
# From frontend/ — headless (default, suitable for CI)
npm run e2e

# With a visible browser window (useful for debugging)
npm run e2e:headed
```

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `BASE_URL` | `http://localhost:5173` | Frontend URL |
| `API_URL` | `http://localhost:5231/api` | Backend API URL |

Override them inline if your ports differ:

```bash
BASE_URL=http://localhost:4173 API_URL=http://localhost:5000/api npm run e2e
```

### Test output

- **Pass/fail** results are printed to the terminal.
- **Screenshots** on failure are saved to `frontend/e2e/reports/screenshots/`.

### Feature coverage

| Feature file | Scenario |
|---|---|
| `auth.feature` | User logs in with valid credentials |
| `projects.feature` | Admin creates a new project |
| `members.feature` | Admin adds a member to a project |
| `sprints.feature` | Admin creates a sprint |
| `tickets.feature` | User creates a new ticket |
| `dashboard.feature` | Admin creates a dashboard |

---

## Adding a database migration

1. Create `backend/sql/V{next}__{Description}.sql`
2. Apply it: `docker compose run --rm migrate`
3. Regenerate EF Core entities: `cd backend && bash scripts/scaffold.sh`
