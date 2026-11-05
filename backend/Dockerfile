# ==============================================================================
# Multi-Stage Dockerfile for Pillar 1: Enterprise Retail Analytics Platform
# Stage 1: Build React 18 Production Bundle
# Stage 2: High-Performance Bun + Native SQLite Runtime
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Frontend Build
# ------------------------------------------------------------------------------
FROM oven/bun:1.1-alpine AS frontend-builder
WORKDIR /app/frontend

# Install dependencies with lockfile caching
COPY frontend/package.json frontend/bun.lock* ./
RUN bun install --frozen-lockfile || bun install

# Copy frontend source and compile static assets
COPY frontend/ ./
RUN bun run build

# ------------------------------------------------------------------------------
# Stage 2: Bun Fullstack Server Runtime
# ------------------------------------------------------------------------------
FROM oven/bun:1.1-alpine AS runner
WORKDIR /app

# Install curl for container healthcheck
RUN apk add --no-cache curl

# Copy backend dependencies and install production packages
COPY backend/package.json ./backend/
RUN cd backend && (bun install --production || bun install)

# Copy backend source code and schema
COPY backend/src ./backend/src
COPY schema.sql ./

# Copy pre-seeded SQLite database if present in build context
COPY backend/retail_analytics.db* ./backend/

# Copy compiled React static assets from Stage 1 into /app/frontend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Production environment variables
ENV NODE_ENV=production \
    PORT=3001 \
    HOST=0.0.0.0 \
    DIST_DIR=/app/frontend/dist \
    DATABASE_PATH=/app/backend/retail_analytics.db

# Expose web & REST API port
EXPOSE 3001

# Healthcheck to ensure container availability
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start Bun server serving both the REST API and React SPA
CMD ["bun", "run", "backend/src/server.ts"]
