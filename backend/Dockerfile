# Backend Dockerfile using Bun runtime
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json ./
RUN bun install --frozen-lockfile

# Build stage (if needed for production)
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy dependencies and source code
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Expose the port
EXPOSE 3000

# Run database migrations and start the server
CMD ["sh", "-c", "bun run drizzle-kit push && bun run src/index.ts"]
