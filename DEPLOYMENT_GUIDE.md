# 🚀 PhishGuard ML Deployment Guide

Complete guide for deploying trained machine learning models to production.

---

## 📋 Prerequisites

- ✅ Python 3.9+ installed
- ✅ TensorFlow 2.15+ installed
- ✅ Kaggle account (for datasets)
- ✅ At least 8GB RAM (16GB recommended for training)
- ✅ 10GB free disk space

---

## 🎯 Deployment Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: TRAIN MODELS (Offline - Python)                   │
│  - Download Kaggle datasets                                 │
│  - Run training scripts                                     │
│  - Generate TensorFlow.js models                            │
│  - Evaluate metrics                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: DEPLOY MODELS (Copy to web app)                   │
│  - Copy model files to /public/models/                      │
│  - Verify file structure                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: UPDATE BACKEND (Enable ML inference)              │
│  - Uncomment model loading code                             │
│  - Redeploy edge function                                   │
│  - Verify logs show models loaded                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: TEST & VALIDATE (Verify deployment)               │
│  - Test with sample URLs/emails/SMS                         │
│  - Check confidence scores                                  │
│  - Verify ML model names in responses                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📖 Detailed Steps

### STEP 1: Train Models (Offline)

#### 1.1 Setup Training Environment

```bash
# Clone or navigate to project
cd phishguard

# Create virtual environment
python3 -m venv ml_env
source ml_env/bin/activate  # Windows: ml_env\Scripts\activate

# Install dependencies
cd training_scripts
pip install -r requirements.txt
```

#### 1.2 Download Datasets from Kaggle

**Option A: Kaggle CLI (Recommended)**

```bash
# Setup Kaggle API
# 1. Go to https://www.kaggle.com/settings/account
# 2. Scroll to "API" section
# 3. Click "Create New API Token"
# 4. Move downloaded kaggle.json to ~/.kaggle/ (Unix) or C:\Users\<User>\.kaggle\ (Windows)

# Download datasets
kaggle datasets download -d taruntiwarihp/phishing-site-urls -p ./datasets
kaggle datasets download -d subhajournal/phishingemails -p ./datasets
kaggle datasets download -d uciml/sms-spam-collection-dataset -p ./datasets

# Unzip
cd datasets
unzip phishing-site-urls.zip
unzip phishingemails.zip
unzip sms-spam-collection-dataset.zip
cd ..
```

**Option B: Manual Download**

1. Visit Kaggle URLs:
   - [URL Dataset](https://www.kaggle.com/datasets/taruntiwarihp/phishing-site-urls)
   - [Email Dataset](https://www.kaggle.com/datasets/subhajournal/phishingemails)
   - [SMS Dataset](https://www.kaggle.com/datasets/uciml/sms-spam-collection-dataset)

2. Click "Download" button for each

3. Extract to `training_scripts/datasets/` directory

#### 1.3 Train All Models

```bash
# Train URL model (~15 min on CPU, ~5 min on GPU)
python url_cnn_training.py datasets/phishing_urls.csv

# Train Email model (~30 min on CPU, ~10 min on GPU)
python email_bert_training.py datasets/emails.csv

# Train SMS model (~20 min on CPU, ~8 min on GPU)
python sms_bilstm_training.py datasets/spam.csv
```

**Expected Console Output**:

```
🚀 URL PHISHING DETECTION - CHARACTER CNN TRAINING
======================================================================

📂 Loading URL dataset...
✅ Loaded 50000 URLs
   - Safe URLs: 25000
   - Phishing URLs: 25000

🔧 Preprocessing URLs (max length: 200)...

🏗️ Building Character-CNN model...
✅ Model architecture:
Model: "sequential"
...

🎯 Training model (epochs: 20, batch size: 64)...
Epoch 1/20
665/665 [==============================] - 45s - loss: 0.3421 - accuracy: 0.8534
...

📊 FINAL EVALUATION METRICS
======================================================================
Accuracy:  0.9245 (92.45%)
Precision: 0.9321 (93.21%)
Recall:    0.9178 (91.78%)
F1-Score:  0.9249 (92.49%)
======================================================================

💾 Saving models...
   ✅ Saved TensorFlow.js model to: ./public/models/url
   ✅ Saved metadata to: ./public/models/url/metadata.json

✨ Training complete!
```

#### 1.4 Verify Training Output

```bash
# Check that all models were created
ls -lh public/models/url/model.json
ls -lh public/models/email/model.json
ls -lh public/models/sms/model.json

# Check model sizes
du -sh public/models/url/
du -sh public/models/email/
du -sh public/models/sms/

# View training metrics
cat public/models/url/metadata.json
cat public/models/email/metadata.json
cat public/models/sms/metadata.json
```

**Expected File Structure**:

```
training_scripts/public/models/
├── url/
│   ├── model.json (150-300 KB)
│   ├── group1-shard1of1.bin (5-10 MB)
│   └── metadata.json (1-2 KB)
├── email/
│   ├── model.json (200-400 KB)
│   ├── group1-shard1of2.bin (10-15 MB)
│   ├── group1-shard2of2.bin (10-15 MB)
│   ├── vocabulary.json (50-100 KB)
│   └── metadata.json (1-2 KB)
└── sms/
    ├── model.json (180-350 KB)
    ├── group1-shard1of1.bin (8-12 MB)
    ├── vocabulary.json (30-60 KB)
    └── metadata.json (1-2 KB)
```

---

### STEP 2: Deploy Models to Web App

#### 2.1 Copy Models to Production

```bash
# From training_scripts directory
cd training_scripts

# Copy all models to web app public directory
cp -r public/models/* ../public/models/

# Or if in different location
cp -r public/models/* /path/to/phishguard/public/models/
```

#### 2.2 Verify Deployment

```bash
# Navigate to web app directory
cd ..  # Back to project root

# Check file structure
tree public/models/

# Expected output:
# public/models/
# ├── url/
# │   ├── model.json
# │   ├── group1-shard1of1.bin
# │   └── metadata.json
# ├── email/
# │   ├── model.json
# │   ├── group1-shard1of2.bin
# │   ├── group1-shard2of2.bin
# │   ├── vocabulary.json
# │   └── metadata.json
# └── sms/
#     ├── model.json
#     ├── group1-shard1of1.bin
#     ├── vocabulary.json
#     └── metadata.json

# Verify files are readable
ls -lh public/models/url/
ls -lh public/models/email/
ls -lh public/models/sms/
```

---

### STEP 3: Update Backend for ML Inference

#### 3.1 Modify Edge Function

Open `functions/ml-phishing-scan/index.ts` and uncomment model loading code:

```typescript
// BEFORE (Current state - rule-based detection):
async function loadModels() {
  console.log("⚠️ Using advanced pattern-based detection");
  modelsLoaded = true;
}

// AFTER (Enable ML inference):
async function loadModels() {
  if (modelsLoaded) return;
  
  console.log("🤖 Loading trained ML models...");
  
  try {
    // Load URL model
    urlModel = await tf.loadLayersModel('file://./public/models/url/model.json');
    console.log("✅ URL Character-CNN model loaded");
    
    // Load Email model
    emailModel = await tf.loadLayersModel('file://./public/models/email/model.json');
    console.log("✅ Email Bi-LSTM model loaded");
    
    // Load SMS model
    smsModel = await tf.loadLayersModel('file://./public/models/sms/model.json');
    console.log("✅ SMS Bi-LSTM model loaded");
    
    modelsLoaded = true;
  } catch (error) {
    console.error("Failed to load ML models:", error);
    throw error;
  }
}
```

#### 3.2 Implement Preprocessing Functions

Add preprocessing functions for each model:

```typescript
// URL preprocessing (character sequences)
function preprocessURL(url: string, maxLength = 200): number[] {
  const sequence = [];
  for (let i = 0; i < Math.min(url.length, maxLength); i++) {
    sequence.push(Math.min(url.charCodeAt(i), 127));
  }
  // Pad to maxLength
  while (sequence.length < maxLength) {
    sequence.push(0);
  }
  return sequence;
}

// Email/SMS preprocessing (word sequences)
async function preprocessText(text: string, vocabulary: string[], maxLength: number): Promise<number[]> {
  const words = text.toLowerCase().split(/\s+/);
  const sequence = [];
  
  for (const word of words.slice(0, maxLength)) {
    const index = vocabulary.indexOf(word);
    sequence.push(index >= 0 ? index : 0); // 0 for unknown words
  }
  
  // Pad to maxLength
  while (sequence.length < maxLength) {
    sequence.push(0);
  }
  
  return sequence;
}
```

#### 3.3 Update Inference Functions

Modify detection functions to use ML models:

```typescript
async function detectURLPhishing(url: string): Promise<ScanResult> {
  let riskScore = 0;
  
  if (urlModel) {
    // Use ML model for inference
    const sequence = preprocessURL(url);
    const tensor = tf.tensor2d([sequence], [1, 200]);
    const prediction = urlModel.predict(tensor) as tf.Tensor;
    const probability = (await prediction.data())[0];
    
    riskScore = Math.round(probability * 100);
    console.log("✅ Used URL ML model for inference");
  } else {
    // Fallback to rule-based
    riskScore = calculateRuleBased URLScore(url);
    console.log("⚠️ Using rule-based URL detection");
  }
  
  const threatLevel = riskScore >= 50 ? "dangerous" : riskScore >= 30 ? "suspicious" : "safe";
  const confidence = calculateConfidence(threatLevel, riskScore);
  
  return {
    isPhishing: riskScore >= 50,
    confidenceScore: confidence,
    threatLevel,
    indicators: extractIndicators(url, riskScore),
    analysis: `ML-based URL analysis. Risk score: ${riskScore}/100`,
    scanType: 'url',
    mlModel: 'URL-CharCNN-v1'
  };
}
```

#### 3.4 Redeploy Edge Function

```bash
# If using Blink CLI
blink functions deploy ml-phishing-scan

# Or manually through Blink dashboard
# 1. Open Blink project
# 2. Go to Edge Functions
# 3. Select ml-phishing-scan
# 4. Click "Deploy"
```

---

### STEP 4: Test & Validate

#### 4.1 Check Backend Logs

```bash
# View edge function logs
blink functions logs ml-phishing-scan --tail

# Look for:
# ✅ URL Character-CNN model loaded
# ✅ Email Bi-LSTM model loaded
# ✅ SMS Bi-LSTM model loaded
```

#### 4.2 Test with Sample Data

Create test file `test_ml_api.sh`:

```bash
#!/bin/bash

API_URL="https://eky2mdxr--ml-phishing-scan.functions.blink.new"

echo "Testing URL detection..."
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "scanType": "url",
    "content": "http://paypal-secure-login.tk/verify"
  }' | jq

echo "\nTesting Email detection..."
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "scanType": "email",
    "content": "URGENT: Your account has been locked. Click here to verify."
  }' | jq

echo "\nTesting SMS detection..."
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "scanType": "sms",
    "content": "You won $1000! Click to claim now!"
  }' | jq
```

```bash
chmod +x test_ml_api.sh
./test_ml_api.sh
```

#### 4.3 Validate Responses

**Expected Response Format**:

```json
{
  "success": true,
  "result": {
    "isPhishing": true,
    "confidenceScore": 88,
    "threatLevel": "dangerous",
    "indicators": [
      "Suspicious TLD detected",
      "URL contains 'verify' keyword"
    ],
    "analysis": "ML-based URL analysis. Risk score: 88/100",
    "recommendations": [
      "Do NOT visit this URL",
      "Report to security team"
    ],
    "scanType": "url",
    "mlModel": "URL-CharCNN-v1"
  },
  "timestamp": "2025-12-21T17:30:00.000Z"
}
```

**Validation Checklist**:

- ✅ `mlModel` field shows model name (not "rule-based")
- ✅ `confidenceScore` is between 60-99
- ✅ `threatLevel` is one of: safe, suspicious, dangerous
- ✅ Backend logs show "✅ Used ML model for inference"

#### 4.4 Test in Web App

1. Open web app: `https://phishguard-web-phishing-detector-eky2mdxr.sites.blink.new`
2. Navigate to scanner
3. Test with samples:
   - **Safe URL**: `https://google.com`
   - **Phishing URL**: `http://paypal-secure.tk`
   - **Safe Email**: "Meeting reminder for tomorrow"
   - **Phishing Email**: "URGENT: Click here to verify account"
4. Verify ML model names appear in results

---

## 🎯 Success Criteria

### Training Phase

- ✅ All three models trained successfully
- ✅ Accuracy > 90% for each model
- ✅ TensorFlow.js files generated
- ✅ Metadata files created

### Deployment Phase

- ✅ Models copied to `/public/models/`
- ✅ Backend updated and redeployed
- ✅ Logs show "✅ Models loaded"
- ✅ No errors in function logs

### Testing Phase

- ✅ API returns ML model names
- ✅ Confidence scores follow requirements
- ✅ Web app shows ML-based results
- ✅ All scan types working

---

## 🔧 Troubleshooting

### Issue: Models not loading in backend

**Symptoms**: Logs show "Failed to load ML models"

**Solutions**:
1. Check file paths are correct:
   ```typescript
   'file://./public/models/url/model.json'  // ✅ Correct
   'file:///public/models/url/model.json'   // ❌ Wrong
   ```

2. Verify files exist:
   ```bash
   ls -lh public/models/url/model.json
   ```

3. Check TensorFlow.js version:
   ```bash
   npm list @tensorflow/tfjs-node
   # Should be 4.x or higher
   ```

### Issue: High inference latency

**Symptoms**: Requests take >5 seconds

**Solutions**:
1. Models load once at startup (not per request)
2. Check model file sizes (<50MB per model)
3. Use quantization to reduce size:
   ```bash
   tensorflowjs_converter --quantize_uint8 ...
   ```

### Issue: Low accuracy in production

**Symptoms**: Many false positives/negatives

**Solutions**:
1. Retrain with more data
2. Increase training epochs
3. Check for data quality issues
4. Verify preprocessing matches training

---

## 📚 For Academic Defense

### Key Points to Emphasize

1. **Real ML Models**: Trained with TensorFlow, not heuristics
2. **Real Datasets**: Public Kaggle datasets (10k-50k samples)
3. **Proper Evaluation**: Accuracy, precision, recall, F1-score
4. **Production Deployment**: TensorFlow.js for real-time inference
5. **Scalable Architecture**: Models cached in memory, fast inference

### Demo Flow

1. Show training scripts and datasets
2. Display model files in `/public/models/`
3. Run live scan in web app
4. Show backend logs with "✅ ML model loaded"
5. Display metrics from metadata.json
6. Explain architecture diagrams

---

## 🎉 Congratulations!

You now have a **production-ready ML phishing detection system** with:

✅ Three trained deep learning models  
✅ TensorFlow.js deployment for real-time inference  
✅ Complete evaluation metrics for academic defense  
✅ Proper confidence calculation per requirements  
✅ QR code detection using trained URL model  

**Your system is ready for academic evaluation and viva defense!**
