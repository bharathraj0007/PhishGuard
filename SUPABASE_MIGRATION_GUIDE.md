# Blink to Supabase Data Migration Guide

## Overview
This guide explains how to migrate all data from Blink database to Supabase, maintaining complete data integrity and structure.

## Prerequisites

1. **Supabase Project Setup**
   - Supabase project already connected to this app
   - Project ID: `ulnkamvutacjbxkeirkh`
   - Region: `ap-south-1`

2. **Required Environment Variables**
   - `SUPABASE_URL` - Already configured
   - `SUPABASE_SERVICE_ROLE_KEY` - Already configured
   - `BLINK_SECRET_KEY` - Need to add this
   - `BLINK_PROJECT_ID` - Need to add this

## Step 1: Create Tables in Supabase

1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/ulnkamvutacjbxkeirkh/sql/new
2. Copy and paste the entire content from `supabase-schema.sql`
3. Execute the SQL to create all tables with matching schema

## Step 2: Add Required Secrets

You need to add the Blink credentials as secrets:

```bash
BLINK_SECRET_KEY=blnk_sk_eky2mdxr_8z2fPdi5dk6fVEytZkSXmcPkVpIrwKdD
BLINK_PROJECT_ID=phishguard-web-phishing-detector-eky2mdxr
```

## Step 3: Deploy Migration Function

The migration function is located at: `functions/blink-to-supabase-migration/index.ts`

Deploy it using Blink's deployment system.

## Step 4: Run Migration

Once deployed, trigger the migration:

```bash
curl -X POST https://eky2mdxr--blink-to-supabase-migration.functions.blink.new
```

Or use the UI to call the function.

## What Gets Migrated

The following tables will be migrated with all their data:

1. **users** - All user accounts and profiles
2. **phishing_scans** - Complete scan history
3. **training_datasets** - ML training datasets metadata
4. **training_records** - Individual training data records
5. **model_versions** - ML model version history
6. **model_tests** - Model testing results
7. **system_settings** - Application configuration
8. **sync_events** - Synchronization event logs
9. **password_reset_tokens** - Password reset tokens
10. **email_verification_tokens** - Email verification tokens
11. **magic_link_tokens** - Magic link authentication tokens

## Migration Features

- ✅ **Batch Processing**: Processes records in chunks of 100
- ✅ **Upsert Strategy**: Uses `upsert` to avoid duplicates (based on `id` field)
- ✅ **Case Conversion**: Automatically converts camelCase to snake_case
- ✅ **Error Handling**: Captures and reports errors per table
- ✅ **Progress Tracking**: Returns detailed results for each table

## Expected Response

```json
{
  "success": true,
  "message": "Migration completed",
  "results": {
    "users": {
      "success": true,
      "total": 150,
      "inserted": 150
    },
    "phishing_scans": {
      "success": true,
      "total": 5420,
      "inserted": 5420
    },
    "training_datasets": {
      "success": true,
      "total": 12,
      "inserted": 12
    },
    ...
  },
  "timestamp": "2025-12-23T12:17:40.000Z"
}
```

## Verification Steps

After migration completes:

1. **Check Record Counts**
   ```sql
   SELECT 
     'users' as table_name, COUNT(*) as count FROM users
   UNION ALL
   SELECT 'phishing_scans', COUNT(*) FROM phishing_scans
   UNION ALL
   SELECT 'training_datasets', COUNT(*) FROM training_datasets
   UNION ALL
   SELECT 'training_records', COUNT(*) FROM training_records;
   ```

2. **Verify Data Integrity**
   - Check foreign key relationships
   - Verify timestamps are preserved
   - Confirm critical fields are not null

3. **Test Application Queries**
   - Try fetching user data
   - Retrieve scan history
   - Access training datasets

## Ongoing Sync (Optional)

For continuous sync between Blink and Supabase, you can:

1. Set up webhooks in Blink
2. Create trigger functions in Supabase
3. Implement bidirectional sync logic

## Troubleshooting

### Table Already Exists Error
- Run: `DROP TABLE IF EXISTS table_name CASCADE;` before schema creation
- Or use the upsert feature (already implemented)

### Foreign Key Violations
- Tables are created in dependency order
- Migration runs in correct sequence (users first, then dependent tables)

### Permission Errors
- Ensure SERVICE_ROLE_KEY is used (not anon key)
- Check RLS policies if enabled

### Large Dataset Timeouts
- Function handles batch processing automatically
- For very large datasets (>100K records), consider running migration in smaller table groups

## Data Backup

Before migration:
1. Export current Supabase data (if any exists)
2. Take Blink database snapshot
3. Test migration on a staging environment first

## Cost Considerations

- Supabase free tier: 500MB database
- Check your current Blink data size
- Monitor Supabase usage during migration

## Support

If you encounter issues:
1. Check function logs for detailed error messages
2. Verify all environment variables are set
3. Ensure Supabase tables exist before running migration
4. Contact support if persistent issues occur
