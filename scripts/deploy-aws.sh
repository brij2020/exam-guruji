#!/bin/bash

# ============================================
# Production Deployment Script for AWS
# Using PM2 for process management
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="guru-ai"
API_DIR="/var/www/guru-ai/guru-api"
UI_DIR="/var/www/guru-ai/guru-ui"
GIT_REPO="https://github.com/your-repo/guru-ai.git"
BRANCH="main"

# PM2 app names
API_APP_NAME="guru-api"
UI_APP_NAME="guru-ui"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Guru AI Production Deployment${NC}"
echo -e "${GREEN}========================================${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}[✓] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[!] $1${NC}"
}

print_error() {
    echo -e "${RED}[✗] $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root or with sudo"
    exit 1
fi

# Update and install dependencies
update_system() {
    print_status "Updating system packages..."
    apt-get update -y
    apt-get upgrade -y
    apt-get install -y curl git nginx build-essential
}

# Install Node.js
install_node() {
    print_status "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    print_status "Node version: $(node -v)"
    print_status "NPM version: $(npm -v)"
}

# Install PM2
install_pm2() {
    print_status "Installing PM2..."
    npm install -g pm2
    pm2 install pm2-logrotate
    pm2 startup
}

# Clone/Update code
deploy_code() {
    print_status "Deploying code from Git..."
    
    # Create directory if not exists
    mkdir -p /var/www/guru-ai
    
    if [ -d "$API_DIR/.git" ]; then
        print_warning "Updating existing code..."
        cd $API_DIR
        git pull origin $BRANCH
    else
        print_status "Cloning repository..."
        rm -rf /var/www/guru-ai
        git clone -b $BRANCH $GIT_REPO /var/www/guru-ai
    fi
}

# Install API dependencies
install_api_deps() {
    print_status "Installing API dependencies..."
    cd $API_DIR
    npm install --production
}

# Install UI dependencies
install_ui_deps() {
    print_status "Installing UI dependencies..."
    cd $UI_DIR
    npm install
}

# Build UI
build_ui() {
    print_status "Building UI..."
    cd $UI_DIR
    
    # Create production env file if not exists
    if [ ! -f ".env.production" ]; then
        cp .env.example .env.production
        print_warning "Please configure .env.production file!"
    fi
    
    npm run build
}

# Setup Nginx
setup_nginx() {
    print_status "Setting up Nginx..."
    
    # Create Nginx config
    cat > /etc/nginx/sites-available/guru-ai << 'EOF'
upstream guru_api {
    server 127.0.0.1:4000;
}

server {
    listen 80;
    server_name guru.yourdomain.com;
    
    # Redirect to HTTPS (uncomment after SSL setup)
    # return 301 https://$server_name$request_uri;
    
    # UI Static Files
    location / {
        root /var/www/guru-ai/guru-ui/.next;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
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
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # WebSocket support
    location /socket.io/ {
        proxy_pass http://guru_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
EOF
    
    # Enable site
    ln -sf /etc/nginx/sites-available/guru-ai /etc/nginx/sites-enabled/
    
    # Test nginx config
    nginx -t
    
    # Restart nginx
    systemctl restart nginx
    print_status "Nginx configured and restarted"
}

# Configure Firewall
setup_firewall() {
    print_status "Configuring firewall..."
    ufw allow 22    # SSH
    ufw allow 80    # HTTP
    ufw allow 443   # HTTPS
    ufw --force enable
}

# Start applications with PM2
start_apps() {
    print_status "Starting applications with PM2..."
    
    # Start API
    cd $API_DIR
    pm2 start ecosystem.config.js --env production || pm2 start "npm start" --name $API_APP_NAME
    
    # Start UI (if using Next.js custom server)
    cd $UI_DIR
    pm2 start "npm start" --name $UI_APP_NAME
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script
    pm2 startup
}

# Restart applications
restart_apps() {
    print_status "Restarting applications..."
    pm2 restart all
}

# Stop applications
stop_apps() {
    print_status "Stopping applications..."
    pm2 stop all
}

# Show status
show_status() {
    print_status "Application Status:"
    pm2 status
    echo ""
    print_status "Application Logs (last 50 lines):"
    pm2 logs --lines 50 --nostream
}

# Rollback
rollback() {
    print_warning "Rolling back to previous version..."
    pm2 resurrect
}

# Main menu
case "$1" in
    deploy)
        update_system
        install_node
        install_pm2
        deploy_code
        install_api_deps
        install_ui_deps
        build_ui
        setup_nginx
        setup_firewall
        start_apps
        show_status
        print_status "Deployment completed!"
        ;;
    update)
        deploy_code
        install_api_deps
        install_ui_deps
        build_ui
        restart_apps
        show_status
        print_status "Update completed!"
        ;;
    start)
        start_apps
        ;;
    stop)
        stop_apps
        ;;
    restart)
        restart_apps
        ;;
    status)
        show_status
        ;;
    logs)
        pm2 logs --lines 100 --nostream
        ;;
    rollback)
        rollback
        ;;
    nginx-setup)
        setup_nginx
        ;;
    *)
        echo "Usage: $0 {deploy|update|start|stop|restart|status|logs|rollback|nginx-setup}"
        echo ""
        echo "Commands:"
        echo "  deploy      - Full deployment (first time)"
        echo "  update      - Update code and rebuild"
        echo "  start       - Start applications"
        echo "  stop        - Stop applications"
        echo "  restart     - Restart applications"
        echo "  status      - Show application status"
        echo "  logs        - Show application logs"
        echo "  rollback    - Rollback to saved state"
        echo "  nginx-setup - Setup Nginx only"
        exit 1
        ;;
esac

exit 0
