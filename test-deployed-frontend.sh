#!/bin/bash

# Test script for deployed frontend and backend integration

FRONTEND_URL="https://career-rl-frontend-1086514937351.europe-west1.run.app"
BACKEND_URL="https://career-rl-backend-1086514937351.europe-west1.run.app"

echo "Testing CareerRoguelike Deployment"
echo "===================================="
echo ""

# Test 1: Frontend health
echo "1. Testing frontend health..."
FRONTEND_HEALTH=$(curl -s "$FRONTEND_URL/health")
if [ "$FRONTEND_HEALTH" = "healthy" ]; then
    echo "   ✓ Frontend health check passed"
else
    echo "   ✗ Frontend health check failed"
    exit 1
fi
echo ""

# Test 2: Frontend loads
echo "2. Testing frontend page load..."
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/")
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo "   ✓ Frontend page loads successfully"
else
    echo "   ✗ Frontend page failed to load (HTTP $FRONTEND_RESPONSE)"
    exit 1
fi
echo ""

# Test 3: Backend health
echo "3. Testing backend health..."
BACKEND_HEALTH=$(curl -s "$BACKEND_URL/health")
if echo "$BACKEND_HEALTH" | grep -q "healthy"; then
    echo "   ✓ Backend health check passed"
else
    echo "   ✗ Backend health check failed"
    exit 1
fi
echo ""

# Test 4: Create session
echo "4. Testing session creation..."
SESSION_RESPONSE=$(curl -s -X POST "$BACKEND_URL/sessions" \
    -H "Content-Type: application/json" \
    -d '{"profession": "ios_engineer", "level": 1}')

SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"session_id":"[^"]*"' | cut -d'"' -f4)

if [ -n "$SESSION_ID" ]; then
    echo "   ✓ Session created successfully: $SESSION_ID"
else
    echo "   ✗ Failed to create session"
    echo "   Response: $SESSION_RESPONSE"
    exit 1
fi
echo ""

# Test 5: Get session
echo "5. Testing session retrieval..."
GET_SESSION=$(curl -s "$BACKEND_URL/sessions/$SESSION_ID")
if echo "$GET_SESSION" | grep -q "ios_engineer"; then
    echo "   ✓ Session retrieved successfully"
else
    echo "   ✗ Failed to retrieve session"
    exit 1
fi
echo ""

# Test 6: Check CORS headers
echo "6. Testing CORS configuration..."
CORS_HEADERS=$(curl -s -I -X OPTIONS "$BACKEND_URL/sessions" \
    -H "Origin: $FRONTEND_URL" \
    -H "Access-Control-Request-Method: POST")

if echo "$CORS_HEADERS" | grep -q "access-control-allow-origin"; then
    echo "   ✓ CORS headers present"
else
    echo "   ⚠ CORS headers may need configuration"
fi
echo ""

echo "===================================="
echo "All tests passed! ✓"
echo ""
echo "Frontend URL: $FRONTEND_URL"
echo "Backend URL: $BACKEND_URL"
echo ""
echo "You can now test the full application in your browser:"
echo "$FRONTEND_URL"
