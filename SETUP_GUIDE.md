# Guru AI - Complete Setup Guide

## Local Setup (Before Deploy)

### Step 1: Prepare Your Local Files

```bash
# Navigate to your guru-ai folder
cd /path/to/your/guru-ai

# Run the setup script to create monorepo structure
bash scripts/setup-local.sh
```

This will create a `guru-ai/` folder with:
- `guru-api/` - Backend code
- `guru-ui/` - Frontend code
- `scripts/` - Deployment scripts

### Step 2: Push to GitHub

```bash
cd guru-ai

# Initialize git
git init
git add .
git commit -m "Initial monorepo setup"

# Create repo on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/guru-ai.git
git push -u origin main
```

## EC2 Deployment

### Step 1: Launch EC2 Instance

- Ubuntu 20.04 or 22.04
- t3.medium or larger
- Open ports: 22, 80, 443, 3000, 4000

### Step 2: Install MongoDB

```bash
# SSH into EC2
ssh ubuntu@YOUR_EC2_IP

# Install MongoDB
sudo apt update
sudo apt install -y gnupg curl
curl -fsSL https://pgp.mongodb.com/server-6.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg --dearmor
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] http://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl enable mongod
sudo systemctl start mongod
```

### Step 3: Clone and Deploy

```bash
# Navigate to /var/www
cd /var/www

# Clone your repo
sudo git clone https://github.com/YOUR_USERNAME/guru-ai.git
cd guru-ai

# Make deployment script executable
sudo chmod +x scripts/deploy-simple.sh

# Run deployment
sudo bash scripts/deploy-simple.sh
```

### Step 4: Setup Nginx (Optional)

```bash
sudo apt install -y nginx

# Create nginx config
sudo nano /etc/nginx/sites-available/guru-ai
```

Paste this config:

```nginx
upstream guru_api {
    server 127.0.0.1:4000;
}

server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    # UI
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api/ {
        proxy_pass http://guru_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# Enable and restart nginx
sudo ln -s /etc/nginx/sites-available/guru-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 5: Environment Variables

Create `.env` files:

```bash
# For guru-api
cd /var/www/guru-ai/guru-api
sudo nano .env
```

Add:
```
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb://localhost:27017/guru
JWT_SECRET=your-super-secret-key
GEMINI_API_KEY=your-gemini-api-key
```

```bash
# For guru-ui
cd /var/www/guru-ai/guru-ui
sudo nano .env.local
```

Add:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

### Step 6: Restart Services

```bash
cd /var/www/guru-ai
sudo pm2 restart all
```

## Common Issues

### Issue: npm install fails
```bash
# Clear npm cache
sudo npm cache clean --force

# Delete lock files and retry
cd /var/www/guru-ai/guru-api
sudo rm -f package-lock.json
sudo npm install

cd ../guru-ui
sudo rm -f package-lock.json  
sudo npm install
```

### Issue: Port already in use
```bash
# Find what's using the port
sudo lsof -i :3000
sudo lsof -i :4000

# Kill the process
sudo kill -9 PID_NUMBER
```

### Issue: MongoDB connection failed
```bash
# Check MongoDB status
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod
```

## Quick Commands

```bash
# Check status
sudo pm2 status

# View logs
sudo pm2 logs

# Restart
sudo pm2 restart all

# Stop
sudo pm2 stop all
```
