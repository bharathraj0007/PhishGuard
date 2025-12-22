/**
 * Browser-Based Model Trainer
 * 
 * Trains lightweight ML models using TensorFlow.js in the browser
 * Stores training metadata in training_records and model info in model_versions
 */

import * as tf from '@tensorflow/tfjs';
import { blink } from '../blink';
import type { ProcessedData, CharProcessedData } from './tfjs-data-processor';

export interface TrainingConfig {
  epochs: number;
  batchSize: number;
  learningRate: number;
  validationSplit: number;
}

export interface TrainingProgress {
  epoch: number;
  loss: number;
  accuracy: number;
  valLoss?: number;
  valAccuracy?: number;
}

export interface TrainingResult {
  modelVersionId: string;
  finalAccuracy: number;
  finalLoss: number;
  trainingTime: number;
  epochs: number;
}

/**
 * Create a simple feedforward neural network for text classification
 */
export function createSimpleTextModel(
  vocabSize: number,
  maxLength: number,
  embeddingDim: number = 32
): tf.LayersModel {
  const model = tf.sequential();
  
  // Embedding layer
  model.add(tf.layers.embedding({
    inputDim: vocabSize,
    outputDim: embeddingDim,
    inputLength: maxLength
  }));
  
  // Global average pooling
  model.add(tf.layers.globalAveragePooling1d());
  
  // Dense layers
  model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.5 }));
  model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
  
  return model;
}

/**
 * Create a character-level CNN model
 */
export function createCharCNNModel(
  charVocabSize: number,
  maxLength: number
): tf.LayersModel {
  const model = tf.sequential();
  
  // Embedding layer
  model.add(tf.layers.embedding({
    inputDim: charVocabSize,
    outputDim: 16,
    inputLength: maxLength,
    inputShape: [maxLength]
  }));
  
  // Conv1D layers
  model.add(tf.layers.conv1d({
    filters: 32,
    kernelSize: 3,
    activation: 'relu'
  }));
  
  model.add(tf.layers.maxPooling1d({ poolSize: 2 }));
  
  model.add(tf.layers.conv1d({
    filters: 64,
    kernelSize: 3,
    activation: 'relu'
  }));
  
  model.add(tf.layers.globalMaxPooling1d());
  
  // Dense layers
  model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.5 }));
  model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
  
  return model;
}

/**
 * Create a simple feature-based model (for URLs)
 */
export function createFeatureModel(featureCount: number): tf.LayersModel {
  const model = tf.sequential();
  
  model.add(tf.layers.dense({
    units: 32,
    activation: 'relu',
    inputShape: [featureCount]
  }));
  
  model.add(tf.layers.dropout({ rate: 0.3 }));
  
  model.add(tf.layers.dense({
    units: 16,
    activation: 'relu'
  }));
  
  model.add(tf.layers.dense({
    units: 1,
    activation: 'sigmoid'
  }));
  
  return model;
}

/**
 * Store training record in database
 */
async function saveTrainingRecord(
  datasetId: string,
  modelVersionId: string,
  epoch: number,
  metrics: TrainingProgress,
  userId: string
): Promise<void> {
  try {
    await blink.db.trainingRecords.create({
      id: `training_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      datasetId,
      content: `Epoch ${epoch} training`,
      scanType: 'training',
      isPhishing: 0,
      threatLevel: 'safe',
      indicators: JSON.stringify(metrics),
      notes: `Model: ${modelVersionId}, Accuracy: ${metrics.accuracy.toFixed(4)}`,
      synced: 1,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving training record:', error);
  }
}

/**
 * Create model version entry
 */
async function createModelVersion(
  modelType: string,
  datasetId: string,
  userId: string
): Promise<string> {
  const version = `v${Date.now()}`;
  
  const modelVersion = await blink.db.modelVersions.create({
    id: `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    versionNumber: version,
    description: `${modelType} model trained on dataset ${datasetId}`,
    modelType,
    trainingDatasetId: datasetId,
    trainingStartedAt: new Date().toISOString(),
    status: 'training',
    isActive: 0,
    createdBy: userId,
    synced: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  
  return modelVersion.id;
}

/**
 * Update model version after training
 */
async function updateModelVersion(
  modelVersionId: string,
  metrics: {
    accuracy: number;
    loss: number;
    valAccuracy?: number;
    valLoss?: number;
  },
  trainingDuration: number
): Promise<void> {
  try {
    await blink.db.modelVersions.update(modelVersionId, {
      trainingCompletedAt: new Date().toISOString(),
      trainingDuration,
      status: 'completed',
      isActive: 1,
      metrics: JSON.stringify(metrics),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating model version:', error);
  }
}

/**
 * Train a model with the given data
 */
export async function trainModel(
  model: tf.LayersModel,
  data: ProcessedData | CharProcessedData,
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
): Promise<TrainingResult> {
  const startTime = Date.now();
  
  // Create model version entry
  const modelVersionId = await createModelVersion(
    metadata.modelType,
    metadata.datasetId,
    metadata.userId
  );
  
  console.log('Training started:', modelVersionId);
  
  // Compile model
  model.compile({
    optimizer: tf.train.adam(config.learningRate),
    loss: 'binaryCrossentropy',
    metrics: ['accuracy']
  });
  
  // Training history
  const history: TrainingProgress[] = [];
  
  // Train model
  await model.fit(data.xTrain, data.yTrain, {
    epochs: config.epochs,
    batchSize: config.batchSize,
    validationSplit: config.validationSplit,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        const progress: TrainingProgress = {
          epoch: epoch + 1,
          loss: logs?.loss || 0,
          accuracy: logs?.acc || 0,
          valLoss: logs?.val_loss,
          valAccuracy: logs?.val_acc
        };
        
        history.push(progress);
        
        // Save training record to database
        await saveTrainingRecord(
          metadata.datasetId,
          modelVersionId,
          epoch + 1,
          progress,
          metadata.userId
        );
        
        // Call progress callback
        if (callbacks.onEpochEnd) {
          callbacks.onEpochEnd(epoch + 1, progress);
        }
        
        console.log(`Epoch ${epoch + 1}: loss=${progress.loss.toFixed(4)}, acc=${progress.accuracy.toFixed(4)}`);
      }
    }
  });
  
  // Evaluate on test set
  const evaluation = model.evaluate(data.xTest, data.yTest) as tf.Scalar[];
  const testLoss = await evaluation[0].data();
  const testAccuracy = await evaluation[1].data();
  
  const trainingTime = Date.now() - startTime;
  
  // Update model version with final metrics
  await updateModelVersion(
    modelVersionId,
    {
      accuracy: testAccuracy[0],
      loss: testLoss[0],
      valAccuracy: history[history.length - 1]?.valAccuracy,
      valLoss: history[history.length - 1]?.valLoss
    },
    trainingTime
  );
  
  const result: TrainingResult = {
    modelVersionId,
    finalAccuracy: testAccuracy[0],
    finalLoss: testLoss[0],
    trainingTime,
    epochs: config.epochs
  };
  
  // Call completion callback
  if (callbacks.onTrainingComplete) {
    callbacks.onTrainingComplete(result);
  }
  
  console.log('Training complete:', result);
  
  // Cleanup
  evaluation.forEach(t => t.dispose());
  
  return result;
}

/**
 * Save trained model to browser storage
 */
export async function saveModelToStorage(
  model: tf.LayersModel,
  modelName: string
): Promise<void> {
  await model.save(`indexeddb://${modelName}`);
  console.log(`Model saved to browser storage: ${modelName}`);
}

/**
 * Load model from browser storage
 */
export async function loadModelFromStorage(
  modelName: string
): Promise<tf.LayersModel | null> {
  try {
    const model = await tf.loadLayersModel(`indexeddb://${modelName}`);
    console.log(`Model loaded from browser storage: ${modelName}`);
    return model;
  } catch (error) {
    console.error('Error loading model:', error);
    return null;
  }
}

/**
 * Complete training pipeline
 */
export async function trainModelPipeline(
  modelType: 'simple' | 'char-cnn' | 'feature',
  data: ProcessedData | CharProcessedData,
  config: TrainingConfig,
  callbacks: {
    onEpochEnd?: (epoch: number, progress: TrainingProgress) => void;
    onTrainingComplete?: (result: TrainingResult) => void;
  },
  metadata: {
    datasetId: string;
    userId: string;
    modelName: string;
  }
): Promise<{ model: tf.LayersModel; result: TrainingResult }> {
  // Create model based on type
  let model: tf.LayersModel;
  
  if (modelType === 'simple') {
    model = createSimpleTextModel(
      data.metadata.vocabSize || 10000,
      data.metadata.maxLength
    );
  } else if (modelType === 'char-cnn') {
    const charData = data as CharProcessedData;
    model = createCharCNNModel(
      charData.metadata.charVocabSize,
      charData.metadata.maxLength
    );
  } else {
    model = createFeatureModel(data.metadata.vocabSize || 13);
  }
  
  // Train model
  const result = await trainModel(
    model,
    data,
    config,
    callbacks,
    {
      modelType,
      datasetId: metadata.datasetId,
      userId: metadata.userId
    }
  );
  
  // Save model to browser storage
  await saveModelToStorage(model, metadata.modelName);
  
  return { model, result };
}
