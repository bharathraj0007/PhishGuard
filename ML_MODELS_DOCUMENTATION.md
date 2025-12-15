# PhishGuard Machine Learning Models Documentation

## Overview

PhishGuard implements **lightweight, browser-compatible TensorFlow.js models** for real-time phishing detection across multiple threat vectors:

- **Email Phishing**: TF-IDF + Dense Neural Network
- **SMS Phishing**: Word Tokenization + Bidirectional LSTM
- **URL Phishing**: Character-level Convolutional Neural Network
- **QR Code Phishing**: QR Decoder + URL Model

All models run entirely in the browser with no server-side processing, ensuring **complete user privacy** and **instant predictions**.

---

## Architecture Overview

### 1. Email Phishing Detection (TF-IDF + Dense NN)

**File**: `src/lib/ml/tfidf-email-model.ts`

**Purpose**: Detect phishing attempts in email content (subject + body)

**Architecture**:
```
Email Text → TF-IDF Vectorizer → Dense(128) → Dropout(0.3) → 
Dense(64) → Dropout(0.2) → Dense(1, sigmoid) → [0, 1] probability
```

**Features**:
- **TF-IDF (Term Frequency-Inverse Document Frequency)**: Extracts statistical features from email text
  - Identifies important words based on frequency and rarity
  - No external embeddings required (lightweight, fast)
  - 1000-word vocabulary built from training data
  
- **Dense Neural Network**: Binary classification
  - 128 hidden units with ReLU activation
  - Batch normalization for stable training
  - Dropout layers to prevent overfitting
  - L2 regularization on weights

**Model Size**: ~500 KB (tiny, fast inference)

**Training Requirements**:
- Minimum 100 email samples (phishing + legitimate)
- CSV/JSON format: `text` (email content) + `label` (0 or 1)
- Training time: 20 epochs, ~2-5 minutes on modern browser

**Usage**:
```typescript
import { getEmailModel } from '@lib/ml/tfidf-email-model'

const emailModel = getEmailModel()
await emailModel.train(emailTexts, labels)
const prediction = await emailModel.predict(emailContent)
// prediction.isPhishing: boolean
// prediction.confidence: 0-1
// prediction.features.suspiciousWords: string[]
```

---

### 2. SMS Phishing Detection (Bi-LSTM)

**File**: `src/lib/ml/bilstm-sms-model.ts`

**Purpose**: Detect phishing attempts in SMS/text messages

**Architecture**:
```
SMS Text → Tokenize → Embedding(32D) → BiLSTM(64 units) → 
Dropout(0.3) → Dense(32) → Dense(1, sigmoid) → [0, 1] probability
```

**Features**:
- **Word Tokenization**: Vocabulary built from training data
  - Word-based (not character-based) for better semantic understanding
  - 5,000-word vocabulary (handles most SMS content)
  - Handles unknown words gracefully
  
- **Small Embedding Layer**: 32-dimensional embeddings
  - Lightweight and fast to compute
  - Still captures semantic relationships
  
- **Bidirectional LSTM**: Processes SMS in both directions
  - Captures long-range dependencies
  - Single layer (not stacked) for browser efficiency
  - 64 hidden units (sufficient for SMS length)

**Model Size**: ~800 KB (fast inference, <100ms per SMS)

**Training Requirements**:
- Minimum 100 SMS samples
- CSV/JSON format: `text` (SMS content) + `label` (0 or 1)
- Training time: 15 epochs, ~3-7 minutes

**Usage**:
```typescript
import { getSMSModel } from '@lib/ml/bilstm-sms-model'

const smsModel = getSMSModel()
await smsModel.train(smsTexts, labels)
const prediction = await smsModel.predictSMS(smsContent)
// prediction.isPhishing: boolean
// prediction.confidence: 0-1
// prediction.features.suspiciousTokens: string[]
```

---

### 3. URL Phishing Detection (Character-level CNN)

**File**: `src/lib/ml/lightweight-url-cnn.ts`

**Purpose**: Detect phishing indicators in URLs

**Architecture**:
```
URL → Character Encoding → Embedding(16D) → 
Conv1D(32 filters, k=3) → MaxPool → Conv1D(64 filters, k=4) → 
GlobalMaxPool → Dense(64) → Dense(1, sigmoid) → [0, 1] probability
```

**Features**:
- **Character-level Encoding**: No tokenization needed
  - Works with any URL structure
  - Learns character patterns (typosquatting, domain spoofing)
  - 50-character charset (letters, numbers, special chars)
  
- **Single-scale CNN**: Efficient multi-feature extraction
  - Conv1D layers with 3 and 4 kernel sizes
  - Global max pooling to fixed-size output
  - No multi-scale approach (reduced parameters)
  
- **Built-in Heuristics**: Complementary rule-based checks
  - Detects IP addresses, suspicious TLDs
  - Identifies brand impersonation
  - Recognizes URL shorteners
  - Checks for HTTPS presence

**Model Size**: ~600 KB

**Training Requirements**:
- Minimum 100 URLs (phishing + legitimate)
- CSV/JSON format: `text` (URL) + `label` (0 or 1)
- Training time: 20 epochs, ~2-4 minutes

**Usage**:
```typescript
import { getURLCNNModel } from '@lib/ml/lightweight-url-cnn'

const urlModel = getURLCNNModel()
await urlModel.train(urls, labels)
const prediction = await urlModel.predict(url)
// prediction.isPhishing: boolean
// prediction.confidence: 0-1
// prediction.features.suspiciousPatterns: string[]
```

---

### 4. QR Code Phishing Detection

**File**: `src/lib/ml/qr-phishing-service.ts` + URL Model

**Purpose**: Decode QR codes and analyze the extracted URL for phishing

**Pipeline**:
```
QR Image → jsQR (QR Decoder) → Extract URL → URL Model → Prediction
```

**Features**:
- **QR Decoding**: Browser-native QR code scanning
  - Uses jsQR library for fast, accurate decoding
  - Returns raw URL from QR code
  
- **URL Analysis**: Reuses trained URL CNN model
  - Analyzes the decoded URL for phishing indicators
  - Same architecture as URL model

**Model Size**: ~600 KB (URL model) + ~20 KB (QR decoder)

**Usage**:
```typescript
import { getQRPhishingService } from '@lib/ml/qr-phishing-service'

const qrService = getQRPhishingService()
const analysis = await qrService.analyzeQRImage(imageFile)
// analysis.decodedURL: string
// analysis.isPhishing: boolean
// analysis.confidence: number
```

---

## Unified ML Service

**File**: `src/lib/ml/unified-ml-service.ts`

**Purpose**: Single interface for all models, training, and predictions

**Key Methods**:
```typescript
const mlService = getMLService()

// Unified prediction interface
const result = await mlService.predict(content, scanType)
// scanType: 'email' | 'sms' | 'link' | 'qr'
// Returns: MLPredictionResult with threat level, indicators, recommendations

// Train models
await mlService.trainEmail(emails, labels, onProgress)
await mlService.trainSMS(smsMessages, labels, onProgress)
await mlService.trainURL(urls, labels, onProgress)

// Check model status
const status = mlService.getModelStatus()
// { email: {ready: boolean, vocabularySize: number}, ... }
```

---

## Dataset Format & Loading

**File**: `src/lib/ml/dataset-loader.ts`

### Supported Formats

#### CSV Format
```csv
text,label
"Click here to verify your account",1
"Your package has been delivered",0
"Urgent: Confirm your payment method",1
```

#### JSON Format
```json
[
  {"text": "Click here to verify your account", "label": 1},
  {"text": "Your package has been delivered", "label": 0},
  {"text": "Urgent: Confirm your payment method", "label": 1}
]
```

### Label Conventions
- **Phishing**: `1`, `true`, `"phishing"`, `"spam"`
- **Legitimate**: `0`, `false`, `"legitimate"`, `"ham"`

### Dataset Utilities
```typescript
import {
  loadFromFile,          // Load from browser file upload
  loadFromURL,           // Load from remote URL
  parseCSV,              // Parse CSV text
  parseJSON,             // Parse JSON text
  splitDataset,          // Train/test split
  balanceDataset,        // Balance phishing/legitimate
  mergeDatasets,         // Combine multiple datasets
  getDatasetStats,       // Get statistics
  validateDataset        // Validate format and balance
} from '@lib/ml/dataset-loader'

// Example usage
const dataset = await loadFromFile(csvFile)
const stats = getDatasetStats(dataset)
// {totalSamples, phishingSamples, legitimateSamples, phishingRatio, ...}

const {train, test} = splitDataset(dataset, 0.2)
await mlService.trainEmail(train.texts, train.labels)
```

---

## Model Training Workflow

### 1. Prepare Dataset
```typescript
import { loadFromFile, validateDataset, balanceDataset, splitDataset } from '@lib/ml/dataset-loader'

// Load dataset
const rawDataset = await loadFromFile(csvFile)

// Validate
const validation = validateDataset(rawDataset)
if (!validation.valid) {
  console.error('Dataset issues:', validation.errors)
  return
}

// Balance (equal phishing and legitimate)
const balanced = balanceDataset(rawDataset)

// Split into train/test
const { train, test } = splitDataset(balanced, 0.2)
```

### 2. Train Model
```typescript
const mlService = getMLService()

const result = await mlService.trainEmail(
  train.texts,
  train.labels,
  (progress) => {
    console.log(`Epoch ${progress.epoch}/${progress.totalEpochs}`)
    console.log(`Accuracy: ${progress.accuracy}`)
    console.log(`Loss: ${progress.loss}`)
  }
)

if (result.success) {
  console.log('Training successful!')
  console.log(`Final Accuracy: ${result.metrics.accuracy}`)
} else {
  console.error('Training failed:', result.message)
}
```

### 3. Evaluate & Make Predictions
```typescript
// Make predictions
const testResults = await mlService.emailModel.predictBatch(test.texts)

// Evaluate accuracy
let correct = 0
for (let i = 0; i < testResults.length; i++) {
  if ((testResults[i].isPhishing ? 1 : 0) === test.labels[i]) {
    correct++
  }
}
const accuracy = correct / test.labels.length
console.log(`Test Accuracy: ${(accuracy * 100).toFixed(2)}%`)

// Make predictions on new data
const prediction = await mlService.predict(newEmail, 'email')
console.log('Threat Level:', prediction.threatLevel)
console.log('Confidence:', prediction.confidence + '%')
console.log('Indicators:', prediction.indicators)
```

---

## Performance Metrics

### Model Sizes
| Model | Size | Inference Time | Memory |
|-------|------|-----------------|--------|
| Email (TF-IDF + Dense) | 500 KB | ~10 ms | ~2 MB |
| SMS (Bi-LSTM) | 800 KB | ~20 ms | ~3 MB |
| URL (Character CNN) | 600 KB | ~15 ms | ~2.5 MB |
| **Total** | **1.9 MB** | **~15 ms avg** | **~7.5 MB** |

### Training Performance (Modern Browser)
- Email: ~2-5 minutes (1000 samples, 20 epochs)
- SMS: ~3-7 minutes (1000 samples, 15 epochs)
- URL: ~2-4 minutes (1000 samples, 20 epochs)

### Accuracy Targets
- Email: 90-95% (after training on domain-specific data)
- SMS: 85-92%
- URL: 88-94%

---

## Privacy & Security

✅ **Completely Client-Side**
- All models run in browser
- No data uploaded to servers
- User retains full control of datasets

✅ **No External Dependencies**
- Uses only TensorFlow.js and jsQR
- No API calls for predictions
- Works offline

✅ **Model Size Optimized**
- Total footprint: ~1.9 MB (all models)
- Fast download over any connection
- Minimal memory usage

---

## Integration with Scanner Component

The Scanner component uses `UnifiedMLService` for predictions:

```typescript
import { getMLService } from '@lib/ml'

const mlService = getMLService()

// In Scanner component
const result = await mlService.predict(userInput, scanType)

// Returns formatted MLPredictionResult with:
// - isPhishing: boolean
// - confidence: 0-100
// - threatLevel: 'safe' | 'suspicious' | 'dangerous'
// - indicators: string[]
// - analysis: string
// - recommendations: string[]
// - riskScore: 0-100
```

---

## Best Practices

### 1. Dataset Preparation
- Collect diverse, real-world examples
- Balance phishing and legitimate samples (50/50 ideally)
- Remove duplicates
- Ensure consistent labeling

### 2. Model Training
- Start with small datasets (100-500 samples)
- Increase gradually for better accuracy
- Monitor validation metrics
- Watch for overfitting

### 3. Threshold Tuning
- Default: 0.5 probability threshold
- Can be adjusted based on use case
- Higher threshold = fewer false positives
- Lower threshold = fewer false negatives

### 4. Periodic Retraining
- Retrain monthly with new samples
- Adapt to evolving phishing tactics
- Users can upload their own datasets
- Continuous improvement possible

---

## Troubleshooting

### Model Not Training
- Check browser DevTools console for errors
- Ensure TensorFlow.js is loaded
- Verify dataset format is correct
- Check that labels are 0 or 1

### Poor Prediction Accuracy
- Ensure training dataset is large enough (100+ samples)
- Verify dataset is balanced (check stats)
- Check that data is domain-specific (email data for email model)
- Validate label accuracy in training data

### Memory Issues
- Reduce batch size during training
- Use smaller datasets
- Clear browser cache
- Close other tabs/applications

---

## Future Improvements

- [ ] Model persistence (IndexedDB storage)
- [ ] Continuous learning from user feedback
- [ ] Ensemble methods (combine models)
- [ ] Transformer-based models for better accuracy
- [ ] Real-time collaborative learning
- [ ] Mobile app with offline ML

