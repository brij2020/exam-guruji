#!/bin/bash
set -e

# Zero-Downtime Deployment Script for guru-ui
# Usage: 
#   ./deploy.sh            # deploy to production (default)
#   ./deploy.sh stg        # deploy to staging
#   ./deploy.sh rollback   # rollback to previous release

EC2_HOST="13.203.195.153"
EC2_USER="ubuntu"
SSH_KEY="~/Documents/development/stomap-app.pem"
APP_DIR="/var/www/exam-guruji/guru-ui"
RELEASES_DIR="/var/www/exam-guruji/releases"
CURRENT_LINK="$APP_DIR/current"
KEEP_RELEASES=3

# Default to production
ENV=${1:-prod}

rollback() {
    echo "🔄 Rolling back..."
    ssh -i $SSH_KEY $EC2_USER@$EC2_HOST << 'EOF'
        CURRENT_LINK="/var/www/exam-guruji/guru-ui/current"
        RELEASES_DIR="/var/www/exam-guruji/releases"
        
        PREVIOUS=$(ls -1t $RELEASES_DIR/ | sed -n '2p')
        
        if [ -n "$PREVIOUS" ] && [ -d "$RELEASES_DIR/$PREVIOUS" ]; then
            ln -sfn "$RELEASES_DIR/$PREVIOUS" $CURRENT_LINK
            pm2 restart guru-ui
            echo "✅ Rolled back to: $PREVIOUS"
        else
            echo "❌ No previous release found"
            exit 1
        fi
EOF
    exit 0
}

if [ "$ENV" = "rollback" ]; then
    rollback
fi

echo "=========================================="
echo "🚀 Deploying to: $ENV"
echo "=========================================="

# Step 1: Build locally with correct env file
echo ""
echo "📦 Step 1: Building locally..."
cd guru-ui
cp .env.${ENV}.example .env.local
npm run build

# Step 2: Create release folder on EC2
echo ""
echo "📁 Step 2: Creating release folder..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
NEW_RELEASE="$RELEASES_DIR/${ENV}_$TIMESTAMP"

ssh -i $SSH_KEY $EC2_USER@$EC2_HOST << EOF
    mkdir -p $RELEASES_DIR
    mkdir -p $NEW_RELEASE
    
    # Copy node_modules from current app
    cp -r $APP_DIR/node_modules $NEW_RELEASE/ 2>/dev/null || true
    cp $APP_DIR/package.json $NEW_RELEASE/
    
    # Copy env file
    cp guru-ui/.env.${ENV}.example $NEW_RELEASE/.env.local 2>/dev/null || true
EOF

# Step 3: Upload .next via tar over SSH
echo ""
echo "📤 Step 3: Uploading (site stays UP)..."
tar -czf ../build.tar .next
scp -i $SSH_KEY ../build.tar $EC2_USER@$EC2_HOST:/tmp/
rm ../build.tar

ssh -i $SSH_KEY $EC2_USER@$EC2_HOST "cd $NEW_RELEASE && tar -xzf /tmp/build.tar && rm /tmp/build.tar"

# Step 4: Switch symlink (instant)
echo ""
echo "🔗 Step 4: Switching release..."
ssh -i $SSH_KEY $EC2_USER@$EC2_HOST "ln -sfn $NEW_RELEASE $CURRENT_LINK"

# Step 5: Restart PM2
echo ""
echo "🔄 Step 5: Reloading PM2..."
ssh -i $SSH_KEY $EC2_USER@$EC2_HOST << EOF
    cd $CURRENT_LINK
    pm2 restart guru-ui --update-env
    sleep 3
    pm2 status guru-ui
EOF

# Step 6: Verify
echo ""
echo "✅ Verifying..."
sleep 3
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$EC2_HOST/en 2>/dev/null || echo "000")

echo ""
echo "=========================================="
if [ "$STATUS" = "200" ]; then
    echo "✅ Deployment SUCCESSFUL!"
else
    echo "⚠️  Deployed (health: $STATUS)"
    echo "   Run ./deploy.sh rollback if issues"
fi
echo "=========================================="

# Cleanup old releases
ssh -i $SSH_KEY $EC2_USER@$EC2_HOST "cd $RELEASES_DIR && ls -1t | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf"

echo ""
echo "🎉 Done!"
