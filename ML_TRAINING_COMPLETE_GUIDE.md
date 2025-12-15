# PhishGuard ML Training - Complete Implementation Guide

## Overview

PhishGuard implements **client-side machine learning** for phishing detection using TensorFlow.js. All training and inference happens directly in the browser, with datasets loaded from the Blink database.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Environment                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Dataset Loading (from Blink DB)                         │
│     ↓                                                         │
│  2. Data Preprocessing (JS/TS)                              │
│     ↓                                                         │
│  3. Model Creation (TensorFlow.js)                          │
│     ↓                                                         │
│  4. Model Training (model.fit)                              │
│     ↓                                                         │
│  5. Model Persistence (IndexedDB)                           │
│     ↓                                                         │
│  6. Real-time Prediction                                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Dataset Loading (`blink-dataset-loader.ts`)

**Purpose**: Fetch training data from Blink database

**Key Functions**:
- `loadTrainingDataFromDB(scanType, limit?)` - Load records by type
- `loadAllTrainingData()` - Load all available datasets
- `getDatasetStatistics(scanType?)` - Get dataset info
- `splitDataset(dataset, testRatio)` - Train/test split
- `balanceDataset(dataset)` - Balance phishing/legitimate samples

**Data Source**: `training_records` table in Blink database

**Query Example**:
```typescript
const result = await blink.db.sql<BlinkDatasetRecord>(
  `SELECT * FROM training_records WHERE scan_type = 'email' LIMIT 1000`
);
```

**Output Format**:
```typescript
interface ProcessedDataset {
  texts: string[];        // Raw text content
  labels: number[];       // 0 = legitimate, 1 = phishing
  metadata: {
    totalSamples: number;
    phishingSamples: number;
    legitimateSamples: number;
    source: string;
    scanType: string;
  };
}
```

### 2. Data Preprocessing (`text-preprocessing.ts`)

**Purpose**: Transform raw text into numerical features for ML models

**Key Functions**:

#### Text Cleaning
```typescript
cleanText(text: string) -> string
// Normalizes text: lowercase, removes special chars, normalizes URLs/emails
```

#### Tokenization
```typescript
tokenize(text: string) -> string[]
// Splits text into words
```

#### Vocabulary Building
```typescript
buildVocabulary(texts: string[], maxVocabSize: number, minFrequency: number) 
  -> Map<string, number>
// Creates word-to-index mapping
// Reserves: 0 for <PAD>, 1 for <UNK>
```

#### Sequence Conversion
```typescript
textToSequence(text: string, vocabulary: Map<string, number>) -> number[]
// Converts text to sequence of word indices
```

#### Padding
```typescript
padSequences(sequences: number[][], maxLength: number) -> number[][]
// Pads/truncates sequences to fixed length
```

#### Character-Level Processing (for URLs)
```typescript
buildCharVocabulary() -> Map<string, number>
textToCharSequence(text: string, charVocab: Map<string, number>, maxLength: number) 
  -> number[]
```

**Processing Pipeline Example**:
```
Input:  "URGENT: Your account has been suspended. Click here to verify."
  ↓ cleanText()
  ↓ "urgent your account has been suspended click here to verify"
  ↓ tokenize()
  ↓ ["urgent", "your", "account", "has", "been", "suspended", "click", "here", "to", "verify"]
  ↓ textToSequence(vocabulary)
  ↓ [15, 42, 8, 103, 87, 29, 11, 56, 7, 23]
  ↓ padSequences(maxLength=100)
  ↓ [15, 42, 8, 103, 87, 29, 11, 56, 7, 23, 0, 0, 0, ..., 0]  // padded to 100
```

### 3. Model Architectures (`tfjs-models.ts`)

**Purpose**: Define neural network architectures for different detection types

#### URL Detection: Character-CNN
```typescript
class CharacterCNNModel {
  // Character-level CNN for URL analysis
  // Input: Character sequences (256 chars)
  // Layers: Embedding → Conv1D → MaxPooling → Conv1D → MaxPooling → Dense → Output
}
```

**Architecture**:
```
Input (256 chars) → Embedding(16) → Conv1D(32, k=3) → MaxPool(2) 
  → Conv1D(64, k=3) → MaxPool(2) → Flatten → Dense(64) → Dropout(0.3) 
  → Dense(1, sigmoid)
```

#### Email Detection: BiLSTM
```typescript
class BiLSTMModel {
  // Bidirectional LSTM for email text analysis
  // Input: Word sequences (150 words)
  // Layers: Embedding → BiLSTM → Dense → Output
}
```

**Architecture**:
```
Input (150 words) → Embedding(32) → BiLSTM(32) → Dropout(0.3) 
  → Dense(16) → Dense(1, sigmoid)
```

#### SMS Detection: LSTM
```typescript
class TextLSTMModel {
  // Standard LSTM for SMS text
  // Input: Word sequences (100 words)
  // Layers: Embedding → LSTM → Dense → Output
}
```

**Architecture**:
```
Input (100 words) → Embedding(32) → LSTM(64) → Dense(32) → Dropout(0.3) 
  → Dense(1, sigmoid)
```

#### QR Detection: Simple CNN
```typescript
class SimpleCNNModel {
  // CNN for QR-decoded text
  // Input: Word sequences (100 words)
  // Layers: Embedding → Conv1D → GlobalMaxPooling → Dense → Output
}
```

**Model Compilation**:
```typescript
model.compile({
  optimizer: tf.train.adam(0.001),      // Adam optimizer, learning rate 0.001
  loss: 'binaryCrossentropy',           // Binary classification loss
  metrics: ['accuracy']                  // Track accuracy during training
});
```

### 4. Training Service (`browser-training-service.ts`)

**Purpose**: Complete training pipeline in the browser

**Main Class**: `BrowserMLTrainingService`

**Training Configuration**:
```typescript
interface TrainingConfig {
  scanType: 'url' | 'email' | 'sms' | 'qr';
  maxSamples?: number;      // Limit dataset size (for browser memory)
  testSplit?: number;       // 0.2 = 20% test set
  balance?: boolean;        // Balance phishing/legitimate samples
  epochs?: number;          // Training epochs (default: 10)
  batchSize?: number;       // Batch size (default: 32)
  validationSplit?: number; // Validation split (default: 0.1)
}
```

**Training Stages**:

1. **Loading** (5-15%)
   - Fetch data from Blink database
   - Parse records into texts and labels

2. **Preprocessing** (20-50%)
   - Balance dataset (optional)
   - Split into train/test sets
   - Build vocabulary
   - Convert text to sequences
   - Pad sequences to fixed length
   - Create TensorFlow tensors

3. **Building** (35-40%)
   - Create model architecture
   - Compile model with optimizer

4. **Training** (55-85%)
   - Run model.fit() with progress callbacks
   - Monitor loss and accuracy per epoch

5. **Evaluating** (85-90%)
   - Evaluate on test set
   - Calculate final metrics

6. **Saving** (95-100%)
   - Save model to IndexedDB
   - Clean up tensors

**Training Function**:
```typescript
async train(config: TrainingConfig, onProgress?: (progress: TrainingProgress) => void): 
  Promise<TrainingResult>
```

**Progress Callback**:
```typescript
interface TrainingProgress {
  stage: 'loading' | 'preprocessing' | 'building' | 'training' | 'evaluating' | 'saving' | 'completed' | 'error';
  progress: number;        // 0-100
  message: string;
  epoch?: number;          // Current epoch
  totalEpochs?: number;    // Total epochs
  loss?: number;           // Current loss
  accuracy?: number;       // Current accuracy
}
```

**Training Result**:
```typescript
interface TrainingResult {
  success: boolean;
  scanType: string;
  metrics: {
    trainAccuracy: number;  // Final training accuracy
    trainLoss: number;      // Final training loss
    testAccuracy: number;   // Test set accuracy
    testLoss: number;       // Test set loss
  };
  datasetInfo: {
    totalSamples: number;
    trainSamples: number;
    testSamples: number;
    phishingRatio: number;
  };
  trainingTime: number;     // Milliseconds
  modelSaved: boolean;
  error?: string;
}
```

**Training Example**:
```typescript
import { trainModel } from './lib/ml/browser-training-service';

const result = await trainModel('email', {
  maxSamples: 5000,        // Use up to 5000 samples
  epochs: 10,              // Train for 10 epochs
  balance: true,           // Balance dataset
  onProgress: (progress) => {
    console.log(`${progress.stage}: ${progress.progress}% - ${progress.message}`);
  }
});

console.log('Training complete:', result);
// {
//   success: true,
//   scanType: 'email',
//   metrics: {
//     trainAccuracy: 0.94,
//     trainLoss: 0.15,
//     testAccuracy: 0.92,
//     testLoss: 0.21
//   },
//   trainingTime: 45000,  // 45 seconds
//   modelSaved: true
// }
```

### 5. Model Persistence

**Storage**: IndexedDB (browser's local database)

**Model Path Pattern**: `indexeddb://phishguard-{scanType}-model`

**Examples**:
- `indexeddb://phishguard-url-model`
- `indexeddb://phishguard-email-model`
- `indexeddb://phishguard-sms-model`
- `indexeddb://phishguard-qr-model`

**Save Model**:
```typescript
await model.save('indexeddb://phishguard-email-model');
```

**Load Model**:
```typescript
const model = await tf.loadLayersModel('indexeddb://phishguard-email-model');
```

**List Models**:
```typescript
const models = await tf.io.listModels();
console.log(models);
// {
//   'indexeddb://phishguard-email-model': { ... },
//   'indexeddb://phishguard-url-model': { ... }
// }
```

**Delete Model**:
```typescript
await tf.io.removeModel('indexeddb://phishguard-email-model');
```

### 6. Prediction Service (`ml-prediction-service.ts`)

**Purpose**: Real-time phishing detection using trained models

**Main Class**: `MLPredictionService`

**Key Methods**:

```typescript
// Load a trained model
await service.loadModel('email');

// Predict single input
const prediction = await service.predict(content, 'email');
// {
//   isPhishing: true,
//   confidence: 0.87,
//   threatLevel: 'high',
//   processingTime: 45,
//   rawScore: 0.87,
//   modelType: 'email'
// }

// Batch prediction
const predictions = await service.predictBatch([content1, content2], 'email');
```

**Prediction Pipeline**:
```
Input Text
  ↓ Preprocess (tokenize, sequence, pad)
  ↓ Create Tensor
  ↓ model.predict(tensor)
  ↓ Extract Score
  ↓ Calculate Threat Level
  ↓ Return Result
```

**Threat Level Calculation**:
```typescript
score < 0.3  → 'safe'
score < 0.5  → 'low'
score < 0.7  → 'medium'
score < 0.9  → 'high'
score >= 0.9 → 'critical'
```

## Complete Training Workflow

### Step 1: Upload Training Data

Upload datasets to the `training_records` table in Blink database:

```typescript
await blink.db.trainingRecords.createMany([
  {
    content: "Your account has been suspended. Click here to verify.",
    scanType: 'email',
    isPhishing: 1,
    indicators: JSON.stringify(['urgency', 'suspicious_link'])
  },
  {
    content: "Your package will arrive tomorrow. Track here: fedex.com",
    scanType: 'email',
    isPhishing: 0
  }
  // ... more records
]);
```

### Step 2: Train Model

Use the UI component or programmatic API:

**UI Component** (`BrowserMLTraining.tsx`):
```tsx
import BrowserMLTraining from './components/BrowserMLTraining';

function AdminPage() {
  return <BrowserMLTraining />;
}
```

**Programmatic API**:
```typescript
import { trainModel } from './lib/ml/browser-training-service';

const result = await trainModel('email', {
  epochs: 10,
  balance: true,
  onProgress: (progress) => {
    console.log(progress.message);
  }
});
```

### Step 3: Use Trained Model for Predictions

```typescript
import { getPredictionService } from './lib/ml/ml-prediction-service';

const service = getPredictionService();
await service.loadModel('email');

const prediction = await service.predict(emailContent, 'email');

if (prediction.isPhishing) {
  console.log(`PHISHING DETECTED! Confidence: ${prediction.confidence}`);
}
```

## Model Configurations by Type

### URL Detection (Character-CNN)
```typescript
{
  vocabSize: 70,           // Character vocabulary size
  maxLength: 256,          // Max URL length in characters
  embeddingDim: 16,
  epochs: 10,
  batchSize: 32
}
```

### Email Detection (BiLSTM)
```typescript
{
  vocabSize: 10000,        // Word vocabulary size
  maxLength: 150,          // Max email length in words
  embeddingDim: 32,
  epochs: 10,
  batchSize: 32
}
```

### SMS Detection (LSTM)
```typescript
{
  vocabSize: 5000,
  maxLength: 100,
  embeddingDim: 32,
  epochs: 10,
  batchSize: 32
}
```

### QR Detection (Simple CNN)
```typescript
{
  vocabSize: 5000,
  maxLength: 100,
  epochs: 10,
  batchSize: 32
}
```

## Memory Management

### Browser Constraints

- **Max Dataset Size**: 5,000-10,000 samples recommended
- **Batch Size**: 32 (default) for stable training
- **Epochs**: 10-20 for convergence

### Tensor Cleanup

Always dispose tensors after use:

```typescript
const tensor = tf.tensor2d(data);
// ... use tensor
tensor.dispose();  // Free memory
```

### Model Disposal

```typescript
const service = getPredictionService();
// ... use models
service.dispose();  // Free all model memory
```

## Performance Optimization

### 1. Dataset Sampling
```typescript
// Load limited samples for faster training
const dataset = await loadTrainingDataFromDB('email', 5000);
```

### 2. Data Balancing
```typescript
// Balance classes to prevent bias
const balanced = balanceDataset(dataset);
```

### 3. Model Simplification
- Use smaller vocabulary sizes
- Reduce embedding dimensions
- Use fewer layers
- Lower batch sizes

### 4. Early Stopping
```typescript
callbacks: {
  onEpochEnd: (epoch, logs) => {
    if (logs.val_acc > 0.95) {
      model.stopTraining = true;  // Stop if accuracy is high enough
    }
  }
}
```

## Error Handling

### Dataset Loading Errors
```typescript
try {
  const dataset = await loadTrainingDataFromDB('email');
} catch (error) {
  console.error('Failed to load dataset:', error);
  // Handle: show error to user, use cached data, etc.
}
```

### Training Errors
```typescript
try {
  const result = await trainModel('email', config);
  if (!result.success) {
    console.error('Training failed:', result.error);
  }
} catch (error) {
  console.error('Training error:', error);
}
```

### Prediction Errors
```typescript
try {
  const prediction = await service.predict(content, 'email');
} catch (error) {
  console.error('Prediction error:', error);
  // Fallback to rule-based detection
}
```

## Testing

### Unit Tests
```typescript
// Test preprocessing
const cleaned = cleanText("URGENT: Click NOW!");
expect(cleaned).toBe("urgent click now");

// Test vocabulary
const vocab = buildVocabulary(["hello world", "world peace"], 100);
expect(vocab.has("world")).toBe(true);
```

### Integration Tests
```typescript
// Test training pipeline
const result = await trainModel('email', {
  maxSamples: 100,
  epochs: 2
});
expect(result.success).toBe(true);
expect(result.metrics.testAccuracy).toBeGreaterThan(0.5);
```

### End-to-End Tests
```typescript
// Train and predict
await trainModel('email', { maxSamples: 500, epochs: 5 });
const service = getPredictionService();
await service.loadModel('email');
const prediction = await service.predict(phishingEmail, 'email');
expect(prediction.isPhishing).toBe(true);
```

## Best Practices

1. **Always validate data** before training
2. **Balance datasets** to prevent bias
3. **Use train/test splits** to evaluate properly
4. **Monitor training progress** with callbacks
5. **Clean up tensors** to prevent memory leaks
6. **Save models** after successful training
7. **Handle errors gracefully** with fallbacks
8. **Test predictions** before deployment
9. **Update models regularly** with new data
10. **Document model versions** and performance

## Troubleshooting

### "Out of Memory" Error
**Solution**: Reduce dataset size, batch size, or model complexity

```typescript
// Reduce samples
const dataset = await loadTrainingDataFromDB('email', 2000);

// Reduce batch size
await trainModel('email', { batchSize: 16 });
```

### Training Too Slow
**Solution**: Reduce epochs, use simpler model, or enable WebGL

```typescript
// Use fewer epochs
await trainModel('email', { epochs: 5 });

// Enable WebGL backend
await tf.setBackend('webgl');
```

### Low Accuracy
**Solution**: More training data, more epochs, or different architecture

```typescript
// More epochs
await trainModel('email', { epochs: 20 });

// More data
const dataset = await loadTrainingDataFromDB('email', 10000);
```

### Model Not Loading
**Solution**: Check IndexedDB, retrain model

```typescript
// Check if model exists
const models = await tf.io.listModels();
console.log('Available models:', Object.keys(models));

// Delete and retrain
await deleteModel('email');
await trainModel('email', config);
```

## API Reference

See individual files for detailed API documentation:

- `blink-dataset-loader.ts` - Dataset loading functions
- `text-preprocessing.ts` - Text processing utilities
- `tfjs-models.ts` - Model architectures
- `browser-training-service.ts` - Training pipeline
- `ml-prediction-service.ts` - Inference service

## Conclusion

PhishGuard implements a complete **client-side ML training pipeline** using TensorFlow.js. All operations (data loading, preprocessing, training, inference) run in the browser, providing:

✅ **Privacy**: No data sent to external servers
✅ **Speed**: Real-time predictions
✅ **Flexibility**: Train on custom datasets
✅ **Offline**: Works without internet after training
✅ **Scalability**: Models stored in IndexedDB

The system is production-ready and follows ML best practices for browser-based applications.
