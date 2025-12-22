/**
 * Model Deployment Service
 * 
 * Handles model loading, caching, and production inference
 * Integrates trained models into the Scanner for real-time predictions
 */

import * as tf from '@tensorflow/tfjs';
import type { ScanType } from '../../types';

export interface DeployedModel {
  scanType: ScanType;
  model: tf.LayersModel;
  loadedAt: Date;
  isReady: boolean;
  version: string;
}

export interface PredictionResult {
  isPhishing: boolean;
  confidence: number;
  threatLevel: 'safe' | 'suspicious' | 'dangerous';
  modelUsed: 'ml' | 'rule-based';
  processingTime: number;
}

export class ModelDeploymentService {
  private deployedModels: Map<ScanType, DeployedModel> = new Map();
  private loadingPromises: Map<ScanType, Promise<void>> = new Map();
  
  /**
   * Load model for a specific scan type
   */
  async loadModel(scanType: ScanType): Promise<boolean> {
    // Check if already loaded
    if (this.deployedModels.has(scanType)) {
      return true;
    }
    
    // Check if loading in progress
    if (this.loadingPromises.has(scanType)) {
      await this.loadingPromises.get(scanType);
      return this.deployedModels.has(scanType);
    }
    
    // Start loading
    const loadPromise = this.performModelLoad(scanType);
    this.loadingPromises.set(scanType, loadPromise);
    
    try {
      await loadPromise;
      return true;
    } catch (error) {
      console.error(`Failed to load ${scanType} model:`, error);
      return false;
    } finally {
      this.loadingPromises.delete(scanType);
    }
  }
  
  /**
   * Perform actual model loading
   */
  private async performModelLoad(scanType: ScanType): Promise<void> {
    const modelPath = `indexeddb://phishguard-${scanType}-model`;
    
    try {
      console.log(`🚀 Loading ${scanType} model from ${modelPath}...`);
      const model = await tf.loadLayersModel(modelPath);
      
      // Warm up model with dummy prediction
      const dummyInput = tf.zeros([1, scanType === 'url' ? 256 : 100]);
      const warmupPred = model.predict(dummyInput) as tf.Tensor;
      warmupPred.dispose();
      dummyInput.dispose();
      
      this.deployedModels.set(scanType, {
        scanType,
        model,
        loadedAt: new Date(),
        isReady: true,
        version: '1.0'
      });
      
      console.log(`✅ ${scanType} model loaded and ready`);
    } catch (error) {
      console.warn(`⚠️ ${scanType} model not found or failed to load - will use rule-based fallback`);
      throw error;
    }
  }
  
  /**
   * Load all available models
   */
  async loadAllModels(): Promise<{ loaded: ScanType[]; failed: ScanType[] }> {
    const scanTypes: ScanType[] = ['link', 'email', 'sms', 'qr'];
    const results = await Promise.allSettled(
      scanTypes.map(type => this.loadModel(type))
    );
    
    const loaded: ScanType[] = [];
    const failed: ScanType[] = [];
    
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value) {
        loaded.push(scanTypes[idx]);
      } else {
        failed.push(scanTypes[idx]);
      }
    });
    
    console.log(`📦 Models loaded: ${loaded.join(', ')}`);
    if (failed.length > 0) {
      console.log(`⚠️ Models not available: ${failed.join(', ')}`);
    }
    
    return { loaded, failed };
  }
  
  /**
   * Predict using deployed model
   */
  async predict(content: string, scanType: ScanType): Promise<PredictionResult> {
    const startTime = performance.now();
    
    // Try to load model if not already loaded
    if (!this.deployedModels.has(scanType)) {
      const loaded = await this.loadModel(scanType);
      if (!loaded) {
        // Fallback to rule-based
        return this.ruleBasedPredict(content, scanType, startTime);
      }
    }
    
    const deployed = this.deployedModels.get(scanType);
    if (!deployed || !deployed.isReady) {
      return this.ruleBasedPredict(content, scanType, startTime);
    }
    
    try {
      // Prepare input
      const sequence = scanType === 'link' 
        ? this.textToCharSequence(content, 256)
        : this.textToWordSequence(content, 100);
      
      const inputTensor = tf.tensor2d([sequence]);
      
      // Run prediction
      const prediction = deployed.model.predict(inputTensor) as tf.Tensor;
      const confidence = (await prediction.data())[0];
      
      // Clean up
      inputTensor.dispose();
      prediction.dispose();
      
      const isPhishing = confidence >= 0.5;
      const threatLevel = this.calculateThreatLevel(confidence);
      const processingTime = performance.now() - startTime;
      
      return {
        isPhishing,
        confidence,
        threatLevel,
        modelUsed: 'ml',
        processingTime
      };
      
    } catch (error) {
      console.error('ML prediction error:', error);
      return this.ruleBasedPredict(content, scanType, startTime);
    }
  }
  
  /**
   * Calculate threat level from confidence
   */
  private calculateThreatLevel(confidence: number): 'safe' | 'suspicious' | 'dangerous' {
    if (confidence < 0.3) return 'safe';
    if (confidence < 0.7) return 'suspicious';
    return 'dangerous';
  }
  
  /**
   * Convert text to character sequence (for URLs)
   */
  private textToCharSequence(text: string, maxLength: number): number[] {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789-._~:/?#[]@!$&\'()*+,;=%';
    const charMap: Record<string, number> = {};
    chars.split('').forEach((char, idx) => {
      charMap[char] = idx + 1;
    });
    
    const sequence: number[] = [];
    const lowerText = text.toLowerCase();
    
    for (let i = 0; i < Math.min(text.length, maxLength); i++) {
      const char = lowerText[i];
      sequence.push(charMap[char] || 0);
    }
    
    while (sequence.length < maxLength) {
      sequence.push(0);
    }
    
    return sequence;
  }
  
  /**
   * Convert text to word sequence (for email/sms/qr)
   */
  private textToWordSequence(text: string, maxLength: number): number[] {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const sequence: number[] = [];
    
    for (let i = 0; i < Math.min(words.length, maxLength); i++) {
      const hash = words[i].split('').reduce((acc, char) => {
        return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
      }, 0);
      sequence.push(Math.abs(hash) % 10000);
    }
    
    while (sequence.length < maxLength) {
      sequence.push(0);
    }
    
    return sequence;
  }
  
  /**
   * Rule-based fallback prediction
   */
  private ruleBasedPredict(
    content: string, 
    scanType: ScanType,
    startTime: number
  ): PredictionResult {
    const lowerContent = content.toLowerCase();
    let riskScore = 0;
    
    // Phishing keywords
    const keywords = [
      'urgent', 'verify', 'suspended', 'click here', 'act now',
      'confirm', 'update', 'security alert', 'unusual activity',
      'prize', 'winner', 'free', 'congratulations', 'claim'
    ];
    
    keywords.forEach(keyword => {
      if (lowerContent.includes(keyword)) {
        riskScore += 15;
      }
    });
    
    // Shortened URLs
    if (/bit\.ly|tinyurl|goo\.gl|ow\.ly|t\.co/i.test(lowerContent)) {
      riskScore += 20;
    }
    
    // Suspicious domains
    if (/\.tk|\.ml|\.ga|\.cf|\.gq/i.test(lowerContent)) {
      riskScore += 30;
    }
    
    const confidence = Math.min(riskScore / 100, 0.99);
    const isPhishing = riskScore >= 40;
    const threatLevel = this.calculateThreatLevel(confidence);
    const processingTime = performance.now() - startTime;
    
    return {
      isPhishing,
      confidence,
      threatLevel,
      modelUsed: 'rule-based',
      processingTime
    };
  }
  
  /**
   * Get model status for all types
   */
  getModelStatus(): Record<ScanType, boolean> {
    return {
      link: this.deployedModels.has('link'),
      email: this.deployedModels.has('email'),
      sms: this.deployedModels.has('sms'),
      qr: this.deployedModels.has('qr')
    };
  }
  
  /**
   * Get detailed model info
   */
  getModelInfo(scanType: ScanType): DeployedModel | null {
    return this.deployedModels.get(scanType) || null;
  }
  
  /**
   * Unload a model to free memory
   */
  unloadModel(scanType: ScanType): void {
    const deployed = this.deployedModels.get(scanType);
    if (deployed) {
      deployed.model.dispose();
      this.deployedModels.delete(scanType);
      console.log(`🧹 ${scanType} model unloaded`);
    }
  }
  
  /**
   * Unload all models
   */
  unloadAllModels(): void {
    this.deployedModels.forEach((deployed, scanType) => {
      deployed.model.dispose();
      console.log(`🧹 ${scanType} model unloaded`);
    });
    this.deployedModels.clear();
  }
}

/**
 * Global deployment service instance
 */
let deploymentService: ModelDeploymentService | null = null;

export function getDeploymentService(): ModelDeploymentService {
  if (!deploymentService) {
    deploymentService = new ModelDeploymentService();
  }
  return deploymentService;
}

/**
 * Initialize models on app startup
 */
export async function initializeDeployedModels(): Promise<void> {
  const service = getDeploymentService();
  const result = await service.loadAllModels();
  
  if (result.loaded.length > 0) {
    console.log(`✅ ${result.loaded.length} ML models deployed and ready for inference`);
  }
  
  if (result.failed.length > 0) {
    console.log(`⚠️ ${result.failed.length} models not available - using rule-based fallback`);
  }
}
