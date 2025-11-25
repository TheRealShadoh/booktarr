#!/bin/bash
set -e

echo "🛑 Stopping BookTarr V2..."

# Stop Docker services
echo "📦 Stopping Docker services..."
docker-compose down

echo ""
echo "✅ BookTarr V2 stopped successfully"
echo ""
echo "To start again, run: ./start.sh"
echo "To remove all data, run: docker-compose down -v"
