/**
 * PhishGuard ML Library - Main Export
 * 
 * Complete machine learning system for browser-based phishing detection:
 * - Dataset loading from Blink database
 * - Text preprocessing and feature extraction
 * - TensorFlow.js model architectures
 * - Training service with model.fit()
 * - Prediction service for real-time detection
 */

// Dataset Loading
export {
  loadTrainingDataFromDB,
  loadAllTrainingData,
  getDatasetStatistics,
  loadUploadedDatasets,
  loadDatasetRecords,
  shuffleDataset,
  splitDataset,
  balanceDataset,
  type BlinkDatasetRecord,
  type ProcessedDataset
} from './blink-dataset-loader';

// Text Preprocessing
export {
  cleanText,
  tokenize,
  buildVocabulary,
  textToSequence,
  padSequences,
  textToCharSequence,
  buildCharVocabulary,
  TFIDFVectorizer,
  extractNGrams,
  extractCharNGrams,
  extractURLFeatures,
  normalizeFeatures,
  type URLFeatures
} from './text-preprocessing';

// Model Architectures
export {
  URLDetectionModel,
  TextLSTMModel,
  BiLSTMModel,
  CharacterCNNModel,
  SimpleCNNModel,
  CNNLSTMModel,
  ModelFactory,
  MODEL_CONFIGS
} from './tfjs-models';

// Training Service
export {
  BrowserMLTrainingService,
  trainModel,
  type TrainingProgress,
  type TrainingConfig,
  type TrainingResult
} from './browser-training-service';

// Prediction Service
export {
  MLPredictionService,
  getPredictionService,
  predictPhishing,
  checkMLModelsAvailable,
  deleteModel,
  type PredictionResult,
  type DetailedPrediction
} from './ml-prediction-service';

/**
 * Quick Start Guide:
 * 
 * 1. Load datasets from Blink database:
 *    const dataset = await loadTrainingDataFromDB('url');
 * 
 * 2. Train a model:
 *    const result = await trainModel('url', {
 *      epochs: 10,
 *      balance: true,
 *      onProgress: (progress) => console.log(progress)
 *    });
 * 
 * 3. Make predictions:
 *    const prediction = await predictPhishing(
 *      'http://suspicious-site.com',
 *      'url'
 *    );
 * 
 * 4. Check prediction result:
 *    if (prediction.isPhishing) {
 *      console.log(`Threat level: ${prediction.threatLevel}`);
 *      console.log(`Confidence: ${(prediction.confidence * 100).toFixed(2)}%`);
 *    }
 */

/**
 * Architecture Overview:
 * 
 * 1. Dataset Loading (blink-dataset-loader.ts)
 *    - Fetches training data from Blink database
 *    - Supports URL, Email, SMS, QR types
 *    - Provides balancing and splitting utilities
 * 
 * 2. Preprocessing (text-preprocessing.ts)
 *    - Text cleaning and normalization
 *    - Tokenization (word and character level)
 *    - Vocabulary building
 *    - Sequence padding
 *    - TF-IDF vectorization
 *    - Feature extraction
 * 
 * 3. Model Architectures (tfjs-models.ts)
 *    - URL Detection: Character-CNN
 *    - Email Detection: BiLSTM
 *    - SMS Detection: LSTM
 *    - QR Detection: Simple CNN
 * 
 * 4. Training Service (browser-training-service.ts)
 *    - End-to-end training pipeline
 *    - Data preparation and tensor conversion
 *    - Model.fit() with callbacks
 *    - Model evaluation and saving
 *    - Progress reporting
 * 
 * 5. Prediction Service (ml-prediction-service.ts)
 *    - Model loading from IndexedDB
 *    - Real-time inference
 *    - Batch prediction
 *    - Threat level calculation
 */

/**
 * Memory Considerations:
 * 
 * - Use limited epochs (5-15) to prevent browser slowdown
 * - Keep batch size small (16-64) for memory efficiency
 * - Use maxSamples parameter to limit dataset size
 * - Dispose tensors after use
 * - Models are saved to IndexedDB, not RAM
 */

/**
 * Performance Tips:
 * 
 * - Train models during low-activity periods
 * - Use Web Workers for training (future enhancement)
 * - Balance datasets for better accuracy
 * - Use smaller vocabulary sizes for faster training
 * - Cache loaded models in memory
 */
