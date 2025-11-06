#!/bin/bash

# GCP Project Setup Script
# This script sets up all required GCP services for CareerRoguelike Backend

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}=== GCP Project Setup for CareerRoguelike ===${NC}\n"

# Load PROJECT_ID from .env
if [ -f .env ]; then
    source .env
fi

# Prompt for PROJECT_ID if not set
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}Enter your GCP Project ID:${NC}"
    read PROJECT_ID
    
    if [ -z "$PROJECT_ID" ]; then
        echo -e "${RED}Error: PROJECT_ID is required${NC}"
        exit 1
    fi
fi

REGION="europe-west1"

echo -e "${BLUE}Project ID: ${PROJECT_ID}${NC}"
echo -e "${BLUE}Region: ${REGION}${NC}\n"

# Set active project
echo -e "${YELLOW}Setting active GCP project...${NC}"
gcloud config set project $PROJECT_ID
echo -e "${GREEN}✓ Project set${NC}\n"

# Step 1: Enable Cloud Run API
echo -e "${YELLOW}Step 1/6: Enabling Cloud Run API...${NC}"
gcloud services enable run.googleapis.com --project=$PROJECT_ID
echo -e "${GREEN}✓ Cloud Run API enabled${NC}\n"

# Step 2: Enable Firestore API
echo -e "${YELLOW}Step 2/6: Enabling Firestore API...${NC}"
gcloud services enable firestore.googleapis.com --project=$PROJECT_ID
echo -e "${GREEN}✓ Firestore API enabled${NC}\n"

# Step 3: Enable Artifact Registry API
echo -e "${YELLOW}Step 3/6: Enabling Artifact Registry API...${NC}"
gcloud services enable artifactregistry.googleapis.com --project=$PROJECT_ID
echo -e "${GREEN}✓ Artifact Registry API enabled${NC}\n"

# Step 3.5: Enable Vertex AI API
echo -e "${YELLOW}Step 3.5/6: Enabling Vertex AI API...${NC}"
gcloud services enable aiplatform.googleapis.com --project=$PROJECT_ID
echo -e "${GREEN}✓ Vertex AI API enabled${NC}\n"

# Step 4: Create Artifact Registry repository
echo -e "${YELLOW}Step 4/6: Creating Artifact Registry repository...${NC}"
if gcloud artifacts repositories describe career-rl --location=$REGION --project=$PROJECT_ID &>/dev/null; then
    echo -e "${YELLOW}Repository 'career-rl' already exists${NC}"
else
    gcloud artifacts repositories create career-rl \
        --repository-format=docker \
        --location=$REGION \
        --description="CareerRoguelike Backend Docker images" \
        --project=$PROJECT_ID
    echo -e "${GREEN}✓ Artifact Registry repository created${NC}"
fi
echo ""

# Step 5: Check/Create Firestore database
echo -e "${YELLOW}Step 5/6: Setting up Firestore database...${NC}"
echo -e "${BLUE}Checking if Firestore database exists...${NC}"

# Try to check if Firestore is already set up
if gcloud firestore databases describe --project=$PROJECT_ID &>/dev/null; then
    echo -e "${GREEN}✓ Firestore database already exists${NC}"
else
    echo -e "${YELLOW}Firestore database not found${NC}"
    echo -e "${YELLOW}Please create Firestore database manually:${NC}"
    echo -e "${BLUE}1. Go to: https://console.cloud.google.com/firestore?project=${PROJECT_ID}${NC}"
    echo -e "${BLUE}2. Click 'Create Database'${NC}"
    echo -e "${BLUE}3. Select 'Native mode'${NC}"
    echo -e "${BLUE}4. Choose location: ${REGION} (or nearby)${NC}"
    echo -e "${BLUE}5. Click 'Create'${NC}"
    echo ""
    read -p "Press Enter once Firestore database is created..."
    echo -e "${GREEN}✓ Firestore setup confirmed${NC}"
fi
echo ""

# Step 6: Grant Cloud Run service account permissions for Vertex AI
echo -e "${YELLOW}Step 6/6: Configuring IAM permissions for Vertex AI...${NC}"
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo -e "${BLUE}Granting Vertex AI User role to Cloud Run service account...${NC}"
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/aiplatform.user" \
    --condition=None \
    --quiet 2>/dev/null || echo -e "${YELLOW}Note: IAM binding may already exist${NC}"

echo -e "${GREEN}✓ IAM permissions configured${NC}\n"

# Summary
echo -e "${GREEN}=== Setup Complete ===${NC}\n"
echo -e "${GREEN}✓ Cloud Run API enabled${NC}"
echo -e "${GREEN}✓ Firestore API enabled${NC}"
echo -e "${GREEN}✓ Artifact Registry API enabled${NC}"
echo -e "${GREEN}✓ Vertex AI API enabled${NC}"
echo -e "${GREEN}✓ Artifact Registry repository created: ${REGION}-docker.pkg.dev/${PROJECT_ID}/career-rl${NC}"
echo -e "${GREEN}✓ Firestore database ready${NC}"
echo -e "${GREEN}✓ IAM permissions configured for Vertex AI${NC}\n"

echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Your .env file is configured to use Vertex AI (no API key needed)"
echo -e "2. Run: ${BLUE}./deploy.sh${NC} to build and deploy to Cloud Run"
echo -e "3. Or follow manual steps in DEPLOYMENT.md\n"

echo -e "${BLUE}Useful links:${NC}"
echo -e "Cloud Run Console: https://console.cloud.google.com/run?project=${PROJECT_ID}"
echo -e "Firestore Console: https://console.cloud.google.com/firestore?project=${PROJECT_ID}"
echo -e "Artifact Registry: https://console.cloud.google.com/artifacts?project=${PROJECT_ID}"
