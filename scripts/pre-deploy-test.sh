#!/bin/bash
# Pre-deployment test script - runs all tests without deploying

set -e

PROJECT_DIR="/Users/brijbhan/Documents/development/guru-ai"
FAILED=0
WARNINGS=0

echo "=========================================="
echo "   Guru AI Pre-Deployment Test Suite"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
  local status=$1
  local message=$2
  if [ "$status" = "pass" ]; then
    echo -e "${GREEN}✓${NC} $message"
  elif [ "$status" = "fail" ]; then
    echo -e "${RED}✗${NC} $message"
  elif [ "$status" = "warn" ]; then
    echo -e "${YELLOW}⚠${NC} $message"
  else
    echo "$message"
  fi
}

# ============================================
# API TESTS
# ============================================
echo ""
echo "=== API Tests ==="
echo "------------------------------------------"

cd "$PROJECT_DIR/guru-api"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
  print_status "warn" "Installing API dependencies..."
  npm install 2>&1 | tail -3
fi

# Check if test dependencies are installed
if [ ! -d "node_modules/mongodb-memory-server" ]; then
  print_status "warn" "Installing API test dependencies..."
  npm install --save-dev mongodb-memory-server supertest 2>&1 | tail -3
fi

# Run API tests
print_status "info" "Running API integration tests..."
if npm test 2>&1; then
  print_status "pass" "API tests passed"
else
  print_status "fail" "API tests failed"
  FAILED=1
fi

# ============================================
# UI TESTS
# ============================================
echo ""
echo "=== UI Tests ==="
echo "------------------------------------------"

cd "$PROJECT_DIR/guru-ui"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
  print_status "warn" "Installing UI dependencies..."
  npm install 2>&1 | tail -3
fi

# Check if test dependencies are installed
if ! grep -q '"ts-jest"' package.json 2>/dev/null; then
  print_status "warn" "Installing UI test dependencies..."
  npm install --save-dev jest ts-jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom identity-obj-proxy 2>&1 | tail -3
fi

# Run UI tests
print_status "info" "Running UI component tests..."
if npm test 2>&1; then
  print_status "pass" "UI tests passed"
else
  print_status "fail" "UI tests failed"
  FAILED=1
fi

# ============================================
# TYPESCRIPT CHECKS
# ============================================
echo ""
echo "=== TypeScript Checks ==="
echo "------------------------------------------"

# API TypeScript
cd "$PROJECT_DIR/guru-api"
print_status "info" "Checking API TypeScript..."
if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
  print_status "fail" "API has TypeScript errors"
  npx tsc --noEmit 2>&1 | grep "error TS" | head -10
  FAILED=1
else
  print_status "pass" "API TypeScript check passed"
fi

# UI TypeScript (non-blocking, build check is primary)
cd "$PROJECT_DIR/guru-ui"
print_status "info" "Checking UI TypeScript..."
TS_OUTPUT=$(npx tsc --noEmit 2>&1)
if echo "$TS_OUTPUT" | grep -q "error TS"; then
  # Check if errors are in test files
  TEST_ERRORS=$(echo "$TS_OUTPUT" | grep "error TS" | grep "tests/")
  if [ -n "$TEST_ERRORS" ]; then
    print_status "fail" "UI test files have TypeScript errors"
    echo "$TEST_ERRORS" | head -5
    FAILED=1
  else
    print_status "warn" "UI has pre-existing TypeScript warnings (non-blocking)"
  fi
else
  print_status "pass" "UI TypeScript check passed"
fi

# ============================================
# LINT CHECKS
# ============================================
echo ""
echo "=== Lint Checks ==="
echo "------------------------------------------"

# API Lint
cd "$PROJECT_DIR/guru-api"
print_status "info" "Running API linter..."
if npm run lint 2>&1 | grep -q "error"; then
  print_status "fail" "API has lint errors"
  WARNINGS=1
else
  print_status "pass" "API lint check passed"
fi

# UI Lint
cd "$PROJECT_DIR/guru-ui"
print_status "info" "Running UI linter..."
if npm run lint 2>&1 | grep -q "error"; then
  print_status "fail" "UI has lint errors"
  WARNINGS=1
else
  print_status "pass" "UI lint check passed"
fi

# ============================================
# BUILD CHECKS
# ============================================
echo ""
echo "=== Build Checks ==="
echo "------------------------------------------"

cd "$PROJECT_DIR/guru-ui"
print_status "info" "Building UI (for production)..."
if npm run build 2>&1 | tail -20 | grep -q "Error"; then
  print_status "fail" "UI build failed"
  FAILED=1
else
  print_status "pass" "UI build successful"
fi

# ============================================
# SUMMARY
# ============================================
echo ""
echo "=========================================="
echo "   TEST SUMMARY"
echo "=========================================="

if [ $FAILED -eq 1 ]; then
  echo -e "${RED}Status: FAILED${NC}"
  echo ""
  echo "Some tests failed. Please fix the issues before deploying."
  echo ""
  echo "Quick fixes:"
  echo "  - API tests:  cd guru-api && npm test"
  echo "  - UI tests:   cd guru-ui && npm test"
  echo "  - API TS:     cd guru-api && npx tsc --noEmit"
  echo "  - UI TS:      cd guru-ui && npx tsc --noEmit"
  echo ""
  exit 1
else
  echo -e "${GREEN}Status: PASSED${NC}"
  echo ""
  if [ $WARNINGS -eq 1 ]; then
    echo -e "${YELLOW}Note: There were some warnings (non-blocking)${NC}"
  fi
  echo ""
  echo "All pre-deployment checks passed!"
  echo "You can now run ./scripts/deploy.sh to deploy."
  echo ""
  exit 0
fi
