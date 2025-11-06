#!/bin/bash

# Quick Frontend Deployment Script
# Builds and deploys frontend to Cloud Run in one command

set -e

PROJECT_ID="careerrogue-4df28"
REGION="europe-west1"
SERVICE_NAME="career-rl-frontend"
IMAGE_NAME="europe-west1-docker.pkg.dev/${PROJECT_ID}/career-rl/frontend:latest"

echo "🚀 Quick deploying frontend to Cloud Run..."
echo ""

# Build and push with Cloud Build
echo "📦 Building Docker image..."
gcloud builds submit --tag ${IMAGE_NAME} --project ${PROJECT_ID}

# Deploy to Cloud Run
echo "☁️  Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --region ${REGION} \
    --platform managed \
    --allow-unauthenticated \
    --min-instances 0 \
    --max-instances 10 \
    --memory 512Mi \
    --cpu 1 \
    --port 8080 \
    --project ${PROJECT_ID}

# Get service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --region ${REGION} \
    --project ${PROJECT_ID} \
    --format="value(status.url)")

echo ""
echo "✅ Deployment complete!"
echo "🌐 Frontend URL: ${SERVICE_URL}"
echo ""
