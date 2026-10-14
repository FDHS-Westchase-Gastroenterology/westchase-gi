# Production image for the ECS Fargate service behind the load balancer. It
# runs the standalone server that `output: "standalone"` in next.config.ts
# produces. CI builds, runs and scans it in .github/workflows/container-image.yml.
#
# Build-time values: NEXT_PUBLIC_SUPABASE_URL and
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are compiled into the server bundle
# (src/proxy.ts and /api/preview-environment read them directly), so an
# environment's image is built with that environment's public values as build
# arguments. The defaults are the no-credentials placeholders CONTRIBUTING.md
# uses. NEXT_DEPLOYMENT_ID is the commit SHA, the same for every environment.
# Server secrets are runtime environment only; none enters a layer.
#
# The container runs with a read-only root filesystem. The server writes only
# to the two VOLUME paths at the end of this file.

# Node 22 matches .nvmrc and CI. The digest pins the multi-platform index.
FROM node:22.23.3-trixie-slim@sha256:154ba2f4d6fec323d28e4f4bb86bba4677f1223391a1979cf521304e03a98dfa AS base
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM base AS build
WORKDIR /app
ARG NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=ci-public-placeholder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next compiles the deployment ID into the server and marks pages and asset
# URLs with it. A client that navigates from an older deployment during a
# rolling deploy gets a full reload instead of a mix of old and new assets.
# The server keeps the value from this build; a runtime NEXT_DEPLOYMENT_ID
# does not change it. Unset builds without a deployment ID.
ARG NEXT_DEPLOYMENT_ID
# The prerender pass requires SUPABASE_SERVICE_ROLE_KEY to be non-empty. The
# placeholder lives only in this command's environment; the server reads the
# real key at runtime.
RUN SUPABASE_SERVICE_ROLE_KEY=build-placeholder npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# The server needs only node. Dropping the package managers removes their
# bundled dependencies from the image and from the vulnerability scan.
RUN rm -rf /usr/local/lib/node_modules /opt/yarn-* \
      /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
      /usr/local/bin/yarn /usr/local/bin/yarnpkg
# Application files stay root-owned, so the server cannot rewrite its own
# code. It writes only to .next/cache (the image optimizer's cache) and /tmp.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/public ./public
COPY --from=build /app/.next/static ./.next/static
RUN mkdir -p .next/cache && chown node:node .next/cache
# The only writable paths under a read-only root filesystem. A volume starts
# with the image's contents and ownership, so node can write to both. On
# Fargate, the task definition's mountPoints must use exactly these
# containerPath values for that copy to happen.
VOLUME ["/app/.next/cache", "/tmp"]
USER node
EXPOSE 3000
# ECS reads its own container health check from the task definition, and the
# load balancer probes /api/health directly; this one serves `docker run`.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --start-interval=2s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "server.js"]
