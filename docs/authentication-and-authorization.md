# Authentication & Authorization

This document explains how authentication and authorization work in the backend, covering the ASP.NET Core middleware pipeline, JWT configuration, and how access control is enforced at both the route and business-logic levels.

---

## Overview

The system uses **JWT (JSON Web Token)** authentication delivered via an **HttpOnly cookie**. Authorization is enforced in two layers: route-level via `[Authorize]` attributes, and business-logic-level via project membership checks inside services.

---

## Startup Registration (`Program.cs`)

### `builder.Services.AddControllers()`

Registers all MVC infrastructure services needed to support `[ApiController]`-based controllers:

- **Controller instantiation via DI** — registers `IControllerActivator` so controllers are constructed by resolving constructor dependencies from the DI container. This is why controllers can declare parameters like `IAuthService`, `IProjectService`, etc. and receive them automatically.
- **Model binding** — maps incoming HTTP data to action parameters:
  - `[FromBody]` → deserializes the JSON request body into a C# object (e.g. `LoginRequest`)
  - `[FromRoute]` → extracts values from URL segments (e.g. `{id}`)
  - `[FromQuery]` → reads query string parameters
- **Model validation** — wires up `DataAnnotations` validation and the `[ApiController]` automatic 400 response. When a model fails validation, the framework returns `400 Bad Request` before the action method runs.
- **Action result formatting** — serializes return values into HTTP responses (`Ok(user)` → 200 JSON, `CreatedAtAction(...)` → 201, etc.) using `System.Text.Json`.
- **Filter pipeline** — registers support for action, result, and exception filters.

> `AddControllers()` registers the *services* (DI, binding, formatters). `MapControllers()` registers the *routes*. Both are required.

---

### `builder.Services.AddAuthentication(...).AddJwtBearer(...)`

```csharp
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => { ... });
```

This three-part chain sets up the authentication system.

**`.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)`**

Registers core ASP.NET Core authentication services into DI and sets the **default scheme** to `"Bearer"`. The default scheme tells the middleware which handler to use when a request hits an `[Authorize]` endpoint, without needing to name the scheme on every attribute.

**`.AddJwtBearer(options => { ... })`**

Registers the JWT Bearer authentication handler and configures it with two things:

1. **Token validation rules** (`TokenValidationParameters`):

   | Parameter | What it checks |
   |---|---|
   | `ValidateIssuer` | Token's `iss` claim must match `Jwt:Issuer` from config |
   | `ValidateAudience` | Token's `aud` claim must match `Jwt:Audience` from config |
   | `ValidateLifetime` | Token's `exp` claim must be in the future (not expired) |
   | `ValidateIssuerSigningKey` | Token's signature must verify against `Jwt:Key` from config |

   If any check fails, the request is treated as unauthenticated.

2. **Cookie extraction hook** — overrides the default `Authorization: Bearer <token>` header behaviour:

   ```csharp
   OnMessageReceived = ctx =>
   {
       ctx.Token = ctx.Request.Cookies["token"];
       return Task.CompletedTask;
   }
   ```

   The browser sends the `HttpOnly` cookie automatically on every request, and the handler picks it up here before validation runs. This means the frontend never needs to manage the token in JavaScript.

---

### `builder.Services.AddAuthorization()`

Registers the authorization middleware and its core services into DI:

- **`IAuthorizationService`** — the engine that evaluates `[Authorize]` attributes and checks if the current `ClaimsPrincipal` satisfies a policy. Can also be injected for manual `authorizationService.AuthorizeAsync(...)` calls.
- **`IAuthorizationPolicyProvider`** — resolves named policies (e.g. `[Authorize(Policy = "AdminOnly")]`).
- **`IAuthorizationHandlerContextFactory` / `IAuthorizationHandlerProvider`** — plumbing that collects and runs all registered `IAuthorizationHandler` implementations.
- **Default policy** — an implicit policy requiring `ClaimsPrincipal.Identity.IsAuthenticated == true`, which is what a plain `[Authorize]` with no arguments enforces.

In this project, `AddAuthorization()` is used in its minimal form with no custom policies. To add role restrictions later:

```csharp
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
});
```

---

## Middleware Pipeline (`Program.cs`)

```csharp
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
```

### `app.UseAuthentication()`

Adds the authentication middleware to the request pipeline. For every incoming request it:

1. Calls `OnMessageReceived` → reads the `token` cookie
2. Parses and validates the JWT (issuer, audience, lifetime, signature)
3. If valid → populates `HttpContext.User` with the claims (`sub`, `unique_name`, `role`)
4. If invalid/missing → `HttpContext.User` remains an unauthenticated anonymous principal

It does **not** block the request — it only identifies who the caller is.

### `app.UseAuthorization()`

Runs after authentication and enforces access rules. For every request it:

1. Checks if the endpoint has `[Authorize]` on it
2. Evaluates `HttpContext.User` (populated by the previous middleware) against the policy
3. If the user doesn't satisfy the policy → short-circuits and returns **401 Unauthorized** or **403 Forbidden**
4. If the user passes → lets the request continue to the controller

### `app.MapControllers()`

Scans all assemblies for `[ApiController]`-decorated classes and registers their action methods as endpoints in the routing table:

- **Discovers controllers and actions** — finds every class with `[ApiController]` + `[Route(...)]` and every public method with `[HttpGet]`, `[HttpPost]`, etc.
- **Builds the route table** — maps each action to its URL pattern by combining class-level `[Route]` with method-level HTTP verb attributes.
- **Wires up endpoint metadata** — attaches `[Authorize]` and other attribute metadata so `UseAuthorization()` knows which endpoints require authentication.

**Order matters strictly.** If the middleware order were swapped, `UseAuthorization` would run before `HttpContext.User` is populated and every `[Authorize]` endpoint would return 401 even with a valid token.

```
Request
  → UseAuthentication()   populate HttpContext.User
  → UseAuthorization()    check [Authorize], return 401/403 if needed
  → MapControllers()      route to the right action method
  → Controller action runs
```

---

## Authentication Flow

### Registration / Login

`AuthService` handles both flows:

- **Register** — hashes the password with BCrypt, persists the user, then calls `TokenService.GenerateToken()`.
- **Login** — fetches the user by username, verifies the password with BCrypt, then calls `TokenService.GenerateToken()`.

`TokenService` builds a signed JWT (HMAC-SHA256) containing:

| Claim | Value |
|---|---|
| `sub` | User's `Guid` (primary identity) |
| `unique_name` | Username |
| `ClaimTypes.Role` | User's role string |
| `jti` | Random `Guid` (token identifier) |

`AuthController.AppendAuthCookie()` writes the JWT into a cookie:

```csharp
Response.Cookies.Append("token", token, new CookieOptions
{
    HttpOnly = true,
    SameSite = SameSiteMode.Strict,
    Secure   = HttpContext.Request.IsHttps,
    Expires  = DateTimeOffset.UtcNow.AddHours(expiryHours)
});
```

### Logout

`POST /api/auth/logout` deletes the cookie. There is no server-side token revocation — logout is purely client-side.

### Current User

`GET /api/auth/me` reads claims directly from `HttpContext.User` (populated by the JWT middleware) and returns a `UserResponse`:

```csharp
var id       = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
var username = User.FindFirstValue(ClaimTypes.Name)!;
var role     = User.FindFirstValue(ClaimTypes.Role)!;
```

---

## Authorization — Two Layers

### Layer 1: Route-level (`[Authorize]`)

Every controller except `AuthController`'s public endpoints is decorated with `[Authorize]` at the class level. The SignalR hub also carries `[Authorize]`. This ensures only authenticated users (valid, non-expired JWT) can reach any endpoint.

| Controller / Hub | Scope |
|---|---|
| `ProjectsController` | Class-level `[Authorize]` |
| `SprintsController` | Class-level `[Authorize]` |
| `TicketsController` | Class-level `[Authorize]` |
| `DashboardController` | Class-level `[Authorize]` |
| `UsersController` | Class-level `[Authorize]` |
| `ProjectHub` (SignalR) | Class-level `[Authorize]` |
| `AuthController` | Method-level only on `/me` and `/logout` |

### Layer 2: Business logic (project membership)

Inside each service, before performing any operation, the caller's membership in the target project is verified:

```csharp
if (!await _projectRepository.IsMemberAsync(projectId, userId))
    throw new UnauthorizedAccessException("You are not a member of this project.");
```

This check is applied in `ProjectService`, `SprintService`, `TicketService`, and `DashboardService`.

`GlobalExceptionHandler` maps `UnauthorizedAccessException` → HTTP 401, so these denials surface cleanly to the client.

### How controllers extract the current user's ID

Each controller has a private helper that reads the `sub` claim populated by the JWT middleware:

```csharp
private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
```

This `Guid` is then passed down to the service layer for membership checks.

---

## What Is Not Yet Implemented

- **Role-based access control** — the `Role` claim is stored in the JWT and returned by `/me`, but no endpoints restrict access by role yet.
- **Refresh tokens** — when the JWT expires, the user must log in again.
- **Server-side token revocation** — logout only deletes the cookie; the token itself remains valid until expiry.
