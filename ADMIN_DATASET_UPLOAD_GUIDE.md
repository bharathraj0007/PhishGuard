# Admin Dataset Upload & Training Guide

## Overview

This guide explains how to upload training datasets and train ML models in PhishGuard as an admin.

## Step 1: Access Admin Dashboard

1. Navigate to `/admin/login`
2. Login with admin credentials:
   - **Email**: admin@phishguard.com
   - **Password**: PhishGuard2024!Secure
3. Go to the **Datasets** tab

## Step 2: Prepare Your Dataset

### CSV Format Requirements

Your CSV file must include these **required columns**:

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `content` | string | The content to analyze | `http://phishing-site.com` |
| `scanType` | string | Type of scan | `link`, `email`, `sms`, or `qr` |
| `isPhishing` | boolean | Is this phishing? | `true` or `false` |

**Optional columns**:

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `threatLevel` | string | Threat severity | `safe`, `suspicious`, `dangerous` |
| `indicators` | string | Semicolon-separated indicators | `suspicious-domain;no-https` |
| `notes` | string | Additional notes | `Known phishing campaign 2024` |

### Example CSV

```csv
content,scanType,isPhishing,threatLevel,indicators,notes
http://phishing-bank-login.xyz,link,true,dangerous,suspicious-domain;no-https;mimics-brand,Fake banking site
http://malware-download.tk,link,true,dangerous,suspicious-tld;suspicious-domain,Malware distribution
http://phishing-paypal.com,link,true,dangerous,typosquatting;suspicious-domain,PayPal phishing
https://www.google.com,link,false,safe,trusted-domain,Legitimate search engine
https://www.amazon.com,link,false,safe,trusted-domain;https,Legitimate e-commerce
Click here to claim your prize! http://bit.ly/xyz123,sms,true,suspicious,shortened-url;urgent-language,Phishing SMS
Your package is waiting: track.fedex.com.xyz,sms,true,dangerous,domain-spoofing;suspicious-domain,Fake delivery notification
Meeting rescheduled to 3pm tomorrow,sms,false,safe,,Normal SMS
URGENT: Your account will be suspended,email,true,dangerous,urgent-language;threatening-language,Account phishing email
Verify your identity immediately,email,true,suspicious,urgent-language;suspicious-sender,Identity theft attempt
Weekly team meeting agenda,email,false,safe,,Legitimate work email
```

## Step 3: Upload Dataset

### Method A: Upload CSV File (Recommended)

1. Click **Upload Dataset** button
2. Fill in:
   - **Dataset Name**: e.g., "Phishing URLs Q4 2024"
   - **Description**: Brief description of the dataset
   - **Dataset Type**: Select `mixed` (contains both phishing and safe examples)
3. Select **Upload File** method
4. Click **Choose File** and select your CSV file
5. The system will preview the number of rows loaded
6. Click **Upload Dataset**

### Method B: Paste CSV Data

1. Click **Upload Dataset** button
2. Fill in dataset information
3. Select **Paste CSV** method
4. Copy and paste CSV data directly into the text area
5. Click **Upload Dataset**

## Step 4: Verify Dataset Upload

After upload, you should see:
- ✅ Success message: "Dataset uploaded successfully with X records"
- The dataset appears in the **Available Datasets** table
- Record count is displayed
- Status shows as "ready"

## Step 5: Train ML Models

1. Navigate to **ML Training** tab
2. Select the dataset you uploaded
3. Configure training parameters:
   - **Version Number**: e.g., "v1.0.0"
   - **Description**: What makes this version unique
   - **Training Config**:
     - Epochs: 10-50 (more = better accuracy, longer training)
     - Batch Size: 32 (default)
     - Learning Rate: 0.001 (default)
4. Click **Start Training**

## Step 6: Monitor Training Progress

- Training status will change from "pending" → "training" → "completed"
- Check the **ML Models** tab to see training progress
- Training metrics (accuracy, loss) will be displayed when complete

## Step 7: Deploy Trained Model

1. Go to **ML Models** tab
2. Find your trained model version
3. Review the metrics:
   - Accuracy should be > 85% for production use
   - Training duration indicates model complexity
4. Click **Deploy** to activate the model
5. The model will now be used for all phishing scans

## Dataset Best Practices

### Size Recommendations

| Scan Type | Minimum Records | Recommended | Optimal |
|-----------|----------------|-------------|---------|
| URL (link) | 100 | 500+ | 1,000+ |
| Email | 100 | 500+ | 1,000+ |
| SMS | 50 | 200+ | 500+ |
| QR | 50 | 200+ | 500+ |

### Quality Guidelines

1. **Balance**: Include roughly equal phishing and safe examples (50/50 split)
2. **Variety**: Include diverse phishing techniques and legitimate examples
3. **Accuracy**: Verify all labels are correct (isPhishing true/false)
4. **Current**: Use recent examples (last 6-12 months)
5. **Clean**: Remove duplicates and invalid entries

### Data Sources

- **Kaggle**: Search for "phishing detection dataset"
- **PhishTank**: Download recent phishing URLs
- **OpenPhish**: Community phishing database
- **Your own scans**: Export user scans from PhishGuard
- **Security feeds**: CERT, CISA, or security vendor feeds

## Troubleshooting

### Upload Fails

**Error**: "Missing required columns"
- **Fix**: Ensure CSV has `content`, `scanType`, `isPhishing` columns
- **Check**: Column names are case-insensitive but must match exactly

**Error**: "No valid records found"
- **Fix**: Verify CSV has at least 1 data row (not just headers)
- **Check**: Ensure `scanType` values are: link, email, sms, or qr

**Error**: "Failed to upload dataset"
- **Fix**: Check file size (should be < 10MB)
- **Try**: Split large datasets into smaller batches

### Training Fails

**Error**: "Insufficient data"
- **Fix**: Upload more records (minimum 50 per scan type)

**Error**: "Training timeout"
- **Fix**: Reduce batch size or number of epochs

### Low Accuracy

If trained model has accuracy < 85%:
1. Add more diverse training examples
2. Increase dataset size (more records)
3. Balance phishing/safe ratio (aim for 50/50)
4. Increase training epochs (20-50)
5. Check data quality (remove mislabeled examples)

## CSV Template Download

Use this template to create your dataset:

```csv
content,scanType,isPhishing,threatLevel,indicators,notes
http://example-phishing-site.com,link,true,dangerous,suspicious-domain,Example phishing URL
https://www.legitimate-site.com,link,false,safe,trusted-domain,Example legitimate URL
```

Save this as `phishing_dataset_template.csv` and fill with your data.

## Next Steps

After uploading and training:
1. Test the model in **ML Testing** tab
2. Compare performance metrics with previous versions
3. Deploy the best-performing model
4. Monitor real-world detection accuracy
5. Continuously add new examples to improve the model

## Support

For issues or questions:
- Check the **Documentation** tab
- Review error messages in browser console
- Contact PhishGuard support

---

**Last Updated**: December 2024
**PhishGuard ML System** - Admin Dataset Management
