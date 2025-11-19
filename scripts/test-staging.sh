#!/bin/bash
set -e

# Staging Environment Testing Script
# Tests all endpoints and features in staging

echo "🧪 Testing Staging Environment"
echo "==============================="
echo ""

# Check if URL is provided
if [ -z "$1" ]; then
  echo "Usage: ./scripts/test-staging.sh <staging-url>"
  echo ""
  echo "Example:"
  echo "  ./scripts/test-staging.sh https://booktarr-staging.vercel.app"
  exit 1
fi

STAGING_URL=$1
PASS_COUNT=0
FAIL_COUNT=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
  local name=$1
  local method=$2
  local endpoint=$3
  local expected_status=$4
  local data=$5

  echo -n "Testing: $name... "

  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$STAGING_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$STAGING_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi

  status_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | head -n -1)

  if [ "$status_code" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $status_code)"
    ((PASS_COUNT++))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC} (Expected $expected_status, got $status_code)"
    echo "  Response: $body"
    ((FAIL_COUNT++))
    return 1
  fi
}

echo "🏥 Health Checks"
echo "----------------"
test_endpoint "Health endpoint" "GET" "/api/health" "200"
echo ""

echo "🔐 Authentication Tests"
echo "----------------------"

# Test registration with invalid data (should fail validation)
test_endpoint "Register - Invalid email" "POST" "/api/auth/register" "400" \
  '{"email":"invalid-email","password":"Test1234","name":"Test"}'

test_endpoint "Register - Weak password" "POST" "/api/auth/register" "400" \
  '{"email":"test@example.com","password":"weak","name":"Test"}'

# Test login rate limiting
echo -n "Testing: Login rate limiting... "
RATE_LIMIT_HIT=0
for i in {1..6}; do
  status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$STAGING_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}')

  if [ "$status" = "429" ]; then
    RATE_LIMIT_HIT=1
    break
  fi
done

if [ $RATE_LIMIT_HIT -eq 1 ]; then
  echo -e "${GREEN}✓ PASS${NC} (Rate limit triggered)"
  ((PASS_COUNT++))
else
  echo -e "${RED}✗ FAIL${NC} (Rate limit not triggered)"
  ((FAIL_COUNT++))
fi

echo ""

echo "📚 API Endpoint Tests"
echo "--------------------"

# Test unauthorized access
test_endpoint "Books - Unauthorized" "GET" "/api/books" "401"
test_endpoint "Series - Unauthorized" "GET" "/api/series" "401"
test_endpoint "Reading - Unauthorized" "GET" "/api/reading/stats" "401"

echo ""

echo "🔍 Security Headers"
echo "------------------"

echo -n "Testing: Security headers... "
headers=$(curl -s -I "$STAGING_URL" | tr -d '\r')

required_headers=(
  "X-Frame-Options"
  "X-Content-Type-Options"
  "Referrer-Policy"
  "Strict-Transport-Security"
)

headers_ok=1
for header in "${required_headers[@]}"; do
  if ! echo "$headers" | grep -q "$header"; then
    echo -e "${RED}✗ FAIL${NC} (Missing header: $header)"
    headers_ok=0
    ((FAIL_COUNT++))
    break
  fi
done

if [ $headers_ok -eq 1 ]; then
  echo -e "${GREEN}✓ PASS${NC} (All security headers present)"
  ((PASS_COUNT++))
fi

echo ""

echo "📊 Test Summary"
echo "==============="
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
fi
