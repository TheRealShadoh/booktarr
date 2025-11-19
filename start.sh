#!/bin/bash
set -e

echo "🚀 Starting BookTarr V2..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please review and update it with your configuration."
fi

# Start Docker services
echo "📦 Starting Docker services (PostgreSQL, Redis, MinIO)..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check PostgreSQL
echo "🔍 Checking PostgreSQL..."
until docker-compose exec -T postgres pg_isready -U booktarr > /dev/null 2>&1; do
    echo "   Waiting for PostgreSQL..."
    sleep 2
done
echo "✅ PostgreSQL is ready"

# Check Redis
echo "🔍 Checking Redis..."
until docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; do
    echo "   Waiting for Redis..."
    sleep 2
done
echo "✅ Redis is ready"

# Run database migrations
echo "🔄 Running database migrations..."
npm run db:migrate --workspace=packages/database

# Start Next.js development server
echo "🌐 Starting Next.js development server..."
echo ""
echo "================================================"
echo "🎉 BookTarr V2 is starting!"
echo "================================================"
echo ""
echo "📱 Application: http://localhost:3000"
echo "🗄️  Database:    PostgreSQL on localhost:5432"
echo "🔴 Redis:       localhost:6379"
echo "📦 MinIO:       http://localhost:9000"
echo "   Console:     http://localhost:9001"
echo ""
echo "Press Ctrl+C to stop"
echo "================================================"
echo ""

npm run dev --workspace=apps/web
