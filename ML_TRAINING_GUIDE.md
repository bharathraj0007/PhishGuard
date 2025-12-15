# PhishGuard ML Training Guide

## 🧠 TensorFlow.js + DistilBERT Architecture

PhishGuard uses a state-of-the-art machine learning model built with TensorFlow.js to detect phishing emails with high accuracy.

---

## 📊 Model Architecture

### Neural Network Design

```
Input Layer (Universal Sentence Encoder)
    ↓
[512-dimensional text embeddings]
    ↓
Reshape Layer (add time dimension)
    ↓
Bidirectional LSTM (128 units)
    ↓ (captures sequential patterns in both directions)
Dense Layer (64 units, ReLU)
    ↓
Dropout (0.3)
    ↓
Output Layer (1 unit, Sigmoid)
    ↓
Binary Classification (Phishing: 0-1)
```

### Key Components

1. **Universal Sentence Encoder (DistilBERT-like)**
   - Converts text to 512-dimensional embeddings
   - Pre-trained on massive text corpus
   - Captures semantic meaning and context

2. **Bidirectional LSTM**
   - Processes text sequences forward and backward
   - Captures long-range dependencies
   - 128 hidden units with dropout regularization

3. **Dense Classification Head**
   - 64-unit dense layer with ReLU activation
   - Dropout (0.3) for regularization
   - Sigmoid output for binary classification

---

## 📁 Training Datasets

The model is trained on **5 high-quality phishing email datasets**:

### 1. **SpamAssassin Dataset**
- **Source**: SpamAssassin public corpus
- **Content**: Email spam detection
- **Format**: text, label (spam/ham)

### 2. **Enron Email Dataset**
- **Source**: Enron Corporation email corpus
- **Content**: Legitimate and phishing emails
- **Format**: text, label (phishing/safe)

### 3. **Ling Dataset**
- **Source**: Academic phishing research
- **Content**: Phishing email samples
- **Format**: subject, body, label

### 4. **Nazario Dataset**
- **Source**: Jose Nazario's phishing corpus
- **Content**: Real-world phishing attempts
- **Format**: subject, body, label

### 5. **Nigerian Fraud Dataset**
- **Source**: Nigerian scam emails
- **Content**: All phishing samples (419 scams)
- **Format**: email content (all labeled as phishing)

**Total Training Samples**: ~50,000+ emails (varies based on selected datasets)

---

## 🏋️ Training the Model

### Via Admin Dashboard

1. **Access ML Training Interface**
   - Log in to admin panel at `/admin-login`
   - Navigate to **ML Training** tab

2. **Select Datasets**
   - Go to **Datasets** tab
   - Select which datasets to include (all 5 recommended)
   - View dataset information

3. **Configure Training**
   - Go to **Configuration** tab
   - Set training parameters:
     - **Epochs**: 10-20 (default: 10)
     - **Batch Size**: 32 (default)
     - **Learning Rate**: 0.001 (default)
     - **Balance Dataset**: ✓ (recommended)
     - **Augment Data**: ✓ (recommended)

4. **Start Training**
   - Go to **Training** tab
   - Click **"Start Training"**
   - Monitor progress in real-time
   - View metrics after each epoch

5. **Evaluate Results**
   - View test accuracy, precision, recall, F1 score
   - Check dataset information
   - Export trained model

### Training Configuration Options

```typescript
{
  epochs: 10,              // Number of training iterations
  batchSize: 32,           // Samples per batch
  learningRate: 0.001,     // Adam optimizer learning rate
  lstmUnits: 128,          // LSTM hidden units
  denseUnits: 64,          // Dense layer units
  dropout: 0.3,            // Dropout rate
  testSplit: 0.2,          // 20% for testing
  balanceDataset: true,    // Equal phishing/safe samples
  augmentData: true        // Data augmentation for generalization
}
```

---

## 📈 Training Metrics

### Accuracy
- **Formula**: (TP + TN) / (TP + TN + FP + FN)
- **Target**: > 90%
- **Meaning**: Overall correctness of predictions

### Precision
- **Formula**: TP / (TP + FP)
- **Target**: > 85%
- **Meaning**: Accuracy of phishing predictions (low false positives)

### Recall
- **Formula**: TP / (TP + FN)
- **Target**: > 90%
- **Meaning**: Coverage of actual phishing emails (low false negatives)

### F1 Score
- **Formula**: 2 × (Precision × Recall) / (Precision + Recall)
- **Target**: > 88%
- **Meaning**: Balanced measure of precision and recall

### Loss
- **Type**: Binary Cross-Entropy
- **Target**: < 0.3
- **Meaning**: Model's prediction error

---

## 🔬 Model Testing

### Test on Sample Data

After training, test the model on new samples:

```typescript
import { getTrainingService } from '@/lib/ml/training-service'

const service = getTrainingService()
const model = service.getModel()

// Test single email
const result = await model.predict("Your account has been suspended. Click here to verify.")

console.log(result)
// {
//   isPhishing: true,
//   confidence: 0.94,
//   threatLevel: 'critical',
//   features: {
//     suspiciousPatterns: ['Urgency tactics', 'Suspicious call-to-action', 'Threatening language'],
//     riskScore: 97,
//     analysis: 'CRITICAL: Almost certainly phishing...'
//   }
// }
```

### Evaluate on Test Set

```typescript
const testMetrics = await model.evaluate({
  texts: testEmails,
  labels: testLabels
})

console.log(testMetrics)
// {
//   accuracy: 0.92,
//   precision: 0.89,
//   recall: 0.94,
//   f1Score: 0.91,
//   loss: 0.24
// }
```

---

## 🚀 Using the Trained Model

### Real-Time Detection

The trained model is automatically used in the Scanner component:

1. User enters email/SMS/link/QR content
2. Content is encoded using Universal Sentence Encoder
3. Model predicts phishing probability
4. Result includes:
   - Threat level (safe/low/medium/high/critical)
   - Confidence score (0-100%)
   - Suspicious patterns detected
   - Detailed analysis
   - Security recommendations

### Prediction Service

```typescript
import { getPredictionService } from '@/lib/ml/prediction-service'

const service = getPredictionService()

// Single prediction
const result = await service.analyzeText(
  "Congratulations! You've won $1,000,000. Click here to claim.",
  'email'
)

// Batch predictions
const results = await service.analyzeBatch(
  [email1, email2, email3],
  'email'
)
```

---

## 🔧 Model Persistence

### Save Trained Model

```typescript
const service = getTrainingService()
await service.saveModel('indexeddb://phishguard-model')
```

### Load Pre-trained Model

```typescript
const service = getTrainingService()
await service.loadModel('indexeddb://phishguard-model')
```

**Storage Options**:
- `indexeddb://model-name` - Browser IndexedDB (recommended)
- `localstorage://model-name` - Browser localStorage
- `downloads://model-name` - Download as files

---

## 🎯 Feature Engineering

### Phishing Indicators

The model learns to detect these patterns automatically:

1. **Urgency Tactics**
   - "urgent", "immediate", "act now", "expires", "limited time"

2. **Financial Keywords**
   - "bank", "account", "credit card", "payment", "verify"

3. **Suspicious CTAs**
   - "click here", "click now", "download", "verify now"

4. **Threatening Language**
   - "suspended", "locked", "unauthorized", "security alert"

5. **Too Good to Be True**
   - "free", "prize", "winner", "congratulations", "lottery"

6. **Generic Greetings**
   - "dear customer", "dear user", "valued customer"

7. **Spelling Errors**
   - Common phishing typos and misspellings

8. **Suspicious URLs**
   - Shortened links, mismatched domains, IP addresses

---

## 📊 Training Progress Example

```
🧠 Initializing PhishGuard ML Model...
📦 Loading Universal Sentence Encoder...
✅ Encoder loaded successfully
✅ Model architecture built
🎉 Model initialized successfully

🏋️ Starting model training...
📊 Training samples: 40,000

🔄 Encoding texts to embeddings...
🚀 Training neural network...

Epoch 1/10 - loss: 0.4521 - acc: 0.7823 - val_loss: 0.3912 - val_acc: 0.8245
Epoch 2/10 - loss: 0.3234 - acc: 0.8567 - val_loss: 0.2891 - val_acc: 0.8789
Epoch 3/10 - loss: 0.2678 - acc: 0.8934 - val_loss: 0.2456 - val_acc: 0.9012
Epoch 4/10 - loss: 0.2301 - acc: 0.9123 - val_loss: 0.2189 - val_acc: 0.9156
Epoch 5/10 - loss: 0.2034 - acc: 0.9267 - val_loss: 0.1987 - val_acc: 0.9289
Epoch 6/10 - loss: 0.1823 - acc: 0.9378 - val_loss: 0.1834 - val_acc: 0.9367
Epoch 7/10 - loss: 0.1645 - acc: 0.9456 - val_loss: 0.1712 - val_acc: 0.9423
Epoch 8/10 - loss: 0.1498 - acc: 0.9512 - val_loss: 0.1623 - val_acc: 0.9467
Epoch 9/10 - loss: 0.1378 - acc: 0.9554 - val_loss: 0.1556 - val_acc: 0.9498
Epoch 10/10 - loss: 0.1276 - acc: 0.9589 - val_loss: 0.1501 - val_acc: 0.9521

✅ Training completed successfully
📈 Final Metrics: {
  accuracy: 0.9589,
  precision: 0.9456,
  recall: 0.9634,
  f1Score: 0.9544,
  loss: 0.1276
}
```

---

## 🛡️ Best Practices

### Training

1. **Use all datasets** for maximum diversity
2. **Balance dataset** to prevent bias
3. **Augment data** for better generalization
4. **Train for 10-20 epochs** (avoid overfitting)
5. **Monitor validation metrics** to detect overfitting

### Deployment

1. **Initialize model on app startup** (non-blocking)
2. **Fallback to rule-based** if ML unavailable
3. **Cache model in IndexedDB** for faster loading
4. **Update model periodically** with new phishing samples
5. **Monitor false positives/negatives** in production

### Performance

1. **Batch predictions** when possible (faster)
2. **Preprocess text** before prediction
3. **Use GPU acceleration** if available (TensorFlow.js WebGL)
4. **Limit text length** to 5000 characters
5. **Dispose tensors** to free memory

---

## 🔬 Technical Details

### TensorFlow.js Configuration

```typescript
import * as tf from '@tensorflow/tfjs'

// Use WebGL backend for GPU acceleration
await tf.setBackend('webgl')

// Enable production mode
tf.env().set('PROD', true)

// Configure memory management
tf.env().set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0)
```

### Universal Sentence Encoder

- **Model**: universal-sentence-encoder
- **Version**: Latest from TensorFlow Hub
- **Embedding Size**: 512 dimensions
- **Input**: Variable-length text (up to 5000 chars)
- **Output**: Fixed 512-d vector representation

### Model Compilation

```typescript
model.compile({
  optimizer: tf.train.adam(0.001),
  loss: 'binaryCrossentropy',
  metrics: ['accuracy', 'precision', 'recall']
})
```

---

## 🆘 Troubleshooting

### Issue: Model takes too long to initialize

**Solution**: ML model loads asynchronously in background. Scanner uses rule-based detection until ready.

### Issue: Low accuracy on test set

**Solutions**:
1. Train for more epochs (15-20)
2. Increase dataset size
3. Enable data augmentation
4. Balance dataset to prevent bias
5. Adjust learning rate (try 0.0005)

### Issue: High false positive rate

**Solutions**:
1. Adjust decision threshold (default: 0.5)
2. Increase precision weight in training
3. Add more legitimate email samples
4. Fine-tune with domain-specific data

### Issue: Out of memory errors

**Solutions**:
1. Reduce batch size (16 or 8)
2. Limit text length to 2000 chars
3. Dispose tensors after use
4. Use smaller LSTM units (64)

---

## 📚 API Reference

### PhishingDetectionModel

```typescript
class PhishingDetectionModel {
  // Initialize model and encoder
  async initialize(): Promise<void>
  
  // Train on dataset
  async train(data: TrainingData, validationSplit?: number): Promise<ModelMetrics>
  
  // Single prediction
  async predict(text: string): Promise<PredictionResult>
  
  // Batch predictions
  async predictBatch(texts: string[]): Promise<PredictionResult[]>
  
  // Evaluate on test data
  async evaluate(testData: TrainingData): Promise<ModelMetrics>
  
  // Save/load model
  async saveModel(path: string): Promise<void>
  async loadModel(path: string): Promise<void>
  
  // Cleanup
  dispose(): void
}
```

### MLTrainingService

```typescript
class MLTrainingService {
  // Train model with config
  async trainModel(config: TrainingConfig, onProgress?: Callback): Promise<TrainingResult>
  
  // Test model
  async testModel(samples: string[]): Promise<any[]>
  
  // Get model instance
  getModel(): PhishingDetectionModel
  
  // Cleanup
  dispose(): void
}
```

### MLPredictionService

```typescript
class MLPredictionService {
  // Initialize for predictions
  async initialize(): Promise<void>
  
  // Analyze single text
  async analyzeText(text: string, scanType: ScanType): Promise<ScanResult>
  
  // Batch analysis
  async analyzeBatch(texts: string[], scanType: ScanType): Promise<ScanResult[]>
  
  // Check readiness
  isReady(): boolean
  
  // Cleanup
  dispose(): void
}
```

---

## 🎓 Further Reading

- [TensorFlow.js Documentation](https://www.tensorflow.org/js)
- [Universal Sentence Encoder](https://tfhub.dev/google/universal-sentence-encoder/4)
- [Phishing Detection Research Papers](https://scholar.google.com/scholar?q=phishing+email+detection+machine+learning)
- [LSTM Networks Explained](https://colah.github.io/posts/2015-08-Understanding-LSTMs/)

---

## 🚀 Next Steps

1. ✅ Train the model with all datasets
2. ✅ Test on sample phishing emails
3. ✅ Integrate with Scanner component
4. ✅ Monitor performance metrics
5. 🔜 Fine-tune with user feedback
6. 🔜 Deploy production model
7. 🔜 Set up periodic retraining

---

**PhishGuard ML System** - Enterprise-grade phishing detection powered by TensorFlow.js 🛡️
