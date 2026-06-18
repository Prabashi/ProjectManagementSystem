# Multi-Tenancy Design: Supporting Multiple Organizations

## Current State

The system is hard-wired to a single implicit organization. The root problems are:

- `users.username` is globally unique — there is no concept of "which company does this user belong to"
- `users.role` (`'User'` / `'Admin'`) is a global flag, not scoped to an organization
- `projects` have no owner organization — any Admin can see and manage any project
- The JWT token encodes a global role, so authorization decisions are also global
- Registration is open to the world with no invitation or org-assignment step

---

## Target Model (Jira-style)

Jira's tenancy model:
- A **site** (organization) is the top-level container — `mycompany.atlassian.net`
- Users **belong to a site** with a **site-level role** (org admin, member, etc.)
- **Projects** are owned by a site
- A user can belong to **multiple sites** (e.g. a contractor working for two companies)

This system should mirror that structure.

---

## Schema Changes

### 1. New `organizations` table

```sql
-- V6__Create_organizations.sql
CREATE TABLE organizations (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100)  NOT NULL,
    slug        VARCHAR(50)   NOT NULL,   -- used in URLs: /org/acme/projects
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT organizations_slug_key UNIQUE (slug)
);
```

The `slug` is the human-readable URL key (e.g. `acme`, `stark-industries`). It must be URL-safe and globally unique, equivalent to Jira's subdomain.

---

### 2. New `organization_members` table — replaces the global `role` on `users`

```sql
-- V6__Create_organizations.sql (continued)
CREATE TABLE organization_members (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role             VARCHAR(20) NOT NULL,   -- 'OrgAdmin' | 'Member'
    joined_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT organization_members_org_user_key UNIQUE (organization_id, user_id),
    CONSTRAINT organization_members_role_check CHECK (role IN ('OrgAdmin', 'Member'))
);

CREATE INDEX ix_org_members_user ON organization_members(user_id);
```

A user can be a `Member` in one org and an `OrgAdmin` in another. This is the direct replacement for `users.role`.

---

### 3. Modify `projects` — add `organization_id`

```sql
-- V7__Add_org_to_projects.sql
ALTER TABLE projects
    ADD COLUMN organization_id UUID NOT NULL REFERENCES organizations(id);

CREATE INDEX ix_projects_org ON projects(organization_id);
```

All project queries are now scoped to an org. "Get my projects" becomes "get projects in this org where I am a member."

---

### 4. Modify `users` — remove the global `role`

```sql
-- V8__Remove_global_role_from_users.sql
ALTER TABLE users DROP COLUMN role;
```

The role concept now lives entirely in `organization_members`. The `users` table becomes a pure identity record (credentials only).

If a super-admin concept is needed (platform-level support access), add a separate `is_platform_admin BOOLEAN NOT NULL DEFAULT false` column rather than reusing the old role strings.

---

### Resulting ERD (simplified)

```
organizations
    └── organization_members (org_id, user_id, role)
            └── users (id, username, password_hash)
    └── projects (org_id, ...)
            └── project_members (project_id, user_id)
            └── sprints
            └── tickets (assignee → users, creator → users)
            └── dashboards
```

---

## Auth & JWT Changes

The current JWT payload:

```json
{ "sub": "<userId>", "unique_name": "<username>", "role": "Admin" }
```

must change. Two options:

### Option A — Org context in JWT (simpler, Jira-style)

When a user logs in they select (or are defaulted to) an active organization. The token is scoped to that org:

```json
{
  "sub": "<userId>",
  "unique_name": "<username>",
  "org_id": "<organizationId>",
  "org_role": "OrgAdmin"
}
```

- All controllers read `org_id` from the token; no need to pass it in every request body
- Switching organizations requires re-issuing a token (a new `POST /api/auth/switch-org` endpoint)
- This is the approach Jira Cloud and most SaaS products use

### Option B — Org context in request header (more flexible)

Token carries only identity; every request includes `X-Organization-Id: <orgId>`. The service layer resolves the caller's role in that org on each request.

- More flexible — user can act across orgs in the same session
- More expensive — extra DB lookup on every request (mitigated by caching)
- Harder to secure: the header value must be validated against org membership on every call

**Recommendation: Option A.** It matches the UX model (one active workspace at a time, like Jira) and keeps authorization simple.

---

## API Surface Changes

### Registration — must be linked to an org

Current: `POST /api/auth/register` creates a free-floating user with a global role.

New flow options:

1. **Invitation-based (Jira model):** An `OrgAdmin` invites a user by email. The invited user registers via a one-time token that pre-assigns them to the org. Cold registration without an invite is not allowed.

2. **Org-creation-on-register:** First registration creates a new organization and makes the registrant its `OrgAdmin`. Subsequent users are invited into existing orgs.

Either way, the `RegisterRequest` needs to carry org context (invite token, or a `create_org` flag + org name).

### Login — must resolve org membership

`POST /api/auth/login` must also return the user's org memberships so the UI can prompt them to select one (if they belong to multiple orgs), or auto-select if they only belong to one.

New endpoint:
```
POST /api/auth/switch-org   { "organizationId": "..." }
→ issues a new JWT scoped to the chosen org
```

### Projects — all routes gain implicit org scope from JWT

```
POST   /api/projects                   → creates project in JWT's org_id
GET    /api/projects                   → lists projects in JWT's org_id where user is a member
GET    /api/projects/{id}
POST   /api/projects/{id}/members
GET    /api/projects/{id}/members
```

No URL path change is needed if the org lives in the JWT (Option A). If Option B, prefix with `/api/org/{orgId}/...`.

### New org management endpoints

```
GET    /api/organizations/me           → orgs the calling user belongs to
POST   /api/organizations              → create org (makes caller OrgAdmin)
GET    /api/organizations/{id}/members
POST   /api/organizations/{id}/members → invite user (OrgAdmin only)
DELETE /api/organizations/{id}/members/{userId}
PATCH  /api/organizations/{id}/members/{userId}/role
```

---

## Authorization Rule Changes

| Action | Current | New |
|---|---|---|
| Create project | Global `Admin` role | `OrgAdmin` in the active org |
| Add project member | Global `Admin` role | `OrgAdmin` in the active org |
| View projects | Any authenticated user | Member of the active org |
| Create sprint/ticket | Any project member | Any project member (unchanged) |
| Invite to org | N/A | `OrgAdmin` |
| Create org | N/A | Any authenticated user (creates their first org) |

The `[Authorize(Roles = "Admin")]` decorators on `ProjectsController` must be replaced with a custom authorization policy (e.g. `[Authorize(Policy = "OrgAdmin")]`) that reads `org_role` from the JWT claim.

---

## Backend Code Changes Summary

| Layer | What changes |
|---|---|
| **Migrations** | V6: `organizations` + `organization_members`; V7: `projects.organization_id`; V8: drop `users.role` |
| **Scaffold** | Re-run `bash scripts/scaffold.sh` after each migration |
| **Entities** | New `Organization`, `OrganizationMember` entities; `Project` gains `OrganizationId`; `User` loses `Role` |
| **TokenService** | Add `org_id` and `org_role` claims to JWT |
| **AuthService** | `RegisterAsync` creates or joins an org; `LoginAsync` returns org list; new `SwitchOrgAsync` |
| **ProjectService** | All queries filter by `organizationId` from the caller's JWT |
| **New OrgService** | Handles org CRUD, membership, invitations |
| **Authorization** | Replace `[Authorize(Roles = "Admin")]` with a custom `OrgAdmin` policy |
| **Tests** | All existing service tests need org context added to their setup; new `OrgServiceTests` |

---

## Frontend Changes Summary

- **Login flow:** After login, if user belongs to multiple orgs, show an org-picker screen before routing to the dashboard (same as Jira's workspace selector)
- **Redux store:** Add `activeOrg: { id, name, slug, role }` slice; populate it on login/switch
- **RTK Query:** All API calls automatically carry the cookie (unchanged), but the store must hold `org_role` to conditionally render admin-only UI
- **Routing:** Consider `/org/:slug/projects` as the URL structure for bookmarkability
- **Settings page:** New "Organization" section for `OrgAdmin`s to manage members

---

## Migration Path for Existing Data

If there is already data in the DB, the migration needs a backfill step:

```sql
-- Part of V6 or a separate V9
-- 1. Create a default org for existing data
INSERT INTO organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'default');

-- 2. Add all existing users to it; former Admins become OrgAdmins
INSERT INTO organization_members (organization_id, user_id, role)
SELECT '00000000-0000-0000-0000-000000000001', id,
       CASE WHEN role = 'Admin' THEN 'OrgAdmin' ELSE 'Member' END
FROM users;

-- 3. Assign all existing projects to the default org
UPDATE projects SET organization_id = '00000000-0000-0000-0000-000000000001';
```

Only after the backfill is complete and verified should the `NOT NULL` constraint on `projects.organization_id` and the `DROP COLUMN role` on `users` be applied.
