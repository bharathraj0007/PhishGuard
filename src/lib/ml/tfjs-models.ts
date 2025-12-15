/**
 * TensorFlow.js Model Architectures
 * 
 * Lightweight, browser-compatible ML models for phishing detection.
 * Each model type is optimized for specific content (URL, Email, SMS, QR).
 */

import * as tf from '@tensorflow/tfjs';

/**
 * Simple Feed-Forward Neural Network for URL Detection
 */
export class URLDetectionModel {
  private model: tf.Sequential | null = null;
  private inputSize: number;

  constructor(inputSize: number = 100) {
    this.inputSize = inputSize;
  }

  /**
   * Build the model architecture
   */
  build(): void {
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: 64,
          activation: 'relu',
          inputShape: [this.inputSize]
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid'
        })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    console.log('✅ URL Detection Model built');
  }

  getModel(): tf.Sequential | null {
    return this.model;
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
    }
  }
}

/**
 * LSTM Model for Email/SMS Text Detection
 */
export class TextLSTMModel {
  private model: tf.Sequential | null = null;
  private vocabSize: number;
  private embeddingDim: number;
  private maxLength: number;

  constructor(
    vocabSize: number = 10000,
    embeddingDim: number = 32,
    maxLength: number = 100
  ) {
    this.vocabSize = vocabSize;
    this.embeddingDim = embeddingDim;
    this.maxLength = maxLength;
  }

  /**
   * Build LSTM model
   */
  build(): void {
    this.model = tf.sequential({
      layers: [
        tf.layers.embedding({
          inputDim: this.vocabSize,
          outputDim: this.embeddingDim,
          inputLength: this.maxLength
        }),
        tf.layers.lstm({
          units: 64,
          returnSequences: false,
          dropout: 0.2,
          recurrentDropout: 0.2
        }),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid'
        })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    console.log('✅ Text LSTM Model built');
  }

  getModel(): tf.Sequential | null {
    return this.model;
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
    }
  }
}

/**
 * Bidirectional LSTM for enhanced text analysis
 */
export class BiLSTMModel {
  private model: tf.Sequential | null = null;
  private vocabSize: number;
  private embeddingDim: number;
  private maxLength: number;

  constructor(
    vocabSize: number = 10000,
    embeddingDim: number = 32,
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
          inputLength: this.maxLength
        }),
        tf.layers.bidirectional({
          layer: tf.layers.lstm({
            units: 32,
            returnSequences: false
          }) as tf.RNN
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid'
        })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    console.log('✅ BiLSTM Model built');
  }

  getModel(): tf.Sequential | null {
    return this.model;
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
    }
  }
}

/**
 * Character-level CNN for URL analysis
 */
export class CharacterCNNModel {
  private model: tf.Sequential | null = null;
  private vocabSize: number;
  private maxLength: number;

  constructor(vocabSize: number = 70, maxLength: number = 256) {
    this.vocabSize = vocabSize;
    this.maxLength = maxLength;
  }

  build(): void {
    this.model = tf.sequential({
      layers: [
        tf.layers.embedding({
          inputDim: this.vocabSize,
          outputDim: 16,
          inputLength: this.maxLength
        }),
        tf.layers.conv1d({
          filters: 32,
          kernelSize: 3,
          activation: 'relu',
          padding: 'same'
        }),
        tf.layers.maxPooling1d({ poolSize: 2 }),
        tf.layers.conv1d({
          filters: 64,
          kernelSize: 3,
          activation: 'relu',
          padding: 'same'
        }),
        tf.layers.maxPooling1d({ poolSize: 2 }),
        tf.layers.flatten(),
        tf.layers.dense({
          units: 64,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid'
        })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    console.log('✅ Character CNN Model built');
  }

  getModel(): tf.Sequential | null {
    return this.model;
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
    }
  }
}

/**
 * Simple CNN for feature-based classification
 */
export class SimpleCNNModel {
  private model: tf.Sequential | null = null;
  private vocabSize: number;
  private maxLength: number;

  constructor(vocabSize: number = 5000, maxLength: number = 100) {
    this.vocabSize = vocabSize;
    this.maxLength = maxLength;
  }

  build(): void {
    this.model = tf.sequential({
      layers: [
        tf.layers.embedding({
          inputDim: this.vocabSize,
          outputDim: 32,
          inputLength: this.maxLength
        }),
        tf.layers.conv1d({
          filters: 64,
          kernelSize: 5,
          activation: 'relu'
        }),
        tf.layers.globalMaxPooling1d(),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid'
        })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    console.log('✅ Simple CNN Model built');
  }

  getModel(): tf.Sequential | null {
    return this.model;
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
    }
  }
}

/**
 * Hybrid CNN-LSTM Model for complex patterns
 */
export class CNNLSTMModel {
  private model: tf.Sequential | null = null;
  private vocabSize: number;
  private embeddingDim: number;
  private maxLength: number;

  constructor(
    vocabSize: number = 10000,
    embeddingDim: number = 32,
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
          inputLength: this.maxLength
        }),
        tf.layers.conv1d({
          filters: 64,
          kernelSize: 3,
          activation: 'relu'
        }),
        tf.layers.maxPooling1d({ poolSize: 2 }),
        tf.layers.lstm({
          units: 32,
          returnSequences: false
        }),
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid'
        })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    console.log('✅ CNN-LSTM Hybrid Model built');
  }

  getModel(): tf.Sequential | null {
    return this.model;
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
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
