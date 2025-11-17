# BookTarr Docker Deployment Guide

Complete guide for deploying BookTarr using Docker containers.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Management](#management)
- [Troubleshooting](#troubleshooting)
- [Advanced Topics](#advanced-topics)

## Prerequisites

### Required Software
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher

### System Requirements
- **CPU**: 2 cores minimum (4+ recommended)
- **RAM**: 2GB minimum (4GB+ recommended)
- **Disk**: 5GB minimum (20GB+ recommended for book covers)
- **OS**: Linux, Windows, or macOS with Docker support

### Check Installation
```bash
docker --version
docker-compose --version
```

## Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/booktarr.git
cd booktarr
```

### 2. Create Environment File
```bash
cp .env.docker .env
```

Edit `.env` and add your API keys:
```env
GOOGLE_BOOKS_API_KEY=your_key_here
AMAZON_CLIENT_ID=your_client_id
AMAZON_CLIENT_SECRET=your_secret
```

### 3. Build and Start Containers
```bash
docker-compose up --build -d
```

### 4. Access the Application
Open your browser and navigate to:
- **Application**: http://localhost
- **API Documentation**: http://localhost/api/docs
- **Health Check**: http://localhost/health

## Configuration

### Environment Variables

#### Backend Configuration
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8000 | Backend API port |
| `DATABASE_URL` | sqlite:///./data/booktarr.db | Database connection string |
| `CACHE_FILE` | /app/cache/book_cache.json | Metadata cache file |
| `API_RATE_LIMIT_DELAY` | 1.0 | API rate limit delay (seconds) |
| `CORS_ORIGINS` | * | Allowed CORS origins (comma-separated) |

#### API Keys
| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_BOOKS_API_KEY` | Optional | Google Books API access |
| `AMAZON_CLIENT_ID` | Optional | Amazon API client ID |
| `AMAZON_CLIENT_SECRET` | Optional | Amazon API secret |

### Docker Compose Configuration

The `docker-compose.yml` file defines two services:

#### Backend Service
- **Image**: Built from `backend/Dockerfile`
- **Port**: 8000
- **Volumes**:
  - `booktarr-db`: SQLite database persistence
  - `booktarr-covers`: Book cover images
  - `booktarr-cache`: Metadata cache
- **Health Check**: HTTP GET to `/health` endpoint

#### Frontend Service
- **Image**: Built from `frontend/Dockerfile`
- **Port**: 80
- **Depends On**: Backend (waits for healthy status)
- **Health Check**: HTTP GET to root endpoint

### Volume Management

Named volumes ensure data persistence across container restarts:

```bash
# List volumes
docker volume ls | grep booktarr

# Inspect a volume
docker volume inspect booktarr-db

# Backup a volume
docker run --rm -v booktarr-db:/data -v $(pwd):/backup alpine tar czf /backup/booktarr-db-backup.tar.gz -C /data .

# Restore a volume
docker run --rm -v booktarr-db:/data -v $(pwd):/backup alpine tar xzf /backup/booktarr-db-backup.tar.gz -C /data
```

## Deployment

### Development Deployment

For local development with hot-reloading:

```bash
# Build and start in development mode
docker-compose up --build

# View logs in real-time
docker-compose logs -f
```

### Production Deployment

For production with optimized settings:

```bash
# Build containers
docker-compose build --no-cache

# Start in detached mode
docker-compose up -d

# Verify services are running
docker-compose ps
```

### HTTPS/SSL Configuration

For production, use a reverse proxy (Nginx, Traefik, Caddy) with Let's Encrypt:

Example with Caddy:
```caddyfile
yourdomain.com {
    reverse_proxy localhost:80
}
```

## Management

### Container Operations

```bash
# Start containers
docker-compose start

# Stop containers
docker-compose stop

# Restart containers
docker-compose restart

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Execute commands in containers
docker-compose exec backend python -m pytest
docker-compose exec frontend sh
```

### Database Operations

```bash
# Access SQLite database
docker-compose exec backend sqlite3 /app/data/booktarr.db

# Backup database
docker-compose exec backend cp /app/data/booktarr.db /app/data/booktarr.db.backup

# Run migrations (if needed)
docker-compose exec backend python database.py
```

### Updating the Application

```bash
# Pull latest code
git pull

# Rebuild and restart containers
docker-compose up --build -d

# Clean up old images
docker image prune -f
```

### Resource Monitoring

```bash
# View resource usage
docker stats

# View specific container stats
docker stats booktarr-backend booktarr-frontend
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using port 80
lsof -i :80  # macOS/Linux
netstat -ano | findstr :80  # Windows

# Change port in docker-compose.yml
ports:
  - "8080:80"  # Use port 8080 instead
```

#### 2. Container Won't Start
```bash
# Check container logs
docker-compose logs backend
docker-compose logs frontend

# Inspect container
docker inspect booktarr-backend
```

#### 3. Database Errors
```bash
# Reset database
docker volume rm booktarr-db
docker-compose up -d

# Check database file permissions
docker-compose exec backend ls -la /app/data/
```

#### 4. Build Failures
```bash
# Clean build cache
docker-compose build --no-cache

# Remove all containers and rebuild
docker-compose down
docker-compose up --build
```

### Health Check Failures

If health checks fail:
```bash
# Check backend health
curl http://localhost:8000/health

# Check frontend health
curl http://localhost/

# View detailed logs
docker-compose logs --tail=100 backend
```

### Performance Issues

If containers are slow:
```bash
# Increase Docker resources (Docker Desktop)
# - Settings → Resources → Advanced
# - Increase CPU and Memory allocation

# Check resource usage
docker stats

# Optimize volumes (remove old data)
docker volume prune
```

## Advanced Topics

### Custom Network Configuration

```yaml
networks:
  booktarr-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Multiple Environments

Use docker-compose override files:

```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Scaling Services

```bash
# Scale backend (load balancing)
docker-compose up -d --scale backend=3
```

### Database Migration to PostgreSQL

For production, consider migrating to PostgreSQL:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: booktarr
      POSTGRES_USER: booktarr
      POSTGRES_PASSWORD: your_password
    volumes:
      - postgres-data:/var/lib/postgresql/data
```

Update backend `DATABASE_URL`:
```env
DATABASE_URL=postgresql://booktarr:your_password@postgres:5432/booktarr
```

### Monitoring and Logging

Integrate with monitoring tools:

```yaml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
```

### Backup Automation

Create a backup script:

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"

mkdir -p $BACKUP_DIR

# Backup database
docker run --rm -v booktarr-db:/data -v $(pwd)/$BACKUP_DIR:/backup alpine \
  tar czf /backup/db-$DATE.tar.gz -C /data .

# Backup covers
docker run --rm -v booktarr-covers:/data -v $(pwd)/$BACKUP_DIR:/backup alpine \
  tar czf /backup/covers-$DATE.tar.gz -C /data .

echo "Backup completed: $BACKUP_DIR"
```

Schedule with cron:
```bash
0 2 * * * /path/to/backup.sh
```

## Security Best Practices

1. **Use Secrets for API Keys**
   ```bash
   echo "your_api_key" | docker secret create google_api_key -
   ```

2. **Restrict CORS Origins**
   ```env
   CORS_ORIGINS=https://yourdomain.com
   ```

3. **Use Non-Root Users** (already configured in Dockerfiles)

4. **Keep Containers Updated**
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

5. **Enable Read-Only Filesystem** (where possible)
   ```yaml
   read_only: true
   tmpfs:
     - /tmp
   ```

## Support

For issues or questions:
- **GitHub Issues**: https://github.com/yourusername/booktarr/issues
- **Documentation**: https://github.com/yourusername/booktarr
- **Discord**: (if applicable)

## License

See [LICENSE](LICENSE) file for details.
