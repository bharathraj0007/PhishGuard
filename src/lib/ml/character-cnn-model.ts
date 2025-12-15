/**
 * Character-CNN Model for Phishing URL Detection
 *
 * Uses character-level convolutions to detect phishing patterns in URLs
 * Architecture: Embedding -> Conv Layers -> Pooling -> Dense -> Output
 */

import * as tf from '@tensorflow/tfjs';

export interface ModelPrediction {
  probability: number;
  isPhishing: boolean;
  confidence: number;
}

export class CharacterCNNModel {
  private model: tf.LayersModel | null = null;
  private characterSet: string =
    'abcdefghijklmnopqrstuvwxyz0123456789-_.:/?#&=';
  private maxSequenceLength: number = 75;
  private charsetSize: number = 50;

  /**
   * Build Character-CNN model with optimized architecture
   */
  buildModel(
    sequenceLength: number = 75,
    charsetSize: number = 50,
    learningRate: number = 0.001
  ): tf.LayersModel {
    this.maxSequenceLength = sequenceLength;
    this.charsetSize = charsetSize;

    const inputs = tf.input({
      shape: [sequenceLength],
      dtype: 'int32',
      name: 'url_input',
    });

    // Embedding layer - convert character indices to dense vectors
    let x = tf.layers.embedding({
      inputDim: charsetSize + 1,
      outputDim: 32,
      inputLength: sequenceLength,
      name: 'embedding',
    }).apply(inputs) as tf.SymbolicTensor;

    // First convolutional block with multiple filter sizes
    const conv1_3 = tf.layers.conv1d({
      filters: 64,
      kernelSize: 3,
      activation: 'relu',
      padding: 'same',
      name: 'conv1_k3',
    }).apply(x) as tf.SymbolicTensor;

    const conv1_4 = tf.layers.conv1d({
      filters: 64,
      kernelSize: 4,
      activation: 'relu',
      padding: 'same',
      name: 'conv1_k4',
    }).apply(x) as tf.SymbolicTensor;

    const conv1_5 = tf.layers.conv1d({
      filters: 64,
      kernelSize: 5,
      activation: 'relu',
      padding: 'same',
      name: 'conv1_k5',
    }).apply(x) as tf.SymbolicTensor;

    // Max pooling
    const pool1_3 = tf.layers.maxPooling1d({
      poolSize: 2,
      strides: 2,
      padding: 'valid',
      name: 'pool1_k3',
    }).apply(conv1_3) as tf.SymbolicTensor;

    const pool1_4 = tf.layers.maxPooling1d({
      poolSize: 2,
      strides: 2,
      padding: 'valid',
      name: 'pool1_k4',
    }).apply(conv1_4) as tf.SymbolicTensor;

    const pool1_5 = tf.layers.maxPooling1d({
      poolSize: 2,
      strides: 2,
      padding: 'valid',
      name: 'pool1_k5',
    }).apply(conv1_5) as tf.SymbolicTensor;

    // Flatten each path
    const flat1_3 = tf.layers.flatten({
      name: 'flat_k3',
    }).apply(pool1_3) as tf.SymbolicTensor;

    const flat1_4 = tf.layers.flatten({
      name: 'flat_k4',
    }).apply(pool1_4) as tf.SymbolicTensor;

    const flat1_5 = tf.layers.flatten({
      name: 'flat_k5',
    }).apply(pool1_5) as tf.SymbolicTensor;

    // Concatenate multi-scale features
    const concat = tf.layers.concatenate({
      name: 'concat',
    }).apply([flat1_3, flat1_4, flat1_5]) as tf.SymbolicTensor;

    // Dense layers
    let y = tf.layers.dense({
      units: 256,
      activation: 'relu',
      name: 'dense1',
    }).apply(concat) as tf.SymbolicTensor;

    y = tf.layers.batchNormalization({
      name: 'bn1',
    }).apply(y) as tf.SymbolicTensor;

    y = tf.layers.dropout({
      rate: 0.4,
      name: 'dropout1',
    }).apply(y) as tf.SymbolicTensor;

    y = tf.layers.dense({
      units: 128,
      activation: 'relu',
      name: 'dense2',
    }).apply(y) as tf.SymbolicTensor;

    y = tf.layers.batchNormalization({
      name: 'bn2',
    }).apply(y) as tf.SymbolicTensor;

    y = tf.layers.dropout({
      rate: 0.3,
      name: 'dropout2',
    }).apply(y) as tf.SymbolicTensor;

    // Output layer
    const output = tf.layers.dense({
      units: 1,
      activation: 'sigmoid',
      name: 'output',
    }).apply(y) as tf.SymbolicTensor;

    // Create model
    this.model = tf.model({ inputs, outputs: output });

    // Compile with Adam optimizer
    this.model.compile({
      optimizer: tf.train.adam(learningRate),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
    });

    console.log('✅ Character-CNN model built successfully');
    return this.model;
  }

  /**
   * Convert URL to character indices
   */
  urlToIndices(url: string, maxLength?: number): number[] {
    const length = maxLength || this.maxSequenceLength;
    const cleanUrl = url.toLowerCase();
    const indices: number[] = [];

    for (const char of cleanUrl) {
      const idx = this.characterSet.indexOf(char);
      indices.push(idx >= 0 ? idx + 1 : 0); // 0 is padding
    }

    // Pad or truncate
    if (indices.length < length) {
      indices.push(...Array(length - indices.length).fill(0));
    } else if (indices.length > length) {
      indices.splice(length);
    }

    return indices;
  }

  /**
   * Predict phishing probability for a URL
   */
  async predictURL(url: string): Promise<ModelPrediction> {
    if (!this.model) {
      throw new Error('Model not built');
    }

    const indices = this.urlToIndices(url);
    const input = tf.tensor2d([indices], [1, this.maxSequenceLength], 'int32');

    const prediction = this.model.predict(input) as tf.Tensor;
    const result = await prediction.data();
    const probability = result[0];

    input.dispose();
    prediction.dispose();

    return {
      probability: probability,
      isPhishing: probability > 0.5,
      confidence: Math.max(probability, 1 - probability),
    };
  }

  /**
   * Batch predict for multiple URLs
   */
  async predictBatch(urls: string[]): Promise<ModelPrediction[]> {
    if (!this.model) {
      throw new Error('Model not built');
    }

    const batch = urls.map((url) => this.urlToIndices(url));
    const input = tf.tensor2d(batch, [urls.length, this.maxSequenceLength], 'int32');

    const predictions = this.model.predict(input) as tf.Tensor;
    const results = await predictions.data();

    input.dispose();
    predictions.dispose();

    return Array.from(results).map((probability) => ({
      probability,
      isPhishing: probability > 0.5,
      confidence: Math.max(probability, 1 - probability),
    }));
  }

  /**
   * Get model summary
   */
  getSummary(): void {
    if (!this.model) {
      console.log('⚠️ Model not built');
      return;
    }
    this.model.summary();
  }

  /**
   * Get the underlying TensorFlow model
   */
  getModel(): tf.LayersModel | null {
    return this.model;
  }

  /**
   * Dispose model
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }

  /**
   * Get character set
   */
  getCharacterSet(): string {
    return this.characterSet;
  }

  /**
   * Get max sequence length
   */
  getMaxSequenceLength(): number {
    return this.maxSequenceLength;
  }
}
