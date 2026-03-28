#!/bin/bash
set -e

# Deploy backend only to EC2
# Usage: ./deploy-backend.sh [service-name]

EC2_HOST="13.203.195.153"
EC2_USER="ubuntu"
SSH_KEY="~/Documents/development/stomap-app.pem"
APP_DIR="/var/www/exam-guruji/guru-api"

echo "🚀 Deploying backend to EC2..."

# Sync backend files
echo "📤 Syncing backend files..."
rsync -avz --delete -e "ssh -i $SSH_KEY" \
  guru-api/ \
  $EC2_USER@$EC2_HOST:$APP_DIR/

# Restart PM2
echo "🔄 Restarting backend..."
ssh -i $SSH_KEY $EC2_USER@$EC2_HOST \
  "pm2 restart guru-api && sleep 2 && pm2 status"

# Verify API
sleep 2
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$EC2_HOST:4000/api/v1/exams 2>/dev/null || echo "000")
if [ "$STATUS" = "200" ]; then
  echo "✅ Backend deployed successfully!"
else
  echo "⚠️  Backend deployed but API check returned: $STATUS"
fi
