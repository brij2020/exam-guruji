#!/bin/bash

# ============================================
# Production Deployment Script for AWS (Monorepo)
# Using PM2 for process management
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[✓] $1${NC}"; }
print_warning() { echo -e "${YELLOW}[!] $1${NC}"; }
print_error() { echo -e "${RED}[✗] $1${NC}"; }

# Configuration
APP_NAME="guru-ai"
APP_DIR="/var/www/guru-ai"
GIT_REPO="https://github.com/your-org/guru-ai.git"
BRANCH="main"

API_APP_NAME="guru-api"
UI_APP_NAME="guru-ui"

echo "=========================================="
echo "  Guru AI Monorepo Deployment"
echo "=========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root or with sudo"
    exit 1
fi

# Update system
update_system() {
    print_status "Updating system..."
    apt-get update -y
    apt-get upgrade -y
    apt-get install -y curl git nginx build-essential rsync
}

# Install Node.js
install_node() {
    print_status "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    print_status "Node: $(node -v), NPM: $(npm -v)"
}

# Install PM2
install_pm2() {
    print_status "Installing PM2..."
    npm install -g pm2
    pm2 install pm2-logrotate
}

# Create directory
setup_dir() {
    print_status "Setting up directories..."
    mkdir -p /var/log/pm2
    mkdir -p $APP_DIR
}

# Deploy code
deploy() {
    print_status "Deploying code..."
    
    if [ -d "$APP_DIR/.git" ]; then
        cd $APP_DIR
        git pull origin $BRANCH
    else
        rm -rf $APP_DIR
        git clone -b $BRANCH $GIT_REPO $APP_DIR
        cd $APP_DIR
    fi
    
    git submodule update --init --recursive
}

# Install dependencies
install_deps() {
    print_status "Installing root dependencies..."
    npm install
    
    print_status "Installing API dependencies..."
    cd $APP_DIR/guru-api
    npm install --production
    
    print_status "Installing UI dependencies..."
    cd $APP_DIR/guru-ui
    npm install
}

# Build UI
build() {
    print_status "Building UI..."
    cd $APP_DIR/guru-ui
    
    if [ ! -f ".env.production" ]; then
        cp .env.example .env.production
        print_warning "Please configure .env.production"
    fi
    
    npm run build
}

# Setup PM2
setup_pm2() {
    print_status "Configuring PM2..."
    
    cd $APP_DIR
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'guru-api',
      script: 'npm',
      args: 'start',
      cwd: './guru-api',
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      error_file: '/var/log/pm2/guru-api-error.log',
      out_file: '/var/log/pm2/guru-api-out.log',
      autorestart: true
    },
    {
      name: 'guru-ui',
      script: 'npm',
      args: 'start',
      cwd: './guru-ui',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/pm2/guru-ui-error.log',
      out_file: '/var/log/pm2/guru-ui-out.log',
      autorestart: true
    }
  ]
};
EOF
}

# Setup Nginx
setup_nginx() {
    print_status "Configuring Nginx..."
    
    cat > /etc/nginx/sites-available/guru-ai << 'EOF'
upstream guru_api {
    server 127.0.0.1:4000;
}

server {
    listen 80;
    server_name guru.yourdomain.com;

    # UI Static Files
    location / {
        root /var/www/guru-ai/guru-ui/.next;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API Proxy
    location /api/ {
        proxy_pass http://guru_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

    ln -sf /etc/nginx/sites-available/guru-ai /etc/nginx/sites-enabled/
    nginx -t
    systemctl restart nginx
}

# Start apps
start_apps() {
    print_status "Starting applications..."
    cd $APP_DIR
    pm2 start ecosystem.config.js --env production
    pm2 save
}

# Restart apps
restart_apps() {
    print_status "Restarting applications..."
    cd $APP_DIR
    pm2 restart all
}

# Show status
status() {
    pm2 status
}

# Main
case "$1" in
    deploy)
        update_system
        install_node
        install_pm2
        setup_dir
        deploy
        install_deps
        build
        setup_pm2
        setup_nginx
        start_apps
        status
        print_status "Deployment complete!"
        ;;
    update)
        deploy
        install_deps
        build
        restart_apps
        status
        print_status "Update complete!"
        ;;
    start)
        cd $APP_DIR
        pm2 start ecosystem.config.js
        ;;
    stop)
        pm2 stop all
        ;;
    restart)
        restart_apps
        ;;
    status)
        status
        ;;
    logs)
        pm2 logs --lines 50
        ;;
    *)
        echo "Usage: $0 {deploy|update|start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  deploy  - Full deployment"
        echo "  update  - Update and rebuild"
        echo "  start   - Start apps"
        echo "  stop    - Stop apps"
        echo "  restart - Restart apps"
        echo "  status  - Show status"
        echo "  logs    - Show logs"
        ;;
esac
