# Keycloak Setup Guide — Search Sensei

This guide covers everything needed to configure a Keycloak instance for the Search Sensei application, including realm setup, client configuration, user profile attributes, roles, and theme deployment.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Realm Setup](#2-realm-setup)
3. [Client Configuration — Main App](#3-client-configuration--main-app-search-sensei)
4. [Client Configuration — Admin (Machine-to-Machine)](#4-client-configuration--admin-client-search-sensei-admin)
5. [User Profile Attributes](#5-user-profile-attributes)
6. [Client Roles](#6-client-roles)
7. [Organizations Feature](#7-organizations-feature)
8. [Custom Theme Deployment](#8-custom-theme-deployment)
9. [appsettings Configuration](#9-appsettings-configuration)
10. [Registration Flow Reference](#10-registration-flow-reference)
11. [Invite Flow Reference](#11-invite-flow-reference)
12. [Local Development Setup](#12-local-development-setup)
13. [Bypass Mode (No Keycloak)](#13-bypass-mode-no-keycloak)

---

## 1. Prerequisites

- Keycloak **26.6+** (Organizations feature requires 26+)
- Docker or a hosted Keycloak instance
- Access to the Keycloak Admin Console

---

## 2. Realm Setup

1. Log in to Keycloak Admin Console.
2. Create a new realm — e.g. `team-red` (production: use your environment name).
3. Under **Realm Settings → General**:
   - Display name: `Search Sensei`
4. Under **Realm Settings → Sessions**:
   - SSO Session Idle: `30 minutes`
   - SSO Session Max: `8 hours`
5. Under **Realm Settings → Tokens**:
   - Access Token Lifespan: `5 minutes` (matches `AccessTokenExpirySeconds: 300`)
   - Refresh Token Max Reuse: `0`

### Enable Organizations

1. Go to **Realm Settings → General**.
2. Scroll to **Organizations** and toggle **Enabled → On**.
3. Save.

### Disable "Verify Profile" Required Action

1. Go to **Authentication → Required Actions**.
2. Find **Verify Profile** and toggle **Enabled** off.
3. Why: Keycloak's verify-profile screen interferes with the registration / invite flows, where the backend has already populated all required user fields. Leaving it enabled causes invited users to be sent to a profile-edit screen instead of the password-set page.

---

## 3. Client Configuration — Main App (`search-sensei`)

> **Client ID note:** This guide uses `search-sensei` and `search-sensei-admin` as example client IDs. Some environments / earlier deployments use `osp-adminui` (and a separate admin service-account client) instead. Use whichever IDs match your actual realm — the configuration below applies the same way.

This is the OIDC client used by the web application for user login.

### Create the Client

1. Go to **Clients → Create client**.
2. Set:
   - **Client type:** `OpenID Connect`
   - **Client ID:** `search-sensei`
3. Click **Next**.
4. Enable:
   - **Standard flow:** On
   - **Direct access grants:** Off
5. Click **Next**, then **Save**.

### Settings Tab

| Field | Value |
|---|---|
| Client authentication | On (Confidential) |
| Authorization | Off |
| Valid redirect URIs | `http://localhost:5000/signin-oidc` (dev) / `https://yourdomain.com/signin-oidc` (prod) |
| Valid post logout redirect URIs | `http://localhost:5000/signout-callback-oidc` |
| Web origins | `http://localhost:5000` (dev) / `https://yourdomain.com` (prod) |

### Advanced Tab

| Field | Value |
|---|---|
| Proof Key for Code Exchange | S256 |
| Access Token Signature Algorithm | RS256 |

### Client Scopes

Ensure the following scopes are added to the client:

- `openid` (default)
- `profile` (default)
- `email` (default)
- `organization` (add if not present — this is a built-in Keycloak 26 scope for the Organizations feature)

### Retrieve Client Secret

1. Go to **Clients → search-sensei → Credentials**.
2. Copy the **Client secret** — this goes into `KeycloakAuthentication:ClientSecret` in appsettings.

### Protocol Mappers

The `active_tenant` user attribute must be exposed as a JWT claim — without this mapper the backend cannot read the current tenant context, and tenant switching will silently break.

1. Go to **Clients → search-sensei → Client Scopes**.
2. Open the dedicated scope (`search-sensei-dedicated` by default).
3. Click **Add mapper → By configuration → User Attribute**.
4. Configure:

| Field | Value |
|---|---|
| Name | `active_tenant` |
| User Attribute | `active_tenant` |
| Token Claim Name | `active_tenant` |
| Claim JSON Type | String |
| Add to ID token | On |
| Add to access token | On |
| Add to userinfo | On |
| Multivalued | Off |

> **Note:** The `organization` claim is provided automatically by Keycloak when the user logs in via an organisation — no custom mapper needed for it. Client roles (`org-admin`, `admin`, `manager`, `contributor`) are also mapped automatically into `resource_access.<clientId>.roles`.

---

## 4. Client Configuration — Admin Client (`search-sensei-admin`)

This is the machine-to-machine client used by the backend to manage users, organisations, and roles via the Keycloak Admin API.

### Create the Client

1. Go to **Clients → Create client**.
2. Set:
   - **Client type:** `OpenID Connect`
   - **Client ID:** `search-sensei-admin`
3. Click **Next**.
4. Enable:
   - **Standard flow:** Off
   - **Direct access grants:** Off
   - **Service accounts roles:** On
5. Click **Save**.

### Assign Admin Permissions to Service Account

1. Go to **Clients → search-sensei-admin → Service accounts roles**.
2. Click **Assign role → Filter by clients**.
3. Search for `realm-management` and assign all of the following roles:

| Role | Purpose |
|---|---|
| `manage-users` | Create, update, delete users |
| `view-users` | Query and list users |
| `manage-clients` | Query clients and roles |
| `view-clients` | View client role definitions |
| `manage-realm` | Organization management |
| `view-realm` | Read realm configuration |

> **Note:** If you prefer a more minimal permission set, at minimum `manage-users`, `view-users`, `view-clients`, and `manage-realm` are required.

### Retrieve Admin Client Secret

1. Go to **Clients → search-sensei-admin → Credentials**.
2. Copy the **Client secret** — this goes into `KeycloakAuthentication:AdminClientSecret`.

---

## 5. User Profile Attributes

Keycloak 26 enforces a **managed user profile** by default. Any attribute not declared here will be silently discarded when the backend tries to save it.

Go to **Realm Settings → User Profile → Add attribute** and create each of the following:

| Attribute Name | Description | Multivalued |
|---|---|---|
| `active_tenant` | The user's currently selected organisation (kebab-case name) | No |
| `tenants` | All organisations the user belongs to | Yes |
| `pendingPaymentSince` | ISO-8601 UTC timestamp set during registration, cleared after payment | No |
| `pendingOrgId` | Keycloak organisation UUID for a pending registration | No |
| `invitedAt` | ISO-8601 UTC timestamp set when a user is invited | No |

For each attribute:
- **Required:** No
- **Permission — Who can edit:** Admin only
- **Permission — Who can view:** Admin only
- Leave all validation rules blank

> **Important:** These must be added in every environment (dev, staging, production). Missing attributes will cause the registration, invite, and cleanup flows to silently fail.

---

## 6. Client Roles

Client roles are scoped to the main `search-sensei` client and assigned to users when they register or are invited.

Go to **Clients → search-sensei → Roles** and create:

| Role Name | Description |
|---|---|
| `org-admin` | Organisation administrator — can invite users and manage the organisation |
| `admin` | System administrator — full access |
| `manager` | Manager — elevated access, referenced in the `AdminOnly` authorization policy |
| `contributor` | Standard organisation member — assigned to invited users by default |

### How Roles Are Assigned

- **Registration:** The registering user is automatically assigned `org-admin` for their new organisation.
- **Invite:** The inviting admin specifies either `org-admin` or `contributor` when sending the invite.

---

## 7. Organizations Feature

The application uses Keycloak's built-in Organizations (introduced in Keycloak 26) as its multi-tenancy mechanism. Each customer organisation in the app maps 1:1 to a Keycloak organisation.

### What Is Stored on Organisations

The backend stores the following as custom attributes on each Keycloak organisation:

| Attribute | Set By | Description |
|---|---|---|
| `displayName` | Registration | Human-readable organisation name |
| `contactPerson` | Registration | Primary contact name |
| `contactPhone` | Registration | Primary contact phone |
| `organisationUrl` | Registration | Organisation website |
| `stripeCustomerId` | Stripe webhook | Stripe customer ID (set after payment) |
| `stripeSubscriptionId` | Stripe webhook | Stripe subscription ID (set after payment) |

No manual setup is needed for organisation attributes — they are set via the Admin API at runtime.

### JWT Claims the Backend Reads

`UserContextResolver.cs` parses the following claims from issued tokens, in fallback order:

| Claim | Source | Used For |
|---|---|---|
| `active_tenant` | User Attribute mapper (see [Section 3 → Protocol Mappers](#protocol-mappers)) | Current tenant context |
| `organization` | Automatic — present when the user logs in via an organisation | Org selected at login; also used to sync `active_tenant` |
| `resource_access.<clientId>.roles` | Automatic — client role mapping | User roles (`admin`, `manager`, `org-admin`, `contributor`) |
| `groups` | Group membership mapper (only if configured) | Fallback role source |
| `realm_access.roles` | Automatic — realm role mapping | Fallback role source |

### Active Tenant Sync on Login

When a user logs in via an organisation different from the one stored in their `active_tenant` attribute, `OnTokenValidated` (in `KeycloakAuthenticationExtensions.cs`) compares the `organization` claim against `active_tenant`, auto-updates the user attribute via the Admin API, and refreshes the tokens so the JWT stays consistent with the org they actually logged into. No manual configuration required — it happens as long as the protocol mapper above is in place.

---

## 8. Custom Theme Deployment

The application ships a custom Keycloak theme at `keycloak-theme/search-sensei/` that replaces the default login screens and invite email with Search Sensei branding.

### Deploy the Theme

**Docker (recommended):**

Mount the theme directory into the Keycloak container:

```yaml
volumes:
  - ./keycloak-theme/search-sensei:/opt/keycloak/themes/search-sensei
```

**Manual:**

Copy the `keycloak-theme/search-sensei` folder to:
```
/opt/keycloak/themes/search-sensei
```

### Activate the Theme

1. Go to **Realm Settings → Themes**.
2. Set:
   - **Login theme:** `search-sensei`
   - **Email theme:** `search-sensei`
3. Save.

### What the Theme Covers

| Template | Purpose |
|---|---|
| `login.ftl` | Username/password login page |
| `login-update-password.ftl` | Password set page (used in invite flow) |
| `login-update-profile.ftl` | Profile update page |
| `select-organization.ftl` | Organisation selector on login |
| `email/html/executeActions.ftl` | Invite email with branded CTA button |
| `email/html/password-reset.ftl` | Password reset email |

---

## 9. appsettings Configuration

### appsettings.json (template — values blank for production injection)

```json
{
  "KeycloakAuthentication": {
    "IsEnabled": true,
    "BaseUrl": "",
    "Realm": "",
    "Authority": "",
    "MetadataAddress": "",
    "ClientId": "",
    "ClientSecret": "",
    "AdminClientId": "",
    "AdminClientSecret": "",
    "ResponseType": "code",
    "CallbackPath": "/signin-oidc",
    "SaveTokens": true,
    "UsePkce": true,
    "RequireHttpsMetadata": true,
    "AccessTokenExpirySeconds": 300,
    "RefreshTokenExpirySeconds": 1800,
    "SilentRefreshThresholdSeconds": 60,
    "MaxRefreshRetryAttempts": 3
  }
}
```

### appsettings.development.json (local dev — **do not commit secrets**)

```json
{
  "KeycloakAuthentication": {
    "IsEnabled": true,
    "BaseUrl": "http://localhost:8080",
    "Realm": "team-red",
    "Authority": "http://localhost:8080/realms/team-red",
    "MetadataAddress": "http://localhost:8080/realms/team-red/.well-known/openid-configuration",
    "ClientId": "search-sensei",
    "ClientSecret": "<copy from Keycloak Admin>",
    "AdminClientId": "search-sensei-admin",
    "AdminClientSecret": "<copy from Keycloak Admin>",
    "RequireHttpsMetadata": false,
    "CallbackPath": "/signin-oidc",
    "SaveTokens": true,
    "UsePkce": true
  }
}
```

### Configuration Field Reference

| Field | Description |
|---|---|
| `IsEnabled` | Set to `false` to bypass Keycloak entirely (local dev without Keycloak) |
| `BaseUrl` | Root URL of Keycloak — e.g. `https://auth.yourdomain.com` |
| `Realm` | Realm name — e.g. `team-red` |
| `Authority` | `{BaseUrl}/realms/{Realm}` |
| `MetadataAddress` | `{Authority}/.well-known/openid-configuration` |
| `ClientId` | Main client ID |
| `ClientSecret` | Main client secret (from Credentials tab) |
| `AdminClientId` | Machine-to-machine client ID |
| `AdminClientSecret` | Machine-to-machine client secret |
| `RequireHttpsMetadata` | Set to `false` for local HTTP development only |
| `CallbackPath` | Must match the redirect URI registered in Keycloak |

### Storing Secrets with dotnet user-secrets (recommended for local dev)

Instead of putting client secrets in `appsettings.development.json`, use the .NET secret manager so they stay outside the repo:

```bash
dotnet user-secrets set "KeycloakAuthentication:ClientSecret" "<search-sensei client secret>"
dotnet user-secrets set "KeycloakAuthentication:AdminClientId" "search-sensei-admin"
dotnet user-secrets set "KeycloakAuthentication:AdminClientSecret" "<search-sensei-admin client secret>"
```

These values override the corresponding `appsettings.json` keys at runtime and are stored in `~/.microsoft/usersecrets/`. In Azure App Service, set the same keys as environment variables using `__` as the separator (e.g. `KeycloakAuthentication__ClientSecret`).

---

## 10. Registration Flow Reference

The self-service registration flow creates a Keycloak organisation and a disabled user, then redirects to Stripe. The user is only enabled after payment is confirmed via webhook.

```
POST /portal/api/register
        │
        ├── 1. Create Organisation (Keycloak Organizations API)
        │       └── Attributes: displayName, contactPerson, contactPhone, organisationUrl
        │
        ├── 2. Create User (disabled=true)
        │       └── Attributes: active_tenant, tenants, pendingPaymentSince, pendingOrgId
        │
        ├── 3. Add User to Organisation
        │
        ├── 4. Assign org-admin client role
        │
        ├── 5. Create Stripe Customer + Checkout Session
        │
        └── Returns { checkoutUrl } → frontend redirects to Stripe

Stripe webhook (checkout.session.completed)
        ├── EnableUserAsync()         → sets enabled=true in Keycloak
        └── UpdateOrgStripeAttributes() → stores stripeCustomerId, stripeSubscriptionId on org
```

**Cleanup:** `InviteCleanupService` runs hourly and deletes any disabled user (and their org) whose `pendingPaymentSince` is older than 24 hours and payment was never confirmed.

---

## 11. Invite Flow Reference

Org admins can invite new users from within the app. Invited users receive an email with a link to set their password.

```
POST /portal/api/invite  (requires org-admin or admin role)
        │
        ├── 1. Create User (disabled=true, requiredActions=["UPDATE_PASSWORD"])
        │       └── Attributes: active_tenant, tenants, invitedAt
        │
        ├── 2. Assign client role (org-admin or contributor)
        │
        ├── 3. Add User to Organisation
        │
        └── 4. Send execute-actions email (link valid 24 hours)
                └── User sets password → account activated → can log in
```

**Cleanup:** `InviteCleanupService` runs hourly and deletes any disabled user whose `invitedAt` is older than 24 hours and they never accepted.

---

## 12. Local Development Setup

### Run Keycloak with Docker

```bash
docker run -d \
  --name keycloak \
  -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  -v ./keycloak-theme/search-sensei:/opt/keycloak/themes/search-sensei \
  quay.io/keycloak/keycloak:26.0.0 start-dev
```

### Quick Setup Checklist

- [ ] Keycloak running at `http://localhost:8080`
- [ ] Realm `team-red` created
- [ ] Organizations feature enabled on the realm
- [ ] Client `search-sensei` created with redirect URI `http://localhost:5000/signin-oidc`
- [ ] Client `search-sensei-admin` created with service accounts enabled and `manage-users`, `view-users`, `view-clients`, `manage-realm` roles assigned
- [ ] User Profile attributes added: `active_tenant`, `tenants`, `pendingPaymentSince`, `pendingOrgId`, `invitedAt`
- [ ] Client roles created: `org-admin`, `admin`, `manager`, `contributor`
- [ ] Theme activated: Login = `search-sensei`, Email = `search-sensei`
- [ ] `appsettings.development.json` populated with client secrets

---

## 13. Bypass Mode (No Keycloak)

For running the application locally without a Keycloak instance, set `IsEnabled` to `false`:

```json
{
  "KeycloakAuthentication": {
    "IsEnabled": false,
    "ActiveTenantWhenDisabled": "OSP_DEV"
  }
}
```

When disabled:
- All requests are treated as authenticated with a local admin identity.
- No tokens, no redirects to Keycloak.
- The `ActiveTenantWhenDisabled` value is used as the tenant context.
- Registration and invite flows will not function (they require Keycloak Admin API).
