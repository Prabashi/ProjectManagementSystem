# Project Management System — Outline

## 1. Overview

A web-based project management tool with a Kanban-style dashboard. Users belong to projects, create and manage tasks within sprints, and see live updates via SignalR. Admins control project membership, sprint lifecycle, and dashboard creation.

---

## 2. Functional Requirements

### 2.1 Authentication & Users
| # | Requirement |
|---|-------------|
| A1 | A visitor can register with a unique username and password |
| A2 | A registered user can log in; the server sets a JWT in an **HttpOnly, SameSite** cookie — the token is never exposed to JavaScript |
| A3 | On registration the user selects a role: **User** or **Admin** |
| A4 | All API endpoints (except register/login) require a valid JWT cookie |
| A5 | A logged-in user can log out; the server clears the auth cookie |

### 2.2 Projects
| # | Requirement |
|---|-------------|
| P1 | An **Admin** can create a project (name, description) |
| P2 | An **Admin** can add existing users to a project |
| P3 | Any **project member** can view the project and its contents |
| P4 | A user can only see projects they are a member of |

### 2.3 Sprints
| # | Requirement |
|---|-------------|
| S1 | An **Admin** can create a sprint for a project (name, start date, end date) |
| S2 | An **Admin** can mark a sprint as **active** (only one active sprint per project at a time) |
| S3 | Any project member can view the sprint list |

### 2.4 Tasks
| # | Requirement |
|---|-------------|
| T1 | Any project member can create a task with: subject, description, estimate, assignee, sprint, status |
| T2 | Task status values: **To Do**, **In Progress**, **In Review**, **To Deploy**, **Testing**, **Done** |
| T3 | Any project member can edit a task (subject, description, estimate, assignee, sprint, status) |
| T4 | Only an **Admin** can delete a task |
| T5 | Tasks can exist without a sprint (backlog) |
| T6 | Tasks maintain a position order within their status column |

### 2.5 Dashboard
| # | Requirement |
|---|-------------|
| D1 | An **Admin** can create a Dashboard for a project |
| D2 | The Dashboard displays tasks belonging to the project's **active sprint** |
| D3 | Tasks are displayed in six status columns: To Do / In Progress / In Review / To Deploy / Testing / Done |
| D4 | Any project member can view the Dashboard |
| D5 | Any project member can filter tasks on the Dashboard by **assignee** |
| D6 | Any project member can drag a task card between status columns; this updates the task's status |
| D7 | All Dashboard changes (task moves, new tasks, edits) are broadcast in real-time to all members viewing the Dashboard via **SignalR** |

### 2.6 Real-time (SignalR)
| # | Requirement |
|---|-------------|
| R1 | When a task is created, all Dashboard viewers for that project receive the new card |
| R2 | When a task's status changes (drag/drop or edit), all Dashboard viewers see the card move instantly |
| R3 | When a task is deleted, all Dashboard viewers see it removed instantly |
| R4 | When the active sprint changes, the Dashboard refreshes automatically |
| R5 | Clients join a project-specific SignalR group on Dashboard load and leave on unmount |

---

## 3. Non-Functional Requirements

- **Security:** Passwords stored as bcrypt hashes. JWT stored in an **HttpOnly cookie** (inaccessible to JavaScript, not vulnerable to XSS token theft). Cookie set with `SameSite=Strict` to block cross-site request forgery. `Secure` flag required in production. Role checks enforced server-side on every request, not just the frontend. CORS configured with a specific allowed origin and `AllowCredentials()` — wildcard origin must not be used alongside credentialed requests.
- **Validation:** Server-side validation on all inputs. Frontend mirrors it for UX only.
- **Testing:** Every backend service/repository method covered by xUnit unit tests. Every frontend component, hook, and utility covered by Jest unit tests.
- **Real-time:** SignalR used exclusively for push notifications; the client re-fetches or patches its RTK Query cache on receipt rather than trusting raw event data for final state.

---

## 4. Database Schema

### Entity Relationship Summary

```
users ──< project_members >── projects ──< sprints
                                    │
                                    └──< tasks >── users (assignee)
                                    │
                                    └── dashboards
```

### 4.1 `users`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| username | VARCHAR(50) | UNIQUE NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| role | VARCHAR(10) | `'User'` \| `'Admin'` NOT NULL |
| created_at | TIMESTAMP | NOT NULL |

### 4.2 `projects`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(100) | NOT NULL |
| description | TEXT | NULLABLE |
| created_by_user_id | UUID FK → users | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

### 4.3 `project_members`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| project_id | UUID FK → projects | NOT NULL |
| user_id | UUID FK → users | NOT NULL |
| added_at | TIMESTAMP | NOT NULL |
| | | UNIQUE(project_id, user_id) |

### 4.4 `sprints`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| project_id | UUID FK → projects | NOT NULL |
| name | VARCHAR(100) | NOT NULL |
| start_date | DATE | NULLABLE |
| end_date | DATE | NULLABLE |
| is_active | BOOLEAN | NOT NULL DEFAULT false |
| created_at | TIMESTAMP | NOT NULL |
| | | Only one `is_active = true` per project (enforced via partial unique index) |

### 4.5 `tasks`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| project_id | UUID FK → projects | NOT NULL |
| sprint_id | UUID FK → sprints | NULLABLE (null = backlog) |
| subject | VARCHAR(200) | NOT NULL |
| description | TEXT | NULLABLE |
| estimate | DECIMAL(5,2) | NULLABLE (story points or hours) |
| assignee_id | UUID FK → users | NULLABLE |
| status | VARCHAR(20) | `'ToDo'` \| `'InProgress'` \| `'InReview'` \| `'ToDeploy'` \| `'Testing'` \| `'Done'` |
| board_order | INTEGER | NOT NULL DEFAULT 0 — position within status column |
| created_by_user_id | UUID FK → users | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

### 4.6 `dashboards`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| project_id | UUID FK → projects | UNIQUE NOT NULL (one dashboard per project) |
| name | VARCHAR(100) | NOT NULL |
| created_by_user_id | UUID FK → users | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |

---

## 5. Backend Architecture

### Layer Responsibilities
```
Controllers/
  AuthController          POST /auth/register, POST /auth/login, POST /auth/logout
  ProjectsController      CRUD projects, member management
  SprintsController       CRUD sprints, set active sprint
  TasksController         CRUD tasks, move task (status + order)
  DashboardController     Create dashboard, get dashboard state

Services/
  IAuthService / AuthService
  IProjectService / ProjectService
  ISprintService / SprintService
  ITaskService / TaskService
  IDashboardService / DashboardService
  ITokenService / TokenService          JWT generation/validation

Repositories/
  IUserRepository / UserRepository
  IProjectRepository / ProjectRepository
  ISprintRepository / SprintRepository
  ITaskRepository / TaskRepository
  IDashboardRepository / DashboardRepository

Data/
  AppDbContext                           EF Core DbContext
  Entities/                             DB-first scaffolded models
  Configurations/                       IEntityTypeConfiguration<T> per entity

Hubs/
  ProjectHub                            SignalR hub; clients join group "project-{id}"
    Methods: JoinProject, LeaveProject
    Events:  TaskCreated, TaskUpdated, TaskDeleted, SprintChanged

Models/
  Requests/                             Incoming DTOs (CreateTaskRequest, etc.)
  Responses/                            Outgoing DTOs (TaskResponse, ProjectResponse, etc.)

Middleware/
  ErrorHandlingMiddleware               Global exception → ProblemDetails
```

### Key Design Decisions
- **Repository pattern** over direct DbContext in services; enables xUnit mocking with NSubstitute.
- **SignalR** hub receives no mutation commands — all state changes go through controllers/services, which then call `IHubContext<ProjectHub>` to push events.
- **JWT in HttpOnly cookie:** on login, `AuthService` builds the JWT and the controller writes it via `Response.Cookies.Append("token", jwt, new CookieOptions { HttpOnly = true, SameSite = SameSiteMode.Strict, Secure = true, Expires = ... })`. On logout, the controller calls `Response.Cookies.Delete("token")`. The JWT middleware is configured via `JwtBearerEvents.OnMessageReceived` to read the token from the cookie rather than the `Authorization` header, so `[Authorize]` and `[Authorize(Roles = "Admin")]` continue to work unchanged. The SignalR hub handshake (HTTP) also carries the cookie automatically.
- **CORS** must specify the exact frontend origin and call `AllowCredentials()` — a wildcard origin cannot be combined with credentialed requests.
- One active sprint per project enforced at the service layer (deactivate all others before activating new one) and at the DB level via a partial unique index.

---

## 6. Frontend Architecture

```
frontend/src/
  app/
    store.ts                Redux store
    hooks.ts                useAppDispatch, useAppSelector

  services/
    api.ts                  RTK Query base createApi
    authApi.ts              register, login endpoints
    projectsApi.ts          project + member endpoints
    sprintsApi.ts           sprint endpoints
    tasksApi.ts             task CRUD + move endpoints
    dashboardApi.ts         dashboard endpoints

  features/
    auth/
      LoginPage.tsx / LoginPage.test.tsx
      RegisterPage.tsx / RegisterPage.test.tsx
      authSlice.ts          stores { user } in Redux (token is HttpOnly cookie, never in JS)
    projects/
      ProjectListPage.tsx
      ProjectDetailPage.tsx
      projectsSlice.ts
    sprints/
      SprintPanel.tsx
    tasks/
      TaskForm.tsx           create / edit
      TaskCard.tsx           card shown on dashboard
    dashboard/
      DashboardPage.tsx      container — wires SignalR + drag-and-drop
      KanbanBoard.tsx        presentational — renders columns
      KanbanColumn.tsx       presentational — single status column
      AssigneeFilter.tsx     presentational — filter control

  hooks/
    useProjectHub.ts         SignalR connection lifecycle for a project
    useDragAndDrop.ts        drag state + drop handler → dispatch task move

  components/
    Layout/                  AppBar, Sidebar, PrivateRoute
    shared/                  Button wrappers, form fields, loaders

  types/
    index.ts                 Task, Project, Sprint, User, Dashboard, enums
```

### State & Data Flow
- **Auth state** (`user` — id, username, role) lives in `authSlice`; the JWT itself is an HttpOnly cookie managed entirely by the browser and server — JavaScript never reads or writes it.
- **RTK Query** base is configured with `credentials: 'include'` so the browser automatically attaches the auth cookie to every API request and to the SignalR WebSocket handshake. No `prepareHeaders` token injection needed.
- **Server data** (projects, tasks, etc.) lives exclusively in RTK Query cache — no duplicate Redux slices.
- **SignalR events** received in `useProjectHub` call `dispatch(tasksApi.util.updateQueryData(...))` to patch the RTK Query cache in place, producing instant UI updates without a refetch.
- **Drag and drop** updates optimistic local state immediately, then fires `PATCH /tasks/{id}/move`; on error the optimistic update is rolled back.

---

## 7. SignalR Integration Design

```
Client connects to /hubs/project?projectId={id}  on Dashboard mount
Client joins group via  hub.invoke("JoinProject", projectId)
Client leaves group via hub.invoke("LeaveProject", projectId)  on unmount

Server → Client events:
  "TaskCreated"   { task: TaskResponse }
  "TaskUpdated"   { task: TaskResponse }
  "TaskDeleted"   { taskId: string }
  "SprintChanged" { sprint: SprintResponse }
```

The `ProjectHub` only sends to members who are in the SignalR group for that project, validated against `project_members` on join.

---

## 8. Development Phases

| Phase | Scope |
|-------|-------|
| **1 — Auth** | Register, login, JWT, role-based auth middleware, user entity + migration |
| **2 — Projects** | Create project, add members, list projects per user |
| **3 — Sprints** | CRUD sprints, set active sprint, one-active constraint |
| **4 — Tasks** | CRUD tasks, assign sprint/assignee/status, admin-only delete |
| **5 — Dashboard** | Create dashboard, Kanban view for active sprint, assignee filter |
| **6 — Drag & Drop** | Status column drop targets, optimistic updates, PATCH move endpoint |
| **7 — Real-time** | SignalR hub, client hook, cache patching for all live events |
| **8 — Polish** | Error handling, validation feedback, loading/empty states, E2E tests |
