# Build & Deploy

This document describes how to build and deploy the `keep-it-short` monorepo (web + api). It gathers commands from the repository manifests, Dockerfiles, and GitHub workflows.

## Overview

- Monorepo managed with `pnpm` + `turbo`.
- `apps/api` is a Hono Node backend (TypeScript).
- `apps/web` is a Vite + React frontend.
- Dockerfiles are provided for both `api` and `web` and a `docker-compose.yml` for local services (Postgres + Redis + optional app services).

## Prerequisites

- Node.js v20+ (project expects modern Node)
- pnpm (project `packageManager` uses pnpm)
- Docker & Docker Compose
- (Optional) GitHub account + GHCR access for publishing images

## Install

From repository root:

```bash
pnpm install
```

## Environment

- Copy `apps/api/.env.example` to `apps/api/.env` and update values (Postgres, Redis, secrets).
- Production deploys expect a single combined env file (the GitHub Actions `DEPLOY_ENV` secret or `/home/ubuntu/.env` on the server).

## Build (local)

- Build everything (uses `turbo`):

```bash
pnpm build
```

- Build `api` only:

```bash
pnpm --filter api build
```

- Build `web` only:

```bash
pnpm --filter web build
```

Notes:

- `apps/web` build runs `tsc -b && vite build`.
- `apps/api` build runs `tsc`.

## Development (local)

1. Start DB + Redis using Docker Compose (dev data persisted in volumes):

```bash
docker compose up -d
# Full stack (api + web): docker compose --profile app up -d --build
```

2. Run migrations (from host):

```bash
# Example override if docker postgres is mapped to host:5433
DATABASE_URL=postgres://postgres:postgres@localhost:5433/keep-it-short pnpm db:migrate
```

3. Start development servers:

```bash
pnpm dev
```

## Docker: build & run (local)

- Build images locally:

```bash
docker build -f apps/api/Dockerfile -t your-registry/keep-it-short:api-latest .
docker build -f apps/web/Dockerfile -t your-registry/keep-it-short-web:latest .
```

- Run containers (example using compose to run full stack):

```bash
docker compose --profile app up -d --build
```

### Docker Compose notes

- `docker-compose.yml` provides:
  - `db` (Postgres 16-alpine) exposed on host port `5433` -> container `5432`.
  - `redis` (Redis 7-alpine) on `6379`.
  - `api` and `web` services under the `app` profile. Use `--profile app` to include them.
- Healthchecks exist for `db` and `redis`; `api` depends_on them.

## Migrations

- Run migrations locally from the host:

```bash
pnpm db:migrate
```

- In Docker/GHA deploy flow the repository runs the built `migrate.js` script inside the `api` image:

```bash
# Example (from deploy script)
docker run --rm --network app_network --env-file /home/ubuntu/.env your-registry/keep-it-short:api-latest node dist/migrate.js
```

## CI / Image build

- GitHub Actions workflow `./github/workflows/build-image.yml` builds and pushes images to GitHub Container Registry (`ghcr.io`) using `docker/build-push-action`.
- The workflow builds:
  - API image: `ghcr.io/<owner>/keep-it-short:latest` (from `apps/api/Dockerfile`)
  - WEB image: `ghcr.io/<owner>/keep-it-short-web:latest` (from `apps/web/Dockerfile`)

## Manual server deploy (summary from `.github/workflows/deploy.yml`)

1. Ensure a production env file exists on the host (workflow writes `DEPLOY_ENV` into `/home/ubuntu/.env`).
2. Login to GHCR on the host: `echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin`.
3. Create or reuse a Docker network `app_network` and ensure `postgres`/`redis` containers are attached.
4. Pull latest images and run migrations:

```bash
docker pull ghcr.io/<owner>/keep-it-short:latest
docker pull ghcr.io/<owner>/keep-it-short-web:latest

# Run migrations
docker run --rm --network app_network --env-file /home/ubuntu/.env ghcr.io/<owner>/keep-it-short:latest node dist/migrate.js

# Run API (named `app`, hostname `api`)
docker run -d --name app --hostname api --network-alias api --restart always --network app_network -p 3000:3000 --env-file /home/ubuntu/.env ghcr.io/<owner>/keep-it-short:latest

# Run web
docker run -d --name web --restart always --network app_network -p 80:80 ghcr.io/<owner>/keep-it-short-web:latest
```

Notes:

- The deploy workflow stops and removes any existing `app` / `web` containers before starting new ones.
- The workflow also attempts to stop host `nginx` (if present) and disables it to free port 80.

## Useful paths

- Root `package.json` scripts: run `pnpm dev`, `pnpm build`, `pnpm start` (starts `api`).
- `apps/api/package.json` scripts: `dev`, `build`, `start`, `db:migrate`, `db:migrate:prod` (runs `node dist/migrate.js`).
- `apps/web/package.json` scripts: `dev`, `build`, `preview`.
- Dockerfiles: [apps/api/Dockerfile](apps/api/Dockerfile) and [apps/web/Dockerfile](apps/web/Dockerfile).
- Compose: [docker-compose.yml](docker-compose.yml)
- GitHub Actions: [.github/workflows/build-image.yml](.github/workflows/build-image.yml) and [.github/workflows/deploy.yml](.github/workflows/deploy.yml)

## Troubleshooting

- If `pnpm install` fails in Docker on some architectures, the repo GitHub Actions uses `ubuntu-24.04-arm` runner to avoid qemu install issues.
- If ports are occupied, stop local services (including host nginx) or change mapped ports.

## Next steps

- Commit this file and push.
- Optionally: I can add a small `Makefile` or `scripts/` to simplify common commands (build, local-up, deploy).
