/**
 * Unified Phishing Text Model (TensorFlow.js + Universal Sentence Encoder)
 *
 * Single binary classifier that can be used for:
 * - Email bodies
 * - SMS messages
 * - URLs
 * - Decoded QR code payloads (typically URLs)
 *
 * Input: string
 * Output: phishing probability (0..1) + binary decision
 * 
 * Updated for browser stability with:
 * - Safe backend initialization
 * - Proper tensor disposal
 * - GPU fallback handling
 */

import * as tf from '@tensorflow/tfjs'
import * as use from '@tensorflow-models/universal-sentence-encoder'
import { initializeForInference, ensureBackendReady, getSafeTrainingConfig } from './tf-backend-manager'

export interface UnifiedModelConfig {
  learningRate: number
  batchSize: number
  epochs: number
  dropout: number
  hiddenUnits: [number, number]
}

export interface UnifiedTrainingData {
  texts: string[]
  labels: number[] // 0 = legitimate, 1 = phishing
}

export interface UnifiedPrediction {
  probability: number
  isPhishing: boolean
}

const DEFAULT_CONFIG: UnifiedModelConfig = {
  learningRate: 0.001,
  batchSize: 32,
  epochs: 8,
  dropout: 0.25,
  hiddenUnits: [128, 64],
}

const MODEL_STORAGE_KEY = 'indexeddb://phishguard-unified-use-v1'

export class UnifiedUSEPhishingModel {
  private encoder: use.UniversalSentenceEncoder | null = null
  private model: tf.LayersModel | null = null
  private initialized = false
  private initializationPromise: Promise<void> | null = null

  constructor(private config: UnifiedModelConfig = DEFAULT_CONFIG) {}

  async initialize(): Promise<void> {
    if (this.initialized) return
    
    // Prevent multiple concurrent initializations
    if (this.initializationPromise) {
      return this.initializationPromise
    }

    this.initializationPromise = this.doInitialize()
    return this.initializationPromise
  }

  private async doInitialize(): Promise<void> {
    try {
      // Initialize TF backend for inference (allows WebGL with fallback)
      await initializeForInference()
      
      console.log('📥 Loading Universal Sentence Encoder...')
      this.encoder = await use.load()
      console.log('✅ USE encoder loaded')

      // Try loading an already-trained model from IndexedDB.
      const loaded = await this.tryLoadFromIndexedDB()
      if (!loaded) {
        console.log('🔧 Building new model...')
        this.model = this.buildModel()
      }

      this.initialized = true
      console.log('✅ UnifiedUSEPhishingModel initialized')
    } catch (error) {
      console.error('❌ Model initialization failed:', error)
      this.initializationPromise = null
      throw error
    }
  }

  private buildModel(): tf.LayersModel {
    const model = tf.sequential()

    model.add(tf.layers.inputLayer({ inputShape: [512] }))

    model.add(tf.layers.dense({ units: this.config.hiddenUnits[0], activation: 'relu' }))
    model.add(tf.layers.dropout({ rate: this.config.dropout }))

    model.add(tf.layers.dense({ units: this.config.hiddenUnits[1], activation: 'relu' }))
    model.add(tf.layers.dropout({ rate: this.config.dropout }))

    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }))

    model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
    })

    return model
  }

  async train(data: UnifiedTrainingData): Promise<void> {
    if (!this.initialized) throw new Error('Model not initialized')
    if (!this.model) throw new Error('Model not ready')

    if (data.texts.length !== data.labels.length) {
      throw new Error('texts and labels must have the same length')
    }

    const xs = await this.embed(data.texts)
    const ys = tf.tensor2d(data.labels, [data.labels.length, 1])

    try {
      await this.model.fit(xs, ys, {
        epochs: this.config.epochs,
        batchSize: this.config.batchSize,
        validationSplit: 0.2,
        shuffle: true,
      })

      await this.model.save(MODEL_STORAGE_KEY)
    } finally {
      xs.dispose()
      ys.dispose()
    }
  }

  async predict(text: string): Promise<UnifiedPrediction> {
    if (!this.initialized) throw new Error('Model not initialized')
    if (!this.model) throw new Error('Model not ready')

    // Ensure backend is ready (handles context loss recovery)
    await ensureBackendReady()

    let xs: tf.Tensor | null = null
    let y: tf.Tensor | null = null

    try {
      xs = await this.embed([text])
      y = this.model.predict(xs) as tf.Tensor
      const probability = (await y.data())[0] ?? 0
      
      return {
        probability,
        isPhishing: probability >= 0.5,
      }
    } catch (error) {
      console.error('Prediction error:', error)
      // Return safe default on error
      return {
        probability: 0,
        isPhishing: false,
      }
    } finally {
      // Safe cleanup
      if (xs && !xs.isDisposed) xs.dispose()
      if (y && !y.isDisposed) y.dispose()
    }
  }

  async predictBatch(texts: string[]): Promise<UnifiedPrediction[]> {
    if (!this.initialized) throw new Error('Model not initialized')
    if (!this.model) throw new Error('Model not ready')

    // Ensure backend is ready (handles context loss recovery)
    await ensureBackendReady()

    let xs: tf.Tensor | null = null
    let y: tf.Tensor | null = null

    try {
      xs = await this.embed(texts)
      y = this.model.predict(xs) as tf.Tensor
      const probs = await y.data()
      
      return Array.from(probs).map((probability) => ({
        probability,
        isPhishing: probability >= 0.5,
      }))
    } catch (error) {
      console.error('Batch prediction error:', error)
      // Return safe defaults on error
      return texts.map(() => ({
        probability: 0,
        isPhishing: false,
      }))
    } finally {
      // Safe cleanup
      if (xs && !xs.isDisposed) xs.dispose()
      if (y && !y.isDisposed) y.dispose()
    }
  }

  isReady(): boolean {
    return this.initialized && !!this.model
  }

  dispose(): void {
    this.model?.dispose()
    this.model = null
    this.initialized = false
  }

  private async embed(texts: string[]): Promise<tf.Tensor2D> {
    if (!this.encoder) throw new Error('Encoder not loaded')
    const embeddings = await this.encoder.embed(texts)
    return embeddings as tf.Tensor2D
  }

  private async tryLoadFromIndexedDB(): Promise<boolean> {
    try {
      this.model = await tf.loadLayersModel(MODEL_STORAGE_KEY)
      return true
    } catch {
      return false
    }
  }
}
