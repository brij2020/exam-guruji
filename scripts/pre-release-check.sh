#!/bin/bash
# Pre-release check script for Guru AI
# Runs lint and build checks for both UI and API

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Guru AI Pre-Release Check"
echo "=========================================="

# Track overall status
OVERALL_STATUS=0

# ============================================
# 1. Check Git Status
# ============================================
echo ""
echo -e "${YELLOW}==========================================${NC}"
echo -e "${YELLOW}Checking Git Status...${NC}"
echo -e "${YELLOW}==========================================${NC}"

# Check parent repo
if [ -d ".git" ]; then
  CHANGES=$(git status --porcelain 2>/dev/null | grep -v "^??" | wc -l)
  UNTRACKED=$(git status --porcelain 2>/dev/null | grep "^??" | wc -l)
  if [ "$CHANGES" -gt 0 ]; then
    echo -e "${YELLOW}Warning: ${CHANGES} staged/modified file(s) not committed${NC}"
    git status --short | head -20
  fi
  if [ "$UNTRACKED" -gt 0 ]; then
    echo -e "${YELLOW}Warning: ${UNTRACKED} untracked file(s)${NC}"
  fi
fi

# Check guru-api submodule
if [ -d "guru-api/.git" ]; then
  cd guru-api
  CHANGES=$(git status --porcelain 2>/dev/null | grep -v "^??" | wc -l)
  if [ "$CHANGES" -gt 0 ]; then
    echo -e "${YELLOW}Warning: guru-api has uncommitted changes${NC}"
    git status --short | head -10
  fi
  cd ..
fi

# ============================================
# 2. Check guru-api
# ============================================
echo ""
echo -e "${YELLOW}==========================================${NC}"
echo -e "${YELLOW}Checking guru-api...${NC}"
echo -e "${YELLOW}==========================================${NC}"

if [ ! -d "guru-api" ]; then
  echo -e "${RED}Error: guru-api directory not found${NC}"
  OVERALL_STATUS=1
else
  cd guru-api
  
  # Install dependencies if needed
  if [ ! -d "node_modules/.bin/eslint" ]; then
    echo "Installing guru-api dependencies..."
    npm install --silent 2>/dev/null
  fi
  
  # Run ESLint
  echo "Running ESLint..."
  LINT_OUTPUT=$(npm run lint 2>&1)
  LINT_EXIT=$?
  echo "$LINT_OUTPUT" > /tmp/lint-api-output.txt
  
  # Count errors vs warnings
  ERRORS=$(echo "$LINT_OUTPUT" | grep -cE "^\s+[0-9]+ error" || echo "0")
  
  if [ $LINT_EXIT -eq 0 ]; then
    echo -e "${GREEN}✓ API ESLint passed${NC}"
  elif [ "$ERRORS" -gt 0 ]; then
    echo -e "${RED}✗ API ESLint failed (${ERRORS} error(s))${NC}"
    echo "$LINT_OUTPUT" | grep "error" | head -10
    OVERALL_STATUS=1
  else
    echo -e "${YELLOW}⚠ API ESLint passed with warnings${NC}"
  fi
  
  cd ..
fi

# ============================================
# 3. Check guru-ui
# ============================================
echo ""
echo -e "${YELLOW}==========================================${NC}"
echo -e "${YELLOW}Checking guru-ui...${NC}"
echo -e "${YELLOW}==========================================${NC}"

if [ ! -d "guru-ui" ]; then
  echo -e "${RED}Error: guru-ui directory not found${NC}"
  OVERALL_STATUS=1
else
  cd guru-ui
  
  # Install dependencies if needed
  if [ ! -d "node_modules/.bin/eslint" ]; then
    echo "Installing guru-ui dependencies..."
    npm install --silent 2>/dev/null
  fi
  
  # Run ESLint
  echo "Running ESLint..."
  LINT_OUTPUT=$(npm run lint 2>&1)
  LINT_EXIT=$?
  echo "$LINT_OUTPUT" > /tmp/lint-output.txt
  
  # Count errors
  ERRORS=$(echo "$LINT_OUTPUT" | grep -cE "error\s" || echo "0")
  
  if [ $LINT_EXIT -eq 0 ]; then
    echo -e "${GREEN}✓ UI ESLint passed${NC}"
  elif [ "$ERRORS" -gt 0 ]; then
    echo -e "${RED}✗ UI ESLint failed (${ERRORS} error(s))${NC}"
    echo "$LINT_OUTPUT" | grep "error" | grep -v "^$" | tail -10
    OVERALL_STATUS=1
  else
    echo -e "${YELLOW}⚠ UI ESLint passed with warnings${NC}"
  fi
  
  cd ..
fi
  
  # Run TypeScript check
  echo "Running TypeScript check..."
  TSC_OUTPUT=$(npx tsc --noEmit 2>&1)
  TSC_EXIT=$?
  echo "$TSC_OUTPUT" > /tmp/tsc-output.txt
  
  # Count errors (ignore warnings)
  TSC_ERRORS=$(echo "$TSC_OUTPUT" | grep -c "error TS" || true)
  
  if [ $TSC_EXIT -eq 0 ]; then
    echo -e "${GREEN}✓ TypeScript check passed${NC}"
  elif [ "$TSC_ERRORS" -gt 0 ]; then
    echo -e "${RED}✗ TypeScript check failed (${TSC_ERRORS} error(s))${NC}"
    echo "$TSC_OUTPUT" | grep "error TS" | head -10
    OVERALL_STATUS=1
  else
    echo -e "${YELLOW}⚠ TypeScript check completed with warnings${NC}"
  fi
  
  cd ..
fi

# ============================================
# 4. Summary
# ============================================
echo ""
echo "=========================================="
echo -e "Pre-Release Check ${OVERALL_STATUS:-0} - Summary"
echo "=========================================="

if [ "$OVERALL_STATUS" -eq 0 ]; then
  echo -e "${GREEN}All checks passed! Ready for release.${NC}"
else
  echo -e "${RED}Some checks failed. Please fix the issues above.${NC}"
fi

exit $OVERALL_STATUS
