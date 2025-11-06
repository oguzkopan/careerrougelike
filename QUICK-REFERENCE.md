# Quick Reference Card

## 🚀 Common Commands

### Deploy Frontend
```bash
./quick-deploy-frontend.sh              # Quick deploy
./deploy-frontend.sh                    # Full deploy with health check
./deploy-frontend.sh --skip-build       # Deploy only (use existing image)
```

### Deploy Backend
```bash
cd backend
./quick-deploy.sh                       # Quick deploy
./deploy-cloud-build.sh                 # Full deploy
```

### Test Deployment
```bash
./test-deployed-frontend.sh             # Test frontend + backend integration
```

### Local Development
```bash
npm install                             # Install dependencies
npm run dev                             # Start dev server (port 3000)
npm run build                           # Build for production
npm run preview                         # Preview production build (port 4173)
```

### View Logs
```bash
# Frontend logs
gcloud run logs read career-rl-frontend --region europe-west1 --project careerrogue-4df28

# Backend logs
gcloud run logs read career-rl-backend --region europe-west1 --project careerrogue-4df28

# Follow logs (live)
gcloud run logs tail career-rl-frontend --region europe-west1 --project careerrogue-4df28
```

### Service Management
```bash
# List services
gcloud run services list --region europe-west1 --project careerrogue-4df28

# Describe service
gcloud run services describe career-rl-frontend --region europe-west1 --project careerrogue-4df28

# Delete service
gcloud run services delete career-rl-frontend --region europe-west1 --project careerrogue-4df28
```

## 🌐 URLs

- **Frontend**: https://career-rl-frontend-1086514937351.europe-west1.run.app
- **Backend**: https://career-rl-backend-1086514937351.europe-west1.run.app
- **Frontend Health**: https://career-rl-frontend-1086514937351.europe-west1.run.app/health
- **Backend Health**: https://career-rl-backend-1086514937351.europe-west1.run.app/health

## 📁 Important Files

### Configuration
- `.env` - Environment variables (not in git)
- `.env.example` - Environment template
- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript configuration

### Docker
- `Dockerfile` - Frontend Docker build
- `nginx.conf` - Nginx server config
- `.dockerignore` - Docker ignore rules
- `cloudbuild.yaml` - Cloud Build config

### Deployment
- `deploy-frontend.sh` - Full deployment script
- `quick-deploy-frontend.sh` - Quick deployment
- `test-deployed-frontend.sh` - Testing script

### Documentation
- `README.md` - Main documentation
- `FRONTEND-DEPLOYMENT.md` - Deployment guide
- `DEPLOYMENT-VERIFICATION.md` - Deployment status
- `CLEANUP-SUMMARY.md` - Cleanup details

## 🔧 Troubleshooting

### Frontend shows blank page
```bash
# Check browser console for errors
# Verify backend URL in .env
# Rebuild and redeploy
npm run build
./quick-deploy-frontend.sh
```

### CORS errors
```bash
# Check backend CORS config in backend/gateway/main.py
# Verify frontend URL is in allowed_origins
# Redeploy backend
cd backend && ./quick-deploy.sh
```

### Build fails
```bash
# Clean and reinstall
rm -rf node_modules dist
npm install
npm run build
```

### Deployment fails
```bash
# Check authentication
gcloud auth login
gcloud config set project careerrogue-4df28

# Check permissions
gcloud projects get-iam-policy careerrogue-4df28
```

## 📊 Monitoring

### Cloud Console
- Frontend: https://console.cloud.google.com/run/detail/europe-west1/career-rl-frontend?project=careerrogue-4df28
- Backend: https://console.cloud.google.com/run/detail/europe-west1/career-rl-backend?project=careerrogue-4df28

### Metrics
```bash
# Get service metrics
gcloud run services describe career-rl-frontend \
  --region europe-west1 \
  --project careerrogue-4df28 \
  --format="value(status.traffic)"
```

## 🔐 Environment Variables

### Frontend (.env)
```bash
VITE_BACKEND_URL=https://career-rl-backend-1086514937351.europe-west1.run.app
VITE_GOOGLE_API_KEY=your-api-key-here
VITE_FIREBASE_PROJECT_ID=careerrogue-4df28
VITE_FIREBASE_PROJECT_NUMBER=1086514937351
```

### Backend (backend/.env)
```bash
PROJECT_ID=careerrogue-4df28
GOOGLE_API_KEY=your-api-key-here
USE_VERTEX_AI=false
```

## 💰 Cost Management

### Check Current Costs
```bash
# View billing
gcloud billing accounts list
gcloud billing projects describe careerrogue-4df28
```

### Optimize Costs
- Services scale to zero (min-instances=0)
- Right-sized resources (512Mi frontend, 1Gi backend)
- Efficient Docker images (Alpine Linux)

## 🎯 Quick Fixes

### Update frontend code
```bash
# Edit files
# Then deploy
./quick-deploy-frontend.sh
```

### Update backend code
```bash
cd backend
# Edit files
./quick-deploy.sh
```

### Rollback deployment
```bash
# List revisions
gcloud run revisions list --service career-rl-frontend --region europe-west1 --project careerrogue-4df28

# Rollback
gcloud run services update-traffic career-rl-frontend \
  --to-revisions REVISION_NAME=100 \
  --region europe-west1 \
  --project careerrogue-4df28
```

## 📚 Documentation Links

- [Frontend Deployment Guide](FRONTEND-DEPLOYMENT.md)
- [Backend README](backend/README.md)
- [Deployment Verification](DEPLOYMENT-VERIFICATION.md)
- [Cleanup Summary](CLEANUP-SUMMARY.md)
- [Test Checklist](DEPLOYMENT-TEST-CHECKLIST.md)

## 🆘 Getting Help

1. Check documentation files above
2. Review Cloud Run logs
3. Run test script: `./test-deployed-frontend.sh`
4. Check Cloud Console for errors
5. Review git history for recent changes
