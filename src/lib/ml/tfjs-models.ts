/**
 * TensorFlow.js Model Architectures
 * 
 * Lightweight, browser-compatible ML models for phishing detection.
 * Each model type is optimized for specific content (URL, Email, SMS, QR).
 * 
 * IMPORTANT: All models use CPU-safe configurations:
 * - glorotUniform initializers (avoid orthogonal which can crash WebGL)
 * - Reduced layer sizes for memory efficiency
 * - Small batch sizes (8) to prevent GPU memory issues
 */

import * as tf from '@tensorflow/tfjs';

/**
 * Safe initializer configuration - avoids WebGL shader compilation failures
 */
const SAFE_KERNEL_INITIALIZER = 'glorotUniform';
const SAFE_RECURRENT_INITIALIZER = 'glorotUniform';
const SAFE_BIAS_INITIALIZER = 'zeros';

/**
 * Simple Feed-Forward Neural Network for URL Detection
 * Reduced complexity for browser stability
 */
export class URLDetectionModel {
  private model: tf.Sequential | null = null;
  private inputSize: number;

  constructor(inputSize: number = 100) {
    this.inputSize = inputSize;
  }

  /**
   * Build the model architecture with safe initializers
   */
  build(): void {
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: 32, // Reduced from 64
          activation: 'relu',
          inputShape: [this.inputSize],
          kernelInitializer: SAFE_KERNEL_INITIALIZER,
          biasInitializer: SAFE_BIAS_INITIALIZER
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 16, // Reduced from 32
          activation: 'relu',
          kernelInitializer: SAFE_KERNEL_INITIALIZER,
          biasInitializer: SAFE_BIAS_INITIALIZER
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid',
          kernelInitializer: SAFE_KERNEL_INITIALIZER,
          biasInitializer: SAFE_BIAS_INITIALIZER
        })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    console.log('✅ URL Detection Model built (CPU-safe)');
  }

  getModel(): tf.Sequential | null {
    return this.model;
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}

/**
 * LSTM Model for Email/SMS Text Detection
 * CPU-safe with reduced complexity and safe initializers
 */
export class TextLSTMModel {
  private model: tf.Sequential | null = null;
  private vocabSize: number;
  private embeddingDim: number;
  private maxLength: number;

  constructor(
    vocabSize: number = 5000, // Reduced from 10000
    embeddingDim: number = 16, // Reduced from 32
    maxLength: number = 100
  ) {
    this.vocabSize = vocabSize;
    this.embeddingDim = embeddingDim;
    this.maxLength = maxLength;
  }

  /**
   * Build LSTM model with safe initializers
   */
  build(): void {
    this.model = tf.sequential({
      layers: [
        tf.layers.embedding({
          inputDim: this.vocabSize,
          outputDim: this.embeddingDim,
          inputLength: this.maxLength,
          embeddingsInitializer: SAFE_KERNEL_INITIALIZER
        }),
        tf.layers.lstm({
          units: 32, // Reduced from 64
          returnSequences: false,
          dropout: 0.2,
          recurrentDropout: 0.0, // Disable recurrent dropout for CPU stability
          kernelInitializer: SAFE_KERNEL_INITIALIZER,
          recurrentInitializer: SAFE_RECURRENT_INITIALIZER,
          biasInitializer: SAFE_BIAS_INITIALIZER
        }),
        tf.layers.dense({
          units: 16, // Reduced from 32
          activation: 'relu',
          kernelInitializer: SAFE_KERNEL_INITIALIZER,
          biasInitializer: SAFE_BIAS_INITIALIZER
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid',
          kernelInitializer: SAFE_KERNEL_INITIALIZER,
          biasInitializer: SAFE_BIAS_INITIALIZER
        })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    console.log('✅ Text LSTM Model built (CPU-safe)');
  }

  getModel(): tf.Sequential | null {
    return this.model;
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}

/**
 * Bidirectional LSTM for enhanced text analysis
 * CPU-safe with reduced complexity and safe initializers
 */
export class BiLSTMModel {
  private model: tf.Sequential | null = null;
  private vocabSize: number;
  private embeddingDim: number;
  private maxLength: number;

  constructor(
    vocabSize: number = 5000, // Reduced from 10000
    embeddingDim: number = 16, // Reduced from 32
    maxLength: number = 100
  ) {
    this.vocabSize = vocabSize;
    this.embeddingDim = embeddingDim;
    this.maxLength = maxLength;
  }

  build(): void {
    this.model = tf.sequential({
      layers: [
        tf.layers.embedding({
          inputDim: this.vocabSize,
          outputDim: this.embeddingDim,
          inputLength: this.maxLength,
          embeddingsInitializer: SAFE_KERNEL_INITIALIZER
        }),
        tf.layers.bidirectional({
          layer: tf.layers.lstm({
            units: 16, // Reduced from 32
            returnSequences: false,
            kernelInitializer: SAFE_KERNEL_INITIALIZER,
            recurrentInitializer: SAFE_RECURRENT_INITIALIZER,
            biasInitializer: SAFE_BIAS_INITIALIZER
          }) as tf.RNN
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 16,
          activation: 'relu',
          kernelInitializer: SAFE_KERNEL_INITIALIZER,
          biasInitializer: SAFE_BIAS_INITIALIZER
        }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid',
          kernelInitializer: SAFE_KERNEL_INITIALIZER,
          biasInitializer: SAFE_BIAS_INITIALIZER
        })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    console.log('✅ BiLSTM Model built (CPU-safe)');
  }

  getModel(): tf.Sequential | null {
    return this.model;
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}

/**
 * Character-level CNN for URL analysis
 * CPU-safe with reduced complexity and safe initializers
 */
export class CharacterCNNModel {
  private model: tf.Sequential | null = null;
  private vocabSize: number;
  private maxLength: number;

  constructor(vocabSize: number = 70, maxLength: number = 128) { // Reduced maxLength from 256
    this.vocabSize = vocabSize;
    this.maxLength = maxLength;
  }

  build(): void {
    this.model = tf.sequential({
      layers: [
        tf.layers.embedding({
          inputDim: this.vocabSize,
          outputDim: 16,
          inputLength: this.maxLength,
          embeddingsInitializer: SAFE_KERNEL_INITIALIZER
        }),
        tf.layers.conv1d({
          filters: 16, // Reduced from 32
          kernelSize: 3,
          activation: 'relu',
          padding: 'same',
          kernelInitializer: SAFE_KERNEL_INITIALIZER,
          biasInitializer: SAFE_BIAS_INITIALIZER
        }),
        tf.layers.maxPooling1d({ poolSize: 2 }),
        tf.layers.conv1d({
          filters: 32, // Reduced from 64
          kernelSize: 3,
          activation: 'relu',
          padding: 'same',
          kernelInitializer: SAFE_KERNEL_INITIALIZER,
          biasInitializer: SAFE_BIAS_INITIALIZER
        }),
        tf.layers.maxPooling1d({ poolSize: 2 }),
        tf.layers.flatten(),
        tf.layers.dense({
          units: 32, // Reduced from 64
          activation: 'relu',
          kernelInitializer: SAFE_KERNEL_INITIALIZER,
          biasInitializer: SAFE_BIAS_INITIALIZER
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid',
          kernelInitializer: SAFE_KERNEL_INITIALIZER,
          biasInitializer: SAFE_BIAS_INITIALIZER
        })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    console.log('✅ Character CNN Model built (CPU-safe)');
  }

  getModel(): tf.Sequential | null {
    return this.model;
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}

/**
 * Simple CNN for feature-based classification
 * CPU-safe with reduced complexity and safe initializers
 */
export class SimpleCNNModel {
  private model: tf.Sequential | null = null;
  private vocabSize: number;
  private maxLength: number;

  constructor(vocabSize: number = 3000, maxLength: number = 100) { // Reduced vocabSize from 5000
    this.vocabSize = vocabSize;
    this.maxLength = maxLength;
  }

  build(): void {
    this.model = tf.sequential({
      layers: [
        tf.layers.embedding({
          inputDim: this.vocabSize,
          outputDim: 16, // Reduced from 32
          inputLength: this.maxLength,
          embeddingsInitializer: SAFE_KERNEL_INITIALIZER
        }),
        tf.layers.conv1d({
          filters: 32, // Reduced from 64
          kernelSize: 5,
          activation: 'relu',
          kernelInitializer: SAFE_KERNEL_INITIALIZER,
          biasInitializer: SAFE_BIAS_INITIALIZER
        }),
        tf.layers.globalMaxPooling1d(),
        tf.layers.dense({
          units: 16, // Reduced from 32
          activation: 'relu',
          kernelInitializer: SAFE_KERNEL_INITIALIZER,
          biasInitializer: SAFE_BIAS_INITIALIZER
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid',
          kernelInitializer: SAFE_KERNEL_INITIALIZER,
          biasInitializer: SAFE_BIAS_INITIALIZER
        })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    console.log('✅ Simple CNN Model built (CPU-safe)');
  }

  getModel(): tf.Sequential | null {
    return this.model;
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}

/**
 * Hybrid CNN-LSTM Model for complex patterns
 * CPU-safe with reduced complexity and safe initializers
 */
export class CNNLSTMModel {
  private model: tf.Sequential | null = null;
  private vocabSize: number;
  private embeddingDim: number;
  private maxLength: number;

  constructor(
    vocabSize: number = 5000, // Reduced from 10000
    embeddingDim: number = 16, // Reduced from 32
    maxLength: number = 100
  ) {
    this.vocabSize = vocabSize;
    this.embeddingDim = embeddingDim;
    this.maxLength = maxLength;
  }

  build(): void {
    this.model = tf.sequential({
      layers: [
        tf.layers.embedding({
          inputDim: this.vocabSize,
          outputDim: this.embeddingDim,
          inputLength: this.maxLength,
          embeddingsInitializer: SAFE_KERNEL_INITIALIZER
        }),
        tf.layers.conv1d({
          filters: 32, // Reduced from 64
          kernelSize: 3,
          activation: 'relu',
          kernelInitializer: SAFE_KERNEL_INITIALIZER,
          biasInitializer: SAFE_BIAS_INITIALIZER
        }),
        tf.layers.maxPooling1d({ poolSize: 2 }),
        tf.layers.lstm({
          units: 16, // Reduced from 32
          returnSequences: false,
          kernelInitializer: SAFE_KERNEL_INITIALIZER,
          recurrentInitializer: SAFE_RECURRENT_INITIALIZER,
          biasInitializer: SAFE_BIAS_INITIALIZER
        }),
        tf.layers.dense({
          units: 16,
          activation: 'relu',
          kernelInitializer: SAFE_KERNEL_INITIALIZER,
          biasInitializer: SAFE_BIAS_INITIALIZER
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid',
          kernelInitializer: SAFE_KERNEL_INITIALIZER,
          biasInitializer: SAFE_BIAS_INITIALIZER
        })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    console.log('✅ CNN-LSTM Hybrid Model built (CPU-safe)');
  }

  getModel(): tf.Sequential | null {
    return this.model;
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}

/**
 * Model factory for creating appropriate models
 */
export class ModelFactory {
  static createModel(
    type: 'url-ffnn' | 'text-lstm' | 'text-bilstm' | 'char-cnn' | 'simple-cnn' | 'cnn-lstm',
    config?: {
      vocabSize?: number;
      embeddingDim?: number;
      maxLength?: number;
      inputSize?: number;
    }
  ): URLDetectionModel | TextLSTMModel | BiLSTMModel | CharacterCNNModel | SimpleCNNModel | CNNLSTMModel {
    switch (type) {
      case 'url-ffnn':
        return new URLDetectionModel(config?.inputSize);
      case 'text-lstm':
        return new TextLSTMModel(
          config?.vocabSize,
          config?.embeddingDim,
          config?.maxLength
        );
      case 'text-bilstm':
        return new BiLSTMModel(
          config?.vocabSize,
          config?.embeddingDim,
          config?.maxLength
        );
      case 'char-cnn':
        return new CharacterCNNModel(config?.vocabSize, config?.maxLength);
      case 'simple-cnn':
        return new SimpleCNNModel(config?.vocabSize, config?.maxLength);
      case 'cnn-lstm':
        return new CNNLSTMModel(
          config?.vocabSize,
          config?.embeddingDim,
          config?.maxLength
        );
      default:
        throw new Error(`Unknown model type: ${type}`);
    }
  }
}

/**
 * Model configuration recommendations by scan type
 */
export const MODEL_CONFIGS = {
  url: {
    type: 'char-cnn' as const,
    config: {
      vocabSize: 70,
      maxLength: 256
    }
  },
  email: {
    type: 'text-bilstm' as const,
    config: {
      vocabSize: 10000,
      embeddingDim: 32,
      maxLength: 150
    }
  },
  sms: {
    type: 'text-lstm' as const,
    config: {
      vocabSize: 5000,
      embeddingDim: 32,
      maxLength: 100
    }
  },
  qr: {
    type: 'simple-cnn' as const,
    config: {
      vocabSize: 5000,
      maxLength: 100
    }
  }
};
