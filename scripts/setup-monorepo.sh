#!/bin/bash

# ============================================
# Mono Repo Setup Script
# Creates a monorepo with guru-api and guru-ui as submodules
# ============================================

set -e

echo "=========================================="
echo "  Setting up Mono Repo Structure"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[✓] $1${NC}"; }
print_error() { echo -e "${RED}[✗] $1${NC}"; }

# Configuration
MONO_REPO_NAME="guru-ai"
GITHUB_ORG="your-github-org"  # Change this
API_REPO="${MONO_REPO_NAME}-api"
UI_REPO="${MONO_REPO_NAME}-ui"

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONO_DIR="$SCRIPT_DIR"

# Check if git is initialized
if [ ! -d ".git" ]; then
    print_status "Initializing main monorepo..."
    git init
fi

# Create .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Build
dist/
build/
.next/
out/

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# PM2
.pm2/

# Misc
*.log
coverage/
.nyc_output/
EOF

# Create directory structure
print_status "Creating directory structure..."

# Create api directory (empty, will be submodule)
mkdir -p guru-api
mkdir -p guru-ui

# Create root package.json for workspace
cat > package.json << 'EOF'
{
  "name": "guru-ai-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "guru-api",
    "guru-ui"
  ],
  "scripts": {
    "dev:api": "cd guru-api && npm run dev",
    "dev:ui": "cd guru-ui && npm run dev",
    "dev": "concurrently \"npm:dev:api\" \"npm:dev:ui\"",
    "build:api": "cd guru-api && npm run build",
    "build:ui": "cd guru-ui && npm run build",
    "build": "npm run build:api && npm run build:ui",
    "start:api": "cd guru-api && npm start",
    "start:ui": "cd guru-ui && npm start",
    "start": "npm run start:api & npm run start:ui",
    "test": "npm run test:api && npm run test:ui",
    "lint": "npm run lint:api && npm run lint:ui"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
EOF

# Create root README
cat > README.md << 'EOF'
# Guru AI - Monorepo

A comprehensive exam preparation platform with AI-powered question generation.

## Structure

```
guru-ai/
├── guru-api/     # Backend API (Node.js/Express)
├── guru-ui/     # Frontend (Next.js)
├── scripts/      # Deployment scripts
└── docs/        # Documentation
```

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/guru-ai.git
cd guru-ai

# Install dependencies
npm install

# Start development
npm run dev
```

## Development

```bash
# Run API only
npm run dev:api

# Run UI only
npm run dev:ui

# Run both
npm run dev
```

## Deployment

See `scripts/AWS_DEPLOYMENT_GUIDE.md` for detailed deployment instructions.

## License

MIT
EOF

# Add and commit initial files
git add .
git commit -m "Initial monorepo structure"

print_status "Monorepo structure created!"
echo ""
echo "=========================================="
echo "  Next Steps:"
echo "=========================================="
echo ""
echo "1. Create GitHub repositories:"
echo "   - $GITHUB_ORG/$API_REPO"
echo "   - $GITHUB_ORG/$UI_REPO"
echo ""
echo "2. Push existing code to submodules:"
echo "   "
echo "   # For API:"
echo "   cd guru-api"
echo "   git init"
echo "   git add ."
echo "   git commit -m 'Initial commit'"
echo "   git remote add origin https://github.com/$GITHUB_ORG/$API_REPO.git"
echo "   git push -u origin main"
echo ""
echo "   # For UI:"
echo "   cd ../guru-ui"
echo "   git init"
echo "   git add ."
echo "   git commit -m 'Initial commit'"
echo "   git remote add origin https://github.com/$GITHUB_ORG/$UI_REPO.git"
echo "   git push -u origin main"
echo ""
echo "3. Add submodules to main repo:"
echo "   cd .."
echo "   git submodule add https://github.com/$GITHUB_ORG/$API_REPO.git guru-api"
echo "   git submodule add https://github.com/$GITHUB_ORG/$UI_REPO.git guru-ui"
echo "   git commit -m 'Add submodules'"
echo "   git push origin main"
echo ""
echo "4. Push main repo:"
echo "   git remote add origin https://github.com/$GITHUB_ORG/$MONO_REPO_NAME.git"
echo "   git push -u origin main"
echo ""
