/**
 * Lightweight Character-CNN for URL Phishing Detection
 * 
 * Browser-optimized model using:
 * - Character-level encoding (no embeddings needed)
 * - Single-scale CNN (not multi-scale for efficiency)
 * - Small filter counts
 * - Lightweight dense layers
 * 
 * Architecture: CharEncoding -> Conv1D(32) -> MaxPool -> Conv1D(64) -> MaxPool -> Dense(64) -> Dense(1)
 */

import * as tf from '@tensorflow/tfjs';

export interface URLCNNConfig {
  maxLength: number;
  charsetSize: number;
  embeddingDim: number;
  filterSizes: number[];
  numFilters: number;
  denseUnits: number;
  dropout: number;
  learningRate: number;
  batchSize: number;
  epochs: number;
}

export interface URLPrediction {
  isPhishing: boolean;
  confidence: number;
  probability: number;
  features: {
    suspiciousPatterns: string[];
    riskScore: number;
  };
}

export interface URLTrainingMetrics {
  accuracy: number;
  loss: number;
  valAccuracy?: number;
  valLoss?: number;
}

/**
 * Lightweight Character-CNN Model for URL Detection
 */
export class LightweightURLCNN {
  private model: tf.LayersModel | null = null;
  private config: URLCNNConfig;
  private characterSet: string = 'abcdefghijklmnopqrstuvwxyz0123456789-_.:/?#&=@%';
  private charToIdx: Map<string, number> = new Map();
  private isInitialized: boolean = false;

  constructor(config?: Partial<URLCNNConfig>) {
    this.config = {
      maxLength: 100,
      charsetSize: 50,
      embeddingDim: 16,
      filterSizes: [3, 4],
      numFilters: 32,
      denseUnits: 64,
      dropout: 0.3,
      learningRate: 0.001,
      batchSize: 32,
      epochs: 20,
      ...config
    };

    // Build character-to-index mapping
    this.characterSet.split('').forEach((char, idx) => {
      this.charToIdx.set(char, idx + 1); // 0 reserved for padding/unknown
    });

    console.log(`✅ Character set initialized with ${this.charToIdx.size} characters`);
  }

  /**
   * Convert URL to character indices
   */
  private urlToIndices(url: string): number[] {
    const cleaned = url.toLowerCase().substring(0, this.config.maxLength);
    const indices: number[] = [];

    for (const char of cleaned) {
      indices.push(this.charToIdx.get(char) || 0);
    }

    // Pad to maxLength
    while (indices.length < this.config.maxLength) {
      indices.push(0);
    }

    return indices;
  }

  /**
   * Build the lightweight CNN model
   */
  private buildModel(): tf.LayersModel {
    const model = tf.sequential();

    // Input layer
    model.add(tf.layers.inputLayer({
      inputShape: [this.config.maxLength],
      dtype: 'int32'
    }));

    // Embedding layer to convert character indices to dense vectors
    model.add(tf.layers.embedding({
      inputDim: this.config.charsetSize + 1,
      outputDim: this.config.embeddingDim,
      inputLength: this.config.maxLength,
      embeddingsInitializer: 'randomUniform'
    }));

    // First Conv1D layer
    model.add(tf.layers.conv1d({
      filters: this.config.numFilters,
      kernelSize: 3,
      activation: 'relu',
      padding: 'valid'
    }));

    // Max pooling
    model.add(tf.layers.maxPooling1d({
      poolSize: 2,
      strides: 2
    }));

    // Second Conv1D layer
    model.add(tf.layers.conv1d({
      filters: this.config.numFilters * 2,
      kernelSize: 4,
      activation: 'relu',
      padding: 'valid'
    }));

    // Global max pooling to get fixed-size output
    model.add(tf.layers.globalMaxPooling1d());

    // Dropout
    model.add(tf.layers.dropout({
      rate: this.config.dropout
    }));

    // Dense layer
    model.add(tf.layers.dense({
      units: this.config.denseUnits,
      activation: 'relu',
      kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
    }));

    // Dropout
    model.add(tf.layers.dropout({
      rate: this.config.dropout
    }));

    // Output layer
    model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    }));

    // Compile model
    model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    console.log('📊 URL CNN Model Architecture:');
    model.summary();

    return model;
  }

  /**
   * Train the model on URL dataset
   */
  async train(
    urls: string[],
    labels: number[],
    validationSplit: number = 0.2,
    onEpochEnd?: (epoch: number, logs: any) => void
  ): Promise<URLTrainingMetrics> {
    console.log('🏋️ Training URL CNN Model...');
    console.log(`📊 Training samples: ${urls.length}`);

    // Build model
    this.model = this.buildModel();

    // Convert URLs to character indices
    const sequences = urls.map(url => this.urlToIndices(url));

    // Convert to tensors
    const xs = tf.tensor2d(sequences, [sequences.length, this.config.maxLength], 'int32');
    const ys = tf.tensor2d(labels, [labels.length, 1]);

    try {
      // Train the model
      const history = await this.model.fit(xs, ys, {
        epochs: this.config.epochs,
        batchSize: this.config.batchSize,
        validationSplit: validationSplit,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log(
              `Epoch ${epoch + 1}/${this.config.epochs} - ` +
              `loss: ${logs?.loss.toFixed(4)} - ` +
              `acc: ${logs?.acc.toFixed(4)} - ` +
              `val_loss: ${logs?.val_loss?.toFixed(4)} - ` +
              `val_acc: ${logs?.val_acc?.toFixed(4)}`
            );
            if (onEpochEnd) {
              onEpochEnd(epoch, logs);
            }
          }
        }
      });

      const finalEpoch = history.history.acc.length - 1;
      const metrics: URLTrainingMetrics = {
        accuracy: history.history.acc[finalEpoch] as number,
        loss: history.history.loss[finalEpoch] as number,
        valAccuracy: history.history.val_acc?.[finalEpoch] as number,
        valLoss: history.history.val_loss?.[finalEpoch] as number
      };

      this.isInitialized = true;
      console.log('✅ Training completed');
      console.log('📈 Final Metrics:', metrics);

      return metrics;
    } finally {
      xs.dispose();
      ys.dispose();
    }
  }

  /**
   * Predict phishing probability for a single URL
   * Uses tf.tidy() for automatic tensor memory management
   */
  async predict(url: string): Promise<URLPrediction> {
    if (!this.isInitialized || !this.model) {
      throw new Error('Model not trained. Call train() first.');
    }

    // Run prediction with automatic tensor cleanup
    const probability = await tf.tidy(async () => {
      const indices = this.urlToIndices(url);
      const input = tf.tensor2d([indices], [1, this.config.maxLength], 'int32');

      const prediction = this.model!.predict(input) as tf.Tensor;
      const probData = await prediction.data();
      
      // Extract probability before tf.tidy disposes tensors
      return probData[0];
    });

    // Analyze suspicious patterns
    const suspiciousPatterns = this.analyzeSuspiciousPatterns(url);
    const riskScore = this.calculateRiskScore(url, probability);

    return {
      isPhishing: probability > 0.5,
      confidence: Math.abs(probability - 0.5) * 2,
      probability: probability,
      features: {
        suspiciousPatterns,
        riskScore
      }
    };
  }

  /**
   * Batch prediction for multiple URLs
   * Uses tf.tidy() for automatic tensor memory management
   */
  async predictBatch(urls: string[]): Promise<URLPrediction[]> {
    if (!this.isInitialized || !this.model) {
      throw new Error('Model not trained. Call train() first.');
    }

    // Run batch prediction with automatic tensor cleanup
    const probabilities = await tf.tidy(async () => {
      const sequences = urls.map(url => this.urlToIndices(url));
      const input = tf.tensor2d(sequences, [urls.length, this.config.maxLength], 'int32');

      const predictions = this.model!.predict(input) as tf.Tensor;
      const probs = await predictions.data();

      // Return copy before tf.tidy disposes tensors
      return Array.from(probs);
    });

    return urls.map((url, idx) => {
      const probability = probabilities[idx];
      const suspiciousPatterns = this.analyzeSuspiciousPatterns(url);
      const riskScore = this.calculateRiskScore(url, probability);

      return {
        isPhishing: probability > 0.5,
        confidence: Math.abs(probability - 0.5) * 2,
        probability: probability,
        features: {
          suspiciousPatterns,
          riskScore
        }
      };
    });
  }

  /**
   * Analyze URL for suspicious patterns
   */
  private analyzeSuspiciousPatterns(url: string): string[] {
    const patterns: string[] = [];
    const lowerUrl = url.toLowerCase();

    try {
      const parsed = new URL(url);

      // Check protocol
      if (parsed.protocol !== 'https:') {
        patterns.push('non_https');
      }

      // Check for IP address
      if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(parsed.hostname)) {
        patterns.push('ip_address');
      }

      // Check for suspicious TLDs
      if (/\.(tk|ml|ga|cf|gq|xyz|top)$/.test(parsed.hostname)) {
        patterns.push('suspicious_tld');
      }

      // Check for excessive subdomains
      const parts = parsed.hostname.split('.');
      if (parts.length > 4) {
        patterns.push('excessive_subdomains');
      }

      // Check for typosquatting
      const brands = ['google', 'facebook', 'amazon', 'paypal', 'microsoft', 'apple'];
      for (const brand of brands) {
        if (lowerUrl.includes(brand) && !parsed.hostname.endsWith(`${brand}.com`)) {
          patterns.push(`typosquatting_${brand}`);
        }
      }

      // Check for phishing keywords
      const keywords = ['verify', 'confirm', 'secure', 'account', 'update', 'login'];
      for (const keyword of keywords) {
        if (lowerUrl.includes(keyword)) {
          patterns.push(`keyword_${keyword}`);
        }
      }

      // Check URL length
      if (url.length > 200) {
        patterns.push('excessive_length');
      }

      // Check for URL shorteners (common in phishing)
      if (/bit\.ly|tinyurl|goo\.gl|ow\.ly|t\.co/.test(lowerUrl)) {
        patterns.push('url_shortener');
      }

    } catch (error) {
      patterns.push('invalid_url_format');
    }

    return patterns;
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(url: string, mlProbability: number): number {
    let score = mlProbability * 100;

    // Adjust based on patterns
    const patterns = this.analyzeSuspiciousPatterns(url);
    score += patterns.length * 3;

    // Adjust based on URL length
    if (url.length > 150) {
      score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Evaluate model on test set
   */
  async evaluate(testUrls: string[], testLabels: number[]): Promise<URLTrainingMetrics> {
    if (!this.isInitialized || !this.model) {
      throw new Error('Model not trained. Call train() first.');
    }

    const sequences = testUrls.map(url => this.urlToIndices(url));
    const xs = tf.tensor2d(sequences, [sequences.length, this.config.maxLength], 'int32');
    const ys = tf.tensor2d(testLabels, [testLabels.length, 1]);

    try {
      const result = this.model.evaluate(xs, ys) as tf.Scalar[];
      const loss = await result[0].data();
      const accuracy = await result[1].data();

      result.forEach(r => r.dispose());

      return {
        accuracy: accuracy[0],
        loss: loss[0]
      };
    } finally {
      xs.dispose();
      ys.dispose();
    }
  }

  /**
   * Get model configuration
   */
  getConfig(): URLCNNConfig {
    return { ...this.config };
  }

  /**
   * Check if model is trained
   */
  isReady(): boolean {
    return this.isInitialized && this.model !== null;
  }

  /**
   * Get character set size
   */
  getCharsetSize(): number {
    return this.charToIdx.size;
  }

  /**
   * Dispose model and free memory
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isInitialized = false;
    console.log('🧹 URL CNN model disposed');
  }
}

// Singleton instance
let urlCNNModel: LightweightURLCNN | null = null;

/**
 * Get or create URL CNN model instance
 */
export function getURLCNNModel(): LightweightURLCNN {
  if (!urlCNNModel) {
    urlCNNModel = new LightweightURLCNN();
  }
  return urlCNNModel;
}
