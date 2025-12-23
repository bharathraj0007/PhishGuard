# Blink to Supabase Migration Checklist

## Pre-Migration

- [ ] Backup Blink database (optional but recommended)
- [ ] Backup existing Supabase data (if any)
- [ ] Verify Supabase credentials are correct
- [ ] Confirm all secrets are added: `BLINK_SECRET_KEY`, `BLINK_PROJECT_ID`

## Step 1: Create Supabase Tables

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/ulnkamvutacjbxkeirkh
2. Open the SQL Editor
3. Create a new query
4. Copy the entire content from `supabase-schema.sql` in your project root
5. Execute the SQL script
6. Verify all tables are created successfully

**Expected Tables Created:**
- ✓ users
- ✓ phishing_scans
- ✓ training_datasets
- ✓ training_records
- ✓ model_versions
- ✓ model_tests
- ✓ system_settings
- ✓ sync_events
- ✓ password_reset_tokens
- ✓ email_verification_tokens
- ✓ magic_link_tokens

## Step 2: Deploy Migration Function

The migration function has been deployed at:
```
https://eky2mdxr--blink-to-supabase-migration.functions.blink.new
```

Status: ✅ **DEPLOYED**

## Step 3: Run Migration

### Option A: Using UI Component (Recommended)
1. Go to a page with the `<MigrationStatus />` component
2. Click "Start Migration" button
3. Monitor the results in real-time

### Option B: Direct API Call
```bash
curl -X POST https://eky2mdxr--blink-to-supabase-migration.functions.blink.new
```

### Option C: Using fetch in console
```javascript
fetch('https://eky2mdxr--blink-to-supabase-migration.functions.blink.new', {
  method: 'POST'
}).then(r => r.json()).then(console.log)
```

## Step 4: Verify Migration

After the migration completes, verify in Supabase:

### Check Record Counts
```sql
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'phishing_scans', COUNT(*) FROM phishing_scans
UNION ALL SELECT 'training_datasets', COUNT(*) FROM training_datasets
UNION ALL SELECT 'training_records', COUNT(*) FROM training_records
UNION ALL SELECT 'model_versions', COUNT(*) FROM model_versions
UNION ALL SELECT 'model_tests', COUNT(*) FROM model_tests
UNION ALL SELECT 'system_settings', COUNT(*) FROM system_settings
UNION ALL SELECT 'sync_events', COUNT(*) FROM sync_events;
```

### Verify Data Integrity
- [ ] Check for NULL values in critical fields (id, user_id, created_at)
- [ ] Verify timestamps are preserved correctly
- [ ] Check foreign key relationships
- [ ] Sample a few records from each table

### Test Sample Queries
```sql
-- Get user with recent scans
SELECT u.id, u.email, COUNT(ps.id) as scan_count
FROM users u
LEFT JOIN phishing_scans ps ON u.id = ps.user_id
GROUP BY u.id
LIMIT 5;

-- Check training datasets
SELECT * FROM training_datasets LIMIT 5;

-- Verify model versions
SELECT * FROM model_versions ORDER BY created_at DESC LIMIT 5;
```

## Step 5: Update Application Code (Optional)

If you want to start using Supabase queries instead of Blink:

1. Update your database queries to use Supabase client
2. Test CRUD operations
3. Monitor performance
4. Update authentication if needed

## Troubleshooting

### Issue: "Table already exists" error
**Solution:** The tables can already exist. The migration uses UPSERT, so it will update existing records. If you need a clean slate:
1. Go to Supabase SQL Editor
2. Run: `DROP TABLE IF EXISTS table_name CASCADE;`
3. Re-run the schema creation SQL

### Issue: "Foreign key constraint violation"
**Solution:** Tables are created in dependency order. Ensure all tables are created before running migration.

### Issue: "Permission denied" error
**Solution:** Verify you're using the SERVICE_ROLE_KEY (not anon key). Check secrets configuration.

### Issue: Migration hangs or times out
**Solution:** Large datasets may take time. Check function logs for progress. The migration processes data in chunks of 100 records.

### Issue: Some records didn't migrate
**Solution:** 
1. Check the detailed migration results
2. Look at function logs for specific errors
3. Verify data formatting in source tables
4. Re-run for specific tables if needed

## Post-Migration

- [ ] Verify all data is present in Supabase
- [ ] Test critical features with migrated data
- [ ] Update application to use Supabase if desired
- [ ] Archive or backup Blink database
- [ ] Document any custom configurations
- [ ] Update team on migration status

## Rollback Plan

If issues occur:
1. Keep original Blink database intact
2. Tables in Supabase can be cleared (DROP TABLE ... CASCADE)
3. Recreate schema and retry migration
4. No data loss occurs in original Blink database

## Data Mapping Reference

The migration automatically converts:
- **camelCase** (Blink) → **snake_case** (Supabase)
- **Integer booleans** (0/1 in Blink) → **Stored as-is** (0/1 in Supabase)
- **Timestamps** (ISO 8601 strings) → **Stored as TEXT** (can be converted to timestamp type)
- **JSON fields** (metadata, indicators) → **Stored as TEXT** (can be parsed as needed)

## Performance Notes

- Migration processes 100 records per batch
- Total time depends on dataset size
- For ~5,420 phishing scans = ~60 batches ≈ 1-2 minutes
- For ~150 users = ~2 batches ≈ 10 seconds

## Next Steps

1. ✅ Create Supabase tables (use supabase-schema.sql)
2. ✅ Deploy migration function (already done)
3. ⏳ Run migration (click button or API call)
4. ✅ Verify data integrity
5. ⏳ (Optional) Update app to use Supabase queries
6. ⏳ (Optional) Decommission Blink database if fully migrated

---

**Migration Function URL:** https://eky2mdxr--blink-to-supabase-migration.functions.blink.new

**Supabase Project:** https://supabase.com/dashboard/project/ulnkamvutacjbxkeirkh

**Support:** Check function logs if issues occur
