# Firestore Index Setup - Complete Guide

## Quick Summary

Your application needs Firestore indexes to query tasks, jobs, and sessions efficiently. Without these indexes, the work dashboard and job search will fail with 500 errors.

---

## 🚀 Quick Setup (5 minutes)

### Option 1: Automated Script (Recommended)

```bash
cd backend
./deploy-firestore-indexes.sh
```

Wait 2-5 minutes for indexes to build, then test your app!

### Option 2: Manual via Console

Click this link and press "Create Index":
```
https://console.firebase.google.com/v1/r/project/careerrogue-4df28/firestore/indexes?create_composite=Ck9wcm9qZWN0cy9jYXJlZXJyb2d1ZS00ZGYyOC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvdGFza3MvaW5kZXhlcy9fEAEaDgoKc2Vzc2lvbl9pZBABGgoKBnN0YXR1cxABGg4KCmNyZWF0ZWRfYXQQARoMCghfX25hbWVfXxAB
```

---

## 📁 Files Created

### 1. `backend/firestore.indexes.json`
**Purpose**: Index configuration file  
**Contains**: Definitions for all required indexes

### 2. `backend/deploy-firestore-indexes.sh`
**Purpose**: Automated deployment script  
**Usage**: `./deploy-firestore-indexes.sh`

### 3. `backend/FIRESTORE_INDEXES.md`
**Purpose**: Complete documentation  
**Contains**: Detailed guide, troubleshooting, best practices

### 4. `backend/DEPLOY_INDEXES_QUICKSTART.md`
**Purpose**: Quick reference card  
**Contains**: Essential commands and steps

---

## 🔍 What Indexes Are Created

### 1. Tasks Index
**For**: Work Dashboard  
**Query**: Get active tasks for a session  
**Fields**: `session_id`, `status`, `created_at`

### 2. Jobs Index
**For**: Job Search Page  
**Query**: Get available jobs for a session  
**Fields**: `session_id`, `status`, `created_at`

### 3. Sessions Index
**For**: User Management  
**Query**: Get user's sessions  
**Fields**: `user_id`, `created_at`

---

## ✅ Verification Steps

### 1. Check Deployment Status

```bash
gcloud firestore indexes list --project=careerrogue-4df28
```

Look for status: **Enabled** (not "Building")

### 2. Test in Firebase Console

Visit: https://console.firebase.google.com/project/careerrogue-4df28/firestore/indexes

All indexes should show 🟢 **Enabled**

### 3. Test Your Application

1. Create a new session
2. Complete an interview
3. Accept a job offer
4. **Work dashboard should load** ✅
5. **Tasks should appear** ✅

---

## 🐛 Troubleshooting

### Error: "The query requires an index"

**Symptom**: Work dashboard shows "AI service temporarily unavailable"

**Solution**:
1. Check if indexes are building:
   ```bash
   gcloud firestore indexes list --project=careerrogue-4df28
   ```
2. If status is "Building", wait 2-5 more minutes
3. If no indexes exist, run deployment script
4. Refresh your application after indexes are ready

### Error: "gcloud: command not found"

**Solution**: Install gcloud CLI
```bash
# macOS
brew install --cask google-cloud-sdk

# Or download from:
# https://cloud.google.com/sdk/docs/install
```

### Error: "You do not currently have an active account"

**Solution**: Authenticate
```bash
gcloud auth login
gcloud config set project careerrogue-4df28
```

### Indexes Taking Too Long

**Normal**: 2-5 minutes  
**If > 10 minutes**: Check Firebase Console for errors

---

## 📊 Index Status Meanings

| Status | Meaning | Action |
|--------|---------|--------|
| 🟢 **Enabled** | Ready to use | None - working! |
| 🟡 **Building** | Creating index | Wait 2-5 minutes |
| 🔴 **Error** | Creation failed | Check console, retry |
| ⚪ **Not Found** | Doesn't exist | Deploy indexes |

---

## 🔄 Updating Indexes

### When to Update
- Adding new query patterns
- Changing sort orders
- Optimizing performance

### How to Update
1. Edit `backend/firestore.indexes.json`
2. Run `./deploy-firestore-indexes.sh`
3. Wait for new indexes to build
4. Test your queries

---

## 📚 Documentation

### Quick Reference
- `backend/DEPLOY_INDEXES_QUICKSTART.md` - Essential commands

### Complete Guide
- `backend/FIRESTORE_INDEXES.md` - Full documentation

### Configuration
- `backend/firestore.indexes.json` - Index definitions

---

## 🎯 Success Checklist

- [ ] Indexes deployed
- [ ] Status shows "Enabled"
- [ ] Work dashboard loads
- [ ] Tasks appear
- [ ] Job search works
- [ ] No console errors

---

## 💡 Pro Tips

1. **Deploy indexes before deploying backend** - Prevents runtime errors
2. **Check index status before testing** - Save time debugging
3. **Keep firestore.indexes.json in version control** - Track changes
4. **Document custom indexes** - Help future developers

---

## 🆘 Need More Help?

1. **Quick Start**: `backend/DEPLOY_INDEXES_QUICKSTART.md`
2. **Full Guide**: `backend/FIRESTORE_INDEXES.md`
3. **Firebase Console**: https://console.firebase.google.com/project/careerrogue-4df28/firestore/indexes
4. **Backend Logs**: Cloud Run console

---

## 📞 Support Resources

- [Firestore Indexes Documentation](https://firebase.google.com/docs/firestore/query-data/indexing)
- [gcloud CLI Reference](https://cloud.google.com/sdk/gcloud/reference/firestore/indexes)
- [Firebase Console](https://console.firebase.google.com)

---

**Created**: 2025-11-06  
**Project**: Career Roguelike  
**Status**: ✅ Ready to Deploy

