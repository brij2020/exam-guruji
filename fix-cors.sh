#!/bin/bash

# Fix CORS on EC2 backend - run this whenever CORS issues occur
# Usage: ./fix-cors.sh

EC2_HOST="13.203.195.153"
EC2_USER="ubuntu"
SSH_KEY="~/Documents/development/stomap-app.pem"

echo "🔧 Fixing CORS on EC2..."

ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" << 'EOF'
  # Set CORS to allow all origins
  sed -i 's/CORS_ORIGIN=.*/CORS_ORIGIN=*/' /var/www/exam-guruji/guru-api/.env
  
  # Restart backend
  pm2 restart guru-api
  
  # Wait and verify
  sleep 3
  echo "✅ CORS fixed! Current setting:"
  grep CORS /var/www/exam-guruji/guru-api/.env
EOF

echo "🚀 Backend restarted with CORS=*"
