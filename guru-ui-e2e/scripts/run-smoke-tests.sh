#!/bin/bash

set -e

echo "========================================"
echo "Running E2E Smoke Tests"
echo "========================================"

# Set environment
export BASE_URL=${BASE_URL:-"http://13.203.195.153:3000"}
export ADMIN_EMAIL=${ADMIN_EMAIL:-"admin@guruji.com"}
export ADMIN_PASSWORD=${ADMIN_PASSWORD:-"admin123"}

echo "BASE_URL: $BASE_URL"

# Check if application is running
echo "Checking if application is running..."
if ! curl -f -s "$BASE_URL" > /dev/null 2>&1; then
  echo "Warning: Application may not be running at $BASE_URL"
  echo "Starting tests anyway (tests may fail)..."
fi

# Run smoke tests
echo "Running smoke tests..."
npx playwright test --grep="@smoke" --reporter=list --timeout=60000

echo "========================================"
echo "Smoke tests completed!"
echo "========================================"
