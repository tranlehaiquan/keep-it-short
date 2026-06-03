FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ─── deps ───────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /repo

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# ─── build ──────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /repo

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules

# Copy root manifests so pnpm workspace is recognized
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/api ./apps/api

RUN pnpm --filter api build

# ─── runner ─────────────────────────────────────────────────────────────────
# Preserve monorepo paths so pnpm symlinks in apps/api/node_modules resolve to
# /repo/node_modules/.pnpm (e.g. @hono/node-server, hono).
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /repo/apps/api/dist ./apps/api/dist
COPY --from=builder /repo/apps/api/drizzle ./apps/api/drizzle
COPY --from=builder /repo/apps/api/package.json ./apps/api/package.json
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules

WORKDIR /app/apps/api

EXPOSE 3000
CMD ["node", "dist/index.js"]