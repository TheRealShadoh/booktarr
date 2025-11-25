# 🚀 Deploy to Staging RIGHT NOW

**Goal**: Get BookTarr running on a live staging URL in < 10 minutes

---

## Option 1: Vercel (Fastest - 5 minutes)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Deploy from GitHub
```bash
# Login to Vercel
vercel login

# Go to the project directory
cd /path/to/booktarr

# Deploy (will create a new project)
vercel --prod
```

That's it! Vercel will give you a URL like: `https://booktarr-xxx.vercel.app`

### Step 3: Add Database (Neon - Free)

1. Go to https://neon.tech and create a free account
2. Create a new database: "booktarr-staging"
3. Copy the connection string
4. Add to Vercel:
   ```bash
   # Add environment variable in Vercel dashboard
   # Or use CLI:
   vercel env add DATABASE_URL staging
   # Paste the Neon connection string when prompted
   ```

5. Add other required variables:
   ```bash
   vercel env add NEXTAUTH_SECRET staging
   # Generate and paste: openssl rand -base64 32

   vercel env add NEXTAUTH_URL staging
   # Paste your Vercel URL: https://booktarr-xxx.vercel.app
   ```

### Step 4: Run Migrations
```bash
# Pull environment variables
vercel env pull .env.local

# Run migrations
npm run db:migrate
```

### Step 5: Test It
```bash
curl https://booktarr-xxx.vercel.app/api/health
```

---

## Option 2: Railway (Easiest - Database Included)

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

### Step 2: Create Project with Database
```bash
cd /path/to/booktarr

# Initialize Railway project
railway init

# Add PostgreSQL (included in Railway)
railway add postgresql

# Deploy
railway up
```

### Step 3: Set Environment Variables
```bash
# Generate and set NEXTAUTH_SECRET
railway variables set NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Get your Railway URL first
railway domain

# Set NEXTAUTH_URL (use the URL from previous command)
railway variables set NEXTAUTH_URL=https://your-app.railway.app
```

### Step 4: Run Migrations
```bash
railway run npm run db:migrate
```

### Step 5: Test It
```bash
# Get your deployment URL
railway domain

# Test health endpoint
curl https://your-app.railway.app/api/health
```

---

## Quick Testing

After deployment, run automated tests:

```bash
./scripts/test-staging.sh https://your-staging-url.com
```

---

## Troubleshooting

### "Build failed"
- Check environment variables are set
- Verify DATABASE_URL is correct
- Check Vercel/Railway logs

### "Database connection error"
- Verify DATABASE_URL includes `?sslmode=require` for Neon
- Run migrations: `npm run db:migrate`
- Check database is running (Neon/Railway dashboard)

### "NEXTAUTH_SECRET error"
```bash
# Generate a new secret
openssl rand -base64 32

# Set it in your platform
vercel env add NEXTAUTH_SECRET staging
# or
railway variables set NEXTAUTH_SECRET=<your-secret>
```

---

## Next Steps After Deployment

1. **Enable OAuth** (Optional)
   - Create Google OAuth app: https://console.cloud.google.com
   - Create GitHub OAuth app: https://github.com/settings/developers
   - Add credentials to environment variables

2. **Enable Sentry** (Optional)
   - Create Sentry project: https://sentry.io
   - Add SENTRY_DSN to environment variables
   - Uncomment Sentry code in config files

3. **Test Everything**
   ```bash
   npm run test:e2e -- --base-url=https://your-staging-url.com
   ```

---

## Full Environment Variables Needed

**Minimum (Required)**:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Random 32+ char string
- `NEXTAUTH_URL` - Your deployment URL

**Recommended**:
- `REDIS_URL` - For caching (Upstash free tier)
- `SENTRY_DSN` - For error tracking
- `NEXT_PUBLIC_SENTRY_DSN` - Client-side error tracking

**Optional (OAuth)**:
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `GITHUB_ID` / `GITHUB_SECRET`

---

## Cost Estimate

### Vercel + Neon (FREE)
- Vercel Hobby: $0/month
- Neon Free Tier: $0/month (3GB storage)
- **Total**: $0/month ✅

### Railway (FREE for first $5)
- Railway Starter: $0/month ($5 credit)
- Includes PostgreSQL
- **Total**: $0/month (with credit) ✅

---

**Ready to deploy? Choose your platform and run the commands above!** 🚀
