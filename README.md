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

**E2E tests — Cucumber + Playwright**

### Option A — Fully in Docker (recommended)

No local installs or manual service startup needed. A single command builds every image, starts the full stack in dependency order, runs all scenarios, and exits with the test result code:

```bash
# From the monorepo root
docker compose -f docker-compose.fullstack.yml run --rm e2e
```

On the first run Docker builds the images (takes a few minutes). Subsequent runs reuse the cached layers.

If you have made changes to the backend or frontend source since the last run, rebuild the affected images first:

```bash
# From the monorepo root
docker compose -f docker-compose.fullstack.yml build api e2e
```

Then re-run the suite as normal.

### Option B — Local (for headed debugging)

Use this when you want a visible browser window to debug a failing scenario.

**Prerequisites (first time only):**

```bash
cd frontend
npm install
npx playwright install chromium
```

**Start the full stack manually:**

```bash
# Terminal 1 — monorepo root: PostgreSQL + Redis + migrations
docker compose up

# Terminal 2 — backend/
dotnet run

# Terminal 3 — frontend/
npm run dev
```

**Run the tests:**

```bash
# From frontend/ — headless
npm run e2e

# With a visible browser window
npm run e2e:headed
```

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `BASE_URL` | `http://localhost:5173` | Frontend URL Playwright navigates to |
| `API_URL` | `http://localhost:5231/api` | Backend API URL for setup calls |
| `HEADLESS` | `true` | Set to `false` for a visible browser |
| `DOCKER` | unset | Set to any value inside Docker to enable `--no-sandbox` |

Override them inline if your ports differ:

```bash
BASE_URL=http://localhost:4173 API_URL=http://localhost:5000/api npm run e2e
```

### Test output

- **Pass/fail** results are printed to the terminal.
- **HTML report** is written to `frontend/e2e/reports/report.html` after every run (open in any browser).
- **Failure screenshots** are embedded directly in the HTML report.

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
