/**
 * Model Persistence Layer for Character-CNN
 * Handles saving, loading, and managing trained models
 */

import * as tf from '@tensorflow/tfjs';

export interface SavedModelMetadata {
  modelName: string;
  timestamp: string;
  algorithm: 'character-cnn';
  version: string;
  maxSequenceLength: number;
  charsetSize: number;
  trainingStats?: {
    epochs: number;
    finalLoss: number;
    finalAccuracy: number;
    trainingTime: number;
  };
  charset: Array<{ char: string; idx: number }>;
}

const STORAGE_KEY = 'phishguard-models';

/**
 * Save model to browser localStorage
 */
export async function saveModelToLocalStorage(
  model: tf.LayersModel,
  metadata: SavedModelMetadata
): Promise<boolean> {
  try {
    console.log('💾 Saving Character-CNN model to storage...');

    // Save model to IndexedDB via tf.io
    const saveResult = await model.save(
      `indexeddb://${STORAGE_KEY}-${metadata.modelName}`
    );

    if (!saveResult) {
      throw new Error('Model save operation failed');
    }

    // Save metadata to localStorage
    const storageData = {
      models: JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"models":[]}').models || [],
    };

    const existingIndex = storageData.models.findIndex(
      (m: any) => m.modelName === metadata.modelName
    );

    if (existingIndex >= 0) {
      storageData.models[existingIndex] = metadata;
    } else {
      storageData.models.push(metadata);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));

    console.log('✅ Model saved successfully to IndexedDB');
    return true;
  } catch (error) {
    console.error('❌ Failed to save model:', error);
    return false;
  }
}

/**
 * Load model from browser storage
 */
export async function loadModelFromLocalStorage(modelName: string): Promise<tf.LayersModel | null> {
  try {
    console.log(`📂 Loading Character-CNN model: ${modelName}...`);

    const model = await tf.loadLayersModel(
      `indexeddb://${STORAGE_KEY}-${modelName}`
    );

    console.log('✅ Model loaded successfully');
    return model;
  } catch (error) {
    console.error('❌ Failed to load model:', error);
    return null;
  }
}

/**
 * Get list of saved models
 */
export function getSavedModels(): SavedModelMetadata[] {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"models":[]}');
    return data.models || [];
  } catch {
    return [];
  }
}

/**
 * Delete model from storage
 */
export async function deleteModel(modelName: string): Promise<boolean> {
  try {
    // Get IndexedDB database
    const databases = await window.indexedDB.databases();
    const dbName = `tensorflowjs`;

    // Note: Direct IndexedDB deletion is handled by TensorFlow.js
    // We just need to update metadata

    const storageData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"models":[]}');
    storageData.models = storageData.models.filter(
      (m: any) => m.modelName !== modelName
    );

    localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));

    console.log(`✅ Model metadata removed: ${modelName}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to delete model:', error);
    return false;
  }
}

/**
 * Export model as JSON for download
 */
export async function exportModelAsJSON(model: tf.LayersModel, modelName: string): Promise<string> {
  try {
    const modelJSON = model.toJSON();
    const weights = await Promise.all(
      model.weights.map(async (weight) => {
        const data = await weight.data();
        return Array.from(data);
      })
    );

    return JSON.stringify({
      model: modelJSON,
      weights,
      timestamp: new Date().toISOString(),
      name: modelName,
    });
  } catch (error) {
    console.error('❌ Failed to export model:', error);
    throw error;
  }
}

/**
 * Import model from JSON
 */
export async function importModelFromJSON(jsonString: string): Promise<tf.LayersModel> {
  try {
    const data = JSON.parse(jsonString);

    // Create model from config
    const model = await tf.models.modelFromJSON({
      modelTopology: data.model.modelTopology,
      weightsManifest: data.model.weightsManifest,
    });

    return model;
  } catch (error) {
    console.error('❌ Failed to import model:', error);
    throw error;
  }
}

/**
 * Get storage stats
 */
export async function getStorageStats(): Promise<{
  modelCount: number;
  estimatedSize: number;
  models: string[];
}> {
  try {
    const savedModels = getSavedModels();

    return {
      modelCount: savedModels.length,
      estimatedSize: JSON.stringify(localStorage.getItem(STORAGE_KEY) || '').length,
      models: savedModels.map((m) => m.modelName),
    };
  } catch (error) {
    console.error('❌ Failed to get storage stats:', error);
    return {
      modelCount: 0,
      estimatedSize: 0,
      models: [],
    };
  }
}
