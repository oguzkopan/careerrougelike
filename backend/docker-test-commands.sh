#!/bin/bash
# Docker Testing Commands
# Run these commands to test the Docker deployment locally

echo "=== Docker Build Test ==="
echo "Building Docker image..."
docker build -t career-rl-backend backend/

echo ""
echo "=== Docker Run Test ==="
echo "Starting container (requires .env file)..."
docker run -p 8080:8080 --env-file backend/.env career-rl-backend &
CONTAINER_PID=$!

echo "Waiting for container to start..."
sleep 5

echo ""
echo "=== Endpoint Tests ==="

echo "Testing health endpoint..."
curl -X GET http://localhost:8080/health

echo ""
echo "Testing session creation..."
curl -X POST http://localhost:8080/sessions \
  -H "Content-Type: application/json" \
  -d '{"profession": "ios_engineer", "level": 3}'

echo ""
echo "=== Cleanup ==="
echo "Stopping container..."
kill $CONTAINER_PID

echo ""
echo "Docker tests complete!"
