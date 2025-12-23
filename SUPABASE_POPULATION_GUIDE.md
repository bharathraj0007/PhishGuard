# Supabase Bulk Data Population Guide

This guide explains how to populate your Supabase database with comprehensive test data using the bulk population script.

## Quick Start

### 1. Set Environment Variables

The script requires your Supabase credentials. Make sure these are set in your `.env.local` file:

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

You can find these values in:
- **SUPABASE_URL**: Supabase project settings → API
- **SUPABASE_SERVICE_ROLE_KEY**: Supabase project settings → API → Service Role Key (keep secret!)

### 2. Run the Population Script

```bash
node scripts/populate-supabase.js
```

The script will:
- Create 25 test users with varied roles
- Create 8 training datasets (2 each for url, email, sms, qr)
- Add 400 phishing scans across all scan types
- Generate 2,500 training records for model training
- Create 8 model versions (2 each for url, email, sms, qr)
- Create 32 model tests with metrics and results

### 3. Monitor Progress

The script outputs progress for each table:

```
Starting Supabase bulk population...

Creating 25 test users...
✓ Created 25 users
Creating 8 training datasets...
✓ Created 8 training datasets
Creating 400 phishing scans...
✓ Created 400 phishing scans
Creating 2500 training records...
  Batch 1: 500 records
  Batch 2: 500 records
  ...
✓ Created 2500 training records total
Creating 8 model versions...
✓ Created 8 model versions
Creating 32 model tests...
✓ Created 32 model tests

✓ All data population completed successfully!
```

## What Gets Created

### Users (25)
- Random email addresses from various domains (gmail.com, yahoo.com, outlook.com, etc.)
- Display names with first and last names
- Mix of 'user' and 'admin' roles
- All email-verified with hashed passwords
- Created within last 30 days

### Training Datasets (8)
- 2 URL datasets
- 2 Email datasets
- 2 SMS datasets
- 2 QR code datasets
- Record counts: 500-1000 per dataset
- Status: 'active'

### Phishing Scans (400)
- Randomly distributed across all 4 scan types
- 60% phishing, 40% legitimate
- Threat levels: low, medium, high, critical (for phishing)
- Confidence scores: 0.7-1.0 (phishing), 0.1-0.4 (legitimate)
- Real-looking content (URLs, emails, SMS, QR data)
- Associated with random users
- Created within last 60 days

### Training Records (2,500)
- Distributed across all 8 datasets
- Inserted in batches of 500 for efficiency
- Content matches dataset type
- Mixed phishing (60%) and legitimate (40%)
- Threat levels for phishing records
- Realistic indicators and notes
- Created within last 90 days

### Model Versions (8)
- 2 versions each for url, email, sms, qr
- Realistic metrics (accuracy: 85-99%, precision, recall, f1_score)
- Training configurations (algorithms: BERT, BiLSTM, CNN)
- Training durations: 5-65 minutes
- Only 1 version per model type is marked as active
- Training timestamps within last 90 days

### Model Tests (32)
- 4 tests per model version
- Various test types: accuracy, precision, recall, f1_score, adversarial, performance
- All tests marked as 'completed'
- Test metrics with accuracy, false positive/negative rates
- Real-looking test results (80-100% pass rate)
- Completed within last 30 days

### System Settings (3)
- max_scans_per_hour: 100
- email_verification_enabled: true
- model_auto_training_enabled: true

## Data Distribution

### Scan Types (All datasets)
```
- URL phishing: ~100 scans
- Email phishing: ~100 scans
- SMS phishing: ~100 scans
- QR phishing: ~100 scans
```

### Threat Levels (Phishing records only)
```
- Low: ~10%
- Medium: ~30%
- High: ~40%
- Critical: ~20%
```

### Confidence Scores
```
- Phishing: 0.70 - 1.00 (high confidence)
- Legitimate: 0.10 - 0.40 (low false positives)
```

## Advanced Options

### Customize Population Counts

You can modify the script to create different amounts of data:

```javascript
// In populate-supabase.js, adjust these calls:
const users = await populateUsers(50);          // Create 50 users instead of 25
const datasets = await populateTrainingDatasets(users, 12); // 12 datasets
await populatePhishingScans(users, 1000);       // 1000 scans
await populateTrainingRecords(datasets, 5000);  // 5000 training records
const modelVersions = await populateModelVersions(datasets, users, 12); // 12 versions
await populateModelTests(modelVersions, datasets, users, 64); // 64 tests
```

### Batch Size Adjustment

For very large datasets, adjust the batch size in `populateTrainingRecords`:

```javascript
for (let i = 0; i < records.length; i += 1000) { // Change 500 to 1000 or 2000
```

## Troubleshooting

### "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required"
- Check that your `.env.local` file contains both environment variables
- Ensure they're not quoted or have extra spaces

### "HTTP 401: Unauthorized"
- Verify your SUPABASE_SERVICE_ROLE_KEY is correct
- Don't use the anon key (it has limited permissions)
- Check that the key hasn't been rotated

### "HTTP 400: Bad Request"
- Check that column names match your Supabase schema
- Ensure all required fields are included
- Look for data type mismatches (e.g., string vs integer)

### "HTTP 409: Conflict"
- Run the script once per environment
- If re-running, delete the data first or handle duplicates

### Partial Data Creation
- The script creates datasets before training records
- Training records depend on datasets existing first
- If interrupted, resume by running again (duplicates may occur)

## Verification

After running the script, verify data in Supabase:

1. Go to Supabase Dashboard → SQL Editor
2. Run verification queries:

```sql
-- Check users
SELECT COUNT(*) as user_count FROM users;
-- Expected: 25

-- Check datasets
SELECT COUNT(*) as dataset_count FROM training_datasets;
-- Expected: 8

-- Check phishing scans
SELECT COUNT(*) as scan_count FROM phishing_scans;
-- Expected: 400

-- Check training records
SELECT COUNT(*) as record_count FROM training_records;
-- Expected: 2500

-- Check model versions
SELECT COUNT(*) as version_count FROM model_versions;
-- Expected: 8

-- Check model tests
SELECT COUNT(*) as test_count FROM model_tests;
-- Expected: 32

-- Check distribution by scan type
SELECT scan_type, COUNT(*) FROM phishing_scans GROUP BY scan_type;
```

## Data Freshness

All timestamps are generated relative to the current time:
- Users: Last 30 days
- Phishing scans: Last 60 days
- Training records: Last 90 days
- Model versions: Last 90 days
- Model tests: Last 60 days
- System settings: Created 90 days ago

This provides realistic time distribution for testing analytics, reporting, and time-range filtering.

## Performance Notes

- Creating 2,500 training records in batches of 500 takes ~10-30 seconds
- Total execution time: ~1-2 minutes
- Network dependent: May be slower on slower connections
- No database locks or conflicts with normal operations

## Next Steps

After population:

1. **Test Queries**: Write and test SQL queries on the new data
2. **API Integration**: Test API endpoints with realistic data
3. **Dashboard**: View analytics with populated data
4. **Model Training**: Use training records for ML model training
5. **Performance Testing**: Test application under data load

## Cleanup

To remove all populated data and start fresh:

```sql
-- Delete all data (be careful!)
DELETE FROM model_tests;
DELETE FROM model_versions;
DELETE FROM training_records;
DELETE FROM training_datasets;
DELETE FROM phishing_scans;
DELETE FROM system_settings;
DELETE FROM users;
```

Then re-run the population script to repopulate with fresh data.

---

For more information, see:
- [Supabase REST API Documentation](https://supabase.com/docs/guides/api)
- [Supabase Authentication Guide](https://supabase.com/docs/guides/auth)
- [Project Database Schema](./supabase-schema.sql)
