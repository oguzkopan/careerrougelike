# Firestore Indexes Guide

## Overview

This document explains the Firestore indexes required for the Career Roguelike application and how to deploy them.

---

## Required Indexes

### 1. Tasks Index
**Purpose**: Query tasks by session and status, ordered by creation date

**Fields**:
- `session_id` (Ascending)
- `status` (Ascending)
- `created_at` (Ascending)

**Used By**:
- `GET /sessions/{session_id}/tasks` - Fetch active tasks for a session
- Work Dashboard - Display current tasks

**Query Example**:
```python
tasks = db.collection('tasks') \
    .where('session_id', '==', session_id) \
    .where('status', '==', 'pending') \
    .order_by('created_at', 'ASCENDING') \
    .limit(10) \
    .get()
```

---

### 2. Jobs Index
**Purpose**: Query jobs by session and status, ordered by creation date

**Fields**:
- `session_id` (Ascending)
- `status` (Ascending)
- `created_at` (Descending)

**Used By**:
- `GET /sessions/{session_id}/jobs/generate` - Fetch job listings
- `POST /sessions/{session_id}/jobs/refresh` - Refresh job listings
- Job Search page

**Query Example**:
```python
jobs = db.collection('jobs') \
    .where('session_id', '==', session_id) \
    .where('status', '==', 'active') \
    .order_by('created_at', 'DESCENDING') \
    .limit(10) \
    .get()
```

---

### 3. Sessions Index
**Purpose**: Query sessions by user, ordered by creation date

**Fields**:
- `user_id` (Ascending)
- `created_at` (Descending)

**Used By**:
- User session management
- Multi-session support (future feature)

**Query Example**:
```python
sessions = db.collection('sessions') \
    .where('user_id', '==', user_id) \
    .order_by('created_at', 'DESCENDING') \
    .limit(10) \
    .get()
```

---

## Deployment Methods

### Method 1: Automated Script (Recommended)

```bash
cd backend
./deploy-firestore-indexes.sh
```

**What it does**:
1. Validates gcloud CLI is installed
2. Checks if index file exists
3. Confirms deployment with user
4. Deploys indexes to Firestore
5. Provides status check instructions

**Requirements**:
- gcloud CLI installed
- Authenticated with Google Cloud
- Project set to `careerrogue-4df28`

---

### Method 2: Manual Deployment via gcloud

```bash
cd backend
gcloud firestore indexes create \
  --project=careerrogue-4df28 \
  --file=firestore.indexes.json
```

---

### Method 3: Firebase Console (Manual)

1. Go to [Firebase Console](https://console.firebase.google.com/project/careerrogue-4df28/firestore/indexes)
2. Click "Add Index"
3. For each index, configure:

#### Tasks Index
- Collection ID: `tasks`
- Fields:
  - `session_id` → Ascending
  - `status` → Ascending
  - `created_at` → Ascending
- Query scope: Collection

#### Jobs Index
- Collection ID: `jobs`
- Fields:
  - `session_id` → Ascending
  - `status` → Ascending
  - `created_at` → Descending
- Query scope: Collection

#### Sessions Index
- Collection ID: `sessions`
- Fields:
  - `user_id` → Ascending
  - `created_at` → Descending
- Query scope: Collection

---

## Checking Index Status

### Via Firebase Console
Visit: https://console.firebase.google.com/project/careerrogue-4df28/firestore/indexes

**Status Indicators**:
- 🟢 **Enabled** - Index is ready to use
- 🟡 **Building** - Index is being created (2-5 minutes)
- 🔴 **Error** - Index creation failed

### Via gcloud CLI

```bash
# List all indexes
gcloud firestore indexes list --project=careerrogue-4df28

# Watch index creation progress
watch -n 5 'gcloud firestore indexes list --project=careerrogue-4df28'
```

---

## Troubleshooting

### Error: "gcloud: command not found"

**Solution**: Install gcloud CLI
```bash
# macOS (Homebrew)
brew install --cask google-cloud-sdk

# Or download from:
# https://cloud.google.com/sdk/docs/install
```

### Error: "You do not currently have an active account selected"

**Solution**: Authenticate with gcloud
```bash
gcloud auth login
gcloud config set project careerrogue-4df28
```

### Error: "Index already exists"

**Solution**: This is fine! The index is already deployed.

To verify:
```bash
gcloud firestore indexes list --project=careerrogue-4df28
```

### Error: "The query requires an index"

**Symptoms**:
- Backend logs show: "400 The query requires an index"
- Work dashboard shows "AI service temporarily unavailable"
- Tasks don't load

**Solution**:
1. Check if indexes are building:
   ```bash
   gcloud firestore indexes list --project=careerrogue-4df28
   ```

2. If no indexes exist, deploy them:
   ```bash
   cd backend
   ./deploy-firestore-indexes.sh
   ```

3. Wait 2-5 minutes for indexes to build

4. Refresh your application

### Index Building Takes Too Long

**Normal**: Index creation typically takes 2-5 minutes

**If longer than 10 minutes**:
1. Check Firebase Console for errors
2. Verify Firestore has data in the collections
3. Check Cloud Console for quota issues
4. Try deleting and recreating the index

---

## Index Maintenance

### When to Update Indexes

Update indexes when:
- Adding new query patterns
- Changing sort orders
- Adding new filter fields
- Optimizing query performance

### How to Update Indexes

1. Edit `firestore.indexes.json`
2. Run deployment script:
   ```bash
   cd backend
   ./deploy-firestore-indexes.sh
   ```
3. Wait for new indexes to build
4. Old indexes will be automatically removed if unused

### Deleting Unused Indexes

```bash
# List indexes with their IDs
gcloud firestore indexes list --project=careerrogue-4df28

# Delete specific index
gcloud firestore indexes delete <INDEX_ID> --project=careerrogue-4df28
```

---

## Performance Considerations

### Index Size
- Each index adds storage overhead
- Indexes are updated on every write
- More indexes = slower writes, faster reads

### Query Optimization
- Use indexes for frequently-run queries
- Avoid over-indexing rarely-used queries
- Monitor index usage in Firebase Console

### Best Practices
1. ✅ Index fields used in `where()` clauses
2. ✅ Index fields used in `order_by()` clauses
3. ✅ Combine multiple filters in one index
4. ❌ Don't index every field
5. ❌ Don't create duplicate indexes

---

## Testing Indexes

### Verify Index is Working

```python
# In Python (backend)
from google.cloud import firestore

db = firestore.Client()

# This query should work without errors
tasks = db.collection('tasks') \
    .where('session_id', '==', 'test-session') \
    .where('status', '==', 'pending') \
    .order_by('created_at', 'ASCENDING') \
    .limit(10) \
    .get()

print(f"Found {len(list(tasks))} tasks")
```

### Test via API

```bash
# Create a session
SESSION_ID=$(curl -s -X POST https://career-rl-backend-1086514937351.europe-west1.run.app/sessions \
  -H "Content-Type: application/json" \
  -d '{"profession": "ios_engineer", "level": 1}' | jq -r '.session_id')

# Try to fetch tasks (should work after index is ready)
curl https://career-rl-backend-1086514937351.europe-west1.run.app/sessions/$SESSION_ID/tasks
```

---

## Index Configuration File

The `firestore.indexes.json` file follows the [Firestore Index Configuration Format](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.collectionGroups.indexes).

### Structure

```json
{
  "indexes": [
    {
      "collectionGroup": "collection_name",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "field_name",
          "order": "ASCENDING" | "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

### Adding New Indexes

1. Edit `firestore.indexes.json`
2. Add new index to `indexes` array
3. Run deployment script
4. Wait for index to build
5. Test your queries

---

## FAQ

### Q: How long does index creation take?
**A**: Typically 2-5 minutes, but can take longer for large datasets.

### Q: Can I use the app while indexes are building?
**A**: No, queries requiring the index will fail until it's ready.

### Q: Do I need to redeploy my backend after creating indexes?
**A**: No, indexes are separate from your application code.

### Q: What happens if I delete an index?
**A**: Queries using that index will fail with "requires an index" error.

### Q: Can I have too many indexes?
**A**: Yes, each index adds overhead. Only create indexes for queries you actually use.

### Q: How do I know which indexes I need?
**A**: Firestore will tell you! Error messages include a link to create the required index.

---

## Resources

- [Firestore Indexes Documentation](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Index Configuration Format](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.collectionGroups.indexes)
- [Query Limitations](https://firebase.google.com/docs/firestore/query-data/queries#query_limitations)
- [Best Practices](https://firebase.google.com/docs/firestore/best-practices)

---

## Support

If you encounter issues:
1. Check this guide's troubleshooting section
2. Review backend logs in Cloud Run
3. Check Firebase Console for index status
4. Verify gcloud authentication and project settings

---

**Last Updated**: 2025-11-06  
**Project**: Career Roguelike  
**Project ID**: careerrogue-4df28

