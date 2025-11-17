# BookTarr Frontend Dockerfile
# Multi-stage build for React application with Nginx

# Stage 1: Build the React application
FROM node:18-alpine as builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production image with Nginx
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1000 booktarr && \
    adduser -D -u 1000 -G booktarr booktarr && \
    chown -R booktarr:booktarr /usr/share/nginx/html && \
    chown -R booktarr:booktarr /var/cache/nginx && \
    chown -R booktarr:booktarr /var/log/nginx && \
    chown -R booktarr:booktarr /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R booktarr:booktarr /var/run/nginx.pid

# Switch to non-root user
USER booktarr

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
