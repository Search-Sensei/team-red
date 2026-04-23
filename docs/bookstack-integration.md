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

```yaml
services:
  bookstack:
    image: lscr.io/linuxserver/bookstack:latest
    ports:
      - "6875:80"
    environment:
      - APP_URL=http://host.docker.internal:6875
      - DB_HOST=bookstack-db
      - DB_USER=bookstack
      - DB_PASS=bookstack
      - DB_DATABASE=bookstack
      # --- Keycloak OIDC ---
      - AUTH_METHOD=oidc
      - AUTH_AUTO_INITIATE=false
      - OIDC_NAME=Keycloak
      - OIDC_DISPLAY_NAME_CLAIMS=name
      - OIDC_CLIENT_ID=bookstack
      - OIDC_CLIENT_SECRET=<bookstack-client-secret>
      - OIDC_ISSUER=http://host.docker.internal:8080/realms/<realm-name>
      - OIDC_ISSUER_DISCOVER=true
      - OIDC_END_SESSION_ENDPOINT=true
      # --- Role sync: Keycloak realm role → BookStack role ---
      - OIDC_USER_TO_GROUPS=true
      - OIDC_GROUPS_CLAIM=realm_access.roles
      - OIDC_REMOVE_FROM_GROUPS=true
    depends_on:
      - bookstack-db
    volumes:
      - bookstack_data:/config

  bookstack-db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=root
      - MYSQL_DATABASE=bookstack
      - MYSQL_USER=bookstack
      - MYSQL_PASSWORD=bookstack
    volumes:
      - bookstack_db_data:/var/lib/mysql

volumes:
  bookstack_data:
  bookstack_db_data:
```

Start the stack:

```bash
docker compose -f docker/docker-compose.bookstack.yml up -d
```

---

## Environment Variable Reference

| Variable | Value | Notes |
|---|---|---|
| `APP_URL` | `http://host.docker.internal:6875` | Replace with FQDN in production |
| `AUTH_METHOD` | `oidc` | Enable OIDC authentication |
| `AUTH_AUTO_INITIATE` | `false` during bootstrap, `true` after | Controls whether SSO is forced or local login is allowed |
| `OIDC_NAME` | `Keycloak` | Label shown on the BookStack login button |
| `OIDC_CLIENT_ID` | `bookstack` | Must match the Keycloak client ID |
| `OIDC_CLIENT_SECRET` | *(from Keycloak)* | Store in a secret manager; never commit to git |
| `OIDC_ISSUER` | `http://host.docker.internal:8080/realms/<realm>` | Must exactly match Keycloak's `iss` claim |
| `OIDC_ISSUER_DISCOVER` | `true` | Auto-discover OIDC endpoints from `/.well-known/openid-configuration` |
| `OIDC_END_SESSION_ENDPOINT` | `true` | Logging out of BookStack also logs out of Keycloak |
| `OIDC_USER_TO_GROUPS` | `true` | Enable role synchronisation from the ID token |
| `OIDC_GROUPS_CLAIM` | `realm_access.roles` | Keycloak realm roles live under this JWT path |
| `OIDC_REMOVE_FROM_GROUPS` | `true` | Revoking a role in Keycloak demotes the user on next login |

### ⚠️ Caveat — LinuxServer image variable names

The LinuxServer BookStack image reads most OIDC settings from `/config/www/.env`. Depending on the image version, top-level environment variables may need to:

- Be used as-is (`OIDC_*`), or
- Be prefixed with `APP_` (`APP_OIDC_*`), or
- Be provided via a mounted `.env` file instead of environment variables

After first start, verify with:

```bash
docker logs bookstack 2>&1 | grep -i oidc
```

If OIDC configuration is not picked up, switch to a mounted `.env` file.

---

## Initial Setup — Bootstrapping the First Admin

When BookStack starts for the first time, the database is empty and any user logging in via OIDC is assigned the default **Viewer** role — which means no one has the permissions required to configure role mapping. The following bootstrap sequence resolves this.

1. Start the stack with `AUTH_AUTO_INITIATE=false` (default in this guide). This keeps the local login form available as a one-time bootstrap path.
2. Retrieve the built-in admin credentials from the container logs:
   ```bash
   docker logs bookstack 2>&1 | grep -i 'admin@admin.com'
   ```
   The default account is typically `admin@admin.com` / `password`.
3. Open `http://host.docker.internal:6875` and sign in with those credentials.
4. Go to **Settings → Users → Admin** and change the password immediately.
5. Ensure Keycloak is fully configured (see [keycloak-bookstack-integration.md](./keycloak-bookstack-integration.md)).
6. Sign out. Sign in once via the Keycloak SSO button — this creates a new BookStack user record (with the default Viewer role) for your Keycloak account.
7. Sign out and sign back in with the built-in admin. Locate the OIDC user created in the previous step and change its role to **Admin**.
8. Configure the OIDC role mapping rule: `platform-admin` → **Admin**. The exact path varies by BookStack version; typically under **Settings → Registration** or the OIDC authentication settings page.
9. Sign out and sign in again via OIDC. Verify:
   - A user with the `platform-admin` realm role sees "Create" and "Edit" controls.
   - A user without that role sees a read-only interface.
10. Once verified, set `AUTH_AUTO_INITIATE=true` and recreate the container. This disables the local login form, so all access must go through Keycloak.
    ```bash
    docker compose -f docker/docker-compose.bookstack.yml up -d
    ```

---

## Role Mapping

| Keycloak identity | BookStack role | Permissions |
|---|---|---|
| User with realm role `platform-admin` | Admin | Create/edit/delete any content; manage users |
| Any other OIDC user (`manager`, `org-admin`, regular users) | Viewer | Read-only browsing |

Role mapping is enforced by BookStack based on the `realm_access.roles` claim in the token. No Keycloak-side Protocol Mapper is required.

---

## Verification

```bash
# Container is running
docker compose -f docker/docker-compose.bookstack.yml ps

# Confirm OIDC configuration was picked up
docker logs bookstack 2>&1 | grep -i oidc

# Hostname resolution (local development only)
ping -c 1 host.docker.internal   # expect 127.0.0.1

# OIDC discovery endpoint reachable from inside the BookStack container
docker exec bookstack curl -s \
  http://host.docker.internal:8080/realms/<realm>/.well-known/openid-configuration | head
```

---

## Troubleshooting

| Symptom | Likely cause | Resolution |
|---|---|---|
| "Invalid issuer" / OIDC login fails immediately | Mismatch between `OIDC_ISSUER` and Keycloak's actual `iss` claim | Ensure both sides use the exact same hostname, port, and realm. `localhost` vs `host.docker.internal` is a common cause |
| `500` on `/oidc/login` with log message `Issuer value must start with https://` | BookStack refuses a non-HTTPS issuer | Expected in production (use HTTPS). In local development, confirm the `OidcProviderSettings.php` bind mount from `docker/bookstack-patches/` is active — see "Local development notes" |
| SSO redirects loop | Cookie domain mismatch | Access BookStack via the same hostname as configured in `APP_URL` — do not mix `localhost` and `host.docker.internal` |
| Users cannot see "Create" buttons even after being assigned `platform-admin` | Role mapping not configured or wrong claim path | Confirm `OIDC_GROUPS_CLAIM=realm_access.roles` and that the BookStack role mapping rule maps `platform-admin` → Admin |
| OIDC environment variables appear ignored | LinuxServer image version reads from `.env` file only | Mount a custom `/config/www/.env` file instead of using environment variables |
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
