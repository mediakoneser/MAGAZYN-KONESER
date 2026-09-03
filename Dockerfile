# Stage 1: Build Frontend and Bundled Production Server
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies including devDependencies for compilation
RUN npm ci

# Copy full application source code
COPY . .

# Run production build: Vite frontend build to /dist + esbuild server.ts to dist/server.cjs
RUN npm run build

# Stage 2: Minimal Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package manifests and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled backend bundle and static frontend assets from builder
COPY --from=builder /app/dist ./dist

# Expose standard Cloud Run & AI Studio port 3000
EXPOSE 3000

# Container liveness healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start bundled CommonJS server
CMD ["node", "dist/server.cjs"]
