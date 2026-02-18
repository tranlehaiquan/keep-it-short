# Base stage for shared environment
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Build stage
FROM base AS build
WORKDIR /usr/src/app

# Copy the entire monorepo context
COPY . .

# Install all dependencies using cache for pnpm store
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build the api package
RUN pnpm --filter api build

# Use pnpm deploy to create a standalone production-ready directory
# This command isolates the 'api' package and its production dependencies
RUN pnpm --filter api --prod deploy /usr/src/app/pruned

# Final production stage
FROM base AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy the standalone package from the build stage
# This includes the built dist/ folder, package.json, and production node_modules
COPY --from=build /usr/src/app/pruned ./

# Expose the application port
EXPOSE 3000

# Start the application
CMD [ "node", "dist/index.js" ]
