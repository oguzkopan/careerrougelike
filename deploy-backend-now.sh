#!/bin/bash

# Quick backend deployment script
set -e

echo "🚀 Deploying backend to Cloud Run..."

# Set project
gcloud config set project careerrogue-4df28

# Deploy using gcloud run deploy with Dockerfile
gcloud run deploy career-rl-backend \
  --source backend \
  --region europe-west1 \
  --allow-unauthenticated \
  --timeout 300 \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 10 \
  --quiet

echo "✅ Backend deployed successfully!"
echo "🔗 URL: https://career-rl-backend-1086514937351.europe-west1.run.app"
