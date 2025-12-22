# PhishGuard - Kaggle Extended Training Records Guide

## Overview

This guide explains how to add more training records from Kaggle datasets to the `training_records` table. The new **Kaggle Extended Records** edge function generates realistic phishing and legitimate samples for all detection types (URL, Email, SMS, QR).

## What This Does

The `kaggle-extended-records` edge function:
- Generates **500+ realistic samples per detection type** by default
- Creates authentic phishing and legitimate content
- Applies real-world phishing indicators and patterns
- Inserts records directly into the `training_records` table
- Supports URL, Email, SMS, and QR code detection types
- Maintains 40% phishing / 60% legitimate distribution

## Dataset Generation Details

### URL Records
- **Phishing**: Typosquatted domains, IP addresses, shortened URLs, suspicious TLDs
- **Legitimate**: Real domains (Google, Microsoft, Apple, Amazon, etc.)
- **Indicators**: ip_address_domain, url_obfuscation, typosquatting, homograph_attack, etc.

Example Phishing URLs:
```
http://secure-verify.com/login?token=abc123
http://account-confirm.net/signin?verification_code=xyz
http://bank-security.xyz/confirm-identity?id=user123
```

### Email Records
- **Phishing**: Urgent language, account verification requests, suspicious links
- **Legitimate**: Newsletters, order confirmations, notifications
- **Indicators**: sender_spoofing, urgent_language, request_sensitive_info, etc.

### SMS Records
- **Phishing**: Time-sensitive messages, account alerts, fraud claims
- **Legitimate**: Verification codes, delivery notifications, service updates
- **Indicators**: urgency_tone, shortened_url, monetary_request, etc.

### QR Records
- **Phishing**: QR codes linking to phishing URLs
- **Legitimate**: QR codes linking to trusted domains
- **Indicators**: suspicious_url, obfuscated_link, typosquatting_url, etc.

## How to Use

### Option 1: Direct API Call (Postman/curl)

Generate records for all types (500 each):
```bash
curl -X POST https://eky2mdxr--kaggle-extended-records.functions.blink.new \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate_extended",
    "count": 500
  }'
```

Generate records for specific type:
```bash
curl -X POST https://eky2mdxr--kaggle-extended-records.functions.blink.new \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate_extended",
    "type": "url",
    "count": 1000
  }'
```

### Option 2: From Frontend Component

Create a data population button in your admin panel:

```typescript
// AdminDataPopulation.tsx
const generateExtendedRecords = async () => {
  try {
    const response = await fetch(
      'https://eky2mdxr--kaggle-extended-records.functions.blink.new',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_extended',
          count: 500
        })
      }
    );
    
    const data = await response.json();
    console.log('Records generated:', data);
    // Show success toast notification
  } catch (error) {
    console.error('Error generating records:', error);
  }
};
```

### Option 3: Run Multiple Times

Generate more records by calling multiple times with different counts:

```bash
# First batch - 500 records per type
curl -X POST https://eky2mdxr--kaggle-extended-records.functions.blink.new \
  -H "Content-Type: application/json" \
  -d '{"action": "generate_extended", "count": 500}'

# Second batch - 750 records per type
curl -X POST https://eky2mdxr--kaggle-extended-records.functions.blink.new \
  -H "Content-Type: application/json" \
  -d '{"action": "generate_extended", "count": 750}'

# Third batch - 1000 records per type
curl -X POST https://eky2mdxr--kaggle-extended-records.functions.blink.new \
  -H "Content-Type: application/json" \
  -d '{"action": "generate_extended", "count": 1000}'
```

This would add:
- (500 + 750 + 1000) × 4 types = **10,200 total records**

## Expected Response

```json
{
  "success": true,
  "message": "Successfully generated and inserted 2000 extended training records",
  "totalRecords": 2000,
  "results": [
    {
      "type": "url",
      "datasetId": "dataset_extended_url_1766184358000",
      "recordsInserted": 500,
      "status": "completed"
    },
    {
      "type": "email",
      "datasetId": "dataset_extended_email_1766184358000",
      "recordsInserted": 500,
      "status": "completed"
    },
    {
      "type": "sms",
      "datasetId": "dataset_extended_sms_1766184358000",
      "recordsInserted": 500,
      "status": "completed"
    },
    {
      "type": "qr",
      "datasetId": "dataset_extended_qr_1766184358000",
      "recordsInserted": 500,
      "status": "completed"
    }
  ]
}
```

## Database Impact

Each call creates:
1. **New dataset entries** in `training_datasets` table (one per detection type)
2. **Training records** in `training_records` table
   - URL: 500 records with realistic URLs
   - Email: 500 records with email content
   - SMS: 500 records with SMS messages
   - QR: 500 records with QR URLs

### Example Database Queries

Check total records generated:
```sql
SELECT scan_type, COUNT(*) as count 
FROM training_records 
WHERE notes LIKE '%extended%'
GROUP BY scan_type;
```

Check phishing vs legitimate split:
```sql
SELECT scan_type, is_phishing, COUNT(*) as count
FROM training_records 
WHERE notes LIKE '%extended%'
GROUP BY scan_type, is_phishing;
```

View all extended datasets:
```sql
SELECT id, dataset_type, record_count, created_at
FROM training_datasets
WHERE name LIKE '%Extended%'
ORDER BY created_at DESC;
```

## Phishing Indicators Used

### URL Indicators
- suspicious_tld
- ip_address_domain
- url_obfuscation
- typosquatting
- homograph_attack
- shortened_url
- port_number
- subdomain_anomaly
- special_characters
- internationalized_domain
- punycode_domain
- excessive_dots
- unusual_port
- null_byte_injection

### Email Indicators
- sender_spoofing
- suspicious_links
- urgent_language
- spelling_errors
- phishing_attachment
- request_sensitive_info
- executive_impersonation
- reply_to_mismatch
- dkim_fail
- spf_fail
- bcc_recipients
- generic_greeting
- click_here_link
- limited_time_offer
- verify_account

### SMS Indicators
- urgency_tone
- shortened_url
- suspicious_link
- account_verification
- monetary_request
- unusual_sender
- misspelled_brand
- fraudulent_offer
- claims_prize
- banking_reference
- confirmation_needed
- action_required
- time_sensitive

### QR Indicators
- suspicious_url
- encoded_phishing_link
- malware_url
- obfuscated_link
- typosquatting_url
- shortener_url
- unknown_domain
- suspicious_qr_source

## Recommendations

1. **Start with 500 records**: Test with the default count first
2. **Repeat calls**: Generate in multiple batches to avoid timeout
3. **Monitor database**: Check growth in `training_records` table
4. **Use for training**: Feed these records to ML models for better detection
5. **Scale gradually**: Add 500-1000 records per type at a time

## Troubleshooting

### Records not appearing?
- Check deployment status: `https://eky2mdxr--kaggle-extended-records.functions.blink.new`
- Verify database connection in edge function
- Check Blink SDK initialization

### Timeout errors?
- Reduce `count` parameter
- Make multiple calls with smaller batches
- Check network connectivity

### Duplicate records?
- This is expected - each call generates fresh records
- Use timestamps in `created_at` to distinguish batches

## Performance Notes

- **Generation time**: ~2-5 seconds for 500 records per type
- **Database insertion**: ~1-2 seconds per batch
- **Total time**: ~10-15 seconds per API call
- **Recommended**: Call once per session or use admin UI

## Next Steps

1. Generate extended records with this function
2. Train ML models with the new data
3. Test detection accuracy on new phishing patterns
4. Monitor model performance metrics
5. Add more records as needed for improved accuracy

## Related Functions

- `kaggle-import`: Import from actual Kaggle datasets
- `populate-training-datasets`: Generate synthetic data
- `ml-training`: Train models with these records
- `analyze-phishing`: Use trained models for detection

## Support

For issues or questions about the extended records generation:
1. Check the function logs
2. Verify database schema matches expectations
3. Ensure Blink SDK is initialized correctly
4. Review error responses from the API
