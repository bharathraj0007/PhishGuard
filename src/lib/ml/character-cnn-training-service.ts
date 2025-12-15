/**
 * Character-CNN Training Service
 *
 * Complete training pipeline for URL phishing detection using Character-CNN
 * Handles data loading, preprocessing, training, evaluation, and model persistence
 */

import * as tf from '@tensorflow/tfjs';
import { CharacterCNNModel } from './character-cnn-model';

export interface TrainingConfig {
  batchSize?: number;
  epochs?: number;
  learningRate?: number;
  validationSplit?: number;
  verbose?: boolean;
  earlyStoppingPatience?: number;
}

export interface TrainingProgress {
  epoch: number;
  totalEpochs: number;
  loss: number;
  accuracy: number;
  valLoss: number;
  valAccuracy: number;
  progress: number; // 0-100
}

export interface TrainingMetrics {
  loss: number;
  accuracy: number;
  valLoss: number;
  valAccuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
}

export interface TrainingResult {
  success: boolean;
  metrics: TrainingMetrics;
  epochs: number;
  trainingTime: number;
  message: string;
}

export interface URLDataPoint {
  url: string;
  label: number; // 0: legitimate, 1: phishing
}

export class CharacterCNNTrainingService {
  private model: CharacterCNNModel;
  private trainingProgress: TrainingProgress | null = null;
  private isTraining: boolean = false;

  constructor(model: CharacterCNNModel) {
    this.model = model;
  }

  /**
   * Prepare training data from URLs
   */
  prepareTrainingData(
    data: URLDataPoint[],
    validationSplit: number = 0.2
  ): {
    trainUrls: string[];
    trainLabels: number[];
    valUrls: string[];
    valLabels: number[];
  } {
    // Shuffle data
    const shuffled = [...data].sort(() => Math.random() - 0.5);

    const splitIdx = Math.floor(shuffled.length * (1 - validationSplit));

    const trainData = shuffled.slice(0, splitIdx);
    const valData = shuffled.slice(splitIdx);

    return {
      trainUrls: trainData.map((d) => d.url),
      trainLabels: trainData.map((d) => d.label),
      valUrls: valData.map((d) => d.url),
      valLabels: valData.map((d) => d.label),
    };
  }

  /**
   * Create tensors from URL data
   */
  createDatasetTensors(
    urls: string[],
    labels: number[]
  ): { inputs: tf.Tensor2D; outputs: tf.Tensor2D } {
    const indices = urls.map((url) => this.model.urlToIndices(url));

    const inputs = tf.tensor2d(indices, [urls.length, this.model.getMaxSequenceLength()], 'int32');
    const outputs = tf.tensor2d(labels, [labels.length, 1], 'float32');

    return { inputs, outputs };
  }

  /**
   * Train the model
   */
  async train(
    data: URLDataPoint[],
    config: TrainingConfig = {}
  ): Promise<TrainingResult> {
    const startTime = Date.now();

    // Default config
    const batchSize = config.batchSize || 32;
    const epochs = config.epochs || 20;
    const learningRate = config.learningRate || 0.001;
    const validationSplit = config.validationSplit || 0.2;
    const verbose = config.verbose !== false;
    const earlyStoppingPatience = config.earlyStoppingPatience || 5;

    if (this.isTraining) {
      throw new Error('Training already in progress');
    }

    if (data.length < 100) {
      throw new Error('Minimum 100 samples required for training');
    }

    this.isTraining = true;

    try {
      console.log('📊 Preparing training data...');
      const { trainUrls, trainLabels, valUrls, valLabels } =
        this.prepareTrainingData(data, validationSplit);

      console.log(
        `✅ Training set: ${trainUrls.length} | Validation set: ${valUrls.length}`
      );

      // Create tensors
      console.log('🔢 Creating tensors...');
      const { inputs: trainInputs, outputs: trainOutputs } =
        this.createDatasetTensors(trainUrls, trainLabels);
      const { inputs: valInputs, outputs: valOutputs } =
        this.createDatasetTensors(valUrls, valLabels);

      const tfModel = this.model.getModel();
      if (!tfModel) {
        throw new Error('Model not built');
      }

      // Training loop
      console.log(`🚀 Starting training for ${epochs} epochs...`);

      let bestValLoss = Infinity;
      let patienceCounter = 0;
      const metrics: TrainingMetrics = {
        loss: 0,
        accuracy: 0,
        valLoss: 0,
        valAccuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
      };

      for (let epoch = 0; epoch < epochs; epoch++) {
        const result = await tfModel.fit(trainInputs, trainOutputs, {
          batchSize,
          epochs: 1,
          validationData: [valInputs, valOutputs],
          verbose: 0,
        });

        const loss = result.history.loss[0] as number;
        const accuracy = result.history.acc?.[0] || 0;
        const valLoss = result.history.val_loss?.[0] || 0;
        const valAccuracy = result.history.val_acc?.[0] || 0;

        metrics.loss = loss;
        metrics.accuracy = accuracy;
        metrics.valLoss = valLoss;
        metrics.valAccuracy = valAccuracy;

        // Update progress
        this.trainingProgress = {
          epoch: epoch + 1,
          totalEpochs: epochs,
          loss,
          accuracy,
          valLoss,
          valAccuracy,
          progress: Math.round(((epoch + 1) / epochs) * 100),
        };

        if (verbose) {
          console.log(
            `Epoch ${epoch + 1}/${epochs} | Loss: ${loss.toFixed(4)} | Acc: ${accuracy.toFixed(4)} | Val Loss: ${valLoss.toFixed(4)} | Val Acc: ${valAccuracy.toFixed(4)}`
          );
        }

        // Early stopping
        if (valLoss < bestValLoss) {
          bestValLoss = valLoss;
          patienceCounter = 0;
        } else {
          patienceCounter++;
          if (patienceCounter >= earlyStoppingPatience) {
            console.log(
              `⏹️ Early stopping at epoch ${epoch + 1} (patience: ${earlyStoppingPatience})`
            );
            break;
          }
        }
      }

      // Calculate additional metrics
      console.log('📈 Calculating metrics...');
      metrics.precision = this.calculatePrecision(
        valOutputs as tf.Tensor,
        tfModel.predict(valInputs) as tf.Tensor
      );
      metrics.recall = this.calculateRecall(
        valOutputs as tf.Tensor,
        tfModel.predict(valInputs) as tf.Tensor
      );
      metrics.f1Score = this.calculateF1Score(metrics.precision, metrics.recall);

      // Cleanup
      trainInputs.dispose();
      trainOutputs.dispose();
      valInputs.dispose();
      valOutputs.dispose();

      const trainingTime = Date.now() - startTime;

      this.isTraining = false;

      return {
        success: true,
        metrics,
        epochs: this.trainingProgress?.epoch || epochs,
        trainingTime,
        message: `✅ Training completed in ${(trainingTime / 1000).toFixed(2)}s`,
      };
    } catch (error) {
      this.isTraining = false;
      throw error;
    }
  }

  /**
   * Calculate precision
   */
  private calculatePrecision(actual: tf.Tensor, predicted: tf.Tensor): number {
    const actualData = (actual as any).dataSync();
    const predictedData = (predicted as any).dataSync();

    let tp = 0;
    let fp = 0;

    for (let i = 0; i < actualData.length; i++) {
      const pred = predictedData[i] > 0.5 ? 1 : 0;
      if (pred === 1 && actualData[i] === 1) tp++;
      if (pred === 1 && actualData[i] === 0) fp++;
    }

    return tp / (tp + fp || 1);
  }

  /**
   * Calculate recall
   */
  private calculateRecall(actual: tf.Tensor, predicted: tf.Tensor): number {
    const actualData = (actual as any).dataSync();
    const predictedData = (predicted as any).dataSync();

    let tp = 0;
    let fn = 0;

    for (let i = 0; i < actualData.length; i++) {
      const pred = predictedData[i] > 0.5 ? 1 : 0;
      if (pred === 1 && actualData[i] === 1) tp++;
      if (pred === 0 && actualData[i] === 1) fn++;
    }

    return tp / (tp + fn || 1);
  }

  /**
   * Calculate F1 Score
   */
  private calculateF1Score(precision: number, recall: number): number {
    if (precision + recall === 0) return 0;
    return (2 * (precision * recall)) / (precision + recall);
  }

  /**
   * Get current training progress
   */
  getProgress(): TrainingProgress | null {
    return this.trainingProgress;
  }

  /**
   * Check if training is in progress
   */
  isTrainingInProgress(): boolean {
    return this.isTraining;
  }

  /**
   * Evaluate model on test data
   */
  async evaluate(
    testUrls: string[],
    testLabels: number[]
  ): Promise<{
    accuracy: number;
    loss: number;
    precision: number;
    recall: number;
    f1Score: number;
  }> {
    const tfModel = this.model.getModel();
    if (!tfModel) {
      throw new Error('Model not built');
    }

    const { inputs, outputs } = this.createDatasetTensors(
      testUrls,
      testLabels
    );

    const result = tfModel.evaluate(inputs, outputs) as tf.Tensor[];
    const [loss, accuracy] = await Promise.all([
      result[0].data(),
      result[1].data(),
    ]);

    // Calculate precision and recall
    const predictions = tfModel.predict(inputs) as tf.Tensor;
    const precision = this.calculatePrecision(outputs, predictions);
    const recall = this.calculateRecall(outputs, predictions);
    const f1Score = this.calculateF1Score(precision, recall);

    inputs.dispose();
    outputs.dispose();
    result.forEach((t) => t.dispose());
    predictions.dispose();

    return {
      accuracy: accuracy[0],
      loss: loss[0],
      precision,
      recall,
      f1Score,
    };
  }
}
