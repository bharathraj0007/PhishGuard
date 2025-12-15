/**
 * Character-CNN Training Service for URL Phishing Detection
 * 
 * Specialized training pipeline for Character-CNN model using URL datasets.
 * This service handles:
 * - URL CSV dataset loading and parsing
 * - Character-level tokenization
 * - Model training and validation
 * - Inference and evaluation
 */

import * as tf from '@tensorflow/tfjs';
import { CharacterCNNModel } from './character-cnn-model';
import URLDataProcessor, { URLRecord, URLDatasetInfo } from './url-data-processor';

export interface CharacterCNNTrainingConfig {
  maxUrlLength?: number;
  batchSize?: number;
  epochs?: number;
  validationSplit?: number;
  learningRate?: number;
  filters?: number[];
  kernelSizes?: number[];
  dropout?: number;
  denseUnits?: number;
}

export interface CharacterCNNTrainingProgress {
  status: 'loading' | 'preprocessing' | 'training' | 'evaluating' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  currentEpoch?: number;
  totalEpochs?: number;
  metrics?: {
    loss: number;
    accuracy: number;
    precision?: number;
    recall?: number;
    f1?: number;
  };
  timeRemaining?: number;
}

export interface CharacterCNNTrainingResult {
  success: boolean;
  totalRecords: number;
  trainingRecords: number;
  validationRecords: number;
  testRecords: number;
  phishingPercentage: number;
  finalMetrics?: {
    trainingLoss: number;
    trainingAccuracy: number;
    validationLoss: number;
    validationAccuracy: number;
    testAccuracy: number;
    testPrecision: number;
    testRecall: number;
    testF1: number;
  };
  datasetInfo?: URLDatasetInfo[];
  trainingTime: number;
  error?: string;
}

export class CharacterCNNTrainingService {
  private model: CharacterCNNModel | null = null;
  private dataProcessor: URLDataProcessor;
  private progressCallback?: (progress: CharacterCNNTrainingProgress) => void;
  private allRecords: URLRecord[] = [];
  private datasetInfos: URLDatasetInfo[] = [];

  constructor(config?: CharacterCNNTrainingConfig) {
    const maxUrlLength = config?.maxUrlLength || 100;
    this.dataProcessor = new URLDataProcessor(maxUrlLength);
    this.model = new CharacterCNNModel({
      vocabSize: this.dataProcessor.getVocabularySize(),
      maxLength: maxUrlLength,
      filters: config?.filters || [64, 100, 128],
      kernelSizes: config?.kernelSizes || [3, 4, 5],
      dropout: config?.dropout || 0.5,
      denseUnits: config?.denseUnits || 256,
      learningRate: config?.learningRate || 0.001
    });
  }

  /**
   * Load and parse CSV dataset
   */
  async loadCSVDataset(csvUrl: string, datasetName: string): Promise<URLRecord[]> {
    try {
      this.reportProgress({
        status: 'loading',
        progress: 0,
        message: `Loading ${datasetName}...`
      });

      // Fetch CSV
      const response = await fetch(csvUrl);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
      
      const csvText = await response.text();
      
      // Parse CSV
      const records = this.dataProcessor.parseCSVData(csvText, datasetName);
      
      if (records.length === 0) {
        throw new Error('No valid records found in CSV');
      }

      // Store dataset info
      const info = this.dataProcessor.getDatasetInfo(records, datasetName);
      this.datasetInfos.push(info);
      this.allRecords.push(...records);

      console.log(`[CharacterCNNTraining] Loaded ${records.length} URLs from ${datasetName}`);
      
      return records;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[CharacterCNNTraining] Failed to load dataset:`, errorMsg);
      throw error;
    }
  }

  /**
   * Load multiple CSV datasets
   */
  async loadMultipleDatasets(
    datasets: Array<{ url: string; name: string }>
  ): Promise<URLRecord[]> {
    this.allRecords = [];
    this.datasetInfos = [];

    for (let i = 0; i < datasets.length; i++) {
      const { url, name } = datasets[i];
      const progress = (i / datasets.length) * 40;
      
      this.reportProgress({
        status: 'loading',
        progress,
        message: `Loading dataset ${i + 1}/${datasets.length}: ${name}`
      });

      try {
        await this.loadCSVDataset(url, name);
      } catch (error) {
        console.warn(`[CharacterCNNTraining] Skipped dataset ${name}:`, error);
      }
    }

    if (this.allRecords.length === 0) {
      throw new Error('No datasets loaded successfully');
    }

    return this.allRecords;
  }

  /**
   * Train Character-CNN model on URL dataset
   */
  async trainModel(
    config?: CharacterCNNTrainingConfig,
    onProgress?: (progress: CharacterCNNTrainingProgress) => void
  ): Promise<CharacterCNNTrainingResult> {
    this.progressCallback = onProgress;
    const startTime = Date.now();

    try {
      if (this.allRecords.length === 0) {
        throw new Error('No training data loaded');
      }

      // Configuration
      const batchSize = config?.batchSize || 32;
      const epochs = config?.epochs || 10;
      const validationSplit = config?.validationSplit || 0.1;

      this.reportProgress({
        status: 'preprocessing',
        progress: 45,
        message: 'Preprocessing URL data...'
      });

      // Split data: 80% train, 10% validation, 10% test
      const shuffled = [...this.allRecords].sort(() => Math.random() - 0.5);
      const trainSize = Math.floor(shuffled.length * 0.8);
      const valSize = Math.floor(shuffled.length * 0.1);
      const testSize = shuffled.length - trainSize - valSize;

      const trainRecords = shuffled.slice(0, trainSize);
      const valRecords = shuffled.slice(trainSize, trainSize + valSize);
      const testRecords = shuffled.slice(trainSize + valSize);

      this.reportProgress({
        status: 'preprocessing',
        progress: 50,
        message: `Data split: ${trainSize} train, ${valSize} val, ${testSize} test`
      });

      // Prepare training data
      const { X: trainX, y: trainY } = this.dataProcessor.prepareTrainingData(trainRecords);
      const { X: valX, y: valY } = this.dataProcessor.prepareTrainingData(valRecords);
      const { X: testX, y: testY } = this.dataProcessor.prepareTrainingData(testRecords);

      this.reportProgress({
        status: 'training',
        progress: 55,
        message: 'Initializing Character-CNN model...'
      });

      // Build and train model
      if (!this.model) {
        throw new Error('Model not initialized');
      }

      await this.model.build();

      this.reportProgress({
        status: 'training',
        progress: 60,
        message: 'Starting training...',
        currentEpoch: 0,
        totalEpochs: epochs
      });

      // Training callback
      const trainingStartTime = Date.now();
      const history: any = {
        loss: [],
        accuracy: [],
        val_loss: [],
        val_accuracy: []
      };

      // Train with manual epoch loop for progress tracking
      for (let epoch = 0; epoch < epochs; epoch++) {
        const epochStartTime = Date.now();

        // Train
        const trainMetrics = await this.model.train(
          trainX,
          trainY,
          batchSize,
          1
        );

        // Validate
        const valMetrics = await this.model.evaluate(valX, valY);

        // Store history
        history.loss.push(trainMetrics.loss);
        history.accuracy.push(trainMetrics.accuracy);
        history.val_loss.push(valMetrics.loss);
        history.val_accuracy.push(valMetrics.accuracy);

        const elapsed = Date.now() - trainingStartTime;
        const timePerEpoch = elapsed / (epoch + 1);
        const timeRemaining = timePerEpoch * (epochs - epoch - 1);

        const progress = 60 + (epoch / epochs) * 25;
        this.reportProgress({
          status: 'training',
          progress,
          message: `Epoch ${epoch + 1}/${epochs}`,
          currentEpoch: epoch + 1,
          totalEpochs: epochs,
          timeRemaining,
          metrics: {
            loss: trainMetrics.loss,
            accuracy: trainMetrics.accuracy,
            precision: valMetrics.precision,
            recall: valMetrics.recall,
            f1: valMetrics.f1
          }
        });

        // Cleanup tensors
        trainX.dispose();
        valX.dispose();
        testX.dispose();
      }

      // Evaluate on test set
      this.reportProgress({
        status: 'evaluating',
        progress: 85,
        message: 'Evaluating on test set...'
      });

      const testMetrics = await this.model.evaluate(testX, testY);

      const trainingTime = Date.now() - startTime;
      const phishingCount = this.allRecords.filter(r => r.isPhishing).length;
      const phishingPercentage = (phishingCount / this.allRecords.length) * 100;

      this.reportProgress({
        status: 'completed',
        progress: 100,
        message: 'Training completed successfully!',
        metrics: {
          loss: history.loss[history.loss.length - 1],
          accuracy: history.accuracy[history.accuracy.length - 1]
        }
      });

      return {
        success: true,
        totalRecords: this.allRecords.length,
        trainingRecords: trainRecords.length,
        validationRecords: valRecords.length,
        testRecords: testRecords.length,
        phishingPercentage,
        finalMetrics: {
          trainingLoss: history.loss[history.loss.length - 1],
          trainingAccuracy: history.accuracy[history.accuracy.length - 1],
          validationLoss: history.val_loss[history.val_loss.length - 1],
          validationAccuracy: history.val_accuracy[history.val_accuracy.length - 1],
          testAccuracy: testMetrics.accuracy,
          testPrecision: testMetrics.precision,
          testRecall: testMetrics.recall,
          testF1: testMetrics.f1
        },
        datasetInfo: this.datasetInfos,
        trainingTime
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      this.reportProgress({
        status: 'error',
        progress: 0,
        message: `Training failed: ${errorMsg}`
      });

      return {
        success: false,
        totalRecords: this.allRecords.length,
        trainingRecords: 0,
        validationRecords: 0,
        testRecords: 0,
        phishingPercentage: 0,
        trainingTime: Date.now() - startTime,
        error: errorMsg
      };
    }
  }

  /**
   * Predict on a single URL
   */
  async predictURL(url: string): Promise<{
    isPhishing: boolean;
    confidence: number;
    patterns?: Record<string, boolean>;
  }> {
    if (!this.model) {
      throw new Error('Model not trained');
    }

    const encoded = this.dataProcessor.encodeURL(url);
    const input = tf.tensor2d([encoded], [1, this.dataProcessor.getMaxURLLength()], 'int32');

    const prediction = await this.model.predict(input);
    
    input.dispose();

    // Detect URL patterns
    const patterns = this.dataProcessor.detectURLPatterns(url);

    return {
      isPhishing: prediction.isPhishing,
      confidence: prediction.confidence,
      patterns
    };
  }

  /**
   * Batch predict on multiple URLs
   */
  async predictBatch(urls: string[]): Promise<Array<{
    url: string;
    isPhishing: boolean;
    confidence: number;
  }>> {
    const results = [];

    for (const url of urls) {
      const prediction = await this.predictURL(url);
      results.push({
        url,
        isPhishing: prediction.isPhishing,
        confidence: prediction.confidence
      });
    }

    return results;
  }

  /**
   * Save trained model
   */
  async saveModel(modelPath: string): Promise<void> {
    if (!this.model) {
      throw new Error('No model to save');
    }

    // Save model
    await this.model.saveModel(modelPath);

    // Save vocabulary
    const vocabData = this.dataProcessor.getVocabulary();
    localStorage.setItem('characterCNNVocab', JSON.stringify(vocabData));

    console.log('[CharacterCNNTraining] Model and vocabulary saved');
  }

  /**
   * Load trained model
   */
  async loadModel(modelPath: string): Promise<void> {
    if (!this.model) {
      throw new Error('Model not initialized');
    }

    await this.model.loadModel(modelPath);

    // Load vocabulary
    const vocabJSON = localStorage.getItem('characterCNNVocab');
    if (vocabJSON) {
      const vocabData = JSON.parse(vocabJSON);
      this.dataProcessor.restoreVocabulary(vocabData);
    }

    console.log('[CharacterCNNTraining] Model and vocabulary loaded');
  }

  /**
   * Get dataset statistics
   */
  getDatasetStats(): {
    totalURLs: number;
    phishingURLs: number;
    legitimateURLs: number;
    datasets: URLDatasetInfo[];
  } {
    const phishingCount = this.allRecords.filter(r => r.isPhishing).length;
    return {
      totalURLs: this.allRecords.length,
      phishingURLs: phishingCount,
      legitimateURLs: this.allRecords.length - phishingCount,
      datasets: this.datasetInfos
    };
  }

  /**
   * Get data processor for external use
   */
  getDataProcessor(): URLDataProcessor {
    return this.dataProcessor;
  }

  /**
   * Get model for external use
   */
  getModel(): CharacterCNNModel | null {
    return this.model;
  }

  /**
   * Report progress
   */
  private reportProgress(progress: CharacterCNNTrainingProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
    console.log(`[CharacterCNNTraining] ${progress.message} (${progress.progress}%)`);
  }

  /**
   * Cleanup and dispose
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
    }
    tf.disposeVariables();
  }
}

export default CharacterCNNTrainingService;
