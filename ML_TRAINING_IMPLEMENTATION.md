# PhishGuard ML Training Implementation

Complete browser-based machine learning implementation using TensorFlow.js and Blink AI database.

## Overview

This implementation provides a complete ML training pipeline that runs entirely in the browser:

1. **Dataset Loading** - Fetch training data from Blink database
2. **Data Preprocessing** - Tokenization, vectorization, normalization
3. **Model Creation** - TensorFlow.js neural network architectures
4. **Model Training** - Browser-based training with model.fit()
5. **Real-time Prediction** - Phishing detection inference

## Architecture

### 1. Dataset Loading (`blink-dataset-loader.ts`)

Loads training datasets from Blink database instead of external sources.

**Key Functions:**
- `loadTrainingDataFromDB(scanType)` - Load data by type (url/email/sms/qr)
- `loadAllTrainingData()` - Load all available datasets
- `getDatasetStatistics()` - Get dataset info and counts
- `splitDataset()` - Split into train/test sets
- `balanceDataset()` - Balance phishing/legitimate samples

**Database Integration:**
```typescript
// Query training_records table
const result = await blink.db.sql(`
  SELECT * FROM training_records 
  WHERE scan_type = 'url'
`);

// Process records
const texts = records.map(r => r.content);
const labels = records.map(r => Number(r.isPhishing));
```

### 2. Text Preprocessing (`text-preprocessing.ts`)

All preprocessing happens in JavaScript, no external dependencies.

**Key Functions:**
- `cleanText()` - Normalize and clean text
- `tokenize()` - Split text into tokens
- `buildVocabulary()` - Create word-to-index mapping
- `textToSequence()` - Convert text to number sequences
- `padSequences()` - Pad sequences to fixed length
- `buildCharVocabulary()` - Character-level vocabulary
- `TFIDFVectorizer` - TF-IDF feature extraction

**Example:**
```typescript
// Word-level processing
const vocabulary = buildVocabulary(texts, 10000);
const sequences = texts.map(t => textToSequence(t, vocabulary));
const padded = padSequences(sequences, 100);

// Character-level processing
const charVocab = buildCharVocabulary();
const charSeq = textToCharSequence(url, charVocab, 256);
```

### 3. Model Architectures (`tfjs-models.ts`)

Lightweight, browser-compatible neural networks.

**Available Models:**

1. **URLDetectionModel** - Feed-forward NN for URL features
2. **TextLSTMModel** - LSTM for sequential text
3. **BiLSTMModel** - Bidirectional LSTM for better context
4. **CharacterCNNModel** - CNN for character-level URL analysis
5. **SimpleCNNModel** - Lightweight CNN
6. **CNNLSTMModel** - Hybrid architecture

**Model Configurations:**

```typescript
const MODEL_CONFIGS = {
  url: {
    type: 'char-cnn',
    config: {
      vocabSize: 70,
      maxLength: 256
    }
  },
  email: {
    type: 'text-bilstm',
    config: {
      vocabSize: 10000,
      embeddingDim: 32,
      maxLength: 150
    }
  },
  sms: {
    type: 'text-lstm',
    config: {
      vocabSize: 5000,
      embeddingDim: 32,
      maxLength: 100
    }
  },
  qr: {
    type: 'simple-cnn',
    config: {
      vocabSize: 5000,
      maxLength: 100
    }
  }
};
```

**Example Model:**
```typescript
// Character CNN for URLs
const model = tf.sequential({
  layers: [
    tf.layers.embedding({
      inputDim: 70,
      outputDim: 16,
      inputLength: 256
    }),
    tf.layers.conv1d({
      filters: 32,
      kernelSize: 3,
      activation: 'relu'
    }),
    tf.layers.maxPooling1d({ poolSize: 2 }),
    tf.layers.flatten(),
    tf.layers.dense({ units: 64, activation: 'relu' }),
    tf.layers.dropout({ rate: 0.3 }),
    tf.layers.dense({ units: 1, activation: 'sigmoid' })
  ]
});

model.compile({
  optimizer: tf.train.adam(0.001),
  loss: 'binaryCrossentropy',
  metrics: ['accuracy']
});
```

### 4. Training Service (`browser-training-service.ts`)

Complete training pipeline that runs in the browser.

**Training Stages:**
1. Load data from Blink database
2. Preprocess and balance dataset
3. Build model architecture
4. Convert data to tensors
5. Train with model.fit()
6. Evaluate on test set
7. Save to IndexedDB

**Training Function:**
```typescript
const result = await trainModel('url', {
  maxSamples: 5000,      // Limit for memory
  epochs: 10,            // Training iterations
  balance: true,         // Balance dataset
  batchSize: 32,         // Batch size
  validationSplit: 0.1,  // Validation data
  onProgress: (progress) => {
    console.log(`${progress.stage}: ${progress.message}`);
    console.log(`Epoch ${progress.epoch}/${progress.totalEpochs}`);
    console.log(`Accuracy: ${progress.accuracy}`);
  }
});
```

**Training Results:**
```typescript
{
  success: true,
  scanType: 'url',
  metrics: {
    trainAccuracy: 0.95,
    trainLoss: 0.15,
    testAccuracy: 0.92,
    testLoss: 0.21
  },
  datasetInfo: {
    totalSamples: 4000,
    trainSamples: 3200,
    testSamples: 800,
    phishingRatio: 0.5
  },
  trainingTime: 45000,
  modelSaved: true
}
```

### 5. Prediction Service (`ml-prediction-service.ts`)

Real-time phishing detection using trained models.

**Key Functions:**
- `loadModel(scanType)` - Load model from IndexedDB
- `predict(content, scanType)` - Single prediction
- `predictBatch(contents, scanType)` - Batch prediction
- `checkMLModelsAvailable()` - Check which models exist
- `deleteModel(scanType)` - Delete trained model

**Prediction Example:**
```typescript
// Load prediction service
const service = getPredictionService();

// Make prediction
const result = await service.predict(
  'http://suspicious-site.com',
  'url'
);

console.log(result);
// {
//   isPhishing: true,
//   confidence: 0.87,
//   threatLevel: 'high',
//   processingTime: 25,
//   rawScore: 0.87,
//   modelType: 'url'
// }
```

**Threat Levels:**
- `safe` - Score < 0.3
- `low` - Score 0.3-0.5
- `medium` - Score 0.5-0.7
- `high` - Score 0.7-0.9
- `critical` - Score > 0.9

## Usage Guide

### Step 1: Prepare Datasets

Upload training datasets to Blink database:

```typescript
// Datasets should be in training_records table:
// - content: TEXT (URL, email, SMS, or QR content)
// - scan_type: TEXT ('url', 'email', 'sms', 'qr')
// - is_phishing: INTEGER (0 or 1)

// Example record:
{
  content: "http://paypal-secure-login.phishing.com",
  scan_type: "url",
  is_phishing: 1
}
```

### Step 2: Train Models

Using the UI component:

1. Navigate to Admin Dashboard → ML Training tab
2. Select a model type (URL, Email, SMS, or QR)
3. Click "Train Model"
4. Wait for training to complete (1-5 minutes)

Using the API:

```typescript
import { trainModel } from './lib/ml';

const result = await trainModel('url', {
  epochs: 10,
  balance: true,
  onProgress: (progress) => {
    console.log(progress.message);
  }
});

if (result.success) {
  console.log('Model trained successfully!');
  console.log(`Test accuracy: ${result.metrics.testAccuracy}`);
}
```

### Step 3: Use Trained Models

```typescript
import { predictPhishing } from './lib/ml';

const prediction = await predictPhishing(
  'http://example.com',
  'url'
);

if (prediction.isPhishing) {
  console.log(`⚠️ Phishing detected!`);
  console.log(`Threat level: ${prediction.threatLevel}`);
  console.log(`Confidence: ${(prediction.confidence * 100).toFixed(2)}%`);
}
```

## Browser Constraints

### Memory Limits

- Keep epochs low (5-15)
- Use small batch sizes (16-64)
- Limit dataset size with maxSamples
- Dispose tensors after use

### Storage

- Models saved to IndexedDB (persistent)
- Each model ~5-20 MB
- No server-side storage needed

### Performance

- Training: 1-5 minutes per model
- Inference: 10-50ms per prediction
- Runs on Web Workers (future enhancement)

## Technical Details

### Data Flow

```
Blink Database (training_records)
  ↓
Load & Parse (blink-dataset-loader.ts)
  ↓
Preprocess (text-preprocessing.ts)
  ↓
Convert to Tensors
  ↓
Train Model (TensorFlow.js model.fit())
  ↓
Save to IndexedDB
  ↓
Load for Prediction
  ↓
Real-time Inference
```

### Model Storage

```
IndexedDB Storage:
- indexeddb://phishguard-url-model
- indexeddb://phishguard-email-model
- indexeddb://phishguard-sms-model
- indexeddb://phishguard-qr-model
```

### Tensor Memory Management

```typescript
// Always dispose tensors
const tensor = tf.tensor2d(data);
const result = model.predict(tensor);
tensor.dispose();  // Free memory
result.dispose();  // Free memory
```

## Best Practices

1. **Dataset Size**: 1000+ samples per type for good accuracy
2. **Balance**: Use equal phishing/legitimate samples
3. **Vocabulary**: Limit to 5000-10000 words
4. **Sequence Length**: 100-256 tokens max
5. **Epochs**: 5-15 for browser training
6. **Batch Size**: 32-64 for memory efficiency
7. **Validation**: Always use test split (20%)

## Troubleshooting

### Training Fails

- Check dataset has enough samples (100+ minimum)
- Reduce epochs or batch size
- Clear browser cache and retry
- Check browser console for errors

### Low Accuracy

- Increase dataset size
- Balance phishing/legitimate samples
- Increase epochs (up to 20)
- Try different model architecture

### Out of Memory

- Reduce maxSamples parameter
- Reduce batch size
- Clear other tabs/applications
- Use more powerful device

## API Reference

See `src/lib/ml/index.ts` for complete API documentation.

## Future Enhancements

1. Web Workers for background training
2. Transfer learning from pre-trained models
3. Ensemble models for better accuracy
4. Online learning (incremental updates)
5. Model compression for smaller size
6. GPU acceleration (WebGL backend)

## License

Part of PhishGuard - All rights reserved.
