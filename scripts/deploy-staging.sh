#!/bin/bash
set -e

# Staging Deployment Script
# Deploys BookTarr to staging environment (Vercel or Railway)

echo "🚀 BookTarr Staging Deployment"
echo "================================"
echo ""

# Check if platform is specified
if [ -z "$1" ]; then
  echo "Usage: ./scripts/deploy-staging.sh [vercel|railway]"
  echo ""
  echo "Examples:"
  echo "  ./scripts/deploy-staging.sh vercel   # Deploy to Vercel"
  echo "  ./scripts/deploy-staging.sh railway  # Deploy to Railway"
  exit 1
fi

PLATFORM=$1

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to deploy to Vercel
deploy_vercel() {
  echo "📦 Deploying to Vercel..."
  echo ""

  # Check if Vercel CLI is installed
  if ! command_exists vercel; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
  fi

  # Check if logged in
  if ! vercel whoami >/dev/null 2>&1; then
    echo "🔐 Please log in to Vercel:"
    vercel login
  fi

  # Deploy
  echo "🚀 Deploying to staging..."
  vercel --prod

  echo ""
  echo "✅ Deployment complete!"
  echo ""
  echo "Next steps:"
  echo "1. Run database migrations:"
  echo "   vercel env pull .env.local"
  echo "   npm run db:migrate"
  echo ""
  echo "2. Test the deployment:"
  echo "   curl https://your-app.vercel.app/api/health"
  echo ""
  echo "3. View logs:"
  echo "   vercel logs --follow"
}

# Function to deploy to Railway
deploy_railway() {
  echo "🚂 Deploying to Railway..."
  echo ""

  # Check if Railway CLI is installed
  if ! command_exists railway; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
  fi

  # Check if logged in
  if ! railway whoami >/dev/null 2>&1; then
    echo "🔐 Please log in to Railway:"
    railway login
  fi

  # Deploy
  echo "🚀 Deploying to staging..."
  railway up

  echo ""
  echo "✅ Deployment complete!"
  echo ""
  echo "Next steps:"
  echo "1. Run database migrations:"
  echo "   railway run npm run db:migrate"
  echo ""
  echo "2. Get deployment URL:"
  echo "   railway domain"
  echo ""
  echo "3. View logs:"
  echo "   railway logs"
}

# Deploy based on platform
case $PLATFORM in
  vercel)
    deploy_vercel
    ;;
  railway)
    deploy_railway
    ;;
  *)
    echo "❌ Unknown platform: $PLATFORM"
    echo "Supported platforms: vercel, railway"
    exit 1
    ;;
esac
