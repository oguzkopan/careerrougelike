#!/bin/bash

# CareerRoguelike Backend - Quick Deployment Script
# This script builds and deploys your backend to Cloud Run in one command
# Perfect for rapid iteration during development

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGION="europe-west1"
SERVICE_NAME="career-rl-backend"
REPOSITORY_NAME="career-rl"
IMAGE_NAME="backend"

echo -e "${GREEN}=== Quick Deploy: CareerRoguelike Backend ===${NC}\n"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create .env file with PROJECT_ID"
    exit 1
fi

# Load environment variables
source .env

# Check required variables
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: PROJECT_ID not set in .env${NC}"
    exit 1
fi

# Check if using Vertex AI or API key
USE_VERTEX_AI=${USE_VERTEX_AI:-true}

echo -e "${BLUE}Project: ${PROJECT_ID}${NC}"
echo -e "${BLUE}Region: ${REGION}${NC}"
echo -e "${BLUE}Auth: Vertex AI${NC}\n"

# Step 1: Build image using Cloud Build
echo -e "${GREEN}[1/3] Building Docker image...${NC}"
FULL_IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${IMAGE_NAME}:latest"

gcloud builds submit \
    --tag $FULL_IMAGE_NAME \
    --project $PROJECT_ID \
    --quiet \
    . 2>&1 | grep -E "(Step|Successfully|DONE|ERROR)" || true

echo -e "${GREEN}✓ Image built and pushed${NC}\n"

# Step 2: Deploy to Cloud Run
echo -e "${GREEN}[2/3] Deploying to Cloud Run...${NC}"

# Prepare environment variables
ENV_VARS="PROJECT_ID=$PROJECT_ID,FIRESTORE_DB=${FIRESTORE_DB:-"(default)"},USE_VERTEX_AI=${USE_VERTEX_AI:-true},VERTEX_AI_LOCATION=${VERTEX_AI_LOCATION:-us-central1}"

# Add API key if not using Vertex AI
if [ "$USE_VERTEX_AI" != "true" ] && [ -n "$GOOGLE_API_KEY" ]; then
    ENV_VARS="$ENV_VARS,GOOGLE_API_KEY=$GOOGLE_API_KEY"
fi

gcloud run deploy $SERVICE_NAME \
    --image $FULL_IMAGE_NAME \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --set-env-vars $ENV_VARS \
    --min-instances 0 \
    --max-instances 10 \
    --memory 1Gi \
    --cpu 2 \
    --timeout 300 \
    --project $PROJECT_ID \
    --quiet

echo -e "${GREEN}✓ Deployed to Cloud Run${NC}\n"

# Step 3: Get service URL and test
echo -e "${GREEN}[3/3] Testing deployment...${NC}"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --region $REGION \
    --project $PROJECT_ID \
    --format 'value(status.url)')

# Wait a moment for service to be ready
sleep 3

# Test health endpoint
HEALTH_STATUS=$(curl -s "${SERVICE_URL}/health" -w "\n%{http_code}" | tail -n1)

if [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${YELLOW}⚠ Health check returned status: ${HEALTH_STATUS}${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           🚀 Deployment Successful! 🚀                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Service URL:${NC}"
echo -e "${YELLOW}${SERVICE_URL}${NC}"
echo ""
echo -e "${BLUE}Quick Tests:${NC}"
echo -e "Health:  ${YELLOW}curl ${SERVICE_URL}/health${NC}"
echo -e "Session: ${YELLOW}curl -X POST ${SERVICE_URL}/sessions -H 'Content-Type: application/json' -d '{\"profession\":\"ios_engineer\",\"level\":3}'${NC}"
echo ""
echo -e "${BLUE}Useful Links:${NC}"
echo -e "Logs:     ${YELLOW}https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}/logs?project=${PROJECT_ID}${NC}"
echo -e "Metrics:  ${YELLOW}https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}/metrics?project=${PROJECT_ID}${NC}"
echo -e "Firestore: ${YELLOW}https://console.cloud.google.com/firestore?project=${PROJECT_ID}${NC}"
echo ""
