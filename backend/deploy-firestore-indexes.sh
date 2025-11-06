#!/bin/bash

# Deploy Firestore Indexes Script
# This script deploys Firestore indexes from firestore.indexes.json

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project configuration
PROJECT_ID="careerrogue-4df28"
INDEX_FILE="firestore.indexes.json"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Firestore Index Deployment Script                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Error: gcloud CLI is not installed${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if index file exists
if [ ! -f "$INDEX_FILE" ]; then
    echo -e "${RED}❌ Error: $INDEX_FILE not found${NC}"
    echo "Please ensure you're running this script from the backend directory"
    exit 1
fi

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "   Project ID: $PROJECT_ID"
echo "   Index File: $INDEX_FILE"
echo ""

# Confirm with user
read -p "$(echo -e ${YELLOW}Do you want to deploy these indexes? [y/N]: ${NC})" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Deployment cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}🚀 Deploying Firestore indexes...${NC}"
echo ""

# Deploy indexes
if gcloud firestore indexes create --project="$PROJECT_ID" --file="$INDEX_FILE" 2>&1; then
    echo ""
    echo -e "${GREEN}✅ Indexes deployment initiated successfully!${NC}"
    echo ""
    echo -e "${YELLOW}⏳ Index Status:${NC}"
    echo "   Indexes are now building in the background."
    echo "   This typically takes 2-5 minutes."
    echo ""
    echo -e "${BLUE}📊 Check index status:${NC}"
    echo "   1. Firebase Console:"
    echo "      https://console.firebase.google.com/project/$PROJECT_ID/firestore/indexes"
    echo ""
    echo "   2. Command line:"
    echo "      gcloud firestore indexes list --project=$PROJECT_ID"
    echo ""
    echo -e "${GREEN}✨ What's next:${NC}"
    echo "   1. Wait for indexes to finish building (2-5 minutes)"
    echo "   2. Check status in Firebase Console"
    echo "   3. Test your application"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Failed to deploy indexes${NC}"
    echo ""
    echo -e "${YELLOW}💡 Troubleshooting:${NC}"
    echo "   1. Check if you're authenticated:"
    echo "      gcloud auth list"
    echo ""
    echo "   2. Set the correct project:"
    echo "      gcloud config set project $PROJECT_ID"
    echo ""
    echo "   3. Check if indexes already exist:"
    echo "      gcloud firestore indexes list --project=$PROJECT_ID"
    echo ""
    echo "   4. Manual creation:"
    echo "      Visit: https://console.firebase.google.com/project/$PROJECT_ID/firestore/indexes"
    echo ""
    exit 1
fi

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
