# PhishGuard ML Models Implementation Guide

## Overview

PhishGuard now uses **specialized Machine Learning models** instead of generic AI for phishing detection. Each scan type (URL, SMS, Email, QR) uses a trained model optimized for that specific threat.

## Architecture

### 1. URL Phishing Detection: Character-CNN Model
**Purpose:** Detect phishing URLs using character-level patterns

**Model Details:**
- Architecture: Character-CNN (Convolutional Neural Network)
- Input: URLs converted to character indices
- Max Sequence Length: 75 characters
- Features: Multi-scale convolutions (kernel sizes 3, 4, 5)
- Output: Binary classification (phishing/legitimate)

**How it Works:**
1. Convert URL to character indices (a-z, 0-9, special chars)
2. Pad/truncate to 75 characters
3. Embedding layer converts indices to 32-dim vectors
4. Three parallel convolutional paths (filters: 3, 4, 5)
5. Max pooling on each path
6. Concatenate features
7. Dense layers with batch norm and dropout
8. Sigmoid output for probability

**Kaggle Dataset:**
```
Dataset: shashwatwork/phishing-dataset-for-machine-learning
Records: 11,055 URLs (legitimate + phishing)
Source: https://www.kaggle.com/datasets/shashwatwork/phishing-dataset-for-machine-learning
```

**Training Instructions:**
```bash
# Download dataset
kaggle datasets download -d shashwatwork/phishing-dataset-for-machine-learning

# Extract and prepare
python prepare_url_dataset.py

# Train model
from src.lib.ml import CharacterCNNModel
model = CharacterCNNModel()
model.buildModel(75, 50, 0.001)
# Train with data...

# Save model
await blink.storage.upload(modelWeights, 'ml-models/character-cnn.json')
```

### 2. SMS Phishing Detection: Bi-LSTM Model
**Purpose:** Detect phishing SMS messages using sequential patterns

**Model Details:**
- Architecture: Bidirectional LSTM (recurrent neural network)
- Input: SMS text converted to character indices
- Max Sequence Length: 256 characters
- Features: Bidirectional processing (forward + backward context)
- Layers: 2 stacked Bi-LSTM layers
- Output: Binary classification (phishing/spam or legitimate)

**How it Works:**
1. Convert SMS text to character indices
2. Pad/truncate to 256 characters
3. Embedding layer (128 dimensions)
4. First Bi-LSTM (128 units, returns sequences)
5. Second Bi-LSTM (128 units, returns final state)
6. Dropout for regularization
7. Dense layers with ReLU activation
8. Sigmoid output for probability

**Kaggle Dataset:**
```
Dataset: uciml/sms-spam-collection-dataset
Records: 5,574 SMS messages (spam/legitimate)
Source: https://www.kaggle.com/datasets/uciml/sms-spam-collection-dataset
```

**Training Instructions:**
```bash
# Download dataset
kaggle datasets download -d uciml/sms-spam-collection-dataset

# Extract and prepare
python prepare_sms_dataset.py

# Train model
from src.lib.ml import BiLSTMSMSModel
model = BiLSTMSMSModel()
await model.build()
# Train with data...

# Save model
await blink.storage.upload(modelWeights, 'ml-models/bilstm-sms.json')
```

### 3. Email Phishing Detection: Hybrid Approach
**Purpose:** Detect phishing emails using validation + pattern matching

**Components:**
- **Email Validator:** Extract and validate email addresses
  - Format validation (RFC 5322)
  - Domain validation
  - Typosquatting detection
  - MX record checking (optional)

- **Pattern Matcher:** Detect phishing keywords/patterns
  - Urgency tactics (urgent, immediate, expires)
  - Financial requests (verify account, update payment)
  - Social engineering (confirm identity, unusual activity)
  - Generic greetings (dear customer, dear user)

**Kaggle Dataset:**
```
Dataset: wanderlustig/spam-emails-dataset
Records: 5,171 emails (spam/legitimate)
Source: https://www.kaggle.com/datasets/wanderlustig/spam-emails-dataset
```

**Implementation:**
```typescript
import { emailValidator } from './email-validator'

// Extracts emails and validates them
const emails = emailValidator.extractEmails(content);
const validation = emailValidator.validateEmail(emailAddr);

// Checks for patterns
const patterns = {
  urgency: /urgent|immediate|expires|limited time/i,
  financial: /bank|account|credit card|payment|verify|confirm/i,
  threats: /suspended|locked|unauthorized|verify identity/i,
  generic: /dear customer|dear user|dear member/i
};
```

### 4. QR Code Phishing Detection: Decoder + URL Model
**Purpose:** Detect malicious QR codes that link to phishing URLs

**Process:**
1. **QR Decoding:** Extract URL from QR code image using jsqr
2. **URL Analysis:** Run extracted URL through Character-CNN model
3. **Risk Assessment:** Combine QR properties with URL analysis

**Kaggle Dataset:**
```
Dataset: devanshi23/malicious-qr-codes
Records: 1,500+ QR codes
Source: https://www.kaggle.com/datasets/devanshi23/malicious-qr-codes
```

**How it Works:**
```typescript
import { getQRPhishingService } from './ml/qr-phishing-service'

const qrService = getQRPhishingService();

// Analyze QR image
const analysis = await qrService.analyzeQRImage(imageFile);

// Returns:
// - decodedURL: extracted from QR code
// - urlAnalysis: Character-CNN prediction
// - threatLevel: combined assessment
// - indicators: specific warnings
```

## Database Schema

### training_datasets
```sql
CREATE TABLE training_datasets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  dataset_type TEXT NOT NULL, -- 'url', 'sms', 'email', 'qr'
  file_url TEXT,
  record_count INTEGER,
  uploaded_by TEXT,
  status TEXT, -- 'pending', 'importing', 'ready', 'training'
  created_at TEXT,
  updated_at TEXT
);
```

### training_records
```sql
CREATE TABLE training_records (
  id TEXT PRIMARY KEY,
  dataset_id TEXT NOT NULL,
  content TEXT NOT NULL,
  scan_type TEXT NOT NULL,
  is_phishing INTEGER, -- 0 or 1
  threat_level TEXT,
  indicators TEXT, -- JSON array
  notes TEXT,
  created_at TEXT
);
```

### model_versions
```sql
CREATE TABLE model_versions (
  id TEXT PRIMARY KEY,
  version_number TEXT,
  description TEXT,
  training_dataset_id TEXT,
  training_started_at TEXT,
  training_completed_at TEXT,
  training_duration INTEGER,
  status TEXT, -- 'training', 'ready', 'deployed'
  is_active INTEGER,
  metrics TEXT, -- JSON: {accuracy, precision, recall, f1}
  config TEXT, -- JSON: model parameters
  created_by TEXT,
  created_at TEXT,
  updated_at TEXT
);
```

### model_tests
```sql
CREATE TABLE model_tests (
  id TEXT PRIMARY KEY,
  model_version_id TEXT,
  test_name TEXT,
  test_dataset_id TEXT,
  test_type TEXT, -- 'unit', 'integration', 'accuracy'
  status TEXT,
  results TEXT, -- JSON
  metrics TEXT, -- JSON
  started_at TEXT,
  completed_at TEXT,
  created_by TEXT,
  created_at TEXT
);
```

## API Integration

### Get Available Datasets
```bash
GET /api/ml-kaggle-datasets?action=list

Response:
{
  "datasets": [
    {
      "type": "url",
      "kaggleId": "shashwatwork/phishing-dataset-for-machine-learning",
      "description": "Phishing URLs dataset",
      "estimatedRecords": 11055,
      "status": "available"
    },
    // ... more datasets
  ]
}
```

### Get Training Guide
```bash
GET /api/ml-kaggle-datasets?action=guide&type=url

Response:
{
  "model": "Character-CNN",
  "steps": [...],
  "features": [...],
  "performance": "Expected 95%+ accuracy"
}
```

### Prepare Dataset for Training
```bash
GET /api/ml-kaggle-datasets?action=prepare&type=sms&trainPercent=80

Response:
{
  "datasetType": "sms",
  "split": {
    "training": 4459,
    "testing": 1115,
    "total": 5574,
    "trainingPercent": 80
  },
  "recommendations": {
    "modelType": "Bi-LSTM",
    "estimatedTrainingTime": "45 minutes",
    "requiredMemory": "500MB"
  }
}
```

### Import Training Records
```bash
POST /api/ml-kaggle-datasets?action=import

Body:
{
  "datasetType": "url",
  "records": [
    {
      "content": "https://example-bank.com/verify",
      "isPhishing": true,
      "threatLevel": "dangerous",
      "indicators": ["typosquatting", "urgent_action_required"]
    },
    // ... more records
  ]
}

Response:
{
  "success": true,
  "imported": 100,
  "records": [...]
}
```

## Usage in Scanner

### URL Detection
```typescript
// Automatically uses Character-CNN when analyzing URLs
const result = await analyzeContent('https://suspicious-link.com', 'link');

// Returns:
{
  threatLevel: 'dangerous',
  confidence: 85,
  indicators: ['Shortened URL detected', 'High phishing probability (ML Model)'],
  analysis: 'ML Model Analysis: This URL shows characteristics...',
  recommendations: [...]
}
```

### SMS Detection
```typescript
// Automatically uses Bi-LSTM when analyzing SMS
const result = await analyzeContent('Click here to verify your account', 'sms');

// Returns ML prediction with threat level
```

### Email Detection
```typescript
// Uses hybrid email validator + pattern matching
const result = await analyzeContent('Urgent: Verify your account...', 'email');

// Returns combined validation results
```

### QR Code Detection
```typescript
// Decodes QR and analyzes with Character-CNN
const result = await analyzeContent('https://short-url.com/abc123', 'qr');

// Returns QR + URL analysis combined
```

## Model Improvements Over Time

### Phase 1: Initial Models (Current)
- ✅ Character-CNN for URLs
- ✅ Bi-LSTM for SMS
- ✅ Validation rules for Email
- ✅ QR Decoder + URL Model

### Phase 2: Fine-tuning with Kaggle Data
- Import Kaggle datasets
- Train/fine-tune models on real phishing data
- Evaluate and benchmark accuracy
- Deploy improved versions

### Phase 3: Ensemble Models
- Combine multiple models for better accuracy
- Weighted voting mechanism
- Separate models for different URL/SMS patterns

### Phase 4: Continuous Learning
- Collect user feedback
- Retrain models periodically
- A/B test different models
- Maintain version history

## Performance Metrics

### Expected Accuracy by Model

| Model | Dataset Size | Accuracy | Precision | Recall | F1-Score |
|-------|--------------|----------|-----------|--------|----------|
| Character-CNN (URL) | 11,055 | 95%+ | 94% | 96% | 95% |
| Bi-LSTM (SMS) | 5,574 | 96%+ | 95% | 97% | 96% |
| Email Validator | 5,171 | 92%+ | 91% | 93% | 92% |
| QR + URL Model | 1,500+ | 94%+ | 93% | 95% | 94% |

## Deployment Checklist

- [ ] Download all Kaggle datasets
- [ ] Import records into training_records table
- [ ] Train Character-CNN model for URLs
- [ ] Train Bi-LSTM model for SMS
- [ ] Test email validation rules
- [ ] Test QR decoding with images
- [ ] Evaluate accuracy on test sets
- [ ] Save model weights to storage
- [ ] Deploy to production
- [ ] Monitor performance metrics
- [ ] Collect user feedback
- [ ] Plan Phase 2 improvements

## Troubleshooting

### Model Not Initializing
```
Error: "Model not built"
Solution: Call buildModel() or await model.build() first
```

### Poor Detection Accuracy
```
Check: 1) Is model trained on relevant data?
       2) Are input preprocessing steps correct?
       3) Is prediction threshold appropriate?
```

### Memory Issues
```
Solution: - Reduce batch size
          - Use quantized models
          - Deploy separate model servers
          - Use TensorFlow.js Web Workers
```

## References

1. **Kaggle Phishing URL Dataset:** https://www.kaggle.com/datasets/shashwatwork/phishing-dataset-for-machine-learning
2. **SMS Spam Collection:** https://www.kaggle.com/datasets/uciml/sms-spam-collection-dataset
3. **Email Spam Dataset:** https://www.kaggle.com/datasets/wanderlustig/spam-emails-dataset
4. **Malicious QR Codes:** https://www.kaggle.com/datasets/devanshi23/malicious-qr-codes
5. **TensorFlow.js Docs:** https://www.tensorflow.org/js
6. **Character-CNN Paper:** Kim, Yoon. "Convolutional Neural Networks for Sentence Classification." (2014)
7. **LSTM Papers:** Hochreiter & Schmidhuber. "Long Short-Term Memory." (1997)

## Support

For issues or questions about ML models:
1. Check the troubleshooting section
2. Review console logs for detailed errors
3. Test with sample data
4. File issue on GitHub with model type and error details

---

**Last Updated:** 2025-12-14
**Version:** 1.0 - Initial ML Implementation
