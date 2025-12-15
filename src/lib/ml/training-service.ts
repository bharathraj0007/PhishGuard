/**
 * ML Training Service for PhishGuard
 * 
 * Manages the end-to-end ML training pipeline:
 * - Dataset loading and preprocessing
 * - Model training and evaluation
 * - Model persistence and versioning
 */

import { PhishingDetectionModel, TrainingData, ModelMetrics } from './phishing-model';
import { DataProcessor, EmailRecord } from './data-processor';

export interface TrainingProgress {
  status: 'loading' | 'preprocessing' | 'training' | 'evaluating' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  currentEpoch?: number;
  totalEpochs?: number;
  metrics?: ModelMetrics;
}

export interface TrainingConfig {
  datasetURLs: { url: string; name: string }[];
  modelConfig?: {
    lstmUnits?: number;
    denseUnits?: number;
    dropout?: number;
    learningRate?: number;
    batchSize?: number;
    epochs?: number;
  };
  testSplit?: number;
  balanceDataset?: boolean;
  augmentData?: boolean;
}

export interface TrainingResult {
  success: boolean;
  metrics?: ModelMetrics;
  testMetrics?: ModelMetrics;
  datasetInfo?: {
    totalSamples: number;
    trainingSamples: number;
    testSamples: number;
    phishingRatio: number;
  };
  error?: string;
  trainingTime?: number;
}

export class MLTrainingService {
  private model: PhishingDetectionModel;
  private progressCallback?: (progress: TrainingProgress) => void;

  constructor() {
    this.model = new PhishingDetectionModel();
  }

  /**
   * Train model with provided configuration
   */
  async trainModel(
    config: TrainingConfig,
    onProgress?: (progress: TrainingProgress) => void
  ): Promise<TrainingResult> {
    this.progressCallback = onProgress;
    const startTime = Date.now();

    try {
      // Step 1: Load datasets
      this.reportProgress({
        status: 'loading',
        progress: 0,
        message: 'Loading datasets...'
      });

      const allRecords = await this.loadDatasets(config.datasetURLs);
      
      if (allRecords.length === 0) {
        throw new Error('No data loaded from datasets');
      }

      this.reportProgress({
        status: 'loading',
        progress: 20,
        message: `Loaded ${allRecords.length} email records`
      });

      // Step 2: Preprocess data
      this.reportProgress({
        status: 'preprocessing',
        progress: 30,
        message: 'Preprocessing data...'
      });

      let processedRecords = allRecords.map(r => ({
        ...r,
        text: DataProcessor.preprocessText(r.text)
      }));

      // Balance dataset if requested
      if (config.balanceDataset) {
        processedRecords = DataProcessor.balanceDataset(processedRecords);
        this.reportProgress({
          status: 'preprocessing',
          progress: 35,
          message: `Balanced dataset to ${processedRecords.length} records`
        });
      }

      // Augment dataset if requested
      if (config.augmentData) {
        processedRecords = DataProcessor.augmentDataset(processedRecords);
        this.reportProgress({
          status: 'preprocessing',
          progress: 40,
          message: `Augmented dataset to ${processedRecords.length} records`
        });
      }

      // Split into train/test sets
      const { train, test } = DataProcessor.splitDataset(
        processedRecords,
        config.testSplit || 0.2
      );

      this.reportProgress({
        status: 'preprocessing',
        progress: 45,
        message: `Split: ${train.length} training, ${test.length} test samples`
      });

      // Step 3: Initialize model
      this.reportProgress({
        status: 'training',
        progress: 50,
        message: 'Initializing neural network...'
      });

      await this.model.initialize();

      // Step 4: Train model
      this.reportProgress({
        status: 'training',
        progress: 55,
        message: 'Training model...',
        currentEpoch: 0,
        totalEpochs: config.modelConfig?.epochs || 10
      });

      const trainingData: TrainingData = {
        texts: train.map(r => r.text),
        labels: train.map(r => r.label)
      };

      const metrics = await this.model.train(
        trainingData,
        0.2, // validation split
        (epoch, logs) => {
          const progress = 55 + (epoch / (config.modelConfig?.epochs || 10)) * 30;
          this.reportProgress({
            status: 'training',
            progress,
            message: `Training epoch ${epoch + 1}/${config.modelConfig?.epochs || 10}`,
            currentEpoch: epoch + 1,
            totalEpochs: config.modelConfig?.epochs || 10,
            metrics: {
              accuracy: logs?.acc || 0,
              loss: logs?.loss || 0,
              precision: logs?.precision || 0,
              recall: logs?.recall || 0,
              f1Score: 0
            }
          });
        }
      );

      // Step 5: Evaluate on test set
      this.reportProgress({
        status: 'evaluating',
        progress: 85,
        message: 'Evaluating on test set...'
      });

      const testData: TrainingData = {
        texts: test.map(r => r.text),
        labels: test.map(r => r.label)
      };

      const testMetrics = await this.model.evaluate(testData);

      // Step 6: Complete
      const trainingTime = Date.now() - startTime;

      this.reportProgress({
        status: 'completed',
        progress: 100,
        message: 'Training completed successfully!',
        metrics: testMetrics
      });

      const phishingCount = processedRecords.filter(r => r.label === 1).length;

      return {
        success: true,
        metrics,
        testMetrics,
        datasetInfo: {
          totalSamples: processedRecords.length,
          trainingSamples: train.length,
          testSamples: test.length,
          phishingRatio: phishingCount / processedRecords.length
        },
        trainingTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.reportProgress({
        status: 'error',
        progress: 0,
        message: `Training failed: ${errorMessage}`
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Load datasets from URLs
   */
  private async loadDatasets(
    datasets: { url: string; name: string }[]
  ): Promise<EmailRecord[]> {
    const allRecords: EmailRecord[] = [];

    for (const dataset of datasets) {
      try {
        this.reportProgress({
          status: 'loading',
          progress: 5 + (datasets.indexOf(dataset) * 15 / datasets.length),
          message: `Loading ${dataset.name}...`
        });

        const records = await DataProcessor.loadCSVFromURL(dataset.url, dataset.name);
        allRecords.push(...records);

        console.log(`✅ Loaded ${records.length} records from ${dataset.name}`);
      } catch (error) {
        console.warn(`⚠️ Failed to load ${dataset.name}:`, error);
      }
    }

    return allRecords;
  }

  /**
   * Test the trained model on sample data
   */
  async testModel(samples: string[]): Promise<any[]> {
    if (!this.model) {
      throw new Error('Model not initialized');
    }

    return await this.model.predictBatch(samples);
  }

  /**
   * Save the trained model
   */
  async saveModel(modelPath: string): Promise<void> {
    if (!this.model) {
      throw new Error('No model to save');
    }

    await this.model.saveModel(modelPath);
  }

  /**
   * Load a pre-trained model
   */
  async loadModel(modelPath: string): Promise<void> {
    await this.model.loadModel(modelPath);
  }

  /**
   * Get the current model instance
   */
  getModel(): PhishingDetectionModel {
    return this.model;
  }

  /**
   * Report training progress
   */
  private reportProgress(progress: TrainingProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * Dispose of model and free resources
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
    }
  }
}

/**
 * Global ML Training Service instance
 */
let globalTrainingService: MLTrainingService | null = null;

export function getTrainingService(): MLTrainingService {
  if (!globalTrainingService) {
    globalTrainingService = new MLTrainingService();
  }
  return globalTrainingService;
}
