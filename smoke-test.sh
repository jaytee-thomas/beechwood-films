#!/bin/bash

# BeechwoodFilms Smoke Test
# Quick automated health check before deploying

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${BACKEND_URL:-https://api.beechwoodfilms.org}"
FRONTEND_URL="${FRONTEND_URL:-https://www.beechwoodfilms.org}"

echo "🔍 Running BeechwoodFilms Smoke Tests..."
echo "Backend: $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"
echo ""

PASSED=0
FAILED=0

# Helper function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $name... "
    
    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null || echo "000")
    status_code=$(echo "$response" | tail -n1)
    
    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $status_code)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $status_code, expected $expected_status)"
        ((FAILED++))
        return 1
    fi
}

# Helper function to test JSON endpoint
test_json_endpoint() {
    local name=$1
    local url=$2
    local expected_key=$3
    
    echo -n "Testing $name... "
    
    response=$(curl -s "$url" 2>/dev/null)
    
    if echo "$response" | grep -q "\"$expected_key\""; then
        echo -e "${GREEN}✓ PASS${NC} (JSON valid)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Invalid JSON or missing key: $expected_key)"
        echo "Response: $response"
        ((FAILED++))
        return 1
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "BACKEND TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Backend health check
test_json_endpoint "Backend Health" "$BACKEND_URL/health" "status"

# Redis health check
test_json_endpoint "Redis Connection" "$BACKEND_URL/api/health/redis" "ready"

# API responds (should be 401 without auth)
test_endpoint "API Authentication" "$BACKEND_URL/api/queues/jobs/recent" 401

# Videos endpoint (should be accessible)
test_endpoint "Videos API" "$BACKEND_URL/api/videos" 200

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "FRONTEND TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Frontend loads
test_endpoint "Homepage" "$FRONTEND_URL/" 200

# Frontend routes
test_endpoint "Library Page" "$FRONTEND_URL/library" 200
test_endpoint "Admin Jobs" "$FRONTEND_URL/admin/jobs" 200

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TOTAL=$((PASSED + FAILED))

echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "${FAILED} Failed"
    echo ""
    echo -e "${GREEN}✓ All tests passed! Ready to deploy.${NC}"
    exit 0
else
    echo -e "${RED}Failed: $FAILED${NC}"
    echo ""
    echo -e "${RED}✗ Some tests failed. Fix issues before deploying.${NC}"
    exit 1
fi
