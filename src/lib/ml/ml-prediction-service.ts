/**
 * ML Prediction Service
 * 
 * Real-time phishing detection using trained TensorFlow.js models.
 * Models are loaded from IndexedDB and used for inference in the browser.
 */

import * as tf from '@tensorflow/tfjs';
import {
  buildVocabulary,
  textToSequence,
  padSequences,
  buildCharVocabulary,
  textToCharSequence,
  cleanText
} from './text-preprocessing';
import { safeInference } from './tf-backend-manager';

export interface PredictionResult {
  isPhishing: boolean;
  confidence: number;
  threatLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  processingTime: number;
}

export interface DetailedPrediction extends PredictionResult {
  rawScore: number;
  modelType: string;
  features?: Record<string, any>;
}

/**
 * ML Prediction Service for real-time phishing detection
 */
export class MLPredictionService {
  private models: Map<string, tf.LayersModel> = new Map();
  private vocabularies: Map<string, Map<string, number>> = new Map();
  private charVocabulary?: Map<string, number>;
  private modelConfigs: Map<string, any> = new Map();

  /**
   * Load a trained model from IndexedDB
   */
  async loadModel(scanType: 'url' | 'email' | 'sms' | 'qr'): Promise<boolean> {
    try {
      const modelPath = `indexeddb://phishguard-${scanType}-model`;
      console.log(`📥 Loading ${scanType} model from IndexedDB...`);

      const model = await tf.loadLayersModel(modelPath);
      this.models.set(scanType, model);

      console.log(`✅ ${scanType} model loaded successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to load ${scanType} model:`, error);
      return false;
    }
  }

  /**
   * Load all available models
   */
  async loadAllModels(): Promise<Map<string, boolean>> {
    const scanTypes: ('url' | 'email' | 'sms' | 'qr')[] = ['url', 'email', 'sms', 'qr'];
    const results = new Map<string, boolean>();

    for (const scanType of scanTypes) {
      const loaded = await this.loadModel(scanType);
      results.set(scanType, loaded);
    }

    return results;
  }

  /**
   * Check if a model is loaded
   */
  isModelLoaded(scanType: string): boolean {
    return this.models.has(scanType);
  }

  /**
   * Predict phishing for given content
   * Uses tf.tidy() to safely manage tensor memory
   */
  async predict(
    content: string,
    scanType: 'url' | 'email' | 'sms' | 'qr'
  ): Promise<DetailedPrediction> {
    const startTime = Date.now();

    try {
      // Check if model is loaded
      if (!this.models.has(scanType)) {
        const loaded = await this.loadModel(scanType);
        if (!loaded) {
          throw new Error(`Model for ${scanType} not available`);
        }
      }

      const model = this.models.get(scanType)!;

      // Run prediction with automatic tensor cleanup
      const score = await tf.tidy(async () => {
        // Preprocess input based on scan type
        const inputTensor = this.preprocessInput(content, scanType);

        // Run prediction
        const prediction = model.predict(inputTensor) as tf.Tensor;
        const scoreData = await prediction.data();
        
        // Extract score before tensors are disposed by tf.tidy
        return scoreData[0];
      });

      const processingTime = Date.now() - startTime;

      // Interpret results
      const isPhishing = score > 0.5;
      const confidence = isPhishing ? score : 1 - score;
      const threatLevel = this.calculateThreatLevel(score);

      return {
        isPhishing,
        confidence,
        threatLevel,
        processingTime,
        rawScore: score,
        modelType: scanType
      };

    } catch (error) {
      console.error(`Prediction error for ${scanType}:`, error);
      
      // Return safe default
      return {
        isPhishing: false,
        confidence: 0,
        threatLevel: 'safe',
        processingTime: Date.now() - startTime,
        rawScore: 0,
        modelType: scanType
      };
    }
  }

  /**
   * Batch prediction for multiple inputs
   */
  async predictBatch(
    contents: string[],
    scanType: 'url' | 'email' | 'sms' | 'qr'
  ): Promise<DetailedPrediction[]> {
    const predictions: DetailedPrediction[] = [];

    for (const content of contents) {
      const prediction = await this.predict(content, scanType);
      predictions.push(prediction);
    }

    return predictions;
  }

  /**
   * Preprocess input for model inference
   */
  private preprocessInput(content: string, scanType: string): tf.Tensor {
    if (scanType === 'url') {
      return this.preprocessURLInput(content);
    } else {
      return this.preprocessTextInput(content, scanType);
    }
  }

  /**
   * Preprocess URL input (character-level)
   */
  private preprocessURLInput(url: string): tf.Tensor {
    if (!this.charVocabulary) {
      this.charVocabulary = buildCharVocabulary();
    }

    const maxLength = 256;
    const sequence = textToCharSequence(url, this.charVocabulary, maxLength);
    
    return tf.tensor2d([sequence]);
  }

  /**
   * Preprocess text input (word-level)
   */
  private preprocessTextInput(text: string, scanType: string): tf.Tensor {
    // Build or retrieve vocabulary (in production, this should be saved with the model)
    let vocabulary = this.vocabularies.get(scanType);
    if (!vocabulary) {
      // For now, rebuild vocabulary (ideally this would be loaded from storage)
      vocabulary = this.buildDefaultVocabulary(scanType);
      this.vocabularies.set(scanType, vocabulary);
    }

    const maxLength = scanType === 'email' ? 150 : 100;
    const sequence = textToSequence(text, vocabulary);
    const padded = padSequences([sequence], maxLength)[0];

    return tf.tensor2d([padded]);
  }

  /**
   * Build default vocabulary (fallback)
   */
  private buildDefaultVocabulary(scanType: string): Map<string, number> {
    // This is a simplified fallback. In production, vocabulary should be saved during training
    const vocabulary = new Map<string, number>();
    vocabulary.set('<PAD>', 0);
    vocabulary.set('<UNK>', 1);
    
    // Add common phishing-related words
    const commonWords = [
      'urgent', 'verify', 'account', 'suspended', 'click', 'login', 'password',
      'update', 'confirm', 'security', 'bank', 'paypal', 'amazon', 'apple',
      'microsoft', 'google', 'congratulations', 'winner', 'prize', 'free',
      'limited', 'offer', 'expire', 'immediately', 'action', 'required'
    ];

    commonWords.forEach((word, idx) => {
      vocabulary.set(word, idx + 2);
    });

    return vocabulary;
  }

  /**
   * Calculate threat level from prediction score
   */
  private calculateThreatLevel(score: number): 'safe' | 'low' | 'medium' | 'high' | 'critical' {
    if (score < 0.3) return 'safe';
    if (score < 0.5) return 'low';
    if (score < 0.7) return 'medium';
    if (score < 0.9) return 'high';
    return 'critical';
  }

  /**
   * Get model info
   */
  getModelInfo(scanType: string): any {
    const model = this.models.get(scanType);
    if (!model) return null;

    return {
      scanType,
      loaded: true,
      inputShape: model.inputs[0].shape,
      outputShape: model.outputs[0].shape,
      parameters: model.countParams()
    };
  }

  /**
   * Dispose of all models and free memory
   */
  dispose(): void {
    for (const [scanType, model] of this.models.entries()) {
      model.dispose();
      console.log(`🗑️ Disposed ${scanType} model`);
    }
    this.models.clear();
    this.vocabularies.clear();
  }
}

/**
 * Global prediction service instance (singleton)
 */
let globalPredictionService: MLPredictionService | null = null;

export function getPredictionService(): MLPredictionService {
  if (!globalPredictionService) {
    globalPredictionService = new MLPredictionService();
  }
  return globalPredictionService;
}

/**
 * Quick prediction function
 */
export async function predictPhishing(
  content: string,
  scanType: 'url' | 'email' | 'sms' | 'qr'
): Promise<PredictionResult> {
  const service = getPredictionService();
  return await service.predict(content, scanType);
}

/**
 * Check if ML models are available
 */
export async function checkMLModelsAvailable(): Promise<Map<string, boolean>> {
  const scanTypes: ('url' | 'email' | 'sms' | 'qr')[] = ['url', 'email', 'sms', 'qr'];
  const results = new Map<string, boolean>();

  for (const scanType of scanTypes) {
    try {
      const modelPath = `indexeddb://phishguard-${scanType}-model`;
      const models = await tf.io.listModels();
      results.set(scanType, modelPath in models);
    } catch (error) {
      results.set(scanType, false);
    }
  }

  return results;
}

/**
 * Delete a trained model
 */
export async function deleteModel(scanType: string): Promise<boolean> {
  try {
    const modelPath = `indexeddb://phishguard-${scanType}-model`;
    await tf.io.removeModel(modelPath);
    console.log(`🗑️ Deleted ${scanType} model`);
    return true;
  } catch (error) {
    console.error(`Failed to delete ${scanType} model:`, error);
    return false;
  }
}
