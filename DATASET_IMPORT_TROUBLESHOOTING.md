# Dataset Import Troubleshooting Guide

## Why Can't I See Any Datasets?

The PhishGuard database starts **empty by default**. You need to import datasets first before they will appear in the database.

### Quick Fix

1. **Login to Admin Dashboard** at `/admin`
   - Default credentials: `admin` / `admin123`

2. **Navigate to the "Datasets" tab**
   - Click on the "Datasets" tab in the admin navigation

3. **Import Datasets**
   - Click the **"Import All Datasets"** button to import all 4 detection types at once
   - OR click individual **"Import & Train"** buttons for specific types

4. **Wait for Import to Complete**
   - The import process takes 2-5 minutes per dataset
   - Progress bars show real-time status
   - You'll see: Downloading → Processing → Training → Completed

5. **Verify Import Success**
   - Dataset statistics will appear at the top
   - Each card shows import status and record count
   - Check for green "Completed" badges

---

## What Gets Imported?

### 4 Detection Types with Real Kaggle Datasets:

| Type | Dataset Source | Records | Description |
|------|---------------|---------|-------------|
| **URL** | GitHub/Kaggle | ~1000 | Malicious URLs and legitimate links |
| **Email** | Enron Spam Dataset | ~1000 | Phishing emails and legitimate messages |
| **SMS** | SMS Spam Collection | ~1000 | SMS spam and normal messages |
| **QR** | Generated | 200 | Phishing QR codes and safe QR codes |

---

## Database Tables

After import, you'll have data in these tables:

### 1. `training_datasets`
Stores metadata about each imported dataset:
```sql
SELECT * FROM training_datasets;
```

**Expected columns:**
- `id`: Unique dataset ID
- `name`: Dataset name (e.g., "URL Kaggle Dataset")
- `dataset_type`: Type (url/email/sms/qr)
- `record_count`: Number of training records
- `status`: Import status (completed/importing/failed)
- `created_at`: Import timestamp

### 2. `training_records`
Stores individual phishing samples:
```sql
SELECT * FROM training_records LIMIT 10;
```

**Expected columns:**
- `id`: Unique record ID
- `dataset_id`: Parent dataset ID
- `content`: URL/email/sms content
- `scan_type`: Detection type
- `is_phishing`: 1 (phishing) or 0 (safe)
- `threat_level`: dangerous/warning/safe
- `indicators`: JSON array of threat indicators

---

## Verify Import Manually

### Check Dataset Count
```sql
SELECT 
  dataset_type,
  COUNT(*) as dataset_count,
  SUM(record_count) as total_records
FROM training_datasets
WHERE status = 'completed'
GROUP BY dataset_type;
```

**Expected Output:**
```
dataset_type | dataset_count | total_records
-------------|---------------|---------------
url          | 1             | 1000
email        | 1             | 1000
sms          | 1             | 1000
qr           | 1             | 200
```

### Check Training Records
```sql
SELECT 
  scan_type,
  is_phishing,
  COUNT(*) as count
FROM training_records
GROUP BY scan_type, is_phishing
ORDER BY scan_type, is_phishing;
```

**Expected Output:**
```
scan_type | is_phishing | count
----------|-------------|-------
email     | 0           | ~500
email     | 1           | ~500
link      | 0           | ~500
link      | 1           | ~500
qr        | 0           | 100
qr        | 1           | 100
sms       | 0           | ~500
sms       | 1           | ~500
```

---

## Common Issues

### Issue 1: "No datasets" after import

**Cause:** Import may have failed silently

**Solution:**
1. Click "Refresh Status" button
2. Check browser console for errors (F12)
3. Try importing individual datasets one at a time
4. Verify edge function is deployed: `kaggle-import`

### Issue 2: Import stuck at "Importing..."

**Cause:** Network timeout or edge function issue

**Solution:**
1. Wait 5 minutes - large datasets take time
2. Refresh the page
3. Click "Refresh Status" to check actual database state
4. Check edge function logs in admin panel

### Issue 3: Training fails after import

**Cause:** Dataset format issue or model training error

**Solution:**
1. Dataset will still be saved (check database)
2. Try training manually from "ML Models" tab
3. Review edge function logs for specific error
4. Re-import the specific dataset type

### Issue 4: Empty database after clicking import

**Cause:** Edge function not responding

**Solution:**
1. Verify edge function URL is correct in code
2. Check CORS settings (should allow all origins)
3. Test edge function directly:
   ```bash
   curl https://eky2mdxr--kaggle-import.functions.blink.new?action=sources
   ```
4. Redeploy edge function if needed

---

## Import Flow Diagram

```
User clicks "Import All Datasets"
  ↓
For each detection type:
  ↓
1. POST to kaggle-import edge function
   - Downloads CSV from Kaggle/GitHub
   - Processes rows into training records
   - Inserts into training_datasets table
   - Inserts into training_records table
  ↓
2. POST to ml-specialized-training edge function
   - Fetches training records from database
   - Extracts features for specific detection type
   - Trains TensorFlow.js model
   - Saves model metrics to model_versions table
  ↓
3. Update UI with results
   - Shows record count
   - Shows model accuracy
   - Displays "Completed" badge
```

---

## API Endpoints

### Kaggle Import Service
```
POST https://eky2mdxr--kaggle-import.functions.blink.new
Body: { "detectionType": "url", "datasetName": "URL Dataset" }

GET https://eky2mdxr--kaggle-import.functions.blink.new?action=status
Response: { "datasets": [...] }

GET https://eky2mdxr--kaggle-import.functions.blink.new?action=sources
Response: { "sources": {...} }
```

### ML Training Service
```
POST https://eky2mdxr--ml-specialized-training.functions.blink.new
Body: {
  "datasetId": "dataset_url_123",
  "detectionType": "url",
  "versionNumber": "v1.0",
  "config": { "epochs": 100, "batchSize": 32 }
}
```

---

## Expected Timeline

| Step | Duration | Status Indicator |
|------|----------|------------------|
| Download dataset | 30-60 sec | "Downloading dataset from Kaggle..." |
| Process records | 30-60 sec | "Imported X records. Starting training..." |
| Train model | 60-120 sec | "Training model..." (progress bar) |
| Save results | 5-10 sec | "Training completed! Accuracy: X%" |

**Total per dataset:** 2-4 minutes
**Total for all 4 types:** 8-16 minutes

---

## Still Having Issues?

1. **Check Browser Console** (F12 → Console tab)
   - Look for red error messages
   - Copy error text for debugging

2. **Check Network Tab** (F12 → Network tab)
   - Filter by "kaggle-import"
   - Check response status codes
   - Look for 500 errors or timeouts

3. **Check Edge Function Logs**
   - Go to Admin Dashboard → Settings
   - Find function logs section
   - Look for errors during import

4. **Manual Database Inspection**
   - Go to Admin Dashboard → Database tab
   - Run SQL queries above
   - Verify table structure matches schema

5. **Contact Support**
   - Provide browser console errors
   - Provide network request details
   - Describe exact steps taken
   - Mention which dataset type failed

---

## Success Indicators

✅ Dataset statistics cards show record counts
✅ Import cards show green "Completed" badges
✅ Progress bars reach 100%
✅ Toast notifications show success messages
✅ Model accuracy metrics displayed (>70%)
✅ Database queries return expected row counts

---

## Next Steps After Import

Once datasets are imported:

1. **Test the Scanner**
   - Go to Scanner page
   - Try scanning a suspicious URL
   - Verify ML model is being used

2. **Review Model Performance**
   - Go to "ML Models" tab
   - Check accuracy metrics
   - Review training history

3. **Add Custom Training Data**
   - Go to "ML Training" tab
   - Upload your own labeled datasets
   - Retrain models with custom data

4. **Monitor Scan Activity**
   - Go to "Scans" tab
   - Review detection results
   - Identify false positives/negatives
