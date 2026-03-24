#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
WEB="$ROOT/apps/web"
ENV_FILE="$WEB/.env.local"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $*"; }
fail() { echo -e "${RED}[deploy]${NC} $*"; exit 1; }

# -------------------------------------------------------------------
# 1. Docker services (postgres, redis, caddy for HTTPS)
# -------------------------------------------------------------------
log "Starting Docker services (postgres, redis, caddy)..."
cd "$ROOT"
docker compose up -d postgres redis caddy 2>&1 | grep -v "^time=" || true

log "Waiting for PostgreSQL to accept connections..."
for i in $(seq 1 30); do
  docker compose exec -T postgres pg_isready -U booktarr -d booktarr >/dev/null 2>&1 && break
  sleep 2
done
docker compose exec -T postgres pg_isready -U booktarr -d booktarr >/dev/null 2>&1 \
  || fail "PostgreSQL did not become ready in 60s"
log "PostgreSQL is ready."

# -------------------------------------------------------------------
# 2. .env.local
# -------------------------------------------------------------------
if [ ! -f "$ENV_FILE" ]; then
  log "Creating $ENV_FILE with local defaults..."
  cat > "$ENV_FILE" <<'EOF'
DATABASE_URL=postgresql://booktarr:booktarr_dev_password@localhost:5432/booktarr
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=local-dev-secret-at-least-32-characters-long-for-nextauth
AUTH_TRUST_HOST=true
REDIS_URL=redis://:booktarr_dev_password@localhost:6379
EOF
else
  log ".env.local already exists — skipping."
fi

# -------------------------------------------------------------------
# 3. Install deps
# -------------------------------------------------------------------
log "Installing dependencies..."
cd "$ROOT"
npm install --silent 2>&1 | tail -1

# -------------------------------------------------------------------
# 4. Run migrations
# -------------------------------------------------------------------
log "Running database migrations..."
cd "$ROOT/packages/database"
DATABASE_URL=postgresql://booktarr:booktarr_dev_password@localhost:5432/booktarr \
  npx drizzle-kit migrate 2>&1 | grep -E "applied|already" || true
log "Migrations complete."

# -------------------------------------------------------------------
# 5. Seed test user (idempotent)
# -------------------------------------------------------------------
log "Ensuring test user exists..."
cd "$ROOT"
node -e "
const postgres = require('postgres');
const bcrypt = require('bcryptjs');
(async () => {
  const sql = postgres('postgresql://booktarr:booktarr_dev_password@localhost:5432/booktarr');
  const existing = await sql\`SELECT id FROM users WHERE email = 'chris@booktarr.test'\`;
  if (existing.length > 0) { console.log('  Test user already exists'); }
  else {
    const hash = await bcrypt.hash('TestPass123', 12);
    await sql\`INSERT INTO users (email, name, password_hash, role) VALUES ('chris@booktarr.test', 'Test User', \${hash}, 'user')\`;
    console.log('  Test user created (chris@booktarr.test / TestPass123)');
  }
  await sql.end();
})();
" 2>&1

# -------------------------------------------------------------------
# 6. Build
# -------------------------------------------------------------------
log "Building Next.js app..."
cd "$WEB"
npx next build 2>&1 | tail -3

# -------------------------------------------------------------------
# 7. Copy static assets for standalone mode
# -------------------------------------------------------------------
log "Preparing standalone server..."
cp -r "$WEB/.next/static" "$WEB/.next/standalone/.next/" 2>/dev/null || true
cp -r "$WEB/public" "$WEB/.next/standalone/" 2>/dev/null || true

# -------------------------------------------------------------------
# 8. Kill any existing server on :3000
# -------------------------------------------------------------------
fuser -k 3000/tcp 2>/dev/null || true
sleep 1

# -------------------------------------------------------------------
# 9. Start the server
# -------------------------------------------------------------------
log "Starting BookTarr..."
cd "$WEB"
set -a
source "$ENV_FILE"
set +a
export PORT=3000
node .next/standalone/server.js &
SERVER_PID=$!

sleep 3

# -------------------------------------------------------------------
# 10. Health check
# -------------------------------------------------------------------
HEALTH=$(curl -s --max-time 10 http://localhost:3000/api/health 2>/dev/null)
STATUS=$(echo "$HEALTH" | python3 -c "import json,sys; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null || echo "unreachable")

if [ "$STATUS" = "healthy" ]; then
  log "Health check: ${GREEN}healthy${NC}"
else
  warn "Health check: $STATUS"
  echo "$HEALTH" | python3 -m json.tool 2>/dev/null || echo "$HEALTH"
fi

# Detect LAN IP for display
LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "<your-lan-ip>")

echo ""
log "========================================="
log "  BookTarr is running!"
log ""
log "  HTTP:     http://localhost:3000"
log "  HTTPS:    https://localhost"
log "  LAN:      https://${LAN_IP}"
log ""
log "  Login:    chris@booktarr.test / TestPass123"
log "  PID:      $SERVER_PID"
log "  Stop:     kill $SERVER_PID"
log "========================================="
echo ""
log "Note: HTTPS uses a Caddy-generated self-signed cert."
log "Your browser will show a security warning — click through it."
log "For mobile barcode scanning, accept the cert on your phone."
echo ""
log "WSL2 port forwarding (run in Windows PowerShell as admin):"
log "  \$wslip = (wsl hostname -I).Trim().Split(' ')[0]"
log "  netsh interface portproxy add v4tov4 listenport=443 listenaddress=0.0.0.0 connectport=443 connectaddress=\$wslip"
log "  netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=\$wslip"
log "  netsh advfirewall firewall add rule name=\"BookTarr\" dir=in action=allow protocol=tcp localport=443,3000"
echo ""
log "Run tests:"
log "  cd apps/web && TEST_URL=http://127.0.0.1:3000 npx playwright test --project=chromium"

# Keep running in foreground
wait $SERVER_PID
