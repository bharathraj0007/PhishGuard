# Complete ML Training Pipeline Documentation

## Overview

PhishGuard now includes a complete client-side ML training pipeline that:

1. **Populates databases** with phishing datasets from Kaggle (CSV/JSON format)
2. **Fetches training data** from Blink database and converts to JavaScript arrays
3. **Preprocesses data** and converts to TensorFlow.js tensors
4. **Trains ML models** in the browser using TensorFlow.js `model.fit()`
5. **Stores metadata** in `training_records` and `model_versions` tables

## Architecture

### Data Flow

```
Kaggle CSV/JSON Dataset
    ↓
Dataset Populator Service
    ↓
training_datasets table (metadata)
training_records table (data rows)
    ↓
Training Data Fetcher Service
    ↓
JavaScript Arrays (texts[], labels[])
    ↓
TensorFlow.js Data Processor
    ↓
TensorFlow.js Tensors (2D/3D)
    ↓
Browser Model Trainer
    ↓
Trained Model (IndexedDB storage)
    ↓
model_versions table (final metrics)
training_records table (epoch logs)
```

## Database Schema

### training_datasets

Stores dataset metadata:

```typescript
{
  id: string                    // "dataset_..."
  name: string                  // "URL Phishing Dataset"
  description: string           // Dataset description
  datasetType: 'url' | 'email' | 'sms'
  recordCount: number           // Number of records
  uploadedBy: string            // User ID
  status: 'pending' | 'active'
  isActive: 1 | 0
  createdAt: string
  updatedAt: string
}
```

### training_records

Stores individual training samples:

```typescript
{
  id: string                    // "record_..."
  datasetId: string             // FK to training_datasets
  content: string               // Text content to analyze
  scanType: 'url' | 'email' | 'sms'
  isPhishing: 1 | 0            // Label
  threatLevel: string
  indicators: string            // JSON array
  notes: string
  createdAt: string
}
```

### model_versions

Stores trained model metadata:

```typescript
{
  id: string                    // "model_..."
  versionNumber: string         // "v1234567890"
  description: string
  modelType: string             // "simple", "char-cnn", "feature"
  trainingDatasetId: string     // FK to training_datasets
  trainingStartedAt: string
  trainingCompletedAt: string
  trainingDuration: number      // milliseconds
  status: 'training' | 'completed'
  isActive: 1 | 0
  metrics: string               // JSON with accuracy, loss
  config: string                // JSON with hyperparameters
  createdBy: string
  createdAt: string
  updatedAt: string
}
```

## Services

### 1. Kaggle Dataset Populator (`kaggle-dataset-populator.ts`)

**Purpose**: Parse CSV/JSON and insert into database

**Key Functions**:

```typescript
// Parse CSV to dataset records
parseCSVToRecords(csvContent: string, type: 'url' | 'email' | 'sms'): DatasetRecord[]

// Parse JSON to dataset records
parseJSONToRecords(jsonContent: string, type: 'url' | 'email' | 'sms'): DatasetRecord[]

// Create dataset metadata entry
createDataset(metadata: DatasetMetadata): Promise<string>

// Insert training records in batches
populateTrainingRecords(datasetId: string, records: DatasetRecord[]): Promise<number>

// Complete pipeline
populateDatasetFromContent(
  content: string,
  format: 'csv' | 'json',
  metadata: DatasetMetadata
): Promise<{ datasetId: string; recordCount: number }>

// Quick test with sample data
populateSampleDatasets(userId: string): Promise<void>
```

**CSV Format**:

```csv
text,label
"http://legitimate-site.com",0
"http://phishing-site.com/fake-login",1
```

**Usage**:

```typescript
import { populateDatasetFromContent } from '@/lib/ml/kaggle-dataset-populator';

const csvData = `text,label
"Safe content",0
"Phishing content",1`;

const result = await populateDatasetFromContent(
  csvData,
  'csv',
  {
    name: 'My Dataset',
    description: 'Test dataset',
    datasetType: 'url',
    recordCount: 0,
    uploadedBy: 'admin'
  }
);

console.log(`Inserted ${result.recordCount} records`);
```

### 2. Training Data Fetcher (`training-data-fetcher.ts`)

**Purpose**: Fetch records from database and convert to arrays

**Key Functions**:

```typescript
// Fetch all active datasets
fetchActiveDatasets(): Promise<TrainingDataset[]>

// Fetch records for specific dataset
fetchDatasetRecords(datasetId: string, limit?: number): Promise<TrainingRecord[]>

// Fetch by scan type
fetchRecordsByScanType(scanType: 'url' | 'email' | 'sms', limit?: number): Promise<TrainingRecord[]>

// Convert to training data arrays
convertRecordsToTrainingData(records: TrainingRecord[]): TrainingData

// Fetch complete training data (with conversion)
fetchTrainingDataForDataset(datasetId: string): Promise<TrainingData | null>

// Get dataset statistics
getDatasetStatistics(datasetId: string): Promise<{
  totalRecords: number;
  phishingCount: number;
  legitimateCount: number;
  scanTypes: Record<string, number>;
}>
```

**Output Format**:

```typescript
interface TrainingData {
  texts: string[];              // ["text1", "text2", ...]
  labels: number[];             // [0, 1, 0, 1, ...]
  metadata: {
    datasetId: string;
    datasetName: string;
    datasetType: string;
    recordCount: number;
  };
}
```

**Usage**:

```typescript
import { fetchTrainingDataForDataset } from '@/lib/ml/training-data-fetcher';

const trainingData = await fetchTrainingDataForDataset('dataset_123');
console.log(`Loaded ${trainingData.texts.length} samples`);
```

### 3. TensorFlow.js Data Processor (`tfjs-data-processor.ts`)

**Purpose**: Convert JavaScript arrays to TensorFlow.js tensors

**Key Functions**:

```typescript
// Word-level tokenization and tensor conversion
convertToTensors(
  texts: string[],
  labels: number[],
  maxLength: number = 100,
  vocabSize?: number
): ProcessedData

// Character-level tensor conversion
convertToCharTensors(
  texts: string[],
  labels: number[],
  maxLength: number = 200
): CharProcessedData

// URL feature extraction and tensor conversion
convertURLsToTensors(
  urls: string[],
  labels: number[]
): ProcessedData

// Balance dataset (equal phishing/legitimate samples)
balanceDataset(
  texts: string[],
  labels: number[]
): { texts: string[]; labels: number[] }
```

**Tensor Shapes**:

- **Word-level**: `[batchSize, maxLength]` (2D)
- **Character-level**: `[batchSize, maxLength, 1]` (3D)
- **Feature-based**: `[batchSize, featureCount]` (2D)

**Usage**:

```typescript
import { convertToTensors, balanceDataset } from '@/lib/ml/tfjs-data-processor';

// Balance dataset
const balanced = balanceDataset(trainingData.texts, trainingData.labels);

// Convert to tensors
const processedData = convertToTensors(
  balanced.texts,
  balanced.labels,
  100,  // maxLength
  5000  // vocabSize
);

console.log('Train size:', processedData.metadata.trainSize);
console.log('Test size:', processedData.metadata.testSize);

// Use tensors for training
// ...training code...

// Cleanup
processedData.xTrain.dispose();
processedData.yTrain.dispose();
processedData.xTest.dispose();
processedData.yTest.dispose();
```

### 4. Browser Model Trainer (`browser-model-trainer.ts`)

**Purpose**: Train TensorFlow.js models in browser and save metadata

**Key Functions**:

```typescript
// Create model architectures
createSimpleTextModel(vocabSize: number, maxLength: number): tf.LayersModel
createCharCNNModel(charVocabSize: number, maxLength: number): tf.LayersModel
createFeatureModel(featureCount: number): tf.LayersModel

// Train model with database integration
trainModel(
  model: tf.LayersModel,
  data: ProcessedData,
  config: TrainingConfig,
  callbacks: {
    onEpochEnd?: (epoch: number, progress: TrainingProgress) => void;
    onTrainingComplete?: (result: TrainingResult) => void;
  },
  metadata: {
    modelType: string;
    datasetId: string;
    userId: string;
  }
): Promise<TrainingResult>

// Complete training pipeline
trainModelPipeline(
  modelType: 'simple' | 'char-cnn' | 'feature',
  data: ProcessedData,
  config: TrainingConfig,
  callbacks: { ... },
  metadata: { ... }
): Promise<{ model: tf.LayersModel; result: TrainingResult }>

// Model persistence
saveModelToStorage(model: tf.LayersModel, modelName: string): Promise<void>
loadModelFromStorage(modelName: string): Promise<tf.LayersModel | null>
```

**Training Config**:

```typescript
interface TrainingConfig {
  epochs: number;              // 10-50 recommended
  batchSize: number;           // 32 recommended
  learningRate: number;        // 0.001 recommended
  validationSplit: number;     // 0.2 recommended (20% for validation)
}
```

**Database Integration**:

During training:
- Creates `model_versions` entry with status="training"
- Saves epoch metrics to `training_records` table
- Updates `model_versions` with final metrics when complete

**Usage**:

```typescript
import { trainModelPipeline } from '@/lib/ml/browser-model-trainer';
import { convertToTensors } from '@/lib/ml/tfjs-data-processor';

// Prepare data
const processedData = convertToTensors(texts, labels);

// Train model
const { model, result } = await trainModelPipeline(
  'simple',
  processedData,
  {
    epochs: 10,
    batchSize: 32,
    learningRate: 0.001,
    validationSplit: 0.2
  },
  {
    onEpochEnd: (epoch, progress) => {
      console.log(`Epoch ${epoch}: ${(progress.accuracy * 100).toFixed(2)}%`);
    },
    onTrainingComplete: (result) => {
      console.log(`Final accuracy: ${(result.finalAccuracy * 100).toFixed(2)}%`);
    }
  },
  {
    datasetId: 'dataset_123',
    userId: 'admin',
    modelName: 'simple_url_model'
  }
);

console.log('Model version ID:', result.modelVersionId);
```

## UI Component

### DatasetTrainingPipeline Component

**Location**: `src/components/DatasetTrainingPipeline.tsx`

**Features**:

1. **Populate Tab**:
   - Quick populate with sample datasets
   - Upload custom CSV datasets
   - Real-time progress feedback

2. **Datasets Tab**:
   - View all active datasets
   - Display dataset statistics
   - Select dataset for training

3. **Train Tab**:
   - Select model type (Simple, Char-CNN, Feature-based)
   - Configure hyperparameters (epochs, batch size, learning rate)
   - Real-time training progress
   - Final results display

**Integration**:

Added to Admin Dashboard at `/admin` → Pipeline tab

## Complete Workflow Example

### Step 1: Populate Dataset

```typescript
import { populateDatasetFromContent } from '@/lib/ml/kaggle-dataset-populator';

const csvData = `text,label
"http://legitimate-bank.com",0
"http://phishing-fake-bank.com/login",1
"https://real-amazon.com/products",0
"http://fake-paypal-verify.com",1`;

const result = await populateDatasetFromContent(
  csvData,
  'csv',
  {
    name: 'URL Phishing Dataset',
    description: 'Sample URL dataset for testing',
    datasetType: 'url',
    recordCount: 0,
    uploadedBy: 'admin'
  }
);

console.log('Dataset ID:', result.datasetId);
console.log('Records inserted:', result.recordCount);
```

### Step 2: Fetch Training Data

```typescript
import { fetchTrainingDataForDataset } from '@/lib/ml/training-data-fetcher';

const trainingData = await fetchTrainingDataForDataset(result.datasetId);
console.log('Training samples:', trainingData.texts.length);
```

### Step 3: Preprocess Data

```typescript
import { convertToTensors, balanceDataset } from '@/lib/ml/tfjs-data-processor';

// Balance dataset
const balanced = balanceDataset(trainingData.texts, trainingData.labels);

// Convert to tensors
const processedData = convertToTensors(balanced.texts, balanced.labels, 100, 5000);
```

### Step 4: Train Model

```typescript
import { trainModelPipeline } from '@/lib/ml/browser-model-trainer';

const { model, result } = await trainModelPipeline(
  'simple',
  processedData,
  {
    epochs: 20,
    batchSize: 32,
    learningRate: 0.001,
    validationSplit: 0.2
  },
  {
    onEpochEnd: (epoch, progress) => {
      console.log(`Epoch ${epoch}/${20}`);
      console.log(`  Accuracy: ${(progress.accuracy * 100).toFixed(2)}%`);
      console.log(`  Loss: ${progress.loss.toFixed(4)}`);
    },
    onTrainingComplete: (result) => {
      console.log('Training complete!');
      console.log(`Final accuracy: ${(result.finalAccuracy * 100).toFixed(2)}%`);
      console.log(`Training time: ${(result.trainingTime / 1000).toFixed(1)}s`);
    }
  },
  {
    datasetId: result.datasetId,
    userId: 'admin',
    modelName: 'simple_url_model'
  }
);

// Cleanup
processedData.xTrain.dispose();
processedData.yTrain.dispose();
processedData.xTest.dispose();
processedData.yTest.dispose();
```

### Step 5: Use Trained Model

```typescript
// Model is automatically saved to IndexedDB
// Load it later for predictions
import { loadModelFromStorage } from '@/lib/ml/browser-model-trainer';

const model = await loadModelFromStorage('simple_url_model');
if (model) {
  // Use model for predictions
  const prediction = model.predict(inputTensor);
}
```

## Model Types

### 1. Simple Neural Network

**Best for**: Email, SMS content
**Architecture**:
- Embedding layer (vocab → 32 dimensions)
- Global average pooling
- Dense layer (16 units, ReLU)
- Dropout (0.5)
- Output layer (1 unit, sigmoid)

**Parameters**: ~50K

### 2. Character-Level CNN

**Best for**: URLs, any text with character patterns
**Architecture**:
- Embedding layer (char vocab → 16 dimensions)
- Conv1D (32 filters, kernel=3)
- MaxPooling1D (pool=2)
- Conv1D (64 filters, kernel=3)
- Global max pooling
- Dense layer (32 units, ReLU)
- Dropout (0.5)
- Output layer (1 unit, sigmoid)

**Parameters**: ~100K

### 3. Feature-Based Model

**Best for**: URLs with extracted features
**Features**:
- Length (normalized)
- Dot count
- Dash count
- @ symbol count
- Digit count
- HTTPS/HTTP flags
- Suspicious keywords (login, verify, secure, etc.)
- IP address pattern

**Architecture**:
- Dense layer (32 units, ReLU)
- Dropout (0.3)
- Dense layer (16 units, ReLU)
- Output layer (1 unit, sigmoid)

**Parameters**: ~1K (very lightweight)

## Performance Considerations

### Browser Constraints

- **Memory**: Limit dataset size to <100K samples
- **Processing**: Use batch sizes of 32-64
- **Storage**: Models saved to IndexedDB (~1-10MB each)

### Optimization Tips

1. **Balance datasets**: Equal phishing/legitimate samples
2. **Limit vocabulary**: Max 5000-10000 words
3. **Truncate sequences**: Max length 100-200 tokens
4. **Use batch inserts**: 100 records per batch
5. **Monitor memory**: Dispose tensors after use

## Sample Datasets

Built-in sample datasets for testing:

### URL Dataset (5 samples)
```csv
text,label
"http://example.com/login",0
"http://phishing-site.com/secure-login",1
"https://legitimate-bank.com",0
"http://fake-paypal.com/verify",1
"https://real-amazon.com",0
```

### Email Dataset (5 samples)
```csv
text,label
"Dear customer, your account is secure",0
"URGENT: Verify your account now or it will be closed",1
"Meeting scheduled for tomorrow at 10am",0
"You have won $1,000,000! Click here to claim",1
"Your invoice is attached",0
```

### SMS Dataset (5 samples)
```csv
text,label
"Your package will arrive tomorrow",0
"URGENT: Your bank account has been suspended. Click: bit.ly/abc123",1
"Reminder: Doctor appointment on Friday",0
"Congratulations! You've won a free iPhone. Claim now: evil.com",1
"Your verification code is 123456",0
```

## Troubleshooting

### Issue: "No records found for dataset"

**Solution**: Ensure dataset was populated correctly
```typescript
const stats = await getDatasetStatistics(datasetId);
console.log('Total records:', stats.totalRecords);
```

### Issue: "Out of memory error"

**Solution**: Reduce dataset size or batch size
```typescript
const trainingData = await fetchTrainingDataForDataset(datasetId, 1000); // Limit to 1000
```

### Issue: "Training very slow"

**Solution**: Reduce epochs or use simpler model
```typescript
const config = {
  epochs: 5,      // Reduce from 20
  batchSize: 64,  // Increase from 32
  learningRate: 0.01  // Increase from 0.001
};
```

### Issue: "Model accuracy stuck at 50%"

**Solution**: Balance dataset and increase training time
```typescript
const balanced = balanceDataset(texts, labels);
// Ensure equal phishing/legitimate samples
```

## Testing

### Quick Test Script

```typescript
// 1. Populate sample datasets
await populateSampleDatasets('admin');

// 2. Fetch datasets
const datasets = await fetchActiveDatasets();
const urlDataset = datasets.find(d => d.datasetType === 'url');

// 3. Train quick model
const trainingData = await fetchTrainingDataForDataset(urlDataset.id);
const processedData = convertToTensors(trainingData.texts, trainingData.labels);

const { model, result } = await trainModelPipeline(
  'feature',  // Fastest model
  processedData,
  { epochs: 5, batchSize: 32, learningRate: 0.01, validationSplit: 0.2 },
  {
    onEpochEnd: (epoch, progress) => {
      console.log(`Epoch ${epoch}: ${(progress.accuracy * 100).toFixed(2)}%`);
    }
  },
  {
    datasetId: urlDataset.id,
    userId: 'admin',
    modelName: 'test_model'
  }
);

console.log('Test complete!');
console.log('Final accuracy:', (result.finalAccuracy * 100).toFixed(2) + '%');
```

## Summary

PhishGuard now has a **complete client-side ML training pipeline** that:

✅ Populates database from Kaggle CSV/JSON datasets  
✅ Fetches training data as JavaScript arrays  
✅ Converts to TensorFlow.js tensors  
✅ Trains models using `model.fit()` in browser  
✅ Stores training metadata in `training_records`  
✅ Stores model info in `model_versions`  
✅ Saves trained models to IndexedDB  
✅ Provides comprehensive UI for the entire workflow  

All logic runs **100% client-side** within Blink AI browser environment using **only TensorFlow.js**.
