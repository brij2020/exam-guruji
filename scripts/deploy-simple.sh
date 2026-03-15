#!/bin/bash

# ============================================
# Simple Deployment Script for EC2
# ============================================

set -e

APP_DIR="/var/www/guru-ai"
APP_NAME="guru-ai"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓] $1${NC}"; }
error() { echo -e "${RED}[✗] $1${NC}"; }

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "Please run as root (sudo)"
    exit 1
fi

echo "=========================================="
echo "  Guru AI Simple Deployment"
echo "=========================================="

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    log "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

log "Node version: $(node -v)"
log "NPM version: $(npm -v)"

# Install dependencies
log "Installing dependencies..."

# Install API dependencies
if [ -d "$APP_DIR/guru-api" ]; then
    log "Installing guru-api dependencies..."
    cd $APP_DIR/guru-api
    rm -f package-lock.json
    npm install --production
fi

# Install UI dependencies
if [ -d "$APP_DIR/guru-ui" ]; then
    log "Installing guru-ui dependencies..."
    cd $APP_DIR/guru-ui
    rm -f package-lock.json
    npm install
    
    # Build UI
    log "Building guru-ui..."
    npm run build
fi

# Setup PM2
log "Setting up PM2..."
npm install -g pm2
pm2 install pm2-logrotate

# Start applications
log "Starting applications..."

# Start API
if [ -f "$APP_DIR/guru-api/app.js" ]; then
    cd $APP_DIR/guru-api
    pm2 start app.js --name "guru-api" -- env NODE_ENV=production PORT=4000
fi

# Start UI (Next.js custom server or static)
if [ -d "$APP_DIR/guru-ui/.next" ]; then
    cd $APP_DIR/guru-ui
    pm2 start npm --name "guru-ui" -- start -- env NODE_ENV=production PORT=3000
fi

# Save PM2 config
pm2 save

log "=========================================="
log "  Deployment Complete!"
log "=========================================="
log ""
log "API: http://localhost:4000"
log "UI: http://localhost:3000"
log ""
log "Commands:"
log "  pm2 status        - Check status"
log "  pm2 logs         - View logs"
log "  pm2 restart all  - Restart all"
