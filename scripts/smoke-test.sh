#!/bin/bash
# Post-deployment smoke test - checks if services are running

EC2_HOST="13.203.195.153"
EC2_USER="ubuntu"
KEY_FILE="/Users/brijbhan/Documents/development/stomap-app.pem"

echo "=== Post-Deployment Smoke Test ==="
echo ""

# Test API health
echo "Testing API health..."
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://$EC2_HOST:4000/api/v1/system/health 2>/dev/null || echo "000")
if [ "$API_RESPONSE" = "200" ]; then
  echo "✓ API is healthy"
else
  echo "✗ API returned status: $API_RESPONSE"
fi

# Test exams endpoint
echo "Testing exams endpoint..."
EXAMS_RESPONSE=$(curl -s http://$EC2_HOST:4000/api/v1/exams 2>/dev/null | head -c 100)
if echo "$EXAMS_RESPONSE" | grep -q "data"; then
  echo "✓ Exams endpoint working"
else
  echo "✗ Exams endpoint issue"
fi

# Test UI
echo "Testing UI..."
UI_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://$EC2_HOST:3000 2>/dev/null || echo "000")
if [ "$UI_RESPONSE" = "200" ] || [ "$UI_RESPONSE" = "304" ]; then
  echo "✓ UI is accessible"
else
  echo "✗ UI returned status: $UI_RESPONSE"
fi

# Check PM2 status on server
echo ""
echo "Checking PM2 services..."
ssh -o StrictHostKeyChecking=no -i "$KEY_FILE" "$EC2_USER@$EC2_HOST" "pm2 list" 2>/dev/null || echo "Could not connect to server"

echo ""
echo "=== Smoke Test Complete ==="
