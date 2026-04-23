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
| Logout behaviour | Keycloak Backchannel Logout — logging out of adminui terminates the BookStack session |
| Data persistence (local) | Docker named volumes |
| Deployment | Standalone container on port `6875` (local); production FQDN to be confirmed with customer |

---

## Prerequisites

1. A running Keycloak instance with the realm used by OSP Search Admin.
2. The Keycloak configuration described in [keycloak-bookstack-integration.md](./keycloak-bookstack-integration.md) is complete:
   - Realm role `platform-admin` created and assigned to platform administrators
   - OIDC client `bookstack` created with redirect URIs, web origins, and Backchannel Logout URL configured
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
      OIDC_END_SESSION_ENDPOINT=true

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
| `OIDC_END_SESSION_ENDPOINT` | `true` | Logging out of BookStack also logs out of Keycloak |
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
| BookStack session remains active after adminui logout | Backchannel Logout not working | Confirm Keycloak has the correct Backchannel Logout URL and that BookStack's OIDC plugin supports it; otherwise fall back to Front-channel Logout |

---

## Production Considerations

The local development setup uses HTTP and a Docker MySQL container, which is not acceptable for production. The following changes are required before going live:

- **HTTPS everywhere** — Serve BookStack, Keycloak, and the OSP admin portal over HTTPS with valid TLS certificates. Replace `host.docker.internal` with a real FQDN in `APP_URL`, `OIDC_ISSUER`, and all Keycloak redirect URIs.
- **Managed database** — Replace the MySQL container with a managed service such as Azure Database for MySQL. The docker-compose MySQL service is intended for local development only.
- **Secret management** — Store `DB_PASS`, `MYSQL_ROOT_PASSWORD`, and `OIDC_CLIENT_SECRET` in Azure Key Vault or equivalent. Never commit secrets to source control.
- **Disable local login** — Set `AUTH_AUTO_INITIATE=true` so all authentication goes through Keycloak.
- **Backup policy** — Define RPO / RTO targets and implement database backups.
- **Deployment topology** — Decide on one of: dedicated domain (`kb.company.com`), subpath on the main domain (`app.company.com/kb`, requires reverse-proxy configuration and a path-aware `APP_URL`), or subdomain (`kb.app.company.com`). This affects TLS strategy and reverse-proxy rules.
- **Verify Backchannel Logout in production** — Confirm that BookStack's OIDC implementation actually processes Keycloak's backchannel logout requests under production HTTPS. Fall back to Front-channel Logout if not supported.
- **Remove the local-dev OIDC patch** — The local compose file bind-mounts `docker/bookstack-patches/OidcProviderSettings.php` into the container to allow `http://` issuers. Production uses HTTPS, so this override is unnecessary and should be removed from the production compose file. See "Local development notes" below.

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
