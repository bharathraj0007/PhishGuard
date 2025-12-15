# Bi-LSTM SMS Phishing Detection Training Guide

## Overview

This guide explains how to build, train, and deploy a **Bidirectional LSTM (Bi-LSTM)** neural network model specifically designed for **SMS phishing detection** using TensorFlow.js.

The Bi-LSTM model processes SMS text bidirectionally to understand context from both directions, making it highly effective at identifying phishing patterns in short message services.

## Architecture

### Bi-LSTM Model Structure

```
Input SMS Text (max 256 characters)
        ↓
Embedding Layer (128 dims)
        ↓
Bidirectional LSTM Layer 1 (128 units, 50% dropout)
        ↓
Bidirectional LSTM Layer 2 (128 units, 50% dropout)
        ↓
Dropout (20%)
        ↓
Dense Layer (64 units, ReLU activation)
        ↓
Dropout (20%)
        ↓
Output Layer (1 unit, Sigmoid activation)
        ↓
Binary Classification (0.0-1.0 probability)
```

### Key Components

| Component | Purpose |
|-----------|---------|
| **Embedding Layer** | Converts character indices to dense vectors (128 dimensions) |
| **Bidirectional LSTM** | Processes text forward and backward to capture full context |
| **Dropout Layers** | Prevents overfitting by randomly disabling neurons (20% rate) |
| **Dense Layers** | Learns complex patterns from LSTM output |
| **Sigmoid Output** | Produces phishing probability (0-1) |

## Data Format

### Supported CSV Formats

#### Format 1: spam.csv (v1, v2 columns)
```csv
v1,v2
ham,Go until jurong point crazy...
spam,Free entry in 2 a wkly comp...
ham,Ok lar Joking wif u oni...
```

#### Format 2: combined_dataset.csv (target, text columns)
```csv
target,text
spam,Congratulations! You've won a luxury vacation...
ham,Hi, how are you doing today?
spam,URGENT: Your account has been compromised...
```

### Data Statistics

**Example Dataset:**
- Total Records: ~5,500 SMS messages
- Phishing SMS: ~747 (13.5%)
- Legitimate SMS: ~4,825 (86.5%)
- Average SMS Length: 79 characters
- Max SMS Length: 918 characters

## Training Process

### Step 1: Load Dataset

```typescript
import { SMSDataProcessor } from '@/lib/ml/sms-data-processor'
import { fetch } from '@blinkdotnew/sdk'

// Fetch CSV file
const response = await fetch(csvUrl)
const csvText = await response.text()

// Parse and process CSV
const dataset = SMSDataProcessor.detectFormatAndExtract(csvText)

console.log('Dataset loaded:')
console.log(`- Total records: ${dataset.statistics.totalRecords}`)
console.log(`- Phishing: ${dataset.statistics.phishingCount}`)
console.log(`- Legitimate: ${dataset.statistics.legitimateCount}`)
```

### Step 2: Balance Dataset

```typescript
// Balance dataset using oversampling
const balancedRecords = SMSDataProcessor.balanceDataset(dataset.records)

// Split into train/validation/test
const { train, validation, test } = SMSDataProcessor.splitDataset(
  balancedRecords,
  0.7,  // 70% training
  0.15  // 15% validation, 15% test
)
```

### Step 3: Build Model

```typescript
import { BiLSTMSMSModel } from '@/lib/ml/bilstm-sms-model'

const model = new BiLSTMSMSModel()
await model.build()

// Get model summary
model.getSummary()
```

### Step 4: Train Model

```typescript
import { BiLSTMTrainingService } from '@/lib/ml/bilstm-training-service'

const trainer = new BiLSTMTrainingService(model)

const { metrics, summary } = await trainer.train(
  balancedRecords,
  {
    epochs: 10,
    batchSize: 32,
    validationSplit: 0.2,
    learningRate: 0.001
  },
  (metrics) => {
    // Progress callback
    console.log(`Epoch ${metrics.epoch}: Loss=${metrics.loss.toFixed(4)}, Accuracy=${metrics.accuracy.toFixed(4)}`)
  }
)

console.log('Training complete!')
console.log(`Final Accuracy: ${(summary.finalAccuracy * 100).toFixed(1)}%`)
console.log(`F1 Score: ${(summary.f1 * 100).toFixed(1)}%`)
```

### Step 5: Evaluate Model

```typescript
const evaluation = await trainer.evaluate(test)

console.log('Test Set Evaluation:')
console.log(`- Accuracy: ${(evaluation.accuracy * 100).toFixed(1)}%`)
console.log(`- Precision: ${(evaluation.precision * 100).toFixed(1)}%`)
console.log(`- Recall: ${(evaluation.recall * 100).toFixed(1)}%`)
console.log(`- F1 Score: ${(evaluation.f1Score * 100).toFixed(1)}%`)
```

## Using the Model

### Single SMS Prediction

```typescript
const { phishingProbability, isPhishing, confidence } = await model.predictSMS(
  'Congratulations! You won $1000. Click here to claim: http://bit.ly/123abc'
)

if (isPhishing) {
  console.log(`⚠️ PHISHING DETECTED (${(phishingProbability * 100).toFixed(1)}% confidence)`)
} else {
  console.log(`✅ Legitimate SMS`)
}
```

### Batch Predictions

```typescript
const smsMessages = [
  'Hi, how are you?',
  'URGENT: Verify your account now!',
  'Meet me for lunch tomorrow'
]

const predictions = await model.predictBatch(smsMessages)

predictions.forEach((pred) => {
  console.log(`${pred.text}: ${pred.isPhishing ? '🔴 Phishing' : '🟢 Legitimate'}`)
})
```

## Integration with PhishGuard

### In the Prediction Service

```typescript
// src/lib/ml/prediction-service.ts
async analyzeText(text: string, scanType: 'email' | 'sms' | 'link' | 'qr') {
  // Use Bi-LSTM SMS for SMS detection
  if (scanType === 'sms' && this.biLSTMSMSModel) {
    const prediction = await this.biLSTMSMSModel.predictSMS(text)
    return {
      threatLevel: prediction.phishingProbability > 0.7 ? 'high' : 'medium',
      confidence: prediction.confidence,
      isPhishing: prediction.isPhishing,
      modelType: 'bilstm'
    }
  }
  // ... other scan types
}
```

### In the Admin Dashboard

1. Navigate to **Admin Dashboard → ML Training**
2. Click the **"Bi-LSTM SMS Training"** tab
3. Select a CSV dataset (spam.csv or combined_dataset.csv)
4. Configure training parameters:
   - **Epochs**: 10 (number of training iterations)
   - **Batch Size**: 32 (samples per training step)
   - **Validation Split**: 0.2 (20% for validation)
5. Click **"Start Training"**
6. Monitor progress in real-time
7. View final metrics and deploy when satisfied

## Training Configuration

### Recommended Settings

| Parameter | Recommended | Range | Impact |
|-----------|-------------|-------|--------|
| **Epochs** | 10-15 | 5-50 | More = better but slower |
| **Batch Size** | 32 | 8-128 | Smaller = better but slower |
| **Learning Rate** | 0.001 | 0.0001-0.01 | Smaller = more stable |
| **Dropout** | 0.2 | 0.1-0.5 | Higher = less overfitting |
| **LSTM Units** | 128 | 64-256 | Larger = more capacity |

### Hyperparameter Tuning

**For Higher Accuracy:**
```typescript
{
  epochs: 15,
  batchSize: 16,
  validationSplit: 0.2,
  learningRate: 0.0005
}
```

**For Faster Training:**
```typescript
{
  epochs: 5,
  batchSize: 64,
  validationSplit: 0.1,
  learningRate: 0.001
}
```

**For Production Robustness:**
```typescript
{
  epochs: 20,
  batchSize: 32,
  validationSplit: 0.2,
  learningRate: 0.0008
}
```

## Performance Metrics

### Understanding the Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| **Accuracy** | % of correct predictions | >85% |
| **Precision** | % of phishing alerts that are true phishing | >90% |
| **Recall** | % of actual phishing SMS detected | >80% |
| **F1 Score** | Harmonic mean of precision & recall | >85% |
| **Loss** | Training error (lower is better) | <0.4 |

### Expected Results

With ~5,500 SMS records:
- **Training Accuracy**: 85-92%
- **Validation Accuracy**: 82-89%
- **Precision**: 85-94%
- **Recall**: 78-88%
- **F1 Score**: 82-91%

## Advanced Features

### Data Augmentation

```typescript
// Augment SMS text with variations
const variations = SMSDataProcessor.augmentSMS(
  'Verify your account now!'
)
// Returns: [original, with replacements, normalized, lowercased]
```

### Phishing Indicators Detection

```typescript
const indicators = SMSDataProcessor.detectPhishingIndicators(smsText)
// Returns: ['urgency', 'financial_promise', 'account_verification', ...]
```

### Dataset Validation

```typescript
const { valid, invalid } = SMSDataProcessor.validateRecords(records)

console.log(`Valid records: ${valid.length}`)
console.log(`Invalid records: ${invalid.length}`)
```

## Troubleshooting

### Model Not Building

```typescript
// Ensure TensorFlow.js is imported
import * as tf from '@tensorflow/tfjs'

// Check model build
try {
  await model.build()
  console.log('Model built successfully')
} catch (error) {
  console.error('Build error:', error)
}
```

### Training Stops Early

**Solutions:**
1. Increase batch size to 64
2. Reduce learning rate to 0.0005
3. Use more training data
4. Check for NaN values in data

### Poor Performance

**Strategies:**
1. Balance dataset (use SMSDataProcessor.balanceDataset)
2. Train longer (increase epochs to 15-20)
3. Use data augmentation
4. Adjust hyperparameters
5. Ensure dataset quality

### Out of Memory

**Solutions:**
1. Reduce batch size to 8-16
2. Reduce LSTM units (from 128 to 64)
3. Limit SMS length (already set to 256 chars)
4. Train on subset of data first

## Database Storage

### Save Training Record

```typescript
await blink.db.modelVersions.create({
  versionNumber: `bilstm-sms-v1`,
  description: `Bi-LSTM SMS Phishing Detection - 5500 SMS records`,
  trainingDatasetId: 'sms-phishing-dataset',
  trainingStartedAt: new Date().toISOString(),
  trainingCompletedAt: new Date().toISOString(),
  status: 'completed',
  isActive: 1,
  metrics: JSON.stringify({
    finalAccuracy: 0.88,
    finalValAccuracy: 0.86,
    precision: 0.89,
    recall: 0.85,
    f1Score: 0.87
  }),
  config: JSON.stringify({
    epochs: 10,
    batchSize: 32,
    validationSplit: 0.2
  }),
  createdBy: 'admin'
})
```

## Edge Functions

### Load CSV Data

**Endpoint**: `https://eky2mdxr-ba194aemtb77.deno.dev`

```typescript
const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    csvUrl: 'https://your-csv-url.com/data.csv',
    datasetName: 'SMS Phishing Dataset'
  })
})

const data = await response.json()
// Returns: { success, totalRecords, phishingCount, statistics, sampleRecords }
```

### Train Bi-LSTM Model

**Endpoint**: `https://eky2mdxr-r7kzprae1t00.deno.dev`

```typescript
const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    csvUrl: 'https://your-csv-url.com/data.csv',
    epochs: 10,
    batchSize: 32,
    validationSplit: 0.2,
    datasetName: 'SMS Phishing Dataset'
  })
})

const result = await response.json()
// Returns: { success, modelId, training, dataset, metrics }
```

## Complete Example

```typescript
import { BiLSTMSMSModel } from '@/lib/ml/bilstm-sms-model'
import { BiLSTMTrainingService } from '@/lib/ml/bilstm-training-service'
import { SMSDataProcessor } from '@/lib/ml/sms-data-processor'

async function trainAndEvaluateModel() {
  try {
    // 1. Load data
    const csvUrl = 'https://...spam.csv'
    const response = await fetch(csvUrl)
    const csvText = await response.text()
    
    // 2. Process data
    const dataset = SMSDataProcessor.detectFormatAndExtract(csvText)
    console.log(`Loaded: ${dataset.statistics.totalRecords} SMS records`)
    
    // 3. Balance and split
    const balanced = SMSDataProcessor.balanceDataset(dataset.records)
    const { train, validation, test } = SMSDataProcessor.splitDataset(balanced)
    
    // 4. Build model
    const model = new BiLSTMSMSModel()
    await model.build()
    
    // 5. Train model
    const trainer = new BiLSTMTrainingService(model)
    const { metrics, summary } = await trainer.train(
      train,
      { epochs: 10, batchSize: 32, validationSplit: 0.2 },
      (m) => console.log(`Epoch ${m.epoch}: Acc=${(m.accuracy*100).toFixed(1)}%`)
    )
    
    // 6. Evaluate
    const evaluation = await trainer.evaluate(test)
    console.log(`\nTest Accuracy: ${(evaluation.accuracy * 100).toFixed(1)}%`)
    console.log(`Precision: ${(evaluation.precision * 100).toFixed(1)}%`)
    console.log(`F1 Score: ${(evaluation.f1Score * 100).toFixed(1)}%`)
    
    // 7. Test predictions
    const testSMS = [
      'Hi how are you',
      'Claim your free prize now!',
      'Can we meet tomorrow?'
    ]
    const predictions = await model.predictBatch(testSMS)
    predictions.forEach(p => {
      console.log(`"${p.text}": ${p.isPhishing ? '🔴' : '🟢'} ${(p.phishingProbability*100).toFixed(1)}%`)
    })
    
  } catch (error) {
    console.error('Training error:', error)
  }
}

// Run
trainAndEvaluateModel()
```

## Files Reference

| File | Purpose |
|------|---------|
| `src/lib/ml/bilstm-sms-model.ts` | Bi-LSTM model architecture |
| `src/lib/ml/sms-data-processor.ts` | SMS data loading & preprocessing |
| `src/lib/ml/bilstm-training-service.ts` | Training pipeline |
| `src/components/BiLSTMSMSTraining.tsx` | Admin UI component |
| `functions/ml-sms-data-loader/index.ts` | Edge function for CSV loading |
| `functions/ml-bilstm-sms-training/index.ts` | Edge function for training |

## Best Practices

1. **Always balance datasets** - Use oversampling for minority class
2. **Validate data quality** - Remove empty or invalid records
3. **Use stratified splitting** - Maintain class distribution in train/val/test
4. **Monitor training** - Check metrics for overfitting
5. **Test on unseen data** - Evaluate on test set after training
6. **Save model versions** - Keep track of trained models
7. **Document hyperparameters** - Record config with model version

## Next Steps

1. ✅ Build Bi-LSTM SMS model
2. ✅ Load and preprocess CSV data
3. ✅ Implement training pipeline
4. ✅ Create admin UI
5. ✅ Deploy edge functions
6. 🔜 Deploy trained model to production
7. 🔜 Monitor performance over time
8. 🔜 Retrain with new SMS data

---

**Created**: December 2025  
**Framework**: TensorFlow.js 4.22.0  
**Model Type**: Bidirectional LSTM for SMS Classification  
**Status**: Production Ready
