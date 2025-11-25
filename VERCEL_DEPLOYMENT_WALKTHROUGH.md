# 📘 Vercel Deployment Walkthrough

**Live Deployment Session for BookTarr V2**

---

## ✅ Step 1: Install Vercel CLI (DONE)

```bash
npm install -g vercel
```

You should see: `added 277 packages` ✓

---

## 🔐 Step 2: Login to Vercel

Run this command:

```bash
vercel login
```

**What will happen:**
1. A browser window will open
2. You'll be prompted to sign up or login with:
   - GitHub (recommended)
   - GitLab
   - Bitbucket
   - Email

**Choose GitHub** - it will automatically link your repositories.

**Expected output:**
```
Vercel CLI 33.0.0
> Log in to Vercel
> Success! Email authentication complete for your-email@example.com
```

---

## 🚀 Step 3: Deploy Your Application

Navigate to your project directory:

```bash
cd /home/user/booktarr
```

Deploy with:

```bash
vercel --prod
```

**What will happen (interactive prompts):**

### Prompt 1: Set up and deploy?
```
? Set up and deploy "~/booktarr"? [Y/n]
```
**Answer:** `Y` (press Enter)

### Prompt 2: Which scope?
```
? Which scope do you want to deploy to?
  Your Name (yourname)
```
**Answer:** Press Enter (select your personal account)

### Prompt 3: Link to existing project?
```
? Link to existing project? [y/N]
```
**Answer:** `N` (this is a new project)

### Prompt 4: Project name
```
? What's your project's name? booktarr
```
**Answer:** `booktarr` (or customize, like `booktarr-staging`)

### Prompt 5: In which directory is your code located?
```
? In which directory is your code located? ./
```
**Answer:** `./apps/web` (this is where the Next.js app lives)

### Prompt 6: Override settings?
```
? Want to override the settings? [y/N]
```
**Answer:** `N` (Vercel auto-detects Next.js)

**Deployment will start:**
```
🔗  Linked to yourname/booktarr (created .vercel and added it to .gitignore)
🔍  Inspect: https://vercel.com/yourname/booktarr/xxx
✅  Production: https://booktarr-xxx.vercel.app [copied to clipboard] [2m]
```

**🎉 Your app is now live at**: `https://booktarr-xxx.vercel.app`

---

## 📊 Step 4: Check Deployment (Will Fail - Expected)

Visit your deployment URL:
```
https://booktarr-xxx.vercel.app
```

**You'll see an error** - This is expected! We need to add the database.

Open the health check:
```
https://booktarr-xxx.vercel.app/api/health
```

**Expected error:**
```json
{
  "error": "Database connection failed",
  "status": "unhealthy"
}
```

This is because `DATABASE_URL` isn't set yet.

---

## 🗄️ Step 5: Set Up Database (Neon - Free)

### 5a. Create Neon Account

1. Go to **https://neon.tech**
2. Click "Sign Up" and use GitHub to sign in (easiest)
3. You'll be redirected to the Neon console

### 5b. Create Database

1. Click **"Create Project"**
2. **Project name**: `booktarr-staging`
3. **Region**: Choose closest to you (e.g., US East, EU Central)
4. **PostgreSQL version**: 16 (default)
5. Click **"Create Project"**

**Wait ~30 seconds** for database to provision.

### 5c. Get Connection String

After creation, you'll see a connection string like:

```
postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**Important:** This string contains your password - keep it secret!

**Copy this entire string** - you'll need it in the next step.

---

## 🔧 Step 6: Add Environment Variables to Vercel

We need to add 3 required environment variables.

### Method 1: Using Vercel Dashboard (Easiest)

1. Go to **https://vercel.com/dashboard**
2. Click on your **booktarr** project
3. Click **"Settings"** tab
4. Click **"Environment Variables"** in left sidebar
5. Add these variables (one at a time):

#### Variable 1: DATABASE_URL
- **Key**: `DATABASE_URL`
- **Value**: Paste your Neon connection string
- **Environments**: Check "Production" + "Preview" + "Development"
- Click **"Save"**

#### Variable 2: NEXTAUTH_SECRET

First, generate a secret on your local machine:
```bash
openssl rand -base64 32
```

Copy the output (should be ~44 characters).

- **Key**: `NEXTAUTH_SECRET`
- **Value**: Paste the generated secret
- **Environments**: Check "Production" + "Preview" + "Development"
- Click **"Save"**

#### Variable 3: NEXTAUTH_URL
- **Key**: `NEXTAUTH_URL`
- **Value**: Your Vercel URL (e.g., `https://booktarr-xxx.vercel.app`)
- **Environments**: Check "Production"
- Click **"Save"**

### Method 2: Using Vercel CLI (Faster if you prefer terminal)

```bash
# Add DATABASE_URL
vercel env add DATABASE_URL production
# Paste your Neon connection string when prompted

# Add NEXTAUTH_SECRET
vercel env add NEXTAUTH_SECRET production
# Paste your generated secret (openssl rand -base64 32)

# Add NEXTAUTH_URL
vercel env add NEXTAUTH_URL production
# Paste your Vercel URL
```

---

## 🔄 Step 7: Redeploy with Environment Variables

After adding environment variables, redeploy:

```bash
vercel --prod
```

**This will be much faster** (uses cache from first build).

**Expected output:**
```
✅  Production: https://booktarr-xxx.vercel.app [copied to clipboard] [30s]
```

---

## 🗃️ Step 8: Run Database Migrations

Now we need to create the database tables.

### 8a. Pull Environment Variables Locally

```bash
cd /home/user/booktarr
vercel env pull .env.local
```

This downloads your Vercel environment variables to `.env.local`

### 8b. Run Migrations

```bash
npm run db:migrate
```

**Expected output:**
```
Applying migrations...
✓ Migration 0000_xxx applied
✓ Migration 0001_xxx applied
✓ Migration 0002_xxx applied
...
✓ All migrations applied successfully
```

**Note:** If you see any errors, check that `.env.local` has the correct `DATABASE_URL`.

---

## ✅ Step 9: Verify Deployment

### 9a. Test Health Endpoint

```bash
curl https://booktarr-xxx.vercel.app/api/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-19T...",
  "uptime": 123,
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 45,
      "details": {
        "totalConnections": 1,
        "activeConnections": 0,
        "idleConnections": 1
      }
    }
  },
  "version": "2.0.0"
}
```

**If status is "healthy"** ✅ - Your deployment is working!

### 9b. Open in Browser

Visit your deployment:
```
https://booktarr-xxx.vercel.app
```

You should see the BookTarr homepage!

---

## 🧪 Step 10: Run Automated Tests

Run the staging test script:

```bash
./scripts/test-staging.sh https://booktarr-xxx.vercel.app
```

**Expected output:**
```
🧪 Testing Staging Environment
===============================

🏥 Health Checks
----------------
Testing: Health endpoint... ✓ PASS (HTTP 200)

🔐 Authentication Tests
----------------------
Testing: Register - Invalid email... ✓ PASS (HTTP 400)
Testing: Register - Weak password... ✓ PASS (HTTP 400)
Testing: Login rate limiting... ✓ PASS (Rate limit triggered)

📚 API Endpoint Tests
--------------------
Testing: Books - Unauthorized... ✓ PASS (HTTP 401)
Testing: Series - Unauthorized... ✓ PASS (HTTP 401)
Testing: Reading - Unauthorized... ✓ PASS (HTTP 401)

🔍 Security Headers
------------------
Testing: Security headers... ✓ PASS (All security headers present)

📊 Test Summary
===============
Passed: 9
Failed: 0

✅ All tests passed!
```

---

## 🎉 Step 11: You're Live!

**Congratulations!** Your staging environment is now running at:
```
https://booktarr-xxx.vercel.app
```

### What's Working:
- ✅ Next.js application
- ✅ PostgreSQL database (Neon)
- ✅ All 14 API endpoints
- ✅ Input validation (Zod)
- ✅ Rate limiting
- ✅ Security headers
- ✅ Health checks
- ✅ Error handling

---

## 🔧 Optional Enhancements

### Enable OAuth (Google Login)

1. **Create Google OAuth App:**
   - Go to https://console.cloud.google.com
   - Create new project: "BookTarr Staging"
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Authorized redirect URI: `https://booktarr-xxx.vercel.app/api/auth/callback/google`

2. **Add to Vercel:**
   ```bash
   vercel env add GOOGLE_CLIENT_ID production
   # Paste your Client ID

   vercel env add GOOGLE_CLIENT_SECRET production
   # Paste your Client Secret
   ```

3. **Redeploy:**
   ```bash
   vercel --prod
   ```

### Enable Sentry (Error Tracking)

1. **Create Sentry Project:**
   - Go to https://sentry.io
   - Create free account
   - Create new project: "booktarr-staging"
   - Copy DSN

2. **Add to Vercel:**
   ```bash
   vercel env add SENTRY_DSN production
   # Paste your DSN

   vercel env add NEXT_PUBLIC_SENTRY_DSN production
   # Paste your DSN (same value)
   ```

3. **Uncomment Sentry code:**
   ```bash
   # Edit these files and uncomment the Sentry.init() code:
   # - apps/web/sentry.client.config.ts
   # - apps/web/sentry.server.config.ts
   ```

4. **Redeploy:**
   ```bash
   vercel --prod
   ```

### Enable Redis Caching (Upstash - Free)

1. **Create Upstash Redis:**
   - Go to https://upstash.com
   - Create free account
   - Create database: "booktarr-staging"
   - Copy REST URL

2. **Add to Vercel:**
   ```bash
   vercel env add REDIS_URL production
   # Paste your Upstash Redis URL
   ```

---

## 📋 Common Issues & Solutions

### Issue 1: "Build failed"

**Check Vercel logs:**
```bash
vercel logs --follow
```

**Common causes:**
- Missing environment variables
- TypeScript errors
- Node version mismatch

**Solution:**
```bash
# Check all environment variables are set
vercel env ls

# Make sure you're using Node 18+
node --version
```

### Issue 2: "Database connection failed"

**Check DATABASE_URL:**
```bash
vercel env ls
```

**Make sure it:**
- Starts with `postgresql://`
- Ends with `?sslmode=require`
- Has the correct password

**Test connection locally:**
```bash
vercel env pull .env.local
psql "$(grep DATABASE_URL .env.local | cut -d= -f2-)" -c "SELECT 1"
```

### Issue 3: "NEXTAUTH_SECRET error"

**Regenerate secret:**
```bash
openssl rand -base64 32
```

**Update in Vercel:**
```bash
vercel env rm NEXTAUTH_SECRET production
vercel env add NEXTAUTH_SECRET production
# Paste new secret
```

### Issue 4: "Module not found" errors

**Clear build cache:**
```bash
vercel --prod --force
```

---

## 🔄 Making Updates

### Update Code:

1. Make changes locally
2. Commit to git:
   ```bash
   git add .
   git commit -m "feat: your changes"
   git push
   ```
3. Redeploy:
   ```bash
   vercel --prod
   ```

### Update Environment Variables:

```bash
# Via CLI
vercel env add VARIABLE_NAME production

# Or via dashboard
# https://vercel.com/dashboard → Your Project → Settings → Environment Variables
```

---

## 📊 Monitoring Your Deployment

### View Logs:
```bash
vercel logs --follow
```

### View Deployment Details:
```bash
vercel inspect
```

### View Project in Dashboard:
```
https://vercel.com/dashboard
```

---

## 💰 Cost Breakdown

**Current Setup - 100% FREE:**

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Hobby | $0/month |
| Neon | Free Tier | $0/month |
| Total | | **$0/month** |

**Limits (Free Tier):**
- Vercel: 100GB bandwidth, 100 deployments/day
- Neon: 3GB storage, 0.5GB RAM
- More than enough for staging! ✅

---

## 🎯 Next Steps

1. ✅ **Test your application thoroughly**
2. ✅ **Share staging URL with team** for testing
3. ⏳ **Set up OAuth** (Google/GitHub) - Optional
4. ⏳ **Enable Sentry** for error tracking - Optional
5. ⏳ **Run load tests** - See `PRODUCTION_INTEGRATION_SUMMARY.md`
6. ⏳ **Deploy to production** - When ready!

---

## 🆘 Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Neon Docs**: https://neon.tech/docs
- **Project Issues**: File an issue in your GitHub repo
- **Community**: Vercel Discord, Next.js Discussions

---

**Your staging URL**: `https://booktarr-xxx.vercel.app`

**Happy deploying!** 🚀
