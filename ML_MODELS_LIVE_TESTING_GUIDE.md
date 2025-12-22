# ML Models Live Testing Guide

## Overview

PhishGuard now includes comprehensive ML model training, validation, and deployment infrastructure for real-time phishing detection across all scan types (URL, Email, SMS, QR).

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PhishGuard ML Pipeline                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐     ┌───────────────┐     ┌─────────────┐ │
│  │   Training  │────▶│  Validation   │────▶│ Deployment  │ │
│  │   Service   │     │   Service     │     │  Service    │ │
│  └─────────────┘     └───────────────┘     └─────────────┘ │
│        │                     │                     │         │
│        │                     │                     │         │
│  ┌─────▼─────────────────────▼─────────────────────▼──────┐ │
│  │            Browser Storage (IndexedDB)                  │ │
│  │  - Trained Models (TensorFlow.js)                      │ │
│  │  - Validation Metrics                                  │ │
│  │  - Model Checkpoints                                   │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │            Scanner Component (Production)               │ │
│  │  - Real-time inference                                 │ │
│  │  - Automatic fallback to rule-based detection          │ │
│  │  - Performance monitoring                              │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Features Implemented

### 1. Model Training Service (`browser-training-service.ts`)
- **Browser-based training**: All training happens in the browser using TensorFlow.js
- **Dataset loading**: Loads training data from Blink database
- **Data preprocessing**: 
  - Character-level encoding for URLs (256 chars max)
  - Word-level encoding for Email/SMS/QR (100 tokens max)
- **Model architectures**:
  - URL: Character-level CNN
  - Email/SMS/QR: BiLSTM/LSTM with embeddings
- **Training progress**: Real-time epoch updates, loss, and accuracy
- **Model persistence**: Saves trained models to IndexedDB

### 2. Model Validation Service (`model-validation-service.ts`)
- **Comprehensive metrics**:
  - Accuracy, Precision, Recall, F1-Score
  - Specificity
  - Confusion Matrix (TP, TN, FP, FN)
- **Live testing**: Tests models with real-world phishing/legitimate samples
- **Test dataset**: Uses held-out test set (20% split)
- **Pass/fail criteria**: Models must achieve >70% accuracy and F1-score
- **Detailed reporting**: Timestamp, dataset size, per-sample predictions

### 3. Model Deployment Service (`model-deployment-service.ts`)
- **Automatic model loading**: Loads trained models on demand
- **Inference API**: Simple `predict()` method for Scanner
- **Performance tracking**: Measures prediction time
- **Graceful fallback**: Falls back to rule-based detection if ML fails
- **Model caching**: Keeps loaded models in memory
- **Batch loading**: Can load all models at once

### 4. Model Metrics Dashboard (`ModelMetricsDashboard.tsx`)
- **Real-time validation**: Validate models with one click
- **Comprehensive metrics display**:
  - Core metrics (Accuracy, Precision, Recall, F1)
  - Confusion matrix visualization
  - Live test results with pass/fail indicators
  - Dataset information
- **Per-model tabs**: Separate metrics for URL, Email, SMS, QR
- **Status indicators**: Shows which models are trained/available
- **Re-validation**: Can revalidate after retraining

## Usage Guide

### For End Users (Dashboard Interface)

#### Step 1: Train Models
1. Navigate to Dashboard → **ML Training** tab
2. Choose a scan type (URL, Email, SMS, or QR)
3. Click **"Train with Kaggle"** (uses real phishing datasets) or **"Quick Train"** (synthetic data)
4. Wait for training to complete (2-5 minutes)
5. Trained model is automatically saved to browser storage

#### Step 2: Validate Models
1. Navigate to Dashboard → **Metrics** tab
2. Select the scan type you want to validate
3. Click **"Validate Model"**
4. Wait for validation (30-60 seconds)
5. Review metrics:
   - ✅ **Green badge**: Model passed validation (>70% accuracy)
   - ⚠️ **Yellow badge**: Model needs improvement
   - Check confusion matrix for error analysis
   - Review live test results for real-world performance

#### Step 3: Use Models in Production
1. Go to Dashboard → **Scanner** tab
2. Trained models are **automatically loaded** and used
3. Scan any content (URL, Email, SMS, QR)
4. Results will show:
   - `✨ ML Model Detection: XX% confidence` - if ML model is used
   - `🤖 Rule-based detection` - if ML model not available
   - Processing time in milliseconds

### For Developers

#### Training a Model Programmatically

```typescript
import { BrowserMLTrainingService } from './lib/ml/browser-training-service';

const trainingService = new BrowserMLTrainingService();

// Train URL model
const result = await trainingService.train(
  {
    scanType: 'url',
    maxSamples: 1000,
    epochs: 10,
    batchSize: 32,
    balance: true,
    testSplit: 0.2
  },
  (progress) => {
    console.log(`${progress.stage}: ${progress.message}`);
    if (progress.epoch) {
      console.log(`Epoch ${progress.epoch}/${progress.totalEpochs}`);
      console.log(`Loss: ${progress.loss}, Accuracy: ${progress.accuracy}`);
    }
  }
);

console.log('Training completed:', result);
```

#### Validating a Model

```typescript
import { getValidationService } from './lib/ml/model-validation-service';

const validationService = getValidationService();

// Validate Email model
const report = await validationService.validateModel('email', 200);

console.log('Validation Report:');
console.log(`Accuracy: ${(report.metrics.accuracy * 100).toFixed(1)}%`);
console.log(`Precision: ${(report.metrics.precision * 100).toFixed(1)}%`);
console.log(`Recall: ${(report.metrics.recall * 100).toFixed(1)}%`);
console.log(`F1-Score: ${(report.metrics.f1Score * 100).toFixed(1)}%`);
console.log(`Validated: ${report.validated ? 'PASS' : 'FAIL'}`);

// Print confusion matrix
console.log('Confusion Matrix:');
console.log(`TP: ${report.metrics.confusionMatrix.truePositive}`);
console.log(`TN: ${report.metrics.confusionMatrix.trueNegative}`);
console.log(`FP: ${report.metrics.confusionMatrix.falsePositive}`);
console.log(`FN: ${report.metrics.confusionMatrix.falseNegative}`);

// Check live test results
report.liveTests.forEach((test, idx) => {
  const status = test.correct ? '✓' : '✗';
  console.log(`${status} ${test.input.substring(0, 50)}...`);
  console.log(`  Predicted: ${test.predicted}, Actual: ${test.actualLabel}`);
});
```

#### Making Predictions

```typescript
import { getDeploymentService } from './lib/ml/model-deployment-service';

const deploymentService = getDeploymentService();

// Load model (automatic, only once)
await deploymentService.loadModel('link');

// Make prediction
const result = await deploymentService.predict(
  'http://paypal-secure-login.tk/verify',
  'link'
);

console.log('Prediction:', result);
// {
//   isPhishing: true,
//   confidence: 0.89,
//   threatLevel: 'dangerous',
//   modelUsed: 'ml',
//   processingTime: 45 // ms
// }
```

## Live Testing Samples

### URL Model Test Samples
```typescript
const urlTests = [
  // Legitimate
  { url: 'https://www.google.com', expected: 'safe' },
  { url: 'https://github.com/login', expected: 'safe' },
  { url: 'https://www.amazon.com/products', expected: 'safe' },
  
  // Phishing
  { url: 'http://paypal-secure-login-verify.tk', expected: 'phishing' },
  { url: 'https://microsoft-account-recovery.xyz/login', expected: 'phishing' },
  { url: 'http://bit.ly/urgentupdate123', expected: 'phishing' },
  { url: 'http://192.168.1.1/verify', expected: 'phishing' },
];
```

### Email Model Test Samples
```typescript
const emailTests = [
  // Legitimate
  { email: 'Thank you for your order #12345. Tracking: ABC123', expected: 'safe' },
  { email: 'Meeting scheduled for tomorrow at 3pm in Conference Room A', expected: 'safe' },
  
  // Phishing
  { email: 'URGENT: Your account has been suspended! Click here to verify immediately', expected: 'phishing' },
  { email: 'Your payment failed. Update your card now or lose access forever', expected: 'phishing' },
  { email: 'Congratulations! You won $5000. Claim your prize at winner-portal.tk', expected: 'phishing' },
];
```

### SMS Model Test Samples
```typescript
const smsTests = [
  // Legitimate
  { sms: 'Your package will arrive tomorrow between 2-4pm', expected: 'safe' },
  { sms: 'Reminder: Doctor appointment on Friday at 10am', expected: 'safe' },
  
  // Phishing
  { sms: 'URGENT! Your bank account has suspicious activity. Verify now: bit.ly/xxx', expected: 'phishing' },
  { sms: 'You won $5000! Claim your prize immediately at winner-portal.tk', expected: 'phishing' },
  { sms: 'Your card is locked. Update PIN immediately or account will be closed.', expected: 'phishing' },
];
```

## Performance Benchmarks

### Expected Model Performance

| Model | Min Accuracy | Min F1-Score | Inference Time | Training Time |
|-------|-------------|--------------|----------------|---------------|
| URL   | 75%         | 70%          | 30-50ms        | 3-5 min       |
| Email | 70%         | 68%          | 40-60ms        | 4-6 min       |
| SMS   | 72%         | 70%          | 35-55ms        | 3-5 min       |
| QR    | 75%         | 70%          | 30-50ms        | 3-5 min       |

### System Requirements

- **Browser**: Modern browser with IndexedDB support (Chrome 80+, Firefox 75+, Safari 14+)
- **Memory**: 2GB+ RAM recommended for training
- **Storage**: 50MB+ free space in IndexedDB for models
- **GPU**: Not required (CPU-based TensorFlow.js)

## Troubleshooting

### Model Not Training
1. Check browser console for errors
2. Verify training dataset exists in database (`training_records` table)
3. Ensure sufficient browser storage (IndexedDB quota)
4. Try with smaller dataset (`maxSamples: 500`)

### Validation Failing
1. Ensure model is trained first
2. Check if test dataset has sufficient samples (need 10+ samples minimum)
3. Review confusion matrix to identify error patterns
4. Consider retraining with more data or different hyperparameters

### Predictions Not Using ML
1. Check if model is loaded: `getDeploymentService().getModelStatus()`
2. Verify model exists in IndexedDB (Dev Tools → Application → IndexedDB)
3. Check browser console for loading errors
4. System gracefully falls back to rule-based detection if ML fails

### Poor Model Performance
1. Train with larger dataset (increase `maxSamples`)
2. Increase training epochs (`epochs: 15-20`)
3. Balance dataset (`balance: true`)
4. Collect more diverse training samples
5. Check for data quality issues in `training_records`

## Next Steps

### Immediate (Completed ✓)
- ✅ Training service with progress tracking
- ✅ Validation service with comprehensive metrics
- ✅ Deployment service with automatic loading
- ✅ Metrics dashboard UI
- ✅ Integration with Scanner component

### Future Enhancements
- [ ] Model versioning and rollback
- [ ] A/B testing between models
- [ ] Transfer learning from pre-trained models
- [ ] Automated hyperparameter tuning
- [ ] Ensemble models (combine multiple models)
- [ ] Real-time model updates from server
- [ ] Model performance analytics over time
- [ ] Export models for edge deployment

## API Reference

### Training Service
```typescript
class BrowserMLTrainingService {
  async train(config: TrainingConfig, onProgress?: (progress: TrainingProgress) => void): Promise<TrainingResult>
}

interface TrainingConfig {
  scanType: 'url' | 'email' | 'sms' | 'qr';
  maxSamples?: number;
  testSplit?: number;
  balance?: boolean;
  epochs?: number;
  batchSize?: number;
  validationSplit?: number;
}
```

### Validation Service
```typescript
class ModelValidationService {
  async validateModel(scanType: ScanType, testSize?: number): Promise<ValidationReport>
  generateReportSummary(report: ValidationReport): string
}

interface ValidationReport {
  scanType: string;
  timestamp: string;
  metrics: ValidationMetrics;
  liveTests: LiveTestResult[];
  datasetSize: number;
  modelPath: string;
  validated: boolean;
}
```

### Deployment Service
```typescript
class ModelDeploymentService {
  async loadModel(scanType: ScanType): Promise<boolean>
  async loadAllModels(): Promise<{ loaded: ScanType[]; failed: ScanType[] }>
  async predict(content: string, scanType: ScanType): Promise<PredictionResult>
  getModelStatus(): Record<ScanType, boolean>
  unloadModel(scanType: ScanType): void
}

interface PredictionResult {
  isPhishing: boolean;
  confidence: number;
  threatLevel: 'safe' | 'suspicious' | 'dangerous';
  modelUsed: 'ml' | 'rule-based';
  processingTime: number;
}
```

## Conclusion

PhishGuard's ML pipeline provides production-ready phishing detection with:
- **Browser-based training**: No server required
- **Comprehensive validation**: Detailed metrics and live testing
- **Automatic deployment**: Models load on-demand
- **Graceful degradation**: Falls back to rules if ML unavailable
- **User-friendly interface**: Dashboard for training, validation, and metrics

All models are trained and validated locally in the browser, ensuring privacy and instant availability.

---

**Last Updated**: December 2024
**Version**: 1.0
**Status**: Production Ready ✅
