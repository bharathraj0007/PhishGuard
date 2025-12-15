/**
 * Browser-Based ML Training Service
 * 
 * Complete training pipeline that runs entirely in the browser:
 * 1. Load datasets from Blink database
 * 2. Preprocess data (tokenization, vectorization)
 * 3. Create and train TensorFlow.js models
 * 4. Save trained models for inference
 */

import * as tf from '@tensorflow/tfjs';
import { loadTrainingDataFromDB, ProcessedDataset, splitDataset, balanceDataset } from './blink-dataset-loader';
import {
  buildVocabulary,
  textToSequence,
  padSequences,
  buildCharVocabulary,
  textToCharSequence,
  TFIDFVectorizer
} from './text-preprocessing';
import { ModelFactory, MODEL_CONFIGS } from './tfjs-models';

export interface TrainingProgress {
  stage: 'loading' | 'preprocessing' | 'building' | 'training' | 'evaluating' | 'saving' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  epoch?: number;
  totalEpochs?: number;
  loss?: number;
  accuracy?: number;
}

export interface TrainingConfig {
  scanType: 'url' | 'email' | 'sms' | 'qr';
  maxSamples?: number;
  testSplit?: number;
  balance?: boolean;
  epochs?: number;
  batchSize?: number;
  validationSplit?: number;
}

export interface TrainingResult {
  success: boolean;
  scanType: string;
  metrics: {
    trainAccuracy: number;
    trainLoss: number;
    testAccuracy: number;
    testLoss: number;
  };
  datasetInfo: {
    totalSamples: number;
    trainSamples: number;
    testSamples: number;
    phishingRatio: number;
  };
  trainingTime: number;
  modelSaved: boolean;
  error?: string;
}

export class BrowserMLTrainingService {
  private progressCallback?: (progress: TrainingProgress) => void;

  /**
   * Train a model for specific scan type
   */
  async train(
    config: TrainingConfig,
    onProgress?: (progress: TrainingProgress) => void
  ): Promise<TrainingResult> {
    this.progressCallback = onProgress;
    const startTime = Date.now();

    try {
      // Stage 1: Load data from Blink database
      this.reportProgress({
        stage: 'loading',
        progress: 5,
        message: `Loading ${config.scanType} training data from database...`
      });

      const dataset = await loadTrainingDataFromDB(config.scanType, config.maxSamples);

      if (dataset.texts.length === 0) {
        throw new Error(`No training data found for ${config.scanType}`);
      }

      this.reportProgress({
        stage: 'loading',
        progress: 15,
        message: `Loaded ${dataset.texts.length} samples`
      });

      // Stage 2: Preprocess data
      this.reportProgress({
        stage: 'preprocessing',
        progress: 20,
        message: 'Preprocessing dataset...'
      });

      let processedDataset = dataset;

      // Balance if requested
      if (config.balance) {
        processedDataset = balanceDataset(processedDataset);
        this.reportProgress({
          stage: 'preprocessing',
          progress: 25,
          message: `Balanced to ${processedDataset.texts.length} samples`
        });
      }

      // Split into train/test
      const { train, test } = splitDataset(
        processedDataset,
        config.testSplit || 0.2
      );

      this.reportProgress({
        stage: 'preprocessing',
        progress: 30,
        message: `Split: ${train.texts.length} train, ${test.texts.length} test`
      });

      // Stage 3: Build model
      this.reportProgress({
        stage: 'building',
        progress: 35,
        message: 'Building neural network...'
      });

      const modelConfig = MODEL_CONFIGS[config.scanType];
      const model = ModelFactory.createModel(modelConfig.type, modelConfig.config);
      model.build();

      const tfModel = model.getModel();
      if (!tfModel) {
        throw new Error('Failed to build model');
      }

      this.reportProgress({
        stage: 'building',
        progress: 40,
        message: 'Model architecture created'
      });

      // Stage 4: Prepare tensors
      this.reportProgress({
        stage: 'preprocessing',
        progress: 45,
        message: 'Converting data to tensors...'
      });

      const { trainX, trainY, testX, testY } = await this.prepareData(
        train,
        test,
        config.scanType,
        modelConfig.config
      );

      this.reportProgress({
        stage: 'preprocessing',
        progress: 50,
        message: 'Data prepared for training'
      });

      // Stage 5: Train model
      const epochs = config.epochs || 10;
      const batchSize = config.batchSize || 32;
      const validationSplit = config.validationSplit || 0.1;

      this.reportProgress({
        stage: 'training',
        progress: 55,
        message: `Training model (${epochs} epochs)...`,
        epoch: 0,
        totalEpochs: epochs
      });

      const history = await tfModel.fit(trainX, trainY, {
        epochs,
        batchSize,
        validationSplit,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            const progress = 55 + ((epoch + 1) / epochs) * 30;
            this.reportProgress({
              stage: 'training',
              progress,
              message: `Epoch ${epoch + 1}/${epochs}`,
              epoch: epoch + 1,
              totalEpochs: epochs,
              loss: logs?.loss,
              accuracy: logs?.acc
            });
          }
        }
      });

      // Stage 6: Evaluate
      this.reportProgress({
        stage: 'evaluating',
        progress: 85,
        message: 'Evaluating model on test set...'
      });

      const testEval = tfModel.evaluate(testX, testY) as tf.Scalar[];
      const testLoss = await testEval[0].data();
      const testAccuracy = await testEval[1].data();

      // Get final training metrics
      const trainLoss = history.history.loss[history.history.loss.length - 1] as number;
      const trainAccuracy = history.history.acc[history.history.acc.length - 1] as number;

      this.reportProgress({
        stage: 'evaluating',
        progress: 90,
        message: `Test accuracy: ${(testAccuracy[0] * 100).toFixed(2)}%`
      });

      // Stage 7: Save model
      this.reportProgress({
        stage: 'saving',
        progress: 95,
        message: 'Saving trained model...'
      });

      const modelPath = `indexeddb://phishguard-${config.scanType}-model`;
      await tfModel.save(modelPath);

      // Clean up tensors
      trainX.dispose();
      trainY.dispose();
      testX.dispose();
      testY.dispose();
      testEval.forEach(t => t.dispose());

      const trainingTime = Date.now() - startTime;

      this.reportProgress({
        stage: 'completed',
        progress: 100,
        message: 'Training completed successfully!'
      });

      return {
        success: true,
        scanType: config.scanType,
        metrics: {
          trainAccuracy,
          trainLoss,
          testAccuracy: testAccuracy[0],
          testLoss: testLoss[0]
        },
        datasetInfo: {
          totalSamples: processedDataset.texts.length,
          trainSamples: train.texts.length,
          testSamples: test.texts.length,
          phishingRatio: processedDataset.metadata.phishingSamples / processedDataset.metadata.totalSamples
        },
        trainingTime,
        modelSaved: true
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.reportProgress({
        stage: 'error',
        progress: 0,
        message: `Training failed: ${errorMessage}`
      });

      return {
        success: false,
        scanType: config.scanType,
        metrics: { trainAccuracy: 0, trainLoss: 0, testAccuracy: 0, testLoss: 0 },
        datasetInfo: { totalSamples: 0, trainSamples: 0, testSamples: 0, phishingRatio: 0 },
        trainingTime: Date.now() - startTime,
        modelSaved: false,
        error: errorMessage
      };
    }
  }

  /**
   * Prepare data and convert to tensors based on scan type
   */
  private async prepareData(
    train: ProcessedDataset,
    test: ProcessedDataset,
    scanType: string,
    modelConfig: any
  ): Promise<{
    trainX: tf.Tensor;
    trainY: tf.Tensor;
    testX: tf.Tensor;
    testY: tf.Tensor;
  }> {
    if (scanType === 'url') {
      // Character-level encoding for URLs
      return this.prepareCharacterData(train, test, modelConfig.maxLength || 256);
    } else {
      // Word-level encoding for email/sms/qr
      return this.prepareSequenceData(
        train,
        test,
        modelConfig.vocabSize || 10000,
        modelConfig.maxLength || 100
      );
    }
  }

  /**
   * Prepare character-level data (for URLs)
   */
  private async prepareCharacterData(
    train: ProcessedDataset,
    test: ProcessedDataset,
    maxLength: number
  ): Promise<{
    trainX: tf.Tensor;
    trainY: tf.Tensor;
    testX: tf.Tensor;
    testY: tf.Tensor;
  }> {
    const charVocab = buildCharVocabulary();

    // Convert texts to character sequences
    const trainSequences = train.texts.map(text =>
      textToCharSequence(text, charVocab, maxLength)
    );
    const testSequences = test.texts.map(text =>
      textToCharSequence(text, charVocab, maxLength)
    );

    // Create tensors
    const trainX = tf.tensor2d(trainSequences);
    const trainY = tf.tensor2d(train.labels, [train.labels.length, 1]);
    const testX = tf.tensor2d(testSequences);
    const testY = tf.tensor2d(test.labels, [test.labels.length, 1]);

    return { trainX, trainY, testX, testY };
  }

  /**
   * Prepare word-level sequence data (for email/sms/qr)
   */
  private async prepareSequenceData(
    train: ProcessedDataset,
    test: ProcessedDataset,
    vocabSize: number,
    maxLength: number
  ): Promise<{
    trainX: tf.Tensor;
    trainY: tf.Tensor;
    testX: tf.Tensor;
    testY: tf.Tensor;
  }> {
    // Build vocabulary from training data
    const vocabulary = buildVocabulary(train.texts, vocabSize);

    // Convert texts to sequences
    const trainSequences = train.texts.map(text =>
      textToSequence(text, vocabulary)
    );
    const testSequences = test.texts.map(text =>
      textToSequence(text, vocabulary)
    );

    // Pad sequences
    const trainPadded = padSequences(trainSequences, maxLength);
    const testPadded = padSequences(testSequences, maxLength);

    // Create tensors
    const trainX = tf.tensor2d(trainPadded);
    const trainY = tf.tensor2d(train.labels, [train.labels.length, 1]);
    const testX = tf.tensor2d(testPadded);
    const testY = tf.tensor2d(test.labels, [test.labels.length, 1]);

    return { trainX, trainY, testX, testY };
  }

  /**
   * Report progress to callback
   */
  private reportProgress(progress: TrainingProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
    console.log(`[${progress.stage}] ${progress.message}`);
  }
}

/**
 * Quick train function for easy API usage
 */
export async function trainModel(
  scanType: 'url' | 'email' | 'sms' | 'qr',
  options?: {
    maxSamples?: number;
    epochs?: number;
    balance?: boolean;
    onProgress?: (progress: TrainingProgress) => void;
  }
): Promise<TrainingResult> {
  const service = new BrowserMLTrainingService();
  
  return await service.train(
    {
      scanType,
      maxSamples: options?.maxSamples,
      epochs: options?.epochs || 10,
      balance: options?.balance !== false,
      testSplit: 0.2,
      batchSize: 32,
      validationSplit: 0.1
    },
    options?.onProgress
  );
}
