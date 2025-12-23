# Supabase Population Script - Quick Reference

## Command

```bash
node scripts/populate-supabase.js
```

## Requirements

Set in `.env.local`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

## Data Created

| Table | Count | Details |
|-------|-------|---------|
| **users** | 25 | Mixed roles (user/admin), verified emails |
| **training_datasets** | 8 | 2 each: url, email, sms, qr |
| **phishing_scans** | 400 | 100 each scan type, 60% phishing |
| **training_records** | 2,500 | Distributed across datasets |
| **model_versions** | 8 | 2 each: url, email, sms, qr |
| **model_tests** | 32 | 4 tests per model version |
| **system_settings** | 3 | Auto-training, email verification, rate limits |

## Sample Data

### Phishing Scans
- Content: Real URLs, email JSON, SMS messages, decoded QR codes
- Confidence: 0.70-1.00 (phishing), 0.10-0.40 (legitimate)
- Threat Levels: low, medium, high, critical

### Training Records
- Content matches dataset type
- 60% phishing, 40% legitimate
- Indicators: JSON array of realistic threat signals
- Notes: Automated descriptions

### Model Versions
- Algorithms: BERT (url/email), BiLSTM (sms), CNN (qr)
- Metrics: Accuracy 85-99%, Precision, Recall, F1
- Training duration: 5-65 minutes
- Status: All 'active', 1 per type marked as 'is_active'

## Execution Flow

```
1. Create 25 users
   ↓
2. Create 8 datasets  
   ↓
3. Create 400 phishing scans (uses users)
   ↓
4. Create 2,500 training records (uses datasets, batched)
   ↓
5. Create 8 model versions (uses datasets)
   ↓
6. Create 32 model tests (uses model versions & datasets)
   ↓
✓ Complete (~1-2 minutes)
```

## Verify Data

```sql
-- Check counts
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'datasets', COUNT(*) FROM training_datasets
UNION ALL
SELECT 'scans', COUNT(*) FROM phishing_scans
UNION ALL
SELECT 'records', COUNT(*) FROM training_records
UNION ALL
SELECT 'versions', COUNT(*) FROM model_versions
UNION ALL
SELECT 'tests', COUNT(*) FROM model_tests;

-- Distribution by scan type
SELECT scan_type, COUNT(*) FROM phishing_scans GROUP BY scan_type;

-- Model type distribution
SELECT model_type, COUNT(*) FROM model_versions GROUP BY model_type;
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "SUPABASE_URL and KEY required" | Add to `.env.local` |
| "HTTP 401: Unauthorized" | Use service_role key, not anon key |
| "HTTP 400: Bad Request" | Check schema matches supabase-schema.sql |
| Script hangs | Check network, may be slow connections |
| Partial data | Script handles failures gracefully, re-run to continue |

## Customization

Edit `scripts/populate-supabase.js`:

```javascript
// Line ~450, in main execution:
const users = await populateUsers(50);           // ← Change 25 to 50
const datasets = await populateTrainingDatasets(users, 12); // ← Change 8
await populatePhishingScans(users, 800);         // ← Change 400
await populateTrainingRecords(datasets, 5000);   // ← Change 2500
const modelVersions = await populateModelVersions(datasets, users, 12); // ← Change 8
await populateModelTests(modelVersions, datasets, users, 64); // ← Change 32
```

## Performance

- Small dataset (400 scans, 2.5k records): ~30 seconds
- Medium dataset (1k scans, 5k records): ~1 minute
- Large dataset (2k+ scans, 10k+ records): ~3-5 minutes
- Training records use batching (500 per request) for efficiency

## Features

✓ Realistic data generation  
✓ Proper data relationships (users → scans, datasets → records)  
✓ Random distribution across types  
✓ Timestamps relative to now (fresh data)  
✓ Error handling and batch processing  
✓ Progress output for monitoring  
✓ No external dependencies (uses built-in HTTPS)  

## Files Modified

- `scripts/populate-supabase.js` - Main script
- `SUPABASE_POPULATION_GUIDE.md` - Detailed guide
- `POPULATION_SCRIPT_REFERENCE.md` - This file

## Next Steps

1. Run the script
2. Verify data in Supabase dashboard
3. Test queries and APIs
4. Use data for model training and testing
5. Customize counts as needed for your use case
