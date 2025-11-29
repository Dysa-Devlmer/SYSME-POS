# ============================================================================
# SYSME POS v2.1 - Production Dockerfile
# Multi-stage build for optimized image size
# ============================================================================

# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY dashboard-web/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy frontend source
COPY dashboard-web/ ./

# Build frontend
RUN npm run build

# Stage 2: Build backend
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies (including dev dependencies for building)
RUN npm ci

# Copy backend source
COPY backend/ ./

# Stage 3: Production image
FROM node:18-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy backend from builder
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend ./backend

# Copy frontend build from builder
COPY --from=frontend-builder --chown=nodejs:nodejs /app/frontend/dist ./backend/public

# Create necessary directories
RUN mkdir -p /app/backend/logs /app/backend/uploads /app/backend/backups /app/backend/src/config /app/backend/src/locales && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Set working directory to backend
WORKDIR /app/backend

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/services/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "src/server.js"]
