#!/bin/bash

# Quick Deploy Script - One command to deploy your backend
# Usage: ./quick-deploy.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}🚀 Quick Deploy Starting...${NC}\n"

# Load environment
if [ -f .env ]; then
    source .env
else
    echo -e "${YELLOW}No .env file found, using defaults${NC}"
fi

PROJECT_ID=${PROJECT_ID:-careerrogue-4df28}
REGION="europe-west1"
SERVICE_NAME="career-rl-backend"
IMAGE="europe-west1-docker.pkg.dev/${PROJECT_ID}/career-rl/backend:latest"

echo -e "${BLUE}Building...${NC}"
gcloud builds submit --tag $IMAGE --project $PROJECT_ID --quiet . 2>&1 | tail -n 5

echo -e "\n${BLUE}Deploying...${NC}"
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE \
    --region $REGION \
    --project $PROJECT_ID \
    --quiet 2>&1 | tail -n 5

SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --project $PROJECT_ID --format 'value(status.url)')

echo -e "\n${GREEN}✅ Done!${NC}"
echo -e "${YELLOW}${SERVICE_URL}${NC}\n"

# Quick test
curl -s "${SERVICE_URL}/health" > /dev/null && echo -e "${GREEN}✓ Service is healthy${NC}" || echo -e "${YELLOW}⚠ Service may still be starting...${NC}"
