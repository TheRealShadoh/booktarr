# Staging Deployment Guide

This guide covers deploying BookTarr V2 to a staging environment for testing before production.

---

## 🚀 Deployment Options

### Option 1: Vercel (Recommended for Next.js)

**Pros:**
- Best Next.js support (official platform)
- Automatic deployments from GitHub
- Built-in CDN and edge network
- Zero configuration for Next.js
- Free tier available

**Cons:**
- Need to set up external database (Vercel Postgres, Supabase, or Neon)
- Serverless limitations (10s timeout on Hobby plan)

#### Vercel Deployment Steps

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Link GitHub Repository**
   - Go to https://vercel.com/new
   - Import your GitHub repository: `TheRealShadoh/booktarr`
   - Select the `claude/audit-app-structure-*` branch for staging

3. **Configure Environment Variables**

   In Vercel dashboard, add all variables from `.env.staging`:

   **Required Variables:**
   - `DATABASE_URL` - PostgreSQL connection string
   - `NEXTAUTH_URL` - Your Vercel deployment URL
   - `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`

   **Optional but Recommended:**
   - `REDIS_URL` - Upstash Redis URL
   - `SENTRY_DSN` - Sentry project DSN
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth
   - `GITHUB_ID` / `GITHUB_SECRET` - OAuth

4. **Database Setup (Choose One)**

   **Option A: Vercel Postgres**
   ```bash
   # In Vercel dashboard
   # Storage → Create → Postgres
   # Copy DATABASE_URL to environment variables
   ```

   **Option B: Neon (Recommended - Generous Free Tier)**
   ```bash
   # 1. Go to https://neon.tech
   # 2. Create free account
   # 3. Create database: booktarr-staging
   # 4. Copy connection string
   # 5. Add to Vercel env vars as DATABASE_URL
   ```

   **Option C: Supabase**
   ```bash
   # 1. Go to https://supabase.com
   # 2. Create project
   # 3. Get connection string from Settings → Database
   # 4. Add to Vercel env vars
   ```

5. **Run Database Migrations**
   ```bash
   # After deployment, run from your local machine:
   DATABASE_URL="your-staging-db-url" npm run db:migrate
   ```

6. **Deploy**
   ```bash
   vercel --prod
   ```

7. **Verify Deployment**
   ```bash
   curl https://your-app.vercel.app/api/health
   ```

---

### Option 2: Railway (Recommended for Simplicity)

**Pros:**
- Includes managed PostgreSQL, Redis
- Simple one-click deployment
- Automatic HTTPS
- $5/month credit free tier
- Can run Docker containers

**Cons:**
- More expensive than Vercel for scaling
- Less Next.js-specific optimization

#### Railway Deployment Steps

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Create New Project**
   ```bash
   cd /path/to/booktarr
   railway init
   ```

3. **Add PostgreSQL**
   ```bash
   railway add postgresql
   # Railway automatically sets DATABASE_URL
   ```

4. **Add Redis (Optional)**
   ```bash
   railway add redis
   # Railway automatically sets REDIS_URL
   ```

5. **Set Environment Variables**
   ```bash
   railway variables set NEXTAUTH_SECRET=$(openssl rand -base64 32)
   railway variables set NODE_ENV=staging
   railway variables set NEXTAUTH_URL=https://your-app.railway.app
   ```

6. **Deploy**
   ```bash
   railway up
   ```

7. **Run Migrations**
   ```bash
   railway run npm run db:migrate
   ```

8. **Get Deployment URL**
   ```bash
   railway domain
   ```

---

### Option 3: Render

**Pros:**
- Free tier includes PostgreSQL
- Good for full-stack apps
- Automatic SSL

**Cons:**
- Slower cold starts on free tier
- Less Next.js optimization

#### Render Deployment Steps

1. **Go to https://render.com**
2. **New → Web Service**
3. **Connect GitHub Repository**
4. **Configure:**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`
   - Environment: Node
5. **Add PostgreSQL Database** (from Render dashboard)
6. **Set Environment Variables** (from `.env.staging`)
7. **Deploy**

---

## 🗄️ Database Setup

### Neon (Recommended for Staging)

```bash
# 1. Create account at https://neon.tech
# 2. Create database
# 3. Copy connection string
DATABASE_URL=postgresql://user:password@ep-*.neon.tech/booktarr?sslmode=require

# 4. Run migrations
npm run db:migrate

# 5. (Optional) Seed with sample data
npm run db:seed
```

### Vercel Postgres

```bash
# 1. In Vercel dashboard: Storage → Postgres
# 2. Create database
# 3. Connection string auto-added to env vars
# 4. Run migrations via Vercel CLI:
vercel env pull .env.local
npm run db:migrate
```

---

## 🔧 Pre-Deployment Checklist

- [ ] Create staging OAuth apps (Google, GitHub)
- [ ] Generate strong NEXTAUTH_SECRET (min 32 chars)
- [ ] Set up database (Neon, Vercel Postgres, or Railway)
- [ ] Configure environment variables
- [ ] Set up Sentry project for staging
- [ ] (Optional) Set up Redis for caching
- [ ] (Optional) Set up S3/MinIO for file storage

---

## 🧪 Post-Deployment Testing

### 1. Health Check
```bash
curl https://your-staging-url.vercel.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-19T...",
  "uptime": 123,
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 45
    }
  }
}
```

### 2. Authentication Test
```bash
# Register new user
curl -X POST https://your-staging-url.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234","name":"Test User"}'
```

### 3. Rate Limiting Test
```bash
# Should return 429 after 5 attempts
for i in {1..6}; do
  curl -X POST https://your-staging-url.vercel.app/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
  echo ""
done
```

### 4. Input Validation Test
```bash
# Should return 400 with validation error
curl -X POST https://your-staging-url.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid-email","password":"weak"}'
```

### 5. Run E2E Tests Against Staging
```bash
# Update playwright.config.ts with staging URL
STAGING_URL=https://your-staging-url.vercel.app npm run test:e2e
```

---

## 📊 Monitoring Staging Environment

### Vercel Analytics
- Enable in Vercel dashboard → Analytics tab
- Monitors Core Web Vitals, page views, errors

### Sentry Monitoring
```bash
# 1. Create Sentry project at https://sentry.io
# 2. Get DSN from project settings
# 3. Add to environment variables:
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# 4. Uncomment Sentry code in:
# - apps/web/sentry.client.config.ts
# - apps/web/sentry.server.config.ts
# - apps/web/sentry.edge.config.ts
```

### Database Monitoring
- **Neon**: Built-in monitoring dashboard
- **Vercel Postgres**: Metrics tab in Vercel dashboard
- **Railway**: Metrics in Railway dashboard

---

## 🔐 Security Configuration

### OAuth Configuration

**Google OAuth (Staging)**
1. Go to https://console.cloud.google.com
2. Create new project: "BookTarr Staging"
3. Enable Google+ API
4. Create OAuth credentials
5. Authorized redirect URIs:
   - `https://your-staging-url.vercel.app/api/auth/callback/google`
6. Copy Client ID and Secret to environment variables

**GitHub OAuth (Staging)**
1. Go to https://github.com/settings/developers
2. New OAuth App
3. Application name: "BookTarr Staging"
4. Homepage URL: `https://your-staging-url.vercel.app`
5. Callback URL: `https://your-staging-url.vercel.app/api/auth/callback/github`
6. Copy Client ID and Secret to environment variables

### Environment Variable Security
```bash
# NEVER commit these files:
.env
.env.local
.env.staging
.env.production

# Use platform-specific secret managers:
# - Vercel: Environment Variables (encrypted)
# - Railway: Variables (encrypted)
# - Render: Environment Variables (encrypted)
```

---

## 🚨 Troubleshooting

### Build Fails

```bash
# Check build logs in Vercel dashboard
# Common issues:
# 1. Missing environment variables
# 2. TypeScript errors
# 3. Missing dependencies

# Fix:
vercel logs --follow
```

### Database Connection Fails

```bash
# Check DATABASE_URL format:
postgresql://user:password@host:5432/database?sslmode=require

# Verify SSL mode for cloud databases
# Test connection:
psql "$DATABASE_URL" -c "SELECT 1"
```

### Authentication Not Working

```bash
# Check NEXTAUTH_URL matches deployment URL
# Verify NEXTAUTH_SECRET is set (min 32 chars)
# Confirm OAuth redirect URIs match exactly
# Check browser console for CORS errors
```

### Rate Limiting Too Aggressive

```bash
# Adjust limits in apps/web/src/lib/rate-limit.ts
# For staging, you might want to increase limits:

register: {
  points: 10,  // Instead of 3
  duration: 3600,
}
```

---

## 📝 Quick Deployment Commands

### Vercel

```bash
# One-time setup
npm install -g vercel
vercel login

# Deploy to staging
vercel --prod

# View logs
vercel logs --follow

# Set environment variable
vercel env add NEXTAUTH_SECRET staging

# Run database migrations
DATABASE_URL="$(vercel env pull --yes && grep DATABASE_URL .env | cut -d= -f2-)" npm run db:migrate
```

### Railway

```bash
# One-time setup
npm install -g @railway/cli
railway login

# Deploy
railway up

# View logs
railway logs

# Run migrations
railway run npm run db:migrate

# Add environment variable
railway variables set NEXTAUTH_SECRET=$(openssl rand -base64 32)
```

---

## 🎯 Staging Testing Checklist

After deployment, test these scenarios:

### Authentication
- [ ] User registration works
- [ ] User login works
- [ ] OAuth (Google) works
- [ ] OAuth (GitHub) works
- [ ] Rate limiting blocks after limit
- [ ] Invalid passwords are rejected
- [ ] Invalid emails are rejected

### Book Management
- [ ] Create book with ISBN search
- [ ] Create book manually
- [ ] View book details
- [ ] Delete book
- [ ] Search books
- [ ] Filter books

### Series Management
- [ ] Create series
- [ ] Add books to series
- [ ] Update series information
- [ ] Delete series

### Reading Progress
- [ ] Start reading a book
- [ ] Update reading progress
- [ ] Finish reading a book
- [ ] View reading stats

### API Security
- [ ] Rate limiting works (429 after limit)
- [ ] Input validation works (400 for invalid data)
- [ ] Authentication required (401 without session)
- [ ] Security headers present (check with curl -I)

### Performance
- [ ] Health check responds < 100ms
- [ ] API responses < 500ms
- [ ] Page loads < 2s (First Contentful Paint)
- [ ] No console errors

---

## 📈 Next Steps After Staging

1. **Load Testing**
   ```bash
   # Use k6 for load testing
   npm install -g k6
   k6 run scripts/load-test.js
   ```

2. **Security Audit**
   ```bash
   # Run security audit
   npm audit
   npm audit fix

   # Check for vulnerabilities
   npx snyk test
   ```

3. **Performance Optimization**
   - Review Vercel Analytics
   - Check Sentry performance monitoring
   - Optimize slow queries

4. **Production Deployment**
   - Create production OAuth apps
   - Set up production database
   - Configure production monitoring
   - Follow production deployment guide

---

## 🆘 Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Railway Docs**: https://docs.railway.app
- **Neon Docs**: https://neon.tech/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment

---

**Staging URL**: https://your-app-name.vercel.app
**Staging Dashboard**: Your deployment platform dashboard
**Monitoring**: Sentry + Vercel Analytics

Good luck with your staging deployment! 🚀
