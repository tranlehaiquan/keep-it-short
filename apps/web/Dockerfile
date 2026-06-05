FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ─── deps ───────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /repo

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# ─── build ──────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /repo

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules

COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/api ./apps/api
COPY apps/web ./apps/web

RUN pnpm --filter web build

# ─── serve ──────────────────────────────────────────────────────────────────
FROM nginx:alpine

ARG PORT=4000
ENV PORT=${PORT}

COPY --from=builder /repo/apps/web/dist /usr/share/nginx/html

# Inject port at runtime via envsubst
COPY apps/web/nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE ${PORT}