# Database Data Population Guide

## Overview

PhishGuard includes a comprehensive data population system that generates and inserts **500+ realistic records per scan type** (link, email, SMS, QR) into your training database. This is essential for training accurate ML models.

## Quick Start

### Method 1: Admin Dashboard (Recommended)

1. **Navigate to Admin Dashboard**
   - Log in with admin credentials
   - Go to Admin → Populate tab

2. **Configure Population**
   - Set records per scan type (default: 500)
   - Select scan types: Link, Email, SMS, QR
   - Total records = Records per Type × Number of Types

3. **Generate & Insert**
   - Click "Populate Database"
   - Monitor progress in real-time
   - View statistics upon completion

### Method 2: Script

```bash
node scripts/populate-database.js
# Then use Admin Dashboard to complete insertion
```

## Data Generator Features

### Generated Data Types

#### Link Scanning
- **Phishing URLs** (40% of records):
  - Typosquatted domains: `gogle-verify.com`, `micros0ft-account.net`
  - IP-based URLs
  - Shortened URLs
  - HTTP instead of HTTPS
  - Unusual TLDs (.tk, .ml, .ga, .cf)

- **Legitimate URLs** (60% of records):
  - Known domains: google.com, microsoft.com, apple.com
  - HTTPS protocol
  - Normal TLDs

#### Email Scanning
- **Phishing Emails** (35% of records):
  - Urgent language: "URGENT", "immediate", "expires"
  - Credential requests: "verify account", "confirm identity"
  - Financial requests: "update payment", "card verification"
  - Spoofed senders: `support@gogle-verify.com`
  - Generic greetings

- **Legitimate Emails** (65% of records):
  - Service notifications
  - Password resets
  - Account activity summaries
  - Official senders: `support@google.com`

#### SMS Scanning
- **Phishing SMS** (45% of records):
  - Urgency tactics
  - Account verification requests
  - Financial requests
  - Shortened links
  - Misspelled brand names

- **Legitimate SMS** (55% of records):
  - 2FA codes
  - Delivery notifications
  - Appointment confirmations
  - Account alerts

#### QR Code Scanning
- **Phishing QR Codes** (50% of records):
  - Encoded phishing URLs
  - IP-based destinations
  - Shortened URLs in QR
  - Suspicious domains

- **Legitimate QR Codes** (50% of records):
  - Known service URLs
  - HTTPS endpoints
  - Official domains

## Database Schema

All records are inserted into the `training_records` table:

```sql
training_records (
  id TEXT PRIMARY KEY,
  dataset_id TEXT NOT NULL,
  content TEXT NOT NULL,
  scan_type TEXT NOT NULL,  -- 'link', 'email', 'sms', or 'qr'
  is_phishing INTEGER NOT NULL,  -- 0 or 1
  threat_level TEXT,  -- 'low', 'medium', 'high'
  indicators TEXT,  -- JSON array of detected indicators
  created_at TEXT NOT NULL
)
```

## Population Statistics Example

When populating 500 records per type:

```
Link:   500 records (200 phishing, 300 legitimate)
Email:  500 records (175 phishing, 325 legitimate)
SMS:    500 records (225 phishing, 275 legitimate)
QR:     500 records (250 phishing, 250 legitimate)
─────────────────────────────────────────────────
TOTAL: 2000 records (850 phishing, 1150 legitimate)
```

## Advanced Configuration

### Custom Record Counts

Set different record counts for different scan types by modifying the component:

```typescript
// In DataPopulationPanel.tsx
const typeConfig = {
  link: 1000,    // More link samples
  email: 500,
  sms: 500,
  qr: 300
}
```

### Custom Phishing Ratios

Adjust phishing vs legitimate ratio in `phishing-data-generator.ts`:

```typescript
// Default: 40% phishing for links
generateBatch(datasetId, 'link', 500, 0.40)

// Custom: 50% phishing
generateBatch(datasetId, 'link', 500, 0.50)
```

### Batch Insertion Size

Modify batch size for database performance:

```typescript
const batchSize = 100  // Default: 100 records per batch
```

## Performance Characteristics

- **Generation Speed**: ~1000 records/second
- **Insertion Speed**: ~100-200 records/batch
- **For 500 records per type**: ~30-60 seconds total
- **Memory Usage**: Minimal (batch processing)

## Edge Function Integration

The `bulk-scan-population` edge function is available for programmatic access:

```bash
POST /functions/bulk-scan-population
Content-Type: application/json

{
  "datasetId": "ds_custom_training",
  "scanTypes": ["link", "email", "sms", "qr"],
  "recordsPerType": 500
}
```

Response:
```json
{
  "success": true,
  "datasetId": "ds_custom_training",
  "summary": {
    "link": { "generated": 500, "phishing": 200, "legitimate": 300 },
    "email": { "generated": 500, "phishing": 175, "legitimate": 325 },
    "sms": { "generated": 500, "phishing": 225, "legitimate": 275 },
    "qr": { "generated": 500, "phishing": 250, "legitimate": 250 }
  },
  "totalRecords": 2000
}
```

## Common Use Cases

### 1. Initial Setup
- Populate 500 records per type for baseline ML training
- Time: ~5-10 minutes

### 2. Expand Dataset
- Populate additional 500 records per type
- Improves model accuracy
- Time: ~5-10 minutes

### 3. Test Different Ratios
- Populate with high phishing ratio (60-70%)
- Test model sensitivity
- Time: ~5-10 minutes

### 4. Batch Processing
- Populate multiple datasets in sequence
- Use for scheduled tasks
- Time: Varies by batch count

## Troubleshooting

### Database Insertion Fails
- **Issue**: "Database connection error"
- **Solution**: Ensure you're logged in with proper credentials
- **Check**: Admin role is required

### Progress Stuck at 100%
- **Issue**: UI doesn't clear after 5 seconds
- **Solution**: Manually refresh the page
- **Check**: Data is still inserted; refresh to verify

### Records Not Appearing
- **Issue**: Population completes but no data visible
- **Solution**: Clear browser cache and reload
- **Check**: Verify in database directly

### Very Slow Insertion
- **Issue**: Taking longer than expected
- **Solution**: Reduce records per type to 100-200
- **Check**: Database load and available resources

## Data Quality Assurance

All generated data includes:
- ✅ Realistic content patterns
- ✅ Appropriate threat levels
- ✅ Relevant indicators
- ✅ Proper timestamp formatting
- ✅ Valid JSON encoding
- ✅ Diverse scenarios

## Next Steps After Population

1. **Train ML Models**
   - Use populated datasets for training
   - Test model accuracy
   - Iterate with different parameters

2. **Run Model Evaluations**
   - Test against generated data
   - Measure precision/recall
   - Validate with real-world samples

3. **Monitor Performance**
   - Track scan statistics
   - Analyze false positives
   - Refine detection rules

## Implementation Details

### Files Involved

- **Data Generator**: `src/lib/phishing-data-generator.ts`
- **UI Component**: `src/components/DataPopulationPanel.tsx`
- **Edge Function**: `functions/bulk-scan-population/index.ts`
- **Admin Page**: `src/pages/AdminPage.tsx`
- **Script**: `scripts/populate-database.js`

### Database Tables

- **training_records**: Stores all generated records
- **training_datasets**: Metadata about datasets
- **phishing_scans**: User scan history

## Support & Feedback

For issues or feature requests:
- Check troubleshooting section above
- Review console logs for errors
- Contact support team

## License

This data population system is part of PhishGuard and follows the same license.
