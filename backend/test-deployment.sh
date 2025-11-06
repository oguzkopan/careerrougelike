#!/bin/bash

# Test script for deployed Cloud Run service

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get service URL
REGION="europe-west1"
SERVICE_NAME="career-rl-backend"

# Load PROJECT_ID from .env
if [ -f .env ]; then
    source .env
fi

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: PROJECT_ID not set${NC}"
    exit 1
fi

echo -e "${GREEN}=== Testing Cloud Run Deployment ===${NC}\n"

# Get service URL
echo -e "${YELLOW}Getting service URL...${NC}"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --region $REGION \
    --project $PROJECT_ID \
    --format 'value(status.url)')

if [ -z "$SERVICE_URL" ]; then
    echo -e "${RED}Error: Could not get service URL. Is the service deployed?${NC}"
    exit 1
fi

echo -e "${GREEN}Service URL: ${SERVICE_URL}${NC}\n"

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
echo "GET ${SERVICE_URL}/health"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "${SERVICE_URL}/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ Health check failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test 2: Create Session
echo -e "${YELLOW}Test 2: Create Session${NC}"
echo "POST ${SERVICE_URL}/sessions"
SESSION_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${SERVICE_URL}/sessions" \
    -H "Content-Type: application/json" \
    -d '{
        "profession": "ios_engineer",
        "level": 3
    }')

HTTP_CODE=$(echo "$SESSION_RESPONSE" | tail -n1)
BODY=$(echo "$SESSION_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Session created${NC}"
    echo "Response: $BODY"
    SESSION_ID=$(echo "$BODY" | jq -r '.session_id')
    echo -e "${GREEN}Session ID: ${SESSION_ID}${NC}"
else
    echo -e "${RED}✗ Session creation failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
    SESSION_ID=""
fi
echo ""

# Test 3: Invoke Agent (only if session was created)
if [ -n "$SESSION_ID" ] && [ "$SESSION_ID" != "null" ]; then
    echo -e "${YELLOW}Test 3: Invoke Interview Agent${NC}"
    echo "POST ${SERVICE_URL}/sessions/${SESSION_ID}/invoke"
    
    INVOKE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${SERVICE_URL}/sessions/${SESSION_ID}/invoke" \
        -H "Content-Type: application/json" \
        -d '{
            "action": "interview",
            "data": {}
        }')
    
    HTTP_CODE=$(echo "$INVOKE_RESPONSE" | tail -n1)
    BODY=$(echo "$INVOKE_RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Agent invoked successfully${NC}"
        echo "Response (truncated):"
        echo "$BODY" | jq '.' | head -n 20
    else
        echo -e "${RED}✗ Agent invocation failed (HTTP $HTTP_CODE)${NC}"
        echo "Response: $BODY"
    fi
    echo ""
    
    # Test 4: Get Session
    echo -e "${YELLOW}Test 4: Get Session State${NC}"
    echo "GET ${SERVICE_URL}/sessions/${SESSION_ID}"
    
    GET_RESPONSE=$(curl -s -w "\n%{http_code}" "${SERVICE_URL}/sessions/${SESSION_ID}")
    HTTP_CODE=$(echo "$GET_RESPONSE" | tail -n1)
    BODY=$(echo "$GET_RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Session retrieved${NC}"
        echo "Response (truncated):"
        echo "$BODY" | jq '.' | head -n 20
    else
        echo -e "${RED}✗ Session retrieval failed (HTTP $HTTP_CODE)${NC}"
        echo "Response: $BODY"
    fi
    echo ""
else
    echo -e "${YELLOW}Skipping agent tests (no valid session ID)${NC}\n"
fi

# Test 5: Check Firestore
echo -e "${YELLOW}Test 5: Verify Firestore Documents${NC}"
echo "Checking Firestore console..."
echo -e "${GREEN}View sessions: https://console.cloud.google.com/firestore/databases/-default-/data/panel/sessions?project=${PROJECT_ID}${NC}"
echo ""

# Test 6: Check Logs
echo -e "${YELLOW}Test 6: Recent Cloud Run Logs${NC}"
echo "Fetching recent logs..."
gcloud run services logs read $SERVICE_NAME \
    --region $REGION \
    --project $PROJECT_ID \
    --limit 10 \
    --format "table(timestamp,severity,textPayload)" 2>/dev/null || echo "Could not fetch logs"
echo ""

echo -e "${GREEN}=== Testing Complete ===${NC}"
echo -e "${YELLOW}View full logs: https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}/logs?project=${PROJECT_ID}${NC}"
echo -e "${YELLOW}View metrics: https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}/metrics?project=${PROJECT_ID}${NC}"
