#!/bin/bash

# ============================================
# Simple Monorepo Setup for EC2
# Run this on your local machine first
# ============================================

set -e

echo "=========================================="
echo "  Setting up Guru AI Monorepo"
echo "=========================================="

# Check if git is available
if ! command -v git &> /dev/null; then
    echo "Git not found. Please install git first."
    exit 1
fi

# Get current directory
CURRENT_DIR="$(pwd)"
PROJECT_NAME="guru-ai"

echo ""
echo "Step 1: Creating monorepo structure..."

# Create main repo directory
mkdir -p $PROJECT_NAME
cd $PROJECT_NAME

# Create root package.json
cat > package.json << 'EOF'
{
  "name": "guru-ai",
  "version": "1.0.0",
  "private": true,
  "description": "Guru AI - Exam Preparation Platform",
  "scripts": {
    "dev:api": "cd guru-api && npm run dev",
    "dev:ui": "cd guru-ui && npm run dev",
    "dev": "echo Use separate terminals: npm run dev:api && npm run dev:ui",
    "build:api": "cd guru-api && npm run build || true",
    "build:ui": "cd guru-ui && npm run build",
    "build": "npm run build:ui",
    "start:api": "cd guru-api && npm start",
    "start:ui": "cd guru-ui && npm start",
    "install:all": "cd guru-api && npm install && cd ../guru-ui && npm install"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
.next/
dist/
build/
.env
.env.local
.env.production
*.log
.DS_Store
EOF

# Copy guru-api
echo "Step 2: Copying guru-api..."
cp -r ../guru-api ./ 2>/dev/null || echo "guru-api not found in parent directory"
if [ -d "guru-api" ]; then
    # Remove nested git folder
    rm -rf guru-api/.git
    # Fix package.json name
    sed -i 's/"name": "guru-api"/"name": "guru-api"/' guru-api/package.json 2>/dev/null || true
    rm -f guru-api/package-lock.json
fi

# Copy guru-ui
echo "Step 3: Copying guru-ui..."
cp -r ../guru-ui ./ 2>/dev/null || echo "guru-ui not found in parent directory"
if [ -d "guru-ui" ]; then
    # Remove nested git folder
    rm -rf guru-ui/.git
    # Fix package.json name
    sed -i 's/"name": "med-cert"/"name": "guru-ui"/' guru-ui/package.json 2>/dev/null || true
    sed -i 's/"name": "guru-ui"/"name": "guru-ui"/' guru-ui/package.json 2>/dev/null || true
    rm -f guru-ui/package-lock.json
fi

# Copy scripts
echo "Step 4: Copying scripts..."
mkdir -p scripts
cp -r ../guru-ai/scripts/* ./scripts/ 2>/dev/null || true

echo ""
echo "=========================================="
echo "  Monorepo created at: ./$PROJECT_NAME"
echo "=========================================="
echo ""
echo "To deploy to EC2:"
echo ""
echo "1. Push to GitHub:"
echo "   cd $PROJECT_NAME"
echo "   git init"
echo "   git add ."
echo "   git commit -m 'Initial commit'"
echo "   git remote add origin https://github.com/YOUR_USERNAME/$PROJECT_NAME.git"
echo "   git push -u origin main"
echo ""
echo "2. On EC2:"
echo "   cd /var/www"
echo "   git clone https://github.com/YOUR_USERNAME/$PROJECT_NAME.git"
echo "   cd $PROJECT_NAME"
echo "   ./scripts/deploy-simple.sh"
echo ""
