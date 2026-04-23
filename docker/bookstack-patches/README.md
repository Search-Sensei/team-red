# BookStack Local-Dev Patches

This directory contains patched BookStack source files that are bind-mounted over the container's copies via `docker-compose.bookstack.yml`. They are **only needed for local development** and are not required in production.

## Why these patches exist

BookStack enforces certain configuration rules that are correct in production but block local development workflows. Rather than fork the BookStack image or introduce TLS infrastructure locally, we overlay specific files with minimally-modified versions.

## Patches in this directory

### `OidcProviderSettings.php`

**Original path inside the container:** `/app/www/app/Access/Oidc/OidcProviderSettings.php`

**What it patches:** The `validateInitial()` method rejects any `OIDC_ISSUER` that does not start with `https://`. Locally our Keycloak runs on `http://host.docker.internal:8080`, which causes BookStack to throw `InvalidArgumentException: Issuer value must start with https://` on `/oidc/login`.

**How it is patched:** The check is relaxed to also accept `http://`. The rest of the file is untouched.

**Why this is acceptable:**
- This only disables the scheme check; all other OIDC validation (signature, issuer match, JWKS, etc.) remains in force.
- In production, Keycloak is served over HTTPS, so the un-patched condition passes naturally and the patch has no effect — production could use the original file with no behavior change.
- Production deployments **should drop this bind mount** from their compose file. See [../../docs/bookstack-integration.md](../../docs/bookstack-integration.md) → "Local development notes".

## Updating a patch

If BookStack is upgraded and the upstream file changes meaningfully, refresh the patch:

```bash
BS=$(docker compose -f docker/docker-compose.bookstack.yml ps -q bookstack)

# 1. Back up current patched file
cp docker/bookstack-patches/OidcProviderSettings.php /tmp/OidcProviderSettings.php.backup

# 2. Pull the latest upstream version (remove bind mount from compose first, or read from a clean container)
docker cp "$BS":/app/www/app/Access/Oidc/OidcProviderSettings.php docker/bookstack-patches/OidcProviderSettings.php

# 3. Re-apply the local-dev modification manually (see the block marked "LOCAL-DEV PATCH" in the file)

# 4. Restart the stack
docker compose -f docker/docker-compose.bookstack.yml up -d --force-recreate bookstack
```
