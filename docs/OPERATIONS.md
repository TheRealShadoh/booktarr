# BookTarr V2 Operations Runbook

**Last Updated**: 2025-01-19
**Version**: 2.0.0

## Table of Contents
1. [Deployment](#deployment)
2. [Common Issues](#common-issues)
3. [Monitoring](#monitoring)
4. [Backup & Recovery](#backup--recovery)
5. [Performance Tuning](#performance-tuning)
6. [Security Incidents](#security-incidents)
7. [Maintenance Tasks](#maintenance-tasks)

---

## Deployment

### Pre-Deployment Checklist

```bash
# 1. Update environment variables
cp .env.production.example .env.production
# Edit .env.production with production values

# 2. Generate strong secrets
openssl rand -base64 48  # For NEXTAUTH_SECRET

# 3. Run tests
npm test
npm run test:e2e

# 4. Build application
npm run build

# 5. Create database backup
./scripts/backup.sh

# 6. Run database migrations
./scripts/migrate.sh
```

### Production Deployment

```bash
# Using Docker Compose
docker-compose -f docker-compose.production.yml up -d

# Check health
curl http://localhost:3000/api/health

# View logs
docker-compose logs -f app
```

### Rollback Procedure

```bash
# 1. Stop current deployment
docker-compose -f docker-compose.production.yml down

# 2. Restore previous version
git checkout <previous-version-tag>

# 3. Restore database
./scripts/restore.sh <backup-timestamp>

# 4. Deploy previous version
docker-compose -f docker-compose.production.yml up -d

# 5. Verify health
curl http://localhost:3000/api/health
```

---

## Common Issues

### Database Connection Failures

**Symptoms**:
- 503 errors from `/api/health`
- "Database connection failed" in logs

**Diagnosis**:
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres | tail -50

# Test connection manually
docker-compose exec postgres psql -U booktarr -d booktarr -c "SELECT 1"
```

**Resolution**:
```bash
# Restart PostgreSQL
docker-compose restart postgres

# If that fails, check credentials in .env
grep DATABASE_URL .env

# Verify network connectivity
docker-compose exec app ping postgres
```

###Application Won't Start

**Symptoms**:
- Container exits immediately
- "Startup validation failed" in logs

**Diagnosis**:
```bash
# Check startup logs
docker-compose logs app | grep -i error

# Check environment variables
docker-compose exec app env | grep -E "DATABASE|NEXTAUTH"

# Verify all required services are running
docker-compose ps
```

**Resolution**:
```bash
# Fix environment variables in .env
vim .env

# Restart application
docker-compose restart app

# If env vars are correct, check migrations
docker-compose exec postgres psql -U booktarr -d booktarr -c "\dt"
```

### High Memory Usage

**Symptoms**:
- Slow response times
- Out of memory errors

**Diagnosis**:
```bash
# Check container memory usage
docker stats

# Check Node.js heap usage
curl http://localhost:3000/api/health | jq '.system.memory'
```

**Resolution**:
```bash
# Increase Node.js memory limit
# In docker-compose.production.yml:
environment:
  NODE_OPTIONS: "--max-old-space-size=4096"

# Restart application
docker-compose restart app

# Consider horizontal scaling
docker-compose up -d --scale app=3
```

### Rate Limiting Issues

**Symptoms**:
- 429 "Too many requests" errors
- Legitimate users blocked

**Diagnosis**:
```bash
# Check rate limit headers in response
curl -I http://localhost:3000/api/books

# Check application logs for rate limit hits
docker-compose logs app | grep "Rate limit exceeded"
```

**Resolution**:
```bash
# Adjust rate limits in apps/web/src/lib/rate-limit.ts
# Restart application
docker-compose restart app

# For emergency relief, temporarily disable:
# Comment out rate limiting in affected routes
```

---

## Monitoring

### Health Checks

```bash
# Overall health
curl http://localhost:3000/api/health | jq

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-01-19T...",
  "uptime": 3600,
  "checks": {
    "database": { "status": "healthy", "latency": 15 },
    "redis": { "status": "healthy", "latency": 5 }
  }
}
```

### Log Monitoring

```bash
# Follow all logs
docker-compose logs -f

# Filter by severity
docker-compose logs app | grep -i error
docker-compose logs app | grep -i warn

# Export logs for analysis
docker-compose logs app > app-logs-$(date +%Y%m%d).log
```

### Performance Metrics

```bash
# Database connection pool
docker-compose exec postgres psql -U booktarr -d booktarr -c "
  SELECT count(*) as total,
         count(*) FILTER (WHERE state = 'active') as active,
         count(*) FILTER (WHERE state = 'idle') as idle
  FROM pg_stat_activity
  WHERE datname = 'booktarr'
"

# Response times (from logs)
docker-compose logs app | grep "duration" | tail -100

# Memory usage
docker stats --no-stream
```

---

## Backup & Recovery

### Creating Backups

```bash
# Full backup (database + storage + config)
./scripts/backup.sh

# Database only
docker-compose exec -T postgres pg_dump -U booktarr booktarr | gzip > backup-$(date +%Y%m%d).sql.gz

# Backups are stored in: ./backups/<timestamp>/
```

### Restoring from Backup

```bash
# Full restore
./scripts/restore.sh <timestamp>

# Database only
gunzip -c backup-20250119.sql.gz | docker-compose exec -T postgres psql -U booktarr booktarr

# Verify restore
docker-compose exec postgres psql -U booktarr -d booktarr -c "\dt"
```

### Backup Schedule

**Recommended Schedule**:
- **Daily**: Automated via cron
- **Weekly**: Before major deployments
- **Monthly**: Long-term retention
- **Ad-hoc**: Before database migrations

**Cron Setup**:
```bash
# Add to crontab -e
0 2 * * * cd /path/to/booktarr && ./scripts/backup.sh >> /var/log/booktarr-backup.log 2>&1
```

---

## Performance Tuning

### Database Optimization

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM books WHERE title ILIKE '%search%';

-- Rebuild indexes
REINDEX DATABASE booktarr;

-- Update statistics
ANALYZE;

-- Check slow queries (requires pg_stat_statements)
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Connection Pool Tuning

```env
# In .env.production
DB_POOL_SIZE=50  # Adjust based on load
```

### Caching Strategy

- Redis cache TTL: 30 days for metadata
- Application cache: TanStack Query with 5min stale time
- CDN cache: Static assets (1 year), API responses (disabled)

---

## Security Incidents

### Suspected Breach

1. **Immediately**:
   - Rotate all secrets (DATABASE_URL, NEXTAUTH_SECRET, OAuth credentials)
   - Force logout all users
   - Review access logs

2. **Investigation**:
   ```bash
   # Check recent database connections
   docker-compose exec postgres psql -U booktarr -d booktarr -c "
     SELECT datname, usename, client_addr, state, query_start
     FROM pg_stat_activity
     WHERE datname = 'booktarr'
   "

   # Check application logs for suspicious activity
   docker-compose logs app | grep -i "unauthorized\|forbidden\|failed"

   # Review rate limit violations
   docker-compose logs app | grep "Rate limit exceeded"
   ```

3. **Remediation**:
   - Patch vulnerabilities
   - Update dependencies
   - Review and tighten security policies
   - Notify affected users if data exposed

### DDoS Attack

1. **Immediate Response**:
   - Enable stricter rate limiting
   - Configure CDN/WAF if available
   - Block malicious IPs in nginx

2. **Mitigation**:
   ```nginx
   # In nginx.conf
   limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
   limit_req zone=api burst=20 nodelay;
   ```

---

## Maintenance Tasks

### Weekly
- Review error logs
- Check disk space usage
- Verify backup completion
- Review performance metrics

### Monthly
- Update dependencies (review Dependabot PRs)
- Rotate secrets
- Review and prune old backups
- Database maintenance (VACUUM, ANALYZE)
- Security audit

### Quarterly
- Penetration testing
- Disaster recovery drill
- Performance benchmark
- Capacity planning review

### Commands

```bash
# Check disk space
df -h
docker system df

# Clean up Docker resources
docker system prune -a --volumes

# Database maintenance
docker-compose exec postgres psql -U booktarr -d booktarr -c "VACUUM ANALYZE"

# Update dependencies
npm update
npm audit fix
```

---

## Emergency Contacts

- **On-Call Engineer**: [Configure]
- **Database Admin**: [Configure]
- **Security Team**: [Configure]
- **Infrastructure**: [Configure]

## Useful Links

- Production Dashboard: [Configure]
- Monitoring (Sentry/DataDog): [Configure]
- Log Aggregation: [Configure]
- Status Page: [Configure]

---

**Document Maintained By**: DevOps Team
**Review Schedule**: Monthly
**Last Reviewed**: 2025-01-19
