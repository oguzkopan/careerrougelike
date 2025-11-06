#!/bin/bash

# Frontend Deployment Script for CareerRoguelike
# This script builds and deploys the frontend to Google Cloud Run

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="careerrogue-4df28"
REGION="europe-west1"
SERVICE_NAME="career-rl-frontend"
IMAGE_NAME="europe-west1-docker.pkg.dev/${PROJECT_ID}/career-rl/frontend"

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_info "Checking prerequisites..."

if ! command_exists gcloud; then
    print_error "gcloud CLI is not installed. Please install it first."
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed. Please install Node.js first."
    exit 1
fi

if ! command_exists docker; then
    print_warning "Docker is not installed. Cloud Build will be used instead."
fi

print_success "Prerequisites check passed"

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Using .env.example as template."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_info "Created .env from .env.example. Please update it with your values."
    fi
fi

# Parse command line arguments
SKIP_BUILD=false
SKIP_DEPLOY=false
LOCAL_BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-deploy)
            SKIP_DEPLOY=true
            shift
            ;;
        --local)
            LOCAL_BUILD=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-build    Skip the Docker image build step"
            echo "  --skip-deploy   Skip the Cloud Run deployment step"
            echo "  --local         Build Docker image locally instead of using Cloud Build"
            echo "  --help          Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Step 1: Test build locally
if [ "$SKIP_BUILD" = false ]; then
    print_info "Testing local build..."
    npm run build
    print_success "Local build successful"
fi

# Step 2: Build and push Docker image
if [ "$SKIP_BUILD" = false ]; then
    print_info "Building Docker image..."
    
    if [ "$LOCAL_BUILD" = true ] && command_exists docker; then
        # Local Docker build
        print_info "Building image locally with Docker..."
        docker build -t ${IMAGE_NAME}:latest .
        
        print_info "Pushing image to Artifact Registry..."
        docker push ${IMAGE_NAME}:latest
    else
        # Cloud Build
        print_info "Building image with Cloud Build..."
        gcloud builds submit \
            --tag ${IMAGE_NAME}:latest \
            --project ${PROJECT_ID}
    fi
    
    print_success "Docker image built and pushed successfully"
else
    print_warning "Skipping Docker image build"
fi

# Step 3: Deploy to Cloud Run
if [ "$SKIP_DEPLOY" = false ]; then
    print_info "Deploying to Cloud Run..."
    
    gcloud run deploy ${SERVICE_NAME} \
        --image ${IMAGE_NAME}:latest \
        --region ${REGION} \
        --platform managed \
        --allow-unauthenticated \
        --min-instances 0 \
        --max-instances 10 \
        --memory 512Mi \
        --cpu 1 \
        --port 8080 \
        --project ${PROJECT_ID}
    
    print_success "Deployment successful!"
    
    # Get the service URL
    SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
        --region ${REGION} \
        --project ${PROJECT_ID} \
        --format="value(status.url)")
    
    echo ""
    print_success "Frontend is now live at:"
    echo -e "${GREEN}${SERVICE_URL}${NC}"
    echo ""
else
    print_warning "Skipping Cloud Run deployment"
fi

# Step 4: Run health check
if [ "$SKIP_DEPLOY" = false ]; then
    print_info "Running health check..."
    sleep 3  # Wait for service to be ready
    
    HEALTH_URL="${SERVICE_URL}/health"
    HEALTH_RESPONSE=$(curl -s ${HEALTH_URL} || echo "failed")
    
    if [ "$HEALTH_RESPONSE" = "healthy" ]; then
        print_success "Health check passed"
    else
        print_warning "Health check returned: ${HEALTH_RESPONSE}"
    fi
fi

# Summary
echo ""
echo "=========================================="
print_success "Deployment Complete!"
echo "=========================================="
echo ""
echo "Service Details:"
echo "  Project:  ${PROJECT_ID}"
echo "  Region:   ${REGION}"
echo "  Service:  ${SERVICE_NAME}"
echo "  URL:      ${SERVICE_URL}"
echo ""
echo "Next Steps:"
echo "  1. Test the frontend in your browser"
echo "  2. Check logs: gcloud run logs read ${SERVICE_NAME} --region ${REGION} --project ${PROJECT_ID}"
echo "  3. Monitor: https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}"
echo ""
