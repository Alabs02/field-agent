# syntax=docker/dockerfile:1.7
#
# One Dockerfile, three runtime targets (api, worker, web) sharing a single
# pruned install so `docker compose up --build` does the dependency work once.
#
#   docker build --target api    -t field-agent-api .
#   docker build --target worker -t field-agent-worker .
#   docker build --target web    -t field-agent-web .

ARG NODE_IMAGE=node:22-alpine

# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS base
RUN apk add --no-cache libc6-compat && corepack enable && corepack prepare pnpm@10.18.0 --activate
WORKDIR /repo
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV CI=true

# --- prune: only the package.json files the three apps need ---------------
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2.10.12 prune api worker web --docker

# --- install + build ---------------------------------------------------------
FROM base AS installer
COPY --from=pruner /repo/out/json/ .
COPY --from=pruner /repo/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /repo/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY .npmrc ./.npmrc
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .
# Web build needs no API at build time: every app route is dynamic.
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm turbo run build --filter=api --filter=worker --filter=web

# --- production node_modules for the node services ---------------------------
FROM base AS prod-deps
COPY --from=pruner /repo/out/json/ .
COPY --from=pruner /repo/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /repo/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY .npmrc ./.npmrc
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter api --filter worker

# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS api
ENV NODE_ENV=production
WORKDIR /repo
RUN apk add --no-cache wget
COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=prod-deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=prod-deps /repo/apps/api/package.json ./apps/api/package.json
COPY --from=installer /repo/apps/api/dist ./apps/api/dist
# Committed migrations ride along so `cli.js migrate` works from the image.
COPY --from=installer /repo/packages/db/drizzle ./apps/api/dist/drizzle
USER node
WORKDIR /repo/apps/api
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=5s --retries=10 CMD wget -qO- http://127.0.0.1:4000/health || exit 1
CMD ["node", "dist/server.js"]

# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS worker
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=prod-deps /repo/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=prod-deps /repo/apps/worker/package.json ./apps/worker/package.json
COPY --from=installer /repo/apps/worker/dist ./apps/worker/dist
USER node
WORKDIR /repo/apps/worker
CMD ["node", "dist/index.js"]

# ---------------------------------------------------------------------------
# Opt-in browser engine: same worker code on Microsoft's Playwright image.
FROM mcr.microsoft.com/playwright:v1.63.0-noble AS worker-browser
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=prod-deps /repo/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=prod-deps /repo/apps/worker/package.json ./apps/worker/package.json
COPY --from=installer /repo/apps/worker/dist ./apps/worker/dist
RUN npm install --no-save --prefix /repo/apps/worker playwright@1.63.0
ENV SCRAPE_ENGINE=playwright
WORKDIR /repo/apps/worker
CMD ["node", "dist/index.js"]

# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS web
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /repo
RUN apk add --no-cache wget
COPY --from=installer /repo/apps/web/.next/standalone ./
COPY --from=installer /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --retries=10 CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "apps/web/server.js"]
