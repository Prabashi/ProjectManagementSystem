# SSO Design: Incorporating Single Sign-On

Builds on the multi-tenancy design in [multi-tenancy-design.md](multi-tenancy-design.md).

---

## Two Tiers of SSO

### Tier 1 — Social Login (OAuth 2.0 / OIDC)
Platform-level. Available to all users regardless of organization.
- "Sign in with Google / GitHub / Microsoft" buttons on the login screen
- Great for individuals and small teams who don't have a corporate IdP

### Tier 2 — Enterprise SSO (per-org OIDC or SAML)
Organization-level. An `OrgAdmin` configures their company's own identity provider (Okta, Azure AD, Google Workspace, etc.).
- Users at `@acme.com` are automatically routed to Acme's IdP
- Enforces company-wide authentication policies (MFA, session duration, device compliance)
- This is what Jira's "SAML 2.0 SSO" and "Atlassian Access" features provide

Both tiers share the same internal token-issuance path — the only difference is how the user's identity is verified externally.

---

## Schema Changes

### 1. Add `email` to `users`

SSO providers identify users by email, not by username. Email becomes the stable identity anchor across providers.

```sql
-- V9__Add_email_to_users.sql
ALTER TABLE users
    ADD COLUMN email          VARCHAR(255),
    ADD COLUMN password_hash  VARCHAR(255);  -- already exists; make it nullable below

-- Make password_hash nullable (SSO users have no password)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add unique constraint on email
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
```

> Username remains for display purposes. For pure-SSO users it can be derived from the provider's name claim on first login.

---

### 2. New `external_identities` table

Maps an external provider's user ID to an internal user account. One user can link multiple providers (Google + GitHub).

```sql
-- V9__Add_email_to_users.sql (continued)
CREATE TABLE external_identities (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider            VARCHAR(50)  NOT NULL,   -- 'google' | 'github' | 'microsoft' | 'saml:{org-slug}'
    provider_user_id    VARCHAR(255) NOT NULL,   -- the 'sub' claim from the provider
    linked_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT external_identities_provider_user_key UNIQUE (provider, provider_user_id)
);

CREATE INDEX ix_external_identities_user ON external_identities(user_id);
```

---

### 3. New `organization_sso_configs` table (Tier 2 only)

Stores each organization's enterprise IdP configuration.

```sql
-- V10__Create_org_sso_configs.sql
CREATE TABLE organization_sso_configs (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID         NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    provider_type    VARCHAR(10)  NOT NULL,         -- 'oidc' | 'saml'
    -- OIDC fields
    client_id        VARCHAR(255),
    client_secret    TEXT,                          -- store encrypted at rest
    discovery_url    TEXT,                          -- e.g. https://accounts.google.com/.well-known/openid-configuration
    -- SAML fields
    metadata_url     TEXT,                          -- IdP metadata endpoint
    -- Domain-based routing
    email_domain     VARCHAR(255) NOT NULL,         -- 'acme.com' — auto-routes @acme.com logins
    sso_required     BOOLEAN      NOT NULL DEFAULT false,  -- blocks password login when true
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT org_sso_configs_type_check CHECK (provider_type IN ('oidc', 'saml')),
    CONSTRAINT org_sso_configs_domain_key UNIQUE (email_domain)
);
```

The `email_domain` unique constraint ensures two orgs can't claim the same domain.

---

## Updated ERD (auth-relevant tables)

```
users (id, email, username, password_hash [nullable])
    └── external_identities (user_id, provider, provider_user_id)
    └── organization_members (user_id, org_id, role)

organizations
    └── organization_sso_configs (org_id, provider_type, email_domain, ...)
```

---

## Auth Flows

### Flow A — Social Login (Tier 1)

```
1.  User clicks "Sign in with Google"
2.  Browser → GET /api/auth/oauth/google  (initiates OAuth code flow)
3.  Redirect to Google's consent screen
4.  Google → GET /api/auth/oauth/google/callback?code=...
5.  Backend: exchange code for tokens → call userinfo endpoint
6.  Extract: { sub, email, name } from Google's response
7.  Look up external_identities WHERE provider='google' AND provider_user_id={sub}
    a. Found  → resolve user_id → issue internal JWT
    b. Not found, email exists in users → link new identity → issue JWT
    c. Not found, email unknown → create user + external_identity → issue JWT
         (if org invite-only: reject and return 403 with "request an invitation" message)
8.  JWT issued as HttpOnly cookie (same path as existing password login)
```

Step 7c is **just-in-time (JIT) provisioning** — the user is created on first SSO login.

---

### Flow B — Enterprise SSO with Domain Routing (Tier 2)

```
1.  User enters email on login screen: jane@acme.com
2.  Frontend: POST /api/auth/resolve-provider  { email: "jane@acme.com" }
3.  Backend: query organization_sso_configs WHERE email_domain = 'acme.com'
    a. Found  → return { provider_type, org_id, org_slug }
    b. Not found → fall back to password login
4.  If SSO: redirect to enterprise IdP (OIDC discovery or SAML redirect)
5.  IdP authenticates user (MFA, device check, etc. — all handled by the IdP)
6.  Callback: GET /api/auth/oauth/{org-slug}/callback  or  POST /api/auth/saml/{org-slug}/acs
7.  Backend verifies the assertion/token against the org's stored config
8.  Extract { sub, email } → same lookup logic as Flow A step 7
9.  JIT provision into the org's organization_members if not already a member
    (respect sso_required: if true, block password login attempts for this domain)
10. Issue internal JWT with org_id + org_role claims (from multi-tenancy design)
```

The internal JWT format is unchanged from the multi-tenancy design — SSO is just a different way to reach the same token-issuance step.

---

### Flow C — Linking a Provider to an Existing Account

A user registered with a password wants to also be able to log in with Google.

```
POST /api/auth/link-provider   (requires existing JWT cookie)
→ initiates OAuth flow with state={userId}
→ on callback: insert into external_identities (user_id={state}, provider, provider_user_id)
```

---

## New API Endpoints

```
# Social login initiation (one per provider)
GET  /api/auth/oauth/google
GET  /api/auth/oauth/github
GET  /api/auth/oauth/microsoft

# OAuth callbacks
GET  /api/auth/oauth/google/callback
GET  /api/auth/oauth/github/callback
GET  /api/auth/oauth/microsoft/callback

# Enterprise SSO (dynamic, keyed by org slug)
GET  /api/auth/sso/{orgSlug}/initiate        → redirects to org's configured IdP
POST /api/auth/sso/{orgSlug}/oidc/callback   → handles OIDC code exchange
POST /api/auth/sso/{orgSlug}/saml/acs        → handles SAML assertion (Assertion Consumer Service)

# Domain resolution (called by the login form on email entry)
POST /api/auth/resolve-provider              { "email": "..." }
→ { "method": "password" | "sso", "orgSlug": "acme", "providerType": "oidc" | "saml" }

# Account linking (for existing users)
GET  /api/auth/link/{provider}               (Authorize required)

# Org SSO config management (OrgAdmin only)
GET    /api/organizations/{id}/sso
PUT    /api/organizations/{id}/sso
DELETE /api/organizations/{id}/sso
```

---

## Backend Code Changes

### `users` entity

```csharp
public partial class User
{
    public Guid    Id           { get; set; }
    public string  Username     { get; set; } = null!;
    public string? Email        { get; set; }       // nullable until migration backfill
    public string? PasswordHash { get; set; }       // nullable for SSO-only users

    public virtual ICollection<ExternalIdentity> ExternalIdentities { get; set; } = new List<ExternalIdentity>();
    // ... rest unchanged
}
```

### New `ExternalIdentity` entity (scaffolded after V9 migration)

```csharp
public partial class ExternalIdentity
{
    public Guid     Id             { get; set; }
    public Guid     UserId         { get; set; }
    public string   Provider       { get; set; } = null!;
    public string   ProviderUserId { get; set; } = null!;
    public DateTime LinkedAt       { get; set; }

    public virtual User User { get; set; } = null!;
}
```

### `AuthService` — new methods

```csharp
public interface IAuthService
{
    Task<(UserResponse User, string Token)> RegisterAsync(RegisterRequest request);
    Task<(UserResponse User, string Token)> LoginAsync(LoginRequest request);

    // New
    Task<(UserResponse User, string Token)> HandleOAuthCallbackAsync(
        string provider, string providerUserId, string email, string displayName);

    Task<(UserResponse User, string Token)> HandleSamlCallbackAsync(
        string orgSlug, string providerUserId, string email);

    Task LinkProviderAsync(
        Guid userId, string provider, string providerUserId);

    Task<SsoProviderInfo?> ResolveProviderAsync(string email);
}
```

`HandleOAuthCallbackAsync` implements the lookup-or-create logic from Flow A step 7. It is shared by all social providers and enterprise OIDC.

### `OAuthController` (new controller)

Handles the OAuth initiation and callback routes. Uses ASP.NET Core's built-in OAuth middleware (`AddGoogle`, `AddGitHub`, etc.) or a library like `AspNet.Security.OAuth.Providers`.

### `SsoController` (new controller)

Handles enterprise OIDC/SAML flows. For SAML, use `ITfoxtec.Identity.Saml2` (the most actively maintained .NET SAML library).

### Token issuance — no change

`TokenService.GenerateToken` only needs `User` + `OrganizationMember` (already covered in the multi-tenancy design). SSO doesn't change what's in the JWT.

---

## Library Recommendations

| Concern | Library |
|---|---|
| Social OAuth (Google, GitHub, Microsoft) | `Microsoft.AspNetCore.Authentication.Google` / `.GitHub` (via `AspNet.Security.OAuth.Providers`) |
| Enterprise OIDC | `Microsoft.AspNetCore.Authentication.OpenIdConnect` (built-in) |
| Enterprise SAML 2.0 | `ITfoxtec.Identity.Saml2` |
| State parameter / CSRF in OAuth flows | Built into ASP.NET Core's OAuth middleware via the correlation cookie |

Avoid pulling in a full identity platform (Auth0, Keycloak) unless you want to offload all identity management — the current architecture is thin enough to wire the above libraries directly.

---

## Security Considerations

**Client secret storage:** The `client_secret` and SAML private key in `organization_sso_configs` must never be stored as plain text. Options:
- Encrypt with a key stored in environment config (AES-256-GCM)
- Use a secrets manager (AWS Secrets Manager, Azure Key Vault)

**State parameter (CSRF):** ASP.NET Core's built-in OAuth middleware handles this automatically via a signed correlation cookie. For custom flows, generate a random nonce, store it in the session, and verify it on callback.

**Provider account takeover:** Before linking an external identity to an existing user account by email match (Flow A step 7b), verify that the provider has confirmed the email address (`email_verified: true` in the OIDC claims). Some providers (GitHub) don't always verify emails. If `email_verified` is false, treat it as a new account, not a match.

**`sso_required` enforcement:** When an org sets `sso_required = true`, the password login endpoint must reject any user whose email domain matches that org, even if they have a `password_hash`. This prevents bypassing SSO via the password path.

---

## Frontend Changes

- **Login form:** On email blur/submit call `POST /api/auth/resolve-provider`. If the response is `{ method: "sso" }`, swap the password field for a "Continue with [Org IdP]" button.
- **Social buttons:** "Sign in with Google / GitHub" on the login and registration screens. These are simple `<a href="/api/auth/oauth/google">` links — no JS needed.
- **Account settings:** A "Connected accounts" section where users can link/unlink providers.
- **Org settings (OrgAdmin):** A form to configure the enterprise SSO IdP (discovery URL, client ID/secret for OIDC; metadata URL for SAML) and set `email_domain` + `sso_required`.

---

## Migration Path for Existing Users

1. Add `email` column as nullable; backfill from username if usernames happen to be emails, otherwise leave null and prompt users to add an email on next login.
2. Make `password_hash` nullable in the schema — existing users are unaffected (they still have a hash).
3. Existing password-based login continues to work with no changes.
4. SSO becomes an additive capability; users opt in by clicking "Connect Google" in account settings.
