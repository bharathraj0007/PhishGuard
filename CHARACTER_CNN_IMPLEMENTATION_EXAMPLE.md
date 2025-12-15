# Character-CNN Implementation Examples

This document provides practical code examples for implementing Character-CNN phishing URL detection in PhishGuard.

## Example 1: Basic URL Prediction

```typescript
// Single URL prediction after model is trained
import { CharacterCNNModel } from '@/lib/ml/character-cnn-model';

async function detectPhishingURL(url: string) {
  const model = new CharacterCNNModel();
  await model.build();
  
  const prediction = await model.predict(url);
  
  if (prediction.isPhishing) {
    console.log(`⚠️ PHISHING DETECTED`);
    console.log(`Confidence: ${(prediction.confidence * 100).toFixed(2)}%`);
    console.log(`Threat Level: ${prediction.threatLevel}`);
  } else {
    console.log(`✅ URL appears legitimate`);
  }
  
  return prediction;
}

// Usage
detectPhishingURL('http://suspicious-paypal-verify.com');
```

## Example 2: Batch URL Analysis

```typescript
// Analyze multiple URLs at once
import { CharacterCNNModel } from '@/lib/ml/character-cnn-model';

async function analyzeURLBatch(urls: string[]) {
  const model = new CharacterCNNModel();
  await model.build();
  
  const predictions = await model.predictBatch(urls);
  
  const phishingURLs = predictions.filter(p => p.isPhishing);
  const legitimateURLs = predictions.filter(p => !p.isPhishing);
  
  console.log(`📊 Analysis Results:`);
  console.log(`Total URLs: ${urls.length}`);
  console.log(`Phishing: ${phishingURLs.length} (${((phishingURLs.length / urls.length) * 100).toFixed(1)}%)`);
  console.log(`Legitimate: ${legitimateURLs.length} (${((legitimateURLs.length / urls.length) * 100).toFixed(1)}%)`);
  
  return { phishingURLs, legitimateURLs };
}

// Usage
const urls = [
  'https://www.google.com',
  'https://goog1e-verify.com',
  'https://github.com',
  'https://g1thub-login.com'
];

analyzeURLBatch(urls);
```

## Example 3: Complete Training Pipeline

```typescript
// Full training workflow with CSV data
import { CharacterCNNModel } from '@/lib/ml/character-cnn-model';
import { CharacterCNNTrainingService } from '@/lib/ml/character-cnn-training-service';
import { URLDataProcessor } from '@/lib/ml/url-data-processor';

async function trainCharacterCNNModel(csvFile: File) {
  console.log('🚀 Starting Character-CNN Training Pipeline');
  
  // Step 1: Initialize model
  console.log('1️⃣ Initializing model...');
  const model = new CharacterCNNModel({
    maxSequenceLength: 200,
    embeddingDim: 64,
    vocabularySize: 128,
  });
  await model.build();
  console.log('✅ Model built');
  
  // Step 2: Load data
  console.log('2️⃣ Loading CSV data...');
  const processor = new URLDataProcessor();
  const data = await processor.loadFromCSV(csvFile);
  console.log(`✅ Loaded ${data.length} URL samples`);
  
  // Step 3: Display statistics
  const stats = processor.getStatistics(data);
  console.log('📊 Dataset Statistics:');
  console.log(`   Total: ${stats.totalRecords}`);
  console.log(`   Phishing: ${stats.phishingCount} (${((stats.phishingCount / stats.totalRecords) * 100).toFixed(1)}%)`);
  console.log(`   Legitimate: ${stats.legitimateCount} (${((stats.legitimateCount / stats.totalRecords) * 100).toFixed(1)}%)`);
  console.log(`   Valid URLs: ${stats.validUrls}`);
  console.log(`   Invalid URLs: ${stats.invalidUrls}`);
  
  // Step 4: Train model
  console.log('3️⃣ Training model...');
  const trainingService = new CharacterCNNTrainingService(model);
  
  const result = await trainingService.train(data, {
    epochs: 20,
    batchSize: 32,
    learningRate: 0.001,
    validationSplit: 0.2,
    earlyStoppingPatience: 5,
    verbose: true,
  });
  
  console.log('✅ Training complete');
  console.log('📈 Final Metrics:');
  console.log(`   Accuracy: ${(result.metrics.accuracy * 100).toFixed(2)}%`);
  console.log(`   Precision: ${(result.metrics.precision * 100).toFixed(2)}%`);
  console.log(`   Recall: ${(result.metrics.recall * 100).toFixed(2)}%`);
  console.log(`   F1 Score: ${result.metrics.f1Score.toFixed(4)}`);
  console.log(`   Training Time: ${(result.trainingTime / 1000).toFixed(2)}s`);
  
  return { model, result };
}

// Usage in React component
async function handleTrainingSubmit(csvFile: File) {
  try {
    const { model, result } = await trainCharacterCNNModel(csvFile);
    alert(`✅ Training successful!\nAccuracy: ${(result.metrics.accuracy * 100).toFixed(2)}%`);
  } catch (error) {
    alert(`❌ Training failed: ${error.message}`);
  }
}
```

## Example 4: Real-time Training Progress Monitoring

```typescript
// Monitor training progress in real-time
import { CharacterCNNTrainingService } from '@/lib/ml/character-cnn-training-service';
import { CharacterCNNModel } from '@/lib/ml/character-cnn-model';

async function trainWithProgressTracking(
  data: Array<{ url: string; label: number }>,
  onProgress: (progress: any) => void
) {
  const model = new CharacterCNNModel();
  await model.build();
  
  const trainingService = new CharacterCNNTrainingService(model);
  
  // Start monitoring progress
  const progressInterval = setInterval(() => {
    const progress = trainingService.getProgress();
    if (progress) {
      onProgress({
        epoch: progress.epoch,
        totalEpochs: progress.totalEpochs,
        progress: progress.progress,
        loss: progress.loss,
        accuracy: progress.accuracy,
        valLoss: progress.valLoss,
        valAccuracy: progress.valAccuracy,
      });
    }
  }, 500);
  
  try {
    const result = await trainingService.train(data, {
      epochs: 20,
      batchSize: 32,
      learningRate: 0.001,
    });
    
    return result;
  } finally {
    clearInterval(progressInterval);
  }
}

// React component example
import { useState } from 'react';

function TrainingComponent() {
  const [progress, setProgress] = useState(null);
  
  const handleStartTraining = async (csvFile: File) => {
    const processor = new URLDataProcessor();
    const data = await processor.loadFromCSV(csvFile);
    
    const result = await trainWithProgressTracking(data, setProgress);
    
    console.log('Training completed:', result.metrics);
  };
  
  return (
    <div>
      <h3>Character-CNN Training</h3>
      {progress && (
        <div>
          <p>Epoch: {progress.epoch}/{progress.totalEpochs}</p>
          <progress value={progress.progress} max={100} />
          <p>Loss: {progress.loss.toFixed(4)} | Accuracy: {progress.accuracy.toFixed(4)}</p>
        </div>
      )}
    </div>
  );
}
```

## Example 5: Model Evaluation on Test Set

```typescript
// Evaluate trained model on test data
import { CharacterCNNTrainingService } from '@/lib/ml/character-cnn-training-service';
import { CharacterCNNModel } from '@/lib/ml/character-cnn-model';

async function evaluateModel(
  model: CharacterCNNModel,
  testData: Array<{ url: string; label: number }>
) {
  const trainingService = new CharacterCNNTrainingService(model);
  
  const testUrls = testData.map(d => d.url);
  const testLabels = testData.map(d => d.label);
  
  const metrics = await trainingService.evaluate(testUrls, testLabels);
  
  console.log('📊 Test Metrics:');
  console.log(`   Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%`);
  console.log(`   Loss: ${metrics.loss.toFixed(4)}`);
  console.log(`   Precision: ${(metrics.precision * 100).toFixed(2)}%`);
  console.log(`   Recall: ${(metrics.recall * 100).toFixed(2)}%`);
  console.log(`   F1 Score: ${metrics.f1Score.toFixed(4)}`);
  
  return metrics;
}

// Usage
const testData = [
  { url: 'http://legitimate-bank.com', label: 0 },
  { url: 'http://phishing-bank-verify.com', label: 1 },
  // ... more test samples
];

const metrics = await evaluateModel(model, testData);
```

## Example 6: CSV Data Loading via Edge Function

```typescript
// Load CSV data from URL using edge function
async function loadPhishingDataset(csvUrl: string) {
  const response = await fetch('https://eky2mdxr-ba194aemtb77.deno.dev', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      csvUrl: csvUrl,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to load CSV: ${response.statusText}`);
  }
  
  const result = await response.json();
  
  console.log('✅ CSV loaded successfully');
  console.log('📊 Statistics:');
  console.log(`   Total Records: ${result.stats.totalRecords}`);
  console.log(`   Phishing: ${result.stats.phishingCount}`);
  console.log(`   Legitimate: ${result.stats.legitimateCount}`);
  
  return result.data;
}

// Usage
const data = await loadPhishingDataset(
  'https://firebasestorage.googleapis.com/v0/b/blink-451505.firebasestorage.app/o/.../dataset.csv'
);
```

## Example 7: Integration with PhishGuard Scanner

```typescript
// Use Character-CNN in the Scanner component
import { PredictionService } from '@/lib/ml/prediction-service';
import { CharacterCNNModel } from '@/lib/ml/character-cnn-model';

async function scanURLWithCharacterCNN(url: string) {
  const predictionService = new PredictionService();
  await predictionService.initialize();
  
  // Analyze with Character-CNN (URL-specific)
  const analysis = await predictionService.analyzeCharacterCNNURL(url);
  
  return {
    algorithm: 'Character-CNN',
    isPhishing: analysis.isPhishing,
    confidence: analysis.confidence,
    threatLevel: analysis.threatLevel,
    indicators: analysis.indicators,
  };
}

// Scanner component integration
async function handleScanURL(url: string) {
  const result = await scanURLWithCharacterCNN(url);
  
  if (result.isPhishing) {
    showAlert({
      type: 'danger',
      title: '🚨 Phishing Detected',
      message: `This URL has a ${(result.confidence * 100).toFixed(1)}% probability of being phishing.`,
      indicators: result.indicators,
    });
  } else {
    showAlert({
      type: 'success',
      title: '✅ URL Appears Safe',
      message: `Confidence: ${(result.confidence * 100).toFixed(1)}%`,
    });
  }
  
  return result;
}
```

## Example 8: Model Persistence - Save & Load

```typescript
// Save trained model for reuse
import { ModelPersistence } from '@/lib/ml/model-persistence';
import { CharacterCNNModel } from '@/lib/ml/character-cnn-model';

async function saveAndLoadModel(trainedModel: CharacterCNNModel) {
  const persistence = new ModelPersistence();
  
  // Save model
  console.log('💾 Saving model...');
  await persistence.saveModel(trainedModel, 'phishing-detector-v1');
  console.log('✅ Model saved');
  
  // Later: Load model
  console.log('📂 Loading model...');
  const loadedModel = await persistence.loadModel('phishing-detector-v1');
  console.log('✅ Model loaded');
  
  // Use loaded model
  const prediction = await loadedModel.predict('http://test-url.com');
  console.log(prediction);
}
```

## Example 9: Data Augmentation & Preprocessing

```typescript
// Augment dataset for better training
import { URLDataProcessor } from '@/lib/ml/url-data-processor';

async function augmentTrainingData(csvFile: File) {
  const processor = new URLDataProcessor();
  const data = await processor.loadFromCSV(csvFile);
  
  console.log(`📊 Original dataset: ${data.length} samples`);
  
  // Check class balance
  const phishingCount = data.filter(d => d.label === 1).length;
  const legitimateCount = data.filter(d => d.label === 0).length;
  
  console.log(`   Phishing: ${phishingCount}`);
  console.log(`   Legitimate: ${legitimateCount}`);
  
  // Augment if imbalanced
  if (phishingCount < legitimateCount * 0.5) {
    console.log('⚠️ Dataset imbalanced, augmenting...');
    const augmented = processor.augmentData(data, 1.5);
    console.log(`✅ Augmented dataset: ${augmented.length} samples`);
    return augmented;
  }
  
  return data;
}
```

## Example 10: Batch Prediction with Results Export

```typescript
// Analyze multiple URLs and export results
import { CharacterCNNModel } from '@/lib/ml/character-cnn-model';

async function analyzeBatchAndExport(urls: string[]) {
  const model = new CharacterCNNModel();
  await model.build();
  
  console.log(`🔍 Analyzing ${urls.length} URLs...`);
  const predictions = await model.predictBatch(urls);
  
  // Prepare results
  const results = predictions.map((pred, idx) => ({
    url: urls[idx],
    isPhishing: pred.isPhishing,
    confidence: (pred.confidence * 100).toFixed(2),
    threatLevel: pred.isPhishing ? 'HIGH' : 'LOW',
    timestamp: new Date().toISOString(),
  }));
  
  // Export to CSV
  const csvContent = [
    ['URL', 'Is Phishing', 'Confidence %', 'Threat Level', 'Timestamp'],
    ...results.map(r => [r.url, r.isPhishing, r.confidence, r.threatLevel, r.timestamp]),
  ]
    .map(row => row.join(','))
    .join('\n');
  
  // Download
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `phishing-analysis-${Date.now()}.csv`;
  a.click();
  
  console.log('✅ Results exported');
  return results;
}
```

## Performance Tips

1. **Batch Processing**: Process multiple URLs at once instead of one-by-one
2. **Model Caching**: Keep model in memory between predictions
3. **Memory Management**: Dispose tensors after use
4. **Edge Functions**: Use Deno functions for large-scale training
5. **IndexedDB**: Store large datasets locally for offline access

## Error Handling Template

```typescript
async function robustCharacterCNNAnalysis(url: string) {
  try {
    const model = new CharacterCNNModel();
    await model.build();
    
    const prediction = await model.predict(url);
    return prediction;
    
  } catch (error) {
    console.error('Character-CNN Analysis Error:', error);
    
    if (error.message.includes('memory')) {
      console.log('💡 Try: Reduce batch size or model complexity');
    } else if (error.message.includes('build')) {
      console.log('💡 Try: Check TensorFlow.js is loaded');
    } else if (error.message.includes('URL')) {
      console.log('💡 Try: Verify URL format is valid');
    }
    
    return { isPhishing: null, confidence: 0, error: error.message };
  }
}
```
