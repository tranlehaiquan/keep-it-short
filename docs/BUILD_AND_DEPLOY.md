# Build & Deploy

This document describes how to build and deploy the `keep-it-short` monorepo. It gathers commands from the repository manifests, Dockerfile, and GitHub workflows.

## Overview

- Monorepo managed with `pnpm` + `turbo`.
- `apps/api` is a Hono Node backend (TypeScript) that also serves the React frontend static files.
- `apps/web` is a Vite + React frontend.
- A single root `Dockerfile` builds both api and web into one image.
- `docker-compose.yml` provides local services (Postgres + Redis) and the app container under the `app` profile.

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

- Build the image locally:

```bash
docker build -t your-registry/keep-it-short:latest .
```

- Run the full stack (DB, Redis, and app container):

```bash
docker compose --profile app up -d --build
```

### Docker Compose notes

- `docker-compose.yml` provides:
  - `db` (Postgres 16-alpine) exposed on host port `5433` -> container `5432`.
  - `redis` (Redis 7-alpine) on `6379`.
  - `app` service under the `app` profile that runs both API and serves the React frontend on port `3000`.
- Healthchecks exist for `db` and `redis`; `app` depends_on them.
- The app container uses the root `Dockerfile`, which builds both the API backend and the web frontend into a single image.

## Migrations

- Run migrations locally from the host:

```bash
pnpm db:migrate
```

- In Docker/GHA deploy flow the repository runs the built `migrate.js` script inside the app image:

```bash
# Example (from deploy script)
docker run --rm --network app_network --env-file /home/ubuntu/.env your-registry/keep-it-short:latest node dist/migrate.js
```

## CI / Image build

- GitHub Actions workflow `./github/workflows/build-image.yml` builds and pushes the image to GitHub Container Registry (`ghcr.io`) using `docker/build-push-action`.
- The workflow uses the root `Dockerfile` to produce a single image: `ghcr.io/<owner>/keep-it-short:latest`.

## Manual server deploy (summary from `.github/workflows/deploy.yml`)

1. Ensure a production env file exists on the host (workflow writes `DEPLOY_ENV` into `/home/ubuntu/.env`).
2. Login to GHCR on the host: `echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin`.
3. Create or reuse a Docker network `app_network` and ensure `postgres`/`redis` containers are attached.
4. Pull latest image and run migrations:

```bash
docker pull ghcr.io/<owner>/keep-it-short:latest

# Run migrations
docker run --rm --network app_network --env-file /home/ubuntu/.env ghcr.io/<owner>/keep-it-short:latest node dist/migrate.js

# Run app (API + static web on port 3000)
docker run -d --name app --hostname app --network-alias app --restart always --network app_network -p 3000:3000 --env-file /home/ubuntu/.env ghcr.io/<owner>/keep-it-short:latest
```

Notes:

- The deploy workflow stops and removes any existing `app` container before starting a new one.

## Useful paths

- Root `package.json` scripts: run `pnpm dev`, `pnpm build`, `pnpm start` (starts `api`).
- `apps/api/package.json` scripts: `dev`, `build`, `start`, `db:migrate`, `db:migrate:prod` (runs `node dist/migrate.js`).
- `apps/web/package.json` scripts: `dev`, `build`, `preview`.
- Dockerfile: [Dockerfile](Dockerfile)
- Compose: [docker-compose.yml](docker-compose.yml)
- GitHub Actions: [.github/workflows/build-image.yml](.github/workflows/build-image.yml) and [.github/workflows/deploy.yml](.github/workflows/deploy.yml)

## Troubleshooting

- If `pnpm install` fails in Docker on some architectures, the repo GitHub Actions uses `ubuntu-24.04-arm` runner to avoid qemu install issues.
- If ports are occupied, stop local services or change mapped ports.

## Next steps

- Commit this file and push.
- Optionally: I can add a small `Makefile` or `scripts/` to simplify common commands (build, local-up, deploy).
