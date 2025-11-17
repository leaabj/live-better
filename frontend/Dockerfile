# Frontend Dockerfile using Node.js and Vite
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json ./
RUN npm install

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production stage - serve with Node
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install serve to run the built app
RUN npm install -g serve

# Copy built assets
COPY --from=builder /app/dist ./dist

# Expose the port
EXPOSE 3001

# Serve the built application
CMD ["serve", "-s", "dist", "-l", "3001"]
