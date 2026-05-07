# BookStack Configuration Guide

BookStack runs as a separate container behind Keycloak SSO. The Admin UI sidebar links to BookStack; both apps share the same Keycloak realm.

For Keycloak-side configuration, see [keycloak-bookstack-integration.md](./keycloak-bookstack-integration.md).

---

## At a glance

| | |
|---|---|
| Image | `lscr.io/linuxserver/bookstack:latest` |
| Local port | `6875` |
| Database | MySQL 8 (container, local only — replace in production) |
| Auth | OIDC against the OSP Keycloak realm |
| Edit permission | Keycloak realm role `platform-admin` |
| Compose template | [`docker/docker-compose.bookstack-example.yml`](../docker/docker-compose.bookstack-example.yml) — copy and fill in placeholders |

---

## Prerequisites

1. Keycloak is configured per [keycloak-bookstack-integration.md](./keycloak-bookstack-integration.md):
   - Realm role `platform-admin` exists and is assigned to platform administrators
   - OIDC client `bookstack` exists with redirect URIs and a User Realm Role Protocol Mapper that emits a top-level `roles` claim into the ID token
   - Client secret obtained
2. **Local development only**: add `127.0.0.1 host.docker.internal` to `/etc/hosts` so the browser and the container resolve Keycloak via the same hostname (required for OIDC `iss` claim consistency):
   ```bash
   sudo sh -c 'echo "127.0.0.1 host.docker.internal" >> /etc/hosts'
   ```
   Clear Chrome's host cache afterwards: `chrome://net-internals/#dns` → Clear host cache. Not needed in production (real FQDN resolves identically from both sides).

---

## Local development — one-pass setup

### 1. Create your working compose file from the template

The repository ships [`docker/docker-compose.bookstack-example.yml`](../docker/docker-compose.bookstack-example.yml) as a placeholder-only template. Copy it to a working file (the file you actually run; treat it like any local config that may carry secrets and keep it out of git):

```bash
cp docker/docker-compose.bookstack-example.yml docker/docker-compose.bookstack.yml
```

> Add `docker/docker-compose.bookstack.yml` to `.gitignore` if your project doesn't already do so — the working copy will hold a Keycloak client secret.

Open the new `docker/docker-compose.bookstack.yml`. Configuration lives at the bottom under `configs.bookstack_env.content`. Three placeholders must be replaced before the first start:

| Field in the YAML | Where the value comes from |
|---|---|
| `APP_KEY=base64:<paste-generated-app-key>` | Run the command below; paste the **entire** `base64:...=` line (replacing the `<paste-generated-app-key>` placeholder, leaving the `base64:` prefix in place) |
| `OIDC_ISSUER=http://host.docker.internal:8080/realms/<your-realm>` | Replace `<your-realm>` with the Keycloak realm name (e.g. `osp-dev`). The full URL must exactly match the `iss` claim Keycloak emits |
| `OIDC_CLIENT_SECRET=<paste-bookstack-client-secret-from-keycloak>` | Keycloak admin console → Clients → `bookstack` → **Credentials** tab → copy **Client Secret** |

Generate the Laravel `APP_KEY`:

```bash
docker run --rm lscr.io/linuxserver/bookstack:latest php artisan key:generate --show
```

The command prints `base64:abcd1234...=`. Paste that whole string (with the `base64:` prefix) over the placeholder. Keep it stable across restarts — rotating `APP_KEY` invalidates all encrypted data BookStack has already written.

> **Never commit production secrets to git.** Local dev can keep secrets in the working compose file (because the file is gitignored). For production, see [Production deployment](#production-deployment) — secrets should come from Azure Key Vault or App Service environment variables.

### 2. Start the stack

```bash
docker compose -f docker/docker-compose.bookstack.yml up -d
```

### 3. Map `platform-admin` → BookStack Admin

```bash
docker exec $(docker compose -f docker/docker-compose.bookstack.yml ps -q bookstack-db) \
  mysql -ubookstack -pbookstack bookstack -e \
  "UPDATE roles SET external_auth_id='platform-admin' WHERE system_name='admin';"
```

### 4. First login (must be a `platform-admin` user)

Open `http://host.docker.internal:6875` and sign in via Keycloak with an account that holds the `platform-admin` realm role. You land as BookStack Admin.

> Do not let any non-`platform-admin` user log in before step 5 — they will be created with no role and need cleanup. See [Cleanup](#cleanup-stuck-users).

### 5. Set the Default User Role

While still signed in as the platform admin from step 4:

1. Click your avatar (top-right corner) → **Settings**
2. In the left sidebar, click **Customization**
3. Scroll to **Default User Role** → change the dropdown from the current value to **Viewer**
4. Click **Save Settings** at the bottom

This setting is what BookStack assigns to any new user account. Without it, OIDC users that log in but don't match any role mapping end up with no role at all — they exist in the `users` table but cannot use the application.

### 6. Wire the Knowledge Base link into the Admin UI

The Admin UI shows a "Knowledge Base" entry in its left sidebar only when `AdminSettings:BookStackUrl` is set ([`Models/AdminSettings.cs`](../Models/AdminSettings.cs:63), [`ClientApp/src/components/LeftMenu/LeftMenu.tsx`](../ClientApp/src/components/LeftMenu/LeftMenu.tsx)). For local development, add the value to [`appsettings.development.json`](../appsettings.development.json):

```jsonc
{
  "AdminSettings": {
    "BookStackUrl": "http://host.docker.internal:6875"
  }
}
```

Or, to keep the value out of any tracked file, use .NET user-secrets:

```bash
dotnet user-secrets set "AdminSettings:BookStackUrl" "http://host.docker.internal:6875"
```

Restart the Admin UI (`dotnet run`) after adding the value. The "Knowledge Base" link should appear in the sidebar after the next sign-in.

### 7. Verify

Sign in to the Admin UI, click the **Knowledge Base** sidebar link — BookStack should open in a new tab, already authenticated as the same Keycloak user. Cross-check in the database:

```bash
docker exec $(docker compose -f docker/docker-compose.bookstack.yml ps -q bookstack-db) \
  mysql -ubookstack -pbookstack bookstack -e "
SELECT u.id, u.email, r.display_name AS role
FROM users u
LEFT JOIN role_user ru ON ru.user_id = u.id
LEFT JOIN roles r ON r.id = ru.role_id
WHERE u.id > 3 ORDER BY u.id;"
```

`platform-admin` users should appear with role **Admin**; everyone else with **Viewer**.

### 8. Apply the custom theme

[`Bookstack/bookstack.html`](../Bookstack/bookstack.html) holds the Search Sensei sidebar styling, the custom shelves/books navigation, and a "← Back to Console" footer button that links back to the Admin UI. BookStack does not load this file from disk — paste it into the running instance:

1. Sign in as the `platform-admin` from step 4
2. Click your avatar (top-right) → **Settings** → **Customization**
3. Find the **Custom HTML head content** field and paste the entire contents of [`Bookstack/bookstack.html`](../Bookstack/bookstack.html)
4. Click **Save Settings**
5. Hard-reload any BookStack page — the left sidebar should turn dark green and the "← Back to Console" button should appear at its bottom

The button's `href` is hardcoded to `http://localhost:5000/adminui` for local development. For other environments, edit the `link.href` value inside the `addBackToConsoleButton` function before pasting — see [Production deployment § 1](#1-replace-hostdockerinternal-with-real-fqdns).

### Cleanup stuck users

If anyone logged in before step 5, they exist with no role. Remove them — they will be recreated correctly on next login:

```bash
docker exec $(docker compose -f docker/docker-compose.bookstack.yml ps -q bookstack-db) \
  mysql -ubookstack -pbookstack bookstack -e "
DELETE u FROM users u
LEFT JOIN role_user ru ON ru.user_id = u.id
WHERE u.id > 3 AND ru.user_id IS NULL;"
```

---

## Role mapping

| Keycloak | BookStack | Permissions |
|---|---|---|
| Realm role `platform-admin` | Admin | Full access |
| Anything else (logged-in users) | Viewer | Read-only |

Driven by `roles.external_auth_id = 'platform-admin'` (set in step 3) and `OIDC_GROUPS_CLAIM=roles`. Revoking `platform-admin` in Keycloak demotes the user on their next login (`OIDC_REMOVE_FROM_GROUPS=true`).

---

## Configuration reference

The compose file injects a complete `.env` into the container via Docker Compose `configs.content`. Key environment variables:

| Variable | Value | Notes |
|---|---|---|
| `APP_KEY` | base64 Laravel app key | Generate once; rotating invalidates encrypted data |
| `APP_URL` | `http://host.docker.internal:6875` | FQDN in production |
| `AUTH_METHOD` | `oidc` | Disables local login form |
| `AUTH_AUTO_INITIATE` | `true` | Skips BookStack's intermediate login page |
| `OIDC_CLIENT_ID` | `bookstack` | Matches the Keycloak client ID |
| `OIDC_CLIENT_SECRET` | *(from Keycloak)* | Store as a secret in production |
| `OIDC_ISSUER` | `http://host.docker.internal:8080/realms/<realm>` | Must match Keycloak's `iss` claim exactly |
| `OIDC_ISSUER_DISCOVER` | `true` | Auto-discover endpoints |
| `OIDC_END_SESSION_ENDPOINT` | `false` | Intentionally off — see [Logout behaviour](#logout-behaviour) |
| `OIDC_USER_TO_GROUPS` | `true` | Sync roles from token |
| `OIDC_GROUPS_CLAIM` | `roles` | Top-level claim from the Keycloak Protocol Mapper |
| `OIDC_REMOVE_FROM_GROUPS` | `true` | Demote when role revoked |

---

## Production deployment

The local compose is a development scaffold, not a production artifact. Below are the changes required to go live, with concrete file pointers.

### 1. Replace `host.docker.internal` with real FQDNs

Hostnames change in three places that must stay consistent:

| Where | Field | Production value (example) |
|---|---|---|
| Your working compose file (copied from [`docker-compose.bookstack-example.yml`](../docker/docker-compose.bookstack-example.yml)) → `configs.bookstack_env.content` | `APP_URL=` | `https://kb.company.com` |
| Same compose file | `OIDC_ISSUER=` | `https://login.company.com/realms/<realm>` |
| Keycloak admin console → Clients → `bookstack` → Settings | Valid redirect URIs / Post logout redirect URIs / Web origins / Root URL / Home URL | `https://kb.company.com/...` |
| [`Bookstack/bookstack.html`](../Bookstack/bookstack.html) → `addBackToConsoleButton()` → `link.href` | `http://localhost:5000/adminui` | `https://app.company.com/adminui` |

### 2. Replace the database container with a managed service

Remove the `bookstack-db` service from the compose file (or use a separate compose for production). Point the BookStack container at a managed MySQL endpoint by setting `DB_HOST=`, `DB_USERNAME=`, `DB_PASSWORD=`, `DB_DATABASE=` to the managed instance's values.

### 3. Externalise secrets

Move these out of the compose file (which lives in git) and into Azure Key Vault / App Service environment variables / Kubernetes secrets:

- `APP_KEY`
- `DB_PASSWORD`
- `OIDC_CLIENT_SECRET`

In compose, leave these as variable references (`OIDC_CLIENT_SECRET=${BOOKSTACK_OIDC_CLIENT_SECRET}`) and supply them at deploy time.

### 4. Drop the local-dev OIDC patch

Remove this block from the `bookstack` service's `volumes:` in the compose file — production uses HTTPS, where the patch is unnecessary:

```yaml
- ./bookstack-patches/OidcProviderSettings.php:/app/www/app/Access/Oidc/OidcProviderSettings.php:ro
```

See [Local-dev patches](#local-dev-patches) for context.

### 5. Configure the Admin UI to point at BookStack

The Admin UI's sidebar "Knowledge Base" link is rendered only when `AdminSettings:BookStackUrl` is non-empty (see [`Models/AdminSettings.cs`](../Models/AdminSettings.cs) and [`ClientApp/src/components/LeftMenu/LeftMenu.tsx`](../ClientApp/src/components/LeftMenu/LeftMenu.tsx)). Set it for each environment:

- **Local dev** — add to [`appsettings.development.json`](../appsettings.development.json):
  ```jsonc
  {
    "AdminSettings": {
      "BookStackUrl": "http://host.docker.internal:6875"
    }
  }
  ```
  (Or use `dotnet user-secrets set "AdminSettings:BookStackUrl" "http://host.docker.internal:6875"` to keep the value out of the file.)
- **Azure App Service / container apps** — set the environment variable `AdminSettings__BookStackUrl=https://kb.company.com`. The double underscore is .NET configuration's convention for nested keys.

If this value is missing, the menu entry silently disappears — there is no error, the link just is not rendered. That's the most common "I deployed everything but no link shows up" symptom; check this first.

### 6. Backups and topology

- Define RPO/RTO and schedule managed-MySQL backups.
- Confirm deployment topology with the customer: dedicated domain (`kb.company.com`), subpath (`app.company.com/kb` — requires reverse-proxy and a path-aware `APP_URL`), or subdomain (`kb.app.company.com`). The choice affects TLS strategy and reverse-proxy rules.

---

## Known limitations

### Logout behaviour

Each app's session is independent of Keycloak's SSO session. BookStack manages its own Laravel session cookie; once issued, BookStack does not re-consult Keycloak.

| Action | BookStack | Admin UI | Keycloak SSO |
|---|---|---|---|
| Admin UI logout | unchanged | cleared | cleared |
| BookStack logout (button) | cleared | unchanged | unchanged (because `OIDC_END_SESSION_ENDPOINT=false`) |
| Keycloak SSO idle timeout | unchanged locally; next OIDC flow re-prompts | unchanged | cleared |

**`OIDC_END_SESSION_ENDPOINT=false` is deliberate.** Setting it to `true` would make a BookStack logout cascade through Keycloak and force the Admin UI to re-authenticate.

**Back-channel logout is not supported by BookStack** ([upstream issue #5279](https://github.com/BookStackApp/BookStack/issues/5279), closed without core implementation). The `bookstack` Keycloak client must therefore have its **Backchannel Logout URL empty** — configuring it produces nothing but HTTP 419 noise. Adopting back-channel logout would require a BookStack fork.

### Switching accounts in the same browser

BookStack's session cookie survives an Admin UI logout, so signing a different Keycloak account into the Admin UI shows the previous user's BookStack view. Workaround: log out from BookStack manually, or use an incognito window. Rarely an issue in production where users have their own browser profile.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `500` on `/oidc/login`, log says `Issuer value must start with https://` | Local Keycloak is on HTTP | Confirm the `OidcProviderSettings.php` bind mount is active — see [Local-dev patches](#local-dev-patches) |
| OIDC users end up with no role | Default User Role not set, or Keycloak Protocol Mapper missing the `roles` claim | Run setup step 5; verify the User Realm Role mapper has `Add to ID token=ON`. Temporarily enable `OIDC_DUMP_USER_DETAILS=true` and check `/config/log/bookstack/laravel.log` to see what claims arrive |
| Admin UI is signed in but BookStack re-prompts for Keycloak password | Admin UI and BookStack point to Keycloak via different hostnames (`localhost` vs `host.docker.internal`); the browser's Keycloak cookie is scoped to one origin | Align both apps' Keycloak hostname. Locally: set Admin UI's `KeycloakAuthentication:Authority` to `http://host.docker.internal:8080/realms/<realm>` |
| `platform-admin` users still appear as Viewer | `external_auth_id` not set on Admin role, or wrong `OIDC_GROUPS_CLAIM` | Re-run setup step 3; confirm `OIDC_GROUPS_CLAIM=roles` |
| SSO redirect loops | Cookie domain mismatch — accessed BookStack via a different hostname than `APP_URL` | Use the same hostname in `APP_URL` and in the browser |
| BookStack session active after Admin UI logout | Expected — see [Logout behaviour](#logout-behaviour) | — |

---

## Local-dev patches

[`docker/bookstack-patches/OidcProviderSettings.php`](../docker/bookstack-patches/OidcProviderSettings.php) is a minimally-modified copy of the BookStack file at `/app/www/app/Access/Oidc/OidcProviderSettings.php`, bind-mounted via the compose file. It relaxes BookStack's hard-coded requirement that the OIDC issuer and endpoint URLs start with `https://` so that a plain-HTTP local Keycloak is accepted. All other OIDC validation is untouched.

The patch is **only needed for local development**. Production should run Keycloak over HTTPS, in which case the original BookStack file passes the check naturally — drop the bind mount from the production compose file. See [`docker/bookstack-patches/README.md`](../docker/bookstack-patches/README.md) for refreshing the patch when upgrading BookStack.
