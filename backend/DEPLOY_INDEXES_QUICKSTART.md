# Firestore Indexes - Quick Start

## 🚀 Deploy Indexes in 3 Steps

### Step 1: Navigate to Backend
```bash
cd backend
```

### Step 2: Run Deployment Script
```bash
./deploy-firestore-indexes.sh
```

### Step 3: Wait for Completion
⏳ Takes 2-5 minutes

---

## ✅ Verify Deployment

### Check Status
```bash
gcloud firestore indexes list --project=careerrogue-4df28
```

### Or Visit Console
https://console.firebase.google.com/project/careerrogue-4df28/firestore/indexes

---

## 🔧 Troubleshooting

### Not Authenticated?
```bash
gcloud auth login
gcloud config set project careerrogue-4df28
```

### Script Not Executable?
```bash
chmod +x deploy-firestore-indexes.sh
```

### Manual Deployment?
```bash
gcloud firestore indexes create \
  --project=careerrogue-4df28 \
  --file=firestore.indexes.json
```

---

## 📋 What Gets Created

1. **Tasks Index** - For work dashboard queries
2. **Jobs Index** - For job listings queries  
3. **Sessions Index** - For user session queries

---

## ⏱️ Timeline

| Step | Time |
|------|------|
| Run script | 10 seconds |
| Index building | 2-5 minutes |
| **Total** | **~5 minutes** |

---

## 🆘 Need Help?

See full documentation: `FIRESTORE_INDEXES.md`

