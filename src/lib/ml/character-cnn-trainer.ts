/**
 * Character-CNN Advanced Trainer
 * 
 * Handles end-to-end training pipeline:
 * 1. Load CSV data from edge function
 * 2. Preprocess for Character-CNN
 * 3. Build and train model
 * 4. Evaluate and save model
 */

import * as tf from '@tensorflow/tfjs';
import { CharacterCNNModel } from './character-cnn-model';
import { saveModelToLocalStorage, SavedModelMetadata } from './model-persistence';

export interface TrainingConfig {
  epochs: number;
  batchSize: number;
  validationSplit: number;
  learningRate: number;
  verbose: boolean;
}

export interface TrainingMetrics {
  loss: number[];
  accuracy: number[];
  valLoss: number[];
  valAccuracy: number[];
  epoch: number;
  duration: number;
}

export interface DataSplit {
  train: {
    inputs: tf.Tensor2D;
    labels: tf.Tensor1D;
  };
  test: {
    inputs: tf.Tensor2D;
    labels: tf.Tensor1D;
  };
}

export class CharacterCNNTrainer {
  private model: CharacterCNNModel;
  private metrics: TrainingMetrics = {
    loss: [],
    accuracy: [],
    valLoss: [],
    valAccuracy: [],
    epoch: 0,
    duration: 0,
  };

  constructor() {
    this.model = new CharacterCNNModel();
  }

  /**
   * Load training data from edge function
   */
  async loadTrainingData(
    csvUrl: string,
    edgeFunctionUrl: string
  ): Promise<DataSplit> {
    try {
      console.log('📥 Loading training data from CSV...');

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetUrl: csvUrl }),
      });

      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.statusText}`);
      }

      const result = await response.json() as {
        success: boolean;
        preprocessedData?: string;
        error?: string;
      };

      if (!result.success || !result.preprocessedData) {
        throw new Error(result.error || 'Failed to preprocess data');
      }

      const data = JSON.parse(result.preprocessedData);

      // Convert to tensors
      const trainInputs = tf.tensor2d(data.trainData.inputs, [
        data.trainData.inputs.length,
        data.metadata.maxLength,
      ]);
      const trainLabels = tf.tensor1d(data.trainData.labels, 'int32');

      const testInputs = tf.tensor2d(data.testData.inputs, [
        data.testData.inputs.length,
        data.metadata.maxLength,
      ]);
      const testLabels = tf.tensor1d(data.testData.labels, 'int32');

      console.log('✅ Training data loaded successfully');

      return {
        train: { inputs: trainInputs, labels: trainLabels },
        test: { inputs: testInputs, labels: testLabels },
      };
    } catch (error) {
      console.error('❌ Failed to load training data:', error);
      throw error;
    }
  }

  /**
   * Train Character-CNN model
   */
  async train(
    dataSplit: DataSplit,
    config: TrainingConfig,
    onProgress?: (progress: {
      epoch: number;
      totalEpochs: number;
      loss: number;
      accuracy: number;
      valLoss?: number;
      valAccuracy?: number;
    }) => void
  ): Promise<TrainingMetrics> {
    const startTime = Date.now();

    try {
      console.log('🚀 Starting Character-CNN training...');

      // Build model
      const compiledModel = this.model.buildModel(75, 50, config.learningRate);

      // Train model
      const history = await compiledModel.fit(dataSplit.train.inputs, dataSplit.train.labels, {
        epochs: config.epochs,
        batchSize: config.batchSize,
        validationSplit: config.validationSplit,
        verbose: config.verbose ? 1 : 0,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (logs) {
              this.metrics.loss.push(logs.loss);
              this.metrics.accuracy.push(logs.acc || 0);
              this.metrics.valLoss.push(logs.val_loss || 0);
              this.metrics.valAccuracy.push(logs.val_acc || 0);
            }

            if (onProgress) {
              onProgress({
                epoch: epoch + 1,
                totalEpochs: config.epochs,
                loss: logs?.loss || 0,
                accuracy: logs?.acc || 0,
                valLoss: logs?.val_loss,
                valAccuracy: logs?.val_acc,
              });
            }
          },
        },
      });

      // Evaluate on test set
      const testResults = await compiledModel.evaluate(
        dataSplit.test.inputs,
        dataSplit.test.labels
      ) as tf.Tensor[];

      const testLoss = await testResults[0].data();
      const testAccuracy = await testResults[1].data();

      console.log(`✅ Training complete!`);
      console.log(`   Test Loss: ${testLoss[0].toFixed(4)}`);
      console.log(`   Test Accuracy: ${(testAccuracy[0] * 100).toFixed(2)}%`);

      // Clean up tensors
      testResults.forEach((t) => t.dispose());

      this.metrics.duration = Date.now() - startTime;
      this.metrics.epoch = config.epochs;

      return this.metrics;
    } catch (error) {
      console.error('❌ Training failed:', error);
      throw error;
    }
  }

  /**
   * Save trained model
   */
  async saveModel(modelName: string): Promise<boolean> {
    try {
      const model = this.model.getModel();
      if (!model) {
        throw new Error('No model to save');
      }

      const metadata: SavedModelMetadata = {
        modelName,
        timestamp: new Date().toISOString(),
        algorithm: 'character-cnn',
        version: '1.0.0',
        maxSequenceLength: 75,
        charsetSize: 50,
        trainingStats: {
          epochs: this.metrics.epoch,
          finalLoss: this.metrics.loss[this.metrics.loss.length - 1] || 0,
          finalAccuracy: this.metrics.accuracy[this.metrics.accuracy.length - 1] || 0,
          trainingTime: this.metrics.duration,
        },
        charset: this.generateCharset(),
      };

      return await saveModelToLocalStorage(model, metadata);
    } catch (error) {
      console.error('❌ Failed to save model:', error);
      return false;
    }
  }

  /**
   * Generate charset mapping
   */
  private generateCharset(): Array<{ char: string; idx: number }> {
    const charset = 'abcdefghijklmnopqrstuvwxyz0123456789-_.:/?#&=';
    const charMap: Array<{ char: string; idx: number }> = [{ char: '<PAD>', idx: 0 }];

    for (let i = 0; i < charset.length; i++) {
      charMap.push({ char: charset[i], idx: i + 1 });
    }

    return charMap;
  }

  /**
   * Get current metrics
   */
  getMetrics(): TrainingMetrics {
    return this.metrics;
  }

  /**
   * Reset trainer state
   */
  reset(): void {
    this.metrics = {
      loss: [],
      accuracy: [],
      valLoss: [],
      valAccuracy: [],
      epoch: 0,
      duration: 0,
    };
    this.model = new CharacterCNNModel();
  }

  /**
   * Get model instance
   */
  getModel(): CharacterCNNModel {
    return this.model;
  }
}
