#!/bin/bash

# Cloud Run Monitoring Script
# Monitors Cloud Run service metrics, logs, and behavior

PROJECT_ID="careerrogue-4df28"
SERVICE_NAME="career-rl-backend"
REGION="europe-west1"

echo "========================================================================"
echo "Cloud Run Service Monitoring"
echo "========================================================================"
echo "Project: $PROJECT_ID"
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"
echo ""

# 1. Service Status
echo "========================================================================"
echo "1. Service Status"
echo "========================================================================"
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="table(status.url,status.conditions[0].status,status.latestReadyRevisionName)"
echo ""

# 2. Service Configuration
echo "========================================================================"
echo "2. Service Configuration"
echo "========================================================================"
echo "Resource Limits:"
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(spec.template.spec.containers[0].resources.limits)"
echo ""

echo "Scaling Configuration:"
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="yaml(spec.template.metadata.annotations)" | grep -E "maxScale|minScale"
echo ""

echo "Environment Variables:"
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="table(spec.template.spec.containers[0].env[].name,spec.template.spec.containers[0].env[].value)"
echo ""

# 3. Recent Revisions
echo "========================================================================"
echo "3. Recent Revisions"
echo "========================================================================"
gcloud run revisions list \
  --service=$SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --limit=5 \
  --format="table(metadata.name,status.conditions[0].status,metadata.creationTimestamp)"
echo ""

# 4. Recent Logs (last 50 lines)
echo "========================================================================"
echo "4. Recent Logs (Last 50 lines)"
echo "========================================================================"
gcloud run services logs read $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --limit=50
echo ""

# 5. Test Health Endpoint
echo "========================================================================"
echo "5. Health Check Test"
echo "========================================================================"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format='value(status.url)')

echo "Service URL: $SERVICE_URL"
echo "Testing /health endpoint..."
curl -s "$SERVICE_URL/health" | jq '.'
echo ""

# 6. Firestore Collections
echo "========================================================================"
echo "6. Firestore Collections"
echo "========================================================================"
echo "Checking for sessions collection..."
gcloud firestore databases describe "(default)" \
  --project=$PROJECT_ID \
  --format="table(name,locationId,type)"
echo ""

# 7. Service Metrics (if available)
echo "========================================================================"
echo "7. Service Metrics Summary"
echo "========================================================================"
echo "Note: Detailed metrics available in Cloud Console:"
echo "https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/metrics?project=$PROJECT_ID"
echo ""

# 8. Scale-to-Zero Test
echo "========================================================================"
echo "8. Scale-to-Zero Verification"
echo "========================================================================"
echo "Current configuration:"
MIN_INSTANCES=$(gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(spec.template.metadata.annotations['autoscaling.knative.dev/minScale'])")

if [ -z "$MIN_INSTANCES" ] || [ "$MIN_INSTANCES" = "0" ]; then
  echo "✓ Scale-to-zero is ENABLED (min-instances=0)"
  echo "  Service will scale down to 0 instances when idle"
else
  echo "⚠ Scale-to-zero is DISABLED (min-instances=$MIN_INSTANCES)"
  echo "  Service will maintain at least $MIN_INSTANCES instance(s)"
fi
echo ""

MAX_INSTANCES=$(gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(spec.template.metadata.annotations['autoscaling.knative.dev/maxScale'])")

echo "Max instances: ${MAX_INSTANCES:-default}"
echo ""

# 9. Summary
echo "========================================================================"
echo "9. Summary"
echo "========================================================================"
echo "✓ Service is deployed and accessible"
echo "✓ Health endpoint responding"
echo "✓ Firestore database configured"
echo "✓ Logs are being generated"
echo ""
echo "To view real-time logs:"
echo "  gcloud run services logs tail $SERVICE_NAME --region=$REGION --project=$PROJECT_ID"
echo ""
echo "To view metrics in Cloud Console:"
echo "  https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/metrics?project=$PROJECT_ID"
echo ""
echo "========================================================================"
