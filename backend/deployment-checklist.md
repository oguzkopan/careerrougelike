# Cloud Run Deployment Checklist

Use this checklist to track your deployment progress.

## Pre-Deployment

- [ ] Install gcloud CLI: https://cloud.google.com/sdk/docs/install
- [ ] Install Docker: https://docs.docker.com/get-docker/
- [ ] Have a Google Cloud Project ready
- [ ] Have a Gemini API key ready
- [ ] Configure `.env` file with PROJECT_ID and GOOGLE_API_KEY

## Task 7.1: Set Up GCP Project ✅

- [ ] Enable Cloud Run API
  ```bash
  gcloud services enable run.googleapis.com
  ```

- [ ] Enable Firestore API
  ```bash
  gcloud services enable firestore.googleapis.com
  ```

- [ ] Enable Artifact Registry API
  ```bash
  gcloud services enable artifactregistry.googleapis.com
  ```

- [ ] Create Artifact Registry repository
  ```bash
  gcloud artifacts repositories create career-rl \
    --repository-format=docker \
    --location=europe-west1
  ```

- [ ] Create Firestore database (Native mode)
  - Go to: https://console.cloud.google.com/firestore
  - Click "Create Database"
  - Select "Native mode"
  - Choose location: europe-west1
  - Click "Create"

**Quick command**: Run `./gcp-setup.sh` to automate all above steps

## Task 7.2: Build and Push Docker Image

- [ ] Authenticate with Artifact Registry
  ```bash
  gcloud auth configure-docker europe-west1-docker.pkg.dev
  ```

- [ ] Build Docker image
  ```bash
  cd backend
  docker build -t career-rl-backend .
  ```

- [ ] Tag image for Artifact Registry
  ```bash
  docker tag career-rl-backend \
    europe-west1-docker.pkg.dev/PROJECT_ID/career-rl/backend:latest
  ```
  Replace PROJECT_ID with your actual project ID

- [ ] Push image to Artifact Registry
  ```bash
  docker push europe-west1-docker.pkg.dev/PROJECT_ID/career-rl/backend:latest
  ```

**Quick command**: Run `./deploy.sh` to automate build, tag, push, and deploy

## Task 7.3: Deploy to Cloud Run

- [ ] Deploy service with configuration
  ```bash
  gcloud run deploy career-rl-backend \
    --image europe-west1-docker.pkg.dev/PROJECT_ID/career-rl/backend:latest \
    --region europe-west1 \
    --platform managed \
    --allow-unauthenticated \
    --set-env-vars GOOGLE_API_KEY=xxx,PROJECT_ID=xxx,FIRESTORE_DB="(default)" \
    --min-instances 0 \
    --max-instances 10 \
    --memory 1Gi \
    --cpu 2
  ```

- [ ] Get deployed service URL
  ```bash
  gcloud run services describe career-rl-backend \
    --region europe-west1 \
    --format 'value(status.url)'
  ```

- [ ] Save service URL for testing

**Quick command**: Included in `./deploy.sh`

## Task 7.4: Test Deployed Service

- [ ] Test health endpoint
  ```bash
  curl https://your-service-url/health
  ```
  Expected: `{"status":"healthy"}`

- [ ] Test POST /sessions endpoint
  ```bash
  curl -X POST https://your-service-url/sessions \
    -H "Content-Type: application/json" \
    -d '{"profession": "ios_engineer", "level": 3}'
  ```
  Expected: `{"session_id":"sess-xxxxx"}`

- [ ] Test POST /sessions/{sid}/invoke endpoint
  ```bash
  curl -X POST https://your-service-url/sessions/SESSION_ID/invoke \
    -H "Content-Type: application/json" \
    -d '{"action": "interview", "data": {}}'
  ```
  Expected: Interview questions JSON

- [ ] Verify Firestore documents are created
  - Go to: https://console.cloud.google.com/firestore
  - Check "sessions" collection
  - Verify session documents exist

- [ ] Check Cloud Run logs for agent execution
  ```bash
  gcloud run services logs read career-rl-backend \
    --region europe-west1 \
    --limit 50
  ```
  Or view in console: https://console.cloud.google.com/run

**Quick command**: Run `./test-deployment.sh` to automate all tests

## Post-Deployment

- [ ] Update frontend API base URL to Cloud Run service URL
- [ ] Test end-to-end flow from frontend
- [ ] Monitor Cloud Run metrics
- [ ] Set up alerts (optional)
- [ ] Configure custom domain (optional)

## Verification Commands

Check service status:
```bash
gcloud run services describe career-rl-backend --region europe-west1
```

View recent logs:
```bash
gcloud run services logs read career-rl-backend --region europe-west1 --limit 20
```

Check Firestore:
```bash
gcloud firestore databases describe --project=PROJECT_ID
```

List deployed services:
```bash
gcloud run services list --region europe-west1
```

## Rollback (if needed)

List revisions:
```bash
gcloud run revisions list --service career-rl-backend --region europe-west1
```

Rollback to previous revision:
```bash
gcloud run services update-traffic career-rl-backend \
  --to-revisions REVISION_NAME=100 \
  --region europe-west1
```

## Clean Up (if needed)

Delete Cloud Run service:
```bash
gcloud run services delete career-rl-backend --region europe-west1
```

Delete Artifact Registry repository:
```bash
gcloud artifacts repositories delete career-rl \
  --location europe-west1
```

## Useful Links

- Cloud Run Console: https://console.cloud.google.com/run
- Firestore Console: https://console.cloud.google.com/firestore
- Artifact Registry: https://console.cloud.google.com/artifacts
- Cloud Logging: https://console.cloud.google.com/logs
- IAM & Admin: https://console.cloud.google.com/iam-admin

## Support

If you encounter issues:
1. Check Cloud Run logs
2. Verify environment variables are set correctly
3. Ensure Firestore is in Native mode
4. Verify GOOGLE_API_KEY is valid
5. Check IAM permissions

For detailed troubleshooting, see [DEPLOYMENT.md](./DEPLOYMENT.md)
