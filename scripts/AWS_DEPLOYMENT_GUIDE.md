# AWS EC2 Deployment Guide for Guru AI

## Prerequisites

1. **EC2 Instance** (t3.medium or larger recommended)
   - Ubuntu 20.04 LTS or 22.04 LTS
   - At least 2GB RAM
   - Security group: Open ports 22, 80, 443

2. **Domain** (optional but recommended)
   - Point domain A record to EC2 IP

## Step 1: Initial Server Setup

```bash
# Connect to your EC2 instance
ssh ubuntu@your-ec2-ip

# Run initial setup
sudo su
cd /opt
git clone https://github.com/your-repo/guru-ai.git
cd guru-ai
chmod +x scripts/deploy-aws.sh

# Run deployment
./scripts/deploy-aws.sh deploy
```

## Step 2: Configure Environment Variables

```bash
# API Environment
cd /var/www/guru-ai/guru-api
cp .env.example .env.production
nano .env.production

# Required variables:
# NODE_ENV=production
# MONGODB_URI=mongodb://localhost:27017/guru
# JWT_SECRET=your-secure-random-string
# GEMINI_API_KEY=your-gemini-key

# UI Environment
cd /var/www/guru-ai/guru-ui
cp .env.example .env.production
nano .env.production

# Required variables:
# NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

## Step 3: Install MongoDB (Local) or Use Atlas

### Option A: Local MongoDB
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt-get update
apt-get install -y mongodb-org
systemctl enable mongod
systemctl start mongod
```

### Option B: MongoDB Atlas (Recommended)
Just update your `MONGODB_URI` in .env.production

## Step 4: Setup SSL (Let's Encrypt)

```bash
# Install Certbot
apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d guru.yourdomain.com

# Auto-renewal is automatic
```

## Step 5: Common Commands

```bash
# Deploy/Update
./scripts/deploy-aws.sh update

# Check status
./scripts/deploy-aws.sh status

# View logs
./scripts/deploy-aws.sh logs

# Restart services
./scripts/deploy-aws.sh restart
```

## PM2 Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs guru-api
pm2 logs guru-ui

# Restart
pm2 restart all

# Stop
pm2 stop all

# Monitor
pm2 monitor
```

## Troubleshooting

### Check if ports are listening
```bash
netstat -tlnp | grep -E '3000|4000|80'
```

### Check PM2 logs
```bash
pm2 logs --err --lines 50
```

### Check Nginx logs
```bash
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### Restart everything
```bash
pm2 restart all
systemctl restart nginx
```

## Auto-start on Server Reboot

```bash
# Setup PM2 startup
pm2 startup

# Save current state
pm2 save
```

## Performance Optimization

1. **Enable Swap** (if needed)
```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

2. **Optimize Nginx** (optional)
```bash
# Add to /etc/nginx/nginx.conf
worker_processes auto;
worker_rlimit_nofile 65535;
```

## Backup Script

```bash
#!/bin/bash
# backup.sh
mongodump --db guru --out /backup/guru-$(date +%Y%m%d)
tar -czf /backup/guru-ui-$(date +%Y%m%d).tar.gz /var/www/guru-ai/guru-ui
```

Add to crontab:
```bash
0 2 * * * /path/to/backup.sh
```
