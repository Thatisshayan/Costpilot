# Multi-stage build for optimized NodeJS Docker image
# 1. Build Stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy root configurations (for pnpm monorepo structure)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY artifacts/api-server/package.json ./artifacts/api-server/

# Install dependencies globally via pnpm
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy codebase
COPY lib ./lib
COPY artifacts/api-server ./artifacts/api-server

# Build all workspace packages
RUN pnpm --filter @workspace/db build
RUN pnpm --filter @workspace/api-zod build
RUN pnpm --filter @workspace/api-server build

# 2. Production Stage
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install pnpm for production run
RUN npm install -g pnpm

# Copy root configs & dist from build stage
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=builder /app/lib/db ./lib/db
COPY --from=builder /app/lib/api-zod ./lib/api-zod
COPY --from=builder /app/artifacts/api-server/package.json ./artifacts/api-server/
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

EXPOSE 8080

CMD ["pnpm", "--filter", "@workspace/api-server", "start"]
