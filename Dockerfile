FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ─── deps ────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /repo

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

# ─── build api ───────────────────────────────────────────────────────────────
FROM base AS api-builder
WORKDIR /repo

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules

COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/api ./apps/api

RUN pnpm --filter api build

# ─── build web ───────────────────────────────────────────────────────────────
FROM base AS web-builder
WORKDIR /repo

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules

COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/api ./apps/api
COPY apps/web ./apps/web

RUN pnpm --filter web build

# ─── runner ──────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=api-builder /repo/apps/api/dist ./apps/api/dist
COPY --from=api-builder /repo/apps/api/drizzle ./apps/api/drizzle
COPY --from=api-builder /repo/apps/api/package.json ./apps/api/package.json
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=web-builder /repo/apps/web/dist ./apps/web/dist

WORKDIR /app/apps/api

EXPOSE 3000
CMD ["node", "dist/server.js"]
