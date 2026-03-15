#!/bin/bash

# ============================================
# Migrate Existing Repos to Monorepo
# Run this in your existing guru-ai repo
# ============================================

set -e

echo "=========================================="
echo "  Migrating to Monorepo Structure"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
NC='\033[0m'
print_status() { echo -e "${GREEN}[✓] $1${NC}"; }

# Get current directory
MONO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(dirname "$MONO_DIR")"

echo "Current monorepo directory: $MONO_DIR"
echo ""

# Check if we have the api and ui folders in parent
if [ -d "$PARENT_DIR/guru-api" ]; then
    print_status "Found guru-api in parent directory"
    
    # Copy contents (excluding .git)
    rsync -av --exclude='.git' "$PARENT_DIR/guru-api/" "$MONO_DIR/guru-api/"
    print_status "Copied guru-api to monorepo"
fi

if [ -d "$PARENT_DIR/guru-ui" ]; then
    print_status "Found guru-ui in parent directory"
    
    # Copy contents (excluding .git)
    rsync -av --exclude='.git' "$PARENT_DIR/guru-ui/" "$MONO_DIR/guru-ui/"
    print_status "Copied guru-ui to monorepo"
fi

if [ -d "$PARENT_DIR/parser" ]; then
    print_status "Found parser in parent directory"
    
    # Copy contents
    rsync -av --exclude='.git' "$PARENT_DIR/parser/" "$MONO_DIR/parser/"
    print_status "Copied parser to monorepo"
fi

# Copy scripts
if [ -d "$PARENT_DIR/scripts" ]; then
    rsync -av --exclude='.git' "$PARENT_DIR/scripts/" "$MONO_DIR/scripts/"
    print_status "Copied scripts to monorepo"
fi

# Add to git
cd "$MONO_DIR"
git add .
git commit -m "Migrate to monorepo structure"

print_status "Migration complete!"
echo ""
echo "Next steps:"
echo "1. Push to GitHub"
echo "2. Setup submodules if needed"
