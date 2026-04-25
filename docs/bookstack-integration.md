# BookStack Configuration Guide

This document describes how to deploy and configure BookStack as the Knowledge Base backend for the OSP Search Admin platform, with Keycloak SSO.

BookStack is accessed directly by end users via SSO; there is no custom embedding layer. Editing permissions are enforced by BookStack's built-in role system, driven by a Keycloak realm role.

For the Keycloak-side configuration that this guide depends on, see [keycloak-bookstack-integration.md](./keycloak-bookstack-integration.md).

---

## Integration Summary

| Aspect | Decision |
|---|---|
| Tenant isolation | None — a single shared KB visible to all logged-in users |
| Edit permission | Only users with the `platform-admin` Keycloak realm role |
| Entry point | A single "Knowledge Base" link in the adminui sidebar (visible to all authenticated users) |
| Logout behaviour | Each application manages its own session independently. Neither an Admin UI logout nor a BookStack logout terminates the other application's local session — see "Logout behaviour — known limitation" below |
| Data persistence (local) | Docker named volumes |
| Deployment | Standalone container on port `6875` (local); production FQDN to be confirmed with customer |

---

## Prerequisites

1. A running Keycloak instance with the realm used by OSP Search Admin.
2. The Keycloak configuration described in [keycloak-bookstack-integration.md](./keycloak-bookstack-integration.md) is complete:
   - Realm role `platform-admin` created and assigned to platform administrators
   - OIDC client `bookstack` created with redirect URIs and web origins configured (Backchannel Logout URL should be left empty — see the Keycloak guide's section 2.2 for why)
   - Client secret obtained
3. Docker / Docker Compose available on the host.
4. (Local development only) `/etc/hosts` contains `127.0.0.1 host.docker.internal` so the browser resolves the same hostname that containers use. This ensures the OIDC `iss` claim matches across browser and container perspectives.
   ```bash
   sudo sh -c 'echo "127.0.0.1 host.docker.internal" >> /etc/hosts'
   ```
   After editing, clear Chrome DNS cache at `chrome://net-internals/#dns` → Clear host cache.
   This step is **not needed in production** — a real FQDN (e.g. `kb.company.com`) resolves identically from both browser and containers via public DNS.

---

## Docker Compose Deployment

File: `docker/docker-compose.bookstack.yml`

**Image:** `lscr.io/linuxserver/bookstack:latest`
**Exposed port:** `6875 → 80`

The LinuxServer BookStack image reads its configuration from `/config/www/.env`. Rather than pass each variable through `environment:`, this compose file uses Docker Compose `configs.content` to render a complete `.env` file at container start. This matches the layout BookStack expects and avoids edge cases where individual env vars are not picked up by the image.

```yaml
services:
  bookstack:
    image: lscr.io/linuxserver/bookstack:latest
    ports:
      - "6875:80"
    depends_on:
      bookstack-db:
        condition: service_healthy
    volumes:
      - bookstack_data:/config
    configs:
      - source: bookstack_env
        target: /config/www/.env

  bookstack-db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=root
      - MYSQL_DATABASE=bookstack
      - MYSQL_USER=bookstack
      - MYSQL_PASSWORD=bookstack
    volumes:
      - bookstack_db_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "bookstack", "-pbookstack"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 30s

configs:
  bookstack_env:
    content: |
      APP_KEY=base64:<generate-a-new-laravel-app-key>
      APP_URL=http://host.docker.internal:6875

      DB_HOST=bookstack-db
      DB_DATABASE=bookstack
      DB_USERNAME=bookstack
      DB_PASSWORD=bookstack

      # --- Keycloak OIDC ---
      AUTH_METHOD=oidc
      AUTH_AUTO_INITIATE=true
      OIDC_NAME=Keycloak
      OIDC_DISPLAY_NAME_CLAIMS=name
      OIDC_CLIENT_ID=bookstack
      OIDC_CLIENT_SECRET=<bookstack-client-secret>
      OIDC_ISSUER=http://host.docker.internal:8080/realms/<realm>
      OIDC_ISSUER_DISCOVER=true
      OIDC_END_SESSION_ENDPOINT=false

      # --- Role sync: Keycloak realm role -> BookStack role ---
      OIDC_USER_TO_GROUPS=true
      OIDC_GROUPS_CLAIM=roles
      OIDC_REMOVE_FROM_GROUPS=true

volumes:
  bookstack_data:
  bookstack_db_data:
```

Generate a fresh `APP_KEY` with:

```bash
docker run --rm lscr.io/linuxserver/bookstack:latest php artisan key:generate --show
```

Start the stack:

```bash
docker compose -f docker/docker-compose.bookstack.yml up -d
```

Because `AUTH_METHOD=oidc` disables BookStack's local login form, the initial bootstrap has to run with OIDC off — see "Initial Setup" below.

---

## Environment Variable Reference

| Variable | Value | Notes |
|---|---|---|
| `APP_KEY` | base64 Laravel app key | Must stay stable across restarts — rotating it invalidates encrypted data. Generate once and store as a secret. |
| `APP_URL` | `http://host.docker.internal:6875` | Replace with FQDN in production |
| `AUTH_METHOD` | `oidc` | Enables OIDC authentication. Disables the local email/password login form — see "Initial Setup" for the bootstrap procedure |
| `AUTH_AUTO_INITIATE` | `true` | Skips BookStack's intermediate login page and redirects straight to Keycloak. Leave as `false` only during the one-off bootstrap |
| `OIDC_NAME` | `Keycloak` | Label shown on the login button (if `AUTH_AUTO_INITIATE=false`) |
| `OIDC_CLIENT_ID` | `bookstack` | Must match the Keycloak client ID |
| `OIDC_CLIENT_SECRET` | *(from Keycloak)* | Store in a secret manager; never commit to git |
| `OIDC_ISSUER` | `http://host.docker.internal:8080/realms/<realm>` | Must exactly match Keycloak's `iss` claim |
| `OIDC_ISSUER_DISCOVER` | `true` | Auto-discover OIDC endpoints from `/.well-known/openid-configuration` |
| `OIDC_END_SESSION_ENDPOINT` | `false` | Intentionally **disabled**. Setting this to `true` makes a BookStack logout also terminate the Keycloak SSO session, which then forces the Admin UI user to re-authenticate on their next protected action — undesirable because BookStack is a secondary surface and its logout should not cascade to the primary app. See "Logout behaviour — known limitation" below |
| `OIDC_USER_TO_GROUPS` | `true` | Enable role synchronisation from the ID token |
| `OIDC_GROUPS_CLAIM` | `roles` | Top-level claim emitted by the Keycloak **User Realm Role** Protocol Mapper. See [keycloak-bookstack-integration.md](./keycloak-bookstack-integration.md) — the mapper is required; Keycloak does not put realm roles in the ID token by default |
| `OIDC_REMOVE_FROM_GROUPS` | `true` | Revoking a role in Keycloak demotes the user on next login. Works together with a BookStack **Default User Role** of Viewer so users never end up with no role |

---

## Initial Setup — Bootstrapping

BookStack's local email/password login is disabled whenever `AUTH_METHOD=oidc`. Several one-off configuration steps require admin access to BookStack's UI, so bootstrap runs with OIDC disabled, then OIDC is enabled at the end.

### Phase 1 — Start with OIDC disabled

Comment out (or remove) the `AUTH_METHOD=oidc` line in the `bookstack_env` config block and start the stack:

```bash
docker compose -f docker/docker-compose.bookstack.yml up -d
```

On first start the image seeds the built-in admin account `admin@admin.com` / `password`.

### Phase 2 — Configure BookStack as the built-in admin

1. Open `http://host.docker.internal:6875` and sign in as `admin@admin.com` / `password`.
2. **Settings → Users → Admin** → change the password immediately.
3. **Settings → Customization → Default User Role** → set to **Viewer**. This ensures users created via OIDC always start with Viewer — the role that Keycloak-authenticated users without the `platform-admin` realm role should have.
4. Sign out of BookStack.

### Phase 3 — Map the Keycloak `platform-admin` role to BookStack Admin

With OIDC currently disabled, BookStack's UI hides the **External Authentication IDs** field on roles. The mapping is added directly in the database:

```bash
docker exec $(docker compose -f docker/docker-compose.bookstack.yml ps -q bookstack-db) \
  mysql -ubookstack -pbookstack bookstack -e \
  "UPDATE roles SET external_auth_id='platform-admin' WHERE system_name='admin';"
```

Verify:

```bash
docker exec $(docker compose -f docker/docker-compose.bookstack.yml ps -q bookstack-db) \
  mysql -ubookstack -pbookstack bookstack -e \
  "SELECT id, display_name, system_name, external_auth_id FROM roles;"
```

The Admin row should show `external_auth_id = platform-admin`.

### Phase 4 — Enable OIDC and recreate the container

Uncomment `AUTH_METHOD=oidc` (and confirm `AUTH_AUTO_INITIATE=true`) in the config block, then:

```bash
docker compose -f docker/docker-compose.bookstack.yml up -d --force-recreate bookstack
```

`--force-recreate` forces Docker Compose to re-render the `bookstack_env` config from the updated compose file.

### Phase 5 — Verify

1. Open `http://host.docker.internal:6875` — should redirect to Keycloak automatically.
2. Sign in with a Keycloak account that holds the `platform-admin` realm role. BookStack should land on the home page and show admin-only controls (Create/Edit, Settings menu).
3. Sign out and sign in with a Keycloak account that does **not** hold `platform-admin`. BookStack should show a read-only view.
4. Confirm role assignment in the database:
   ```bash
   docker exec $(docker compose -f docker/docker-compose.bookstack.yml ps -q bookstack-db) \
     mysql -ubookstack -pbookstack bookstack -e "
   SELECT u.id, u.email, r.display_name AS role
   FROM users u
   LEFT JOIN role_user ru ON ru.user_id = u.id
   LEFT JOIN roles r ON r.id = ru.role_id
   WHERE u.id > 3
   ORDER BY u.id;"
   ```
   `platform-admin` users should appear with role **Admin**; everyone else with **Viewer**.

---

## Role Mapping

| Keycloak identity | BookStack role | Permissions |
|---|---|---|
| User with realm role `platform-admin` | Admin | Create/edit/delete any content; manage users |
| Any other OIDC user (`manager`, `org-admin`, regular users) | Viewer | Read-only browsing |

Role mapping is driven by a top-level `roles` claim in the ID token and relies on two pieces of configuration:

1. On the **Keycloak** side — a **User Realm Role** Protocol Mapper on the `bookstack` client must be configured to emit the claim into the ID token. Keycloak does **not** include realm roles in the ID token by default. Setup is documented in [keycloak-bookstack-integration.md](./keycloak-bookstack-integration.md).
2. On the **BookStack** side — the Admin role's `external_auth_id` column is set to `platform-admin` (see "Initial Setup" → Phase 3). Other BookStack roles are left without an external ID so they are not assigned by the OIDC sync.

Combined with `OIDC_REMOVE_FROM_GROUPS=true` and BookStack's Default User Role set to Viewer, this produces the intended behaviour: users with `platform-admin` are promoted to Admin on login, and revoking the role in Keycloak demotes them on their next login. Users without the role remain Viewer.

---

## Verification

```bash
# Container is running
docker compose -f docker/docker-compose.bookstack.yml ps

# OIDC environment is correctly rendered into /config/www/.env
BS=$(docker compose -f docker/docker-compose.bookstack.yml ps -q bookstack)
docker exec "$BS" grep -E "^(AUTH_|OIDC_)" /config/www/.env

# Hostname resolution (local development only)
ping -c 1 host.docker.internal   # expect 127.0.0.1

# OIDC discovery endpoint reachable from inside the BookStack container
docker exec "$BS" curl -s \
  http://host.docker.internal:8080/realms/<realm>/.well-known/openid-configuration | head
```

---

## Troubleshooting

| Symptom | Likely cause | Resolution |
|---|---|---|
| "Invalid issuer" / OIDC login fails immediately | Mismatch between `OIDC_ISSUER` and Keycloak's actual `iss` claim | Ensure both sides use the exact same hostname, port, and realm. `localhost` vs `host.docker.internal` is a common cause |
| `500` on `/oidc/login` with log message `Issuer value must start with https://` | BookStack refuses a non-HTTPS issuer | Expected in production (use HTTPS). In local development, confirm the `OidcProviderSettings.php` bind mount from `docker/bookstack-patches/` is active — see "Local development notes" |
| SSO redirects loop | Cookie domain mismatch | Access BookStack via the same hostname as configured in `APP_URL` — do not mix `localhost` and `host.docker.internal` |
| Users cannot see "Create" buttons even after being assigned `platform-admin` | Role mapping not configured on the Admin role | Verify the Admin role has `external_auth_id='platform-admin'` (see "Initial Setup" → Phase 3). Confirm `OIDC_GROUPS_CLAIM=roles` |
| All OIDC-authenticated users end up with no role (`role = NULL` in the database) | Either the `roles` claim is missing from the ID token, or BookStack's Default User Role is not set | Check the ID token contents (temporarily set `OIDC_DUMP_USER_DETAILS=true`, log in, inspect `/config/log/bookstack/laravel.log`); confirm the Keycloak User Realm Role Protocol Mapper is configured and its "Add to ID token" checkbox is on. Confirm **Settings → Customization → Default User Role = Viewer** in BookStack |
| ID token logged by `OIDC_DUMP_USER_DETAILS` does not contain a `roles` claim | The Keycloak Protocol Mapper is missing, its Token Claim Name is wrong, or "Add to ID token" is disabled | See [keycloak-bookstack-integration.md](./keycloak-bookstack-integration.md) → Protocol Mapper section. The mapper must be a **User Realm Role** mapper on the `bookstack` client's dedicated scope with `Token Claim Name=roles`, `Multivalued=ON`, and `Add to ID token=ON` |
| BookStack session remains active after Admin UI logout | **Expected** — BookStack does not implement OIDC back-channel logout | See "Logout behaviour — known limitation" below for the full rationale and accepted mitigations |
| User is already signed in to Admin UI but BookStack still asks them to sign in to Keycloak | Admin UI and BookStack point to Keycloak at **different hostnames**, so the browser treats them as separate origins and the Keycloak session cookie does not cross | Make both apps reach Keycloak via the **same hostname** — see "Single Keycloak hostname requirement" below |

---

## Production Considerations

The local development setup uses HTTP and a Docker MySQL container, which is not acceptable for production. The following changes are required before going live:

- **HTTPS everywhere** — Serve BookStack, Keycloak, and the OSP admin portal over HTTPS with valid TLS certificates. Replace `host.docker.internal` with a real FQDN in `APP_URL`, `OIDC_ISSUER`, and all Keycloak redirect URIs.
- **Managed database** — Replace the MySQL container with a managed service such as Azure Database for MySQL. The docker-compose MySQL service is intended for local development only.
- **Secret management** — Store `DB_PASS`, `MYSQL_ROOT_PASSWORD`, and `OIDC_CLIENT_SECRET` in Azure Key Vault or equivalent. Never commit secrets to source control.
- **Disable local login** — Set `AUTH_AUTO_INITIATE=true` so all authentication goes through Keycloak.
- **Backup policy** — Define RPO / RTO targets and implement database backups.
- **Deployment topology** — Decide on one of: dedicated domain (`kb.company.com`), subpath on the main domain (`app.company.com/kb`, requires reverse-proxy configuration and a path-aware `APP_URL`), or subdomain (`kb.app.company.com`). This affects TLS strategy and reverse-proxy rules.
- **Logout behaviour is intentionally one-way** — BookStack does not implement OIDC back-channel logout, so do not configure a Backchannel Logout URL on the Keycloak client. Operate on the assumption that Admin UI logout leaves the BookStack tab logged in; the Keycloak SSO session idle timeout eventually terminates it. Full rationale in "Logout behaviour — known limitation" below.
- **Remove the local-dev OIDC patch** — The local compose file bind-mounts `docker/bookstack-patches/OidcProviderSettings.php` into the container to allow `http://` issuers. Production uses HTTPS, so this override is unnecessary and should be removed from the production compose file. See "Local development notes" below.
- **Point the Admin UI at BookStack** — Set `AdminSettings:BookStackUrl` on the Admin UI to the production BookStack FQDN (e.g. `https://kb.company.com`). On Azure App Service this is the environment variable `AdminSettings__BookStackUrl`. The Admin UI's "Knowledge Base" sidebar link renders only when this value is non-empty — an unset value silently hides the entry point, so it is easy to miss.

---

## Local development notes

This section applies only when running the stack on a developer machine against a non-HTTPS local Keycloak. It does **not** apply to production deployments.

### Patched file: `OidcProviderSettings.php`

BookStack enforces that `OIDC_ISSUER` must start with `https://`. When running a local Keycloak over plain HTTP (e.g. `http://host.docker.internal:8080`), BookStack returns `500 Internal Server Error` on `/oidc/login` with the exception `Issuer value must start with https://`.

To avoid introducing local TLS infrastructure for POC work, the repository includes a minimally-modified copy of BookStack's `OidcProviderSettings.php` under [`docker/bookstack-patches/`](../docker/bookstack-patches/). The only change is that the issuer scheme check accepts `http://` in addition to `https://`. All other OIDC validation (signature, issuer match, JWKS retrieval, etc.) is unaffected.

The file is bind-mounted over the container's copy in `docker-compose.bookstack.yml`:

```yaml
volumes:
  - ./bookstack-patches/OidcProviderSettings.php:/app/www/app/Access/Oidc/OidcProviderSettings.php:ro
```

**When this patch applies:** local development with a non-HTTPS Keycloak.
**When it should be removed:** any production or staging environment where Keycloak is served over HTTPS. The patched file is semantically equivalent to the original when the issuer is `https://`, but dropping the bind mount entirely is cleaner and avoids keeping a customised copy in sync with upstream BookStack.

### Upgrading BookStack with the patch in place

If BookStack is upgraded and the upstream `OidcProviderSettings.php` has changed, refresh the patched copy. See [`docker/bookstack-patches/README.md`](../docker/bookstack-patches/README.md) for the exact procedure.

---

## Single Keycloak hostname requirement

Silent SSO between the Admin UI and BookStack depends on both apps reaching Keycloak at the **same hostname**. The browser scopes Keycloak's session cookie to a single origin (scheme + host + port), so two applications that point at `http://localhost:8080` and `http://host.docker.internal:8080` — even if those resolve to the same Keycloak instance — see separate cookie jars. Symptom: after signing in to the Admin UI, opening the Knowledge Base link re-prompts for the Keycloak password.

**Production.** Not an issue in practice, because Keycloak is published under a single FQDN (e.g. `https://login.company.com`) and every client — Admin UI, BookStack, any future portal — points to that same FQDN. Guidance:

- Configure Admin UI's `KeycloakAuthentication:Authority` and BookStack's `OIDC_ISSUER` to use the identical Keycloak FQDN, including protocol and port.
- Avoid split-horizon schemes where server-to-server calls use `keycloak.internal` while the browser uses `login.company.com`. The browser flow and the server-to-server flow must share one hostname. If internal routing optimisation is required, use split-horizon **DNS** (same name, different IPs from different networks) rather than two different names.

**Local development.** This is the one place where the problem commonly surfaces, because BookStack (in a container) must reach Keycloak via `host.docker.internal` while the Admin UI (on the host) defaults to `localhost`. Fix by aligning the Admin UI's Keycloak config with BookStack's:

```jsonc
// appsettings.development.json
"KeycloakAuthentication": {
  "Authority": "http://host.docker.internal:8080/realms/osp-dev",
  "BaseUrl":   "http://host.docker.internal:8080"
}
```

Restart the Admin UI after this change and clear Keycloak cookies from both `localhost` and `host.docker.internal` in the browser (or use a fresh incognito window), because the stale cookie on `localhost:8080` will otherwise keep interfering. The Admin UI itself can still be accessed at `http://localhost:5000/adminui` — only its Keycloak endpoint changes.

---

## Logout behaviour — known limitation

BookStack manages its own session independently of the Keycloak OpenID Provider. Neither an Admin UI logout nor a BookStack logout automatically terminates the other application's session. This is a known BookStack design decision (documented upstream), not a misconfiguration of this integration.

From the BookStack OIDC documentation: _"Once a user successfully logs into BookStack, their session becomes largely independent from the session at the OpenID Provider."_

### What happens on each action

| Action | BookStack session | Admin UI session | Keycloak SSO session |
|---|---|---|---|
| Admin UI logout | **unchanged** (stays logged in) | cleared | cleared |
| BookStack logout (button inside BookStack) | cleared | unchanged (stays logged in) | **unchanged** (because `OIDC_END_SESSION_ENDPOINT=false`) |
| Browser tab closed | depends on session cookie lifetime | depends on session cookie lifetime | unchanged |
| Keycloak SSO idle timeout expires | unchanged locally, but any new OIDC flow BookStack initiates will require re-login | unchanged locally | cleared |

The `OIDC_END_SESSION_ENDPOINT=false` setting is deliberate. Setting it to `true` would cause a BookStack logout to cascade through Keycloak's `end_session_endpoint` and kill the shared SSO session — which would in turn force the Admin UI user to re-authenticate on their next protected action. Because BookStack is a secondary surface accessed through the Admin UI, its logout must not disrupt the primary app.

### Why back-channel logout cannot be made to work here

BookStack's OIDC plugin (as shipped in the current LinuxServer image) does not implement the [OIDC Back-Channel Logout spec](https://openid.net/specs/openid-connect-backchannel-1_0.html). We verified this end-to-end:

1. Keycloak **does** fire a POST to the configured Backchannel Logout URL when the SSO session is terminated — confirmed in BookStack's nginx access log with User-Agent `Apache-HttpClient/...` (Keycloak's Java HTTP client).
2. BookStack's `/oidc/logout` endpoint is a browser-only Laravel route protected by CSRF middleware. The POST from Keycloak has no CSRF token, so Laravel returns HTTP 419 (`TokenMismatchException`) before any application logic runs.
3. Even if CSRF were bypassed, the route does not parse the `logout_token` JWT or terminate sessions indexed by `sid`. It only ends the session of the browser making the request; Keycloak's server-to-server call has no such session to end.

Upstream tracking: [BookStackApp/BookStack#5279 — Implement OIDC Front-Channel / Back-Channel Logout](https://github.com/BookStackApp/BookStack/issues/5279) was closed in March 2025 without a change to BookStack core; the closing comment links to an [external gist](https://gist.github.com/timhallmann/464fad847c6e9e4a401f847639095faf) that implements the feature by patching BookStack's database session handling directly. Adopting that patch would mean maintaining a fork and is out of scope for this integration.

Configuring Keycloak with a Backchannel Logout URL produces nothing but HTTP 419 log noise. The URL should therefore remain empty on the `bookstack` client.

### Switching between accounts in the same browser

Because the BookStack session cookie survives an Admin UI logout, logging a different Keycloak account into the Admin UI and then opening the Knowledge Base link will display **the previous user's** BookStack view — BookStack recognises its own cookie and does not re-consult Keycloak. Same root cause as the logout limitation above.

This is mostly a developer / QA concern; in production, one person typically uses one browser profile, so the situation rarely arises. When it does, any of the following restores a clean state:

- Open the Admin UI in a fresh **incognito / private window** for the new account (zero setup, recommended for testing).
- Click **Log out** inside BookStack before switching accounts in the Admin UI. The BookStack session cookie is cleared; the next Knowledge Base click establishes a fresh session for the new user.
- Clear `host.docker.internal:6875` cookies from the browser manually.

The BookStack community issue tracker acknowledges the same workflow: users needing to switch OIDC accounts must log out of BookStack manually or clear cookies (see [BookStackApp/BookStack#4401](https://github.com/BookStackApp/BookStack/issues/4401)).

### Accepted mitigations for logout

- **Rely on the Keycloak SSO session idle timeout.** Once the Keycloak SSO session expires (default 30 minutes idle), any new OIDC flow from BookStack requires re-authentication.
- **User-initiated BookStack logout** (button inside BookStack) — clears the BookStack local session. Does not affect the Admin UI or Keycloak (intentional, per the table above).
- **Closing the browser** — if the BookStack session cookie is browser-scoped (default), the session disappears with the browser process.

### Future work (not in scope)

Adding true cross-application logout would require one of:
- Forking BookStack to implement [OIDC Back-Channel Logout spec](https://openid.net/specs/openid-connect-backchannel-1_0.html) properly ([upstream issue](https://github.com/BookStackApp/BookStack/issues/5279)), which also depends on BookStack implementing OIDC session handling ([upstream issue](https://github.com/BookStackApp/BookStack/issues/5278)).
- Adopting the community gist patch and maintaining it alongside BookStack upgrades.
- Running a small bridge service that receives Keycloak logout notifications and invalidates BookStack's session directly in its database.

None of these are planned for this integration.
